import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Block } from "./Block";
import { createGuideSampler, serializeKeyframes } from "./guidePath";
import type { CameraPathSync } from "./guidePath";
import { PhoneShootQr } from "./PhoneShootQr";
import { createGuideClock } from "./playbackClock";
import type { GuideClock } from "./playbackClock";
import { extensionForMimeType, pickRecordingMimeType, triggerDownload } from "./recording";
import { SceneLighting } from "./SceneLighting";
import { StaticGround } from "./StaticGround";
import { DepthOfFieldEffect } from "./DepthOfFieldEffect";
import { blockPositionAt, useBlockStore } from "./useBlockStore";
import { toUniformKeyframes, useCameraPathStore } from "./useCameraPathStore";
import { FORMAT_PRESETS, useCameraSettingsStore } from "./useCameraSettingsStore";
import { useGuideExportStore } from "./useGuideExportStore";
import { useProjectStore } from "./useProjectStore";

const START_DELAY_MS = 600;
const TAIL_MS = 400;
// Bits per pixel per frame: high enough that flat colors and edges stay clean.
const BITS_PER_PIXEL = 0.3;

const RESOLUTION_OPTIONS = [
  { width: 1280, label: "HD" },
  { width: 1920, label: "Full HD (권장)" },
  { width: 2560, label: "QHD" },
];
const FPS_OPTIONS = [30, 60];

type ExportStatus = "options" | "preparing" | "recording" | "done" | "error";

function evenPx(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

// Plays the camera path (and the objects' one-shot moves) once on its own clock.
// Sits at the first frame until `running`, so the recording starts exactly on it.
const _focusPoint = new THREE.Vector3();

function ExportScene({
  path,
  clock,
  running,
  withDof,
  onFinished,
}: {
  path: CameraPathSync;
  clock: GuideClock;
  running: boolean;
  withDof: boolean;
  onFinished: () => void;
}) {
  const { camera } = useThree();
  const blocks = useBlockStore((s) => s.blocks);
  const sampler = useMemo(() => createGuideSampler(path), [path]);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);

  // The focus object stays the focus even when it's left out of the video
  // (e.g. a stand-in for someone who'll be composited in later).
  const getFocusPoint = () => {
    const { focusBlockId } = useCameraSettingsStore.getState();
    const block = focusBlockId ? useBlockStore.getState().blocks.find((b) => b.id === focusBlockId) : null;
    if (!block) return null;
    return _focusPoint.set(...blockPositionAt(block, clock.playing, clock.elapsed, clock.duration));
  };

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    clock.duration = sampler.duration;
    clock.elapsed = 0;
    // Objects wait at their start pose, not at wherever they were left in the editor.
    clock.playing = true;
  }, [clock, sampler]);

  useFrame((_, delta) => {
    if (running && !finishedRef.current) {
      clock.elapsed = Math.min(clock.elapsed + delta, sampler.duration);
      if (clock.elapsed >= sampler.duration) {
        finishedRef.current = true;
        onFinishedRef.current();
      }
    }
    sampler.apply(clock.elapsed, camera as THREE.PerspectiveCamera);
  });

  return (
    <>
      <SceneLighting />
      <gridHelper args={[24, 24, "#b9b4a4", "#ddd9cc"]} />
      <StaticGround />
      {blocks
        .filter((block) => !block.hideInExport)
        .map((block) => (
          <Block key={block.id} block={block} interactive={false} clock={clock} />
        ))}
      {withDof && <DepthOfFieldEffect getFocusPoint={getFocusPoint} />}
    </>
  );
}

// Renders the project's camera path off a fixed-size canvas and records it to a
// video file: the guide to feed an AI video model or to overlay on the phone.
export function GuideExporter() {
  const open = useGuideExportStore((s) => s.open);
  const closeExport = useGuideExportStore((s) => s.closeExport);
  if (!open) return null;
  return createPortal(<GuideExporterDialog onClose={closeExport} />, document.body);
}

function GuideExporterDialog({ onClose }: { onClose: () => void }) {
  const projectName = useProjectStore((s) => s.currentProjectName);
  const formatIndex = useCameraSettingsStore((s) => s.formatIndex);
  const aspect = FORMAT_PRESETS[formatIndex].aspect;

  const [width, setWidth] = useState(1920);
  const [fps, setFps] = useState(30);
  const [withDof, setWithDof] = useState(() => useCameraSettingsStore.getState().dofEnabled);
  const height = evenPx(width / aspect);

  // Snapshot once: editing the scene mid-export must not change the video.
  // Re-spacing the keys evenly also smooths paths recorded before that was done at record time.
  const [path] = useState<CameraPathSync | null>(() => {
    const { keyframes } = useCameraPathStore.getState();
    return keyframes.length >= 2 ? serializeKeyframes(toUniformKeyframes(keyframes)) : null;
  });
  const [clock] = useState(createGuideClock);

  const [status, setStatus] = useState<ExportStatus>(path ? "options" : "error");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
  const [scale, setScale] = useState(1);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const cancelledRef = useRef(false);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const fit = () => {
      setScale(Math.min((window.innerWidth * 0.8) / width, (window.innerHeight * 0.5) / height, 1));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [width, height]);

  useEffect(() => {
    const timers = timersRef.current;
    // StrictMode mounts, cleans up and remounts in dev; don't stay "cancelled".
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      timers.forEach(clearTimeout);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== "recording") return;
    const id = setInterval(() => {
      setProgress(clock.duration > 0 ? clock.elapsed / clock.duration : 0);
    }, 200);
    return () => clearInterval(id);
  }, [status, clock]);

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas || cancelledRef.current) return;
    try {
      const mimeType = pickRecordingMimeType();
      const recorder = new MediaRecorder(canvas.captureStream(fps), {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: Math.round(width * height * fps * BITS_PER_PIXEL),
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (cancelledRef.current) return;
        const type = recorder.mimeType || mimeType || "video/webm";
        const url = URL.createObjectURL(new Blob(chunks, { type }));
        const safeName = projectName.replace(/[\\/:*?"<>|]/g, "_").trim() || "project";
        const filename = `${safeName}-guide.${extensionForMimeType(type)}`;
        resultUrlRef.current = url;
        setResult({ url, filename });
        setStatus("done");
        triggerDownload(url, filename);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRunning(true);
      setStatus("recording");
    } catch {
      setStatus("error");
    }
  };

  const handleFinished = () => {
    timersRef.current.push(
      setTimeout(() => {
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") recorder.stop();
      }, TAIL_MS),
    );
  };

  const statusText =
    status === "preparing"
      ? "준비 중..."
      : status === "recording"
        ? `영상을 만드는 중... ${Math.round(progress * 100)}%`
        : status === "done"
          ? "완료! 파일이 다운로드됐어요"
          : status === "error"
            ? "영상을 만들 수 없어요. 카메라 경로가 있는지 확인해주세요"
            : "";

  return (
    <div className="export-backdrop">
      <div className="export-dialog">
        <h2>가이드 영상 내보내기</h2>

        {status === "options" && path && (
          <>
            <div className="export-dialog__options">
              <label>
                해상도
                <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
                  {RESOLUTION_OPTIONS.map((option) => (
                    <option key={option.width} value={option.width}>
                      {option.label} · {option.width}×{evenPx(option.width / aspect)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                프레임
                <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                  {FPS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}fps
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="export-dialog__check">
              <input
                type="checkbox"
                checked={withDof}
                onChange={(e) => setWithDof(e.target.checked)}
              />
              심도(배경 흐림) 포함 — 폰 촬영용 가이드는 끄는 게 더 선명해요
            </label>
            <p className="export-dialog__hint">
              카메라 경로 {path.duration.toFixed(1)}초 · 실시간으로 녹화돼서 같은 시간이 걸려요.
              해상도와 프레임이 높을수록 선명하지만 컴퓨터가 느리면 끊길 수 있어요
            </p>
          </>
        )}

        {status !== "options" && path && status !== "error" && (
          <div
            className="export-dialog__viewport"
            style={{ width: width * scale, height: height * scale } as CSSProperties}
          >
            <div
              className="export-dialog__canvas"
              style={{ width, height, transform: `scale(${scale})` }}
            >
              <Canvas
                dpr={1}
                resize={{ offsetSize: true }}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                camera={{ position: [8, 8, 8], fov: 50 }}
                onCreated={({ gl }) => {
                  canvasRef.current = gl.domElement;
                  timersRef.current.push(setTimeout(startRecording, START_DELAY_MS));
                }}
              >
                <ExportScene
                  path={path}
                  clock={clock}
                  running={running}
                  withDof={withDof}
                  onFinished={handleFinished}
                />
              </Canvas>
            </div>
          </div>
        )}

        {statusText && <p className="export-dialog__status">{statusText}</p>}
        {status === "done" && (
          <div className="export-dialog__next">
            <p>
              📱 폰으로 촬영하려면 받은 영상을 폰으로 옮긴 뒤(카톡, 드라이브, USB 등) 아래 QR을
              스캔하고 <strong>가이드 영상으로 촬영</strong>을 누르세요
            </p>
            <PhoneShootQr />
          </div>
        )}
        {(status === "preparing" || status === "recording") && (
          <p className="export-dialog__hint">
            {width}×{height} · {fps}fps · 끝날 때까지 이 창과 탭을 그대로 두세요
          </p>
        )}

        <div className="export-dialog__buttons">
          {status === "options" && (
            <button
              type="button"
              className="export-dialog__start"
              onClick={() => setStatus("preparing")}
            >
              내보내기 시작
            </button>
          )}
          {status === "done" && result && (
            <a className="export-dialog__download" href={result.url} download={result.filename}>
              다시 받기
            </a>
          )}
          <button type="button" onClick={onClose}>
            {status === "done" || status === "error" ? "닫기" : "취소"}
          </button>
        </div>
      </div>
    </div>
  );
}
