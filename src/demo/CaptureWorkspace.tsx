import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { AspectMask } from "./AspectMask";
import { CaptureGuide } from "./CaptureGuide";
import type { CameraPathSync } from "./guidePath";
import { ensureAnonymousAuth, watchBlocks, watchCameraPath, watchCameraSettings } from "./phoneSession";
import type { CameraSettingsSync } from "./phoneSession";
import type { PlacedBlock } from "./useBlockStore";

type CaptureStatus = "idle" | "countdown" | "recording" | "saved";

const COUNTDOWN_START = 3;
const RECORDING_BITRATE = 20_000_000;

function pickRecordingMimeType(): string {
  const candidates = ["video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export interface CaptureData {
  blocks: PlacedBlock[];
  path: CameraPathSync | null;
  fov: number;
  aspect?: number;
}

// Live data from a desktop pairing session (QR flow).
export function CaptureWorkspace({ sessionId }: { sessionId: string }) {
  const [blocks, setBlocks] = useState<PlacedBlock[]>([]);
  const [path, setPath] = useState<CameraPathSync | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettingsSync | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribers: Array<() => void> = [];

    ensureAnonymousAuth().then(() => {
      if (cancelled) return;
      unsubscribers = [
        watchBlocks(sessionId, setBlocks),
        watchCameraPath(sessionId, setPath),
        watchCameraSettings(sessionId, setCameraSettings),
      ];
    });

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [sessionId]);

  return (
    <CaptureView
      blocks={blocks}
      path={path}
      fov={cameraSettings?.fov ?? 50}
      aspect={cameraSettings?.aspect}
    />
  );
}

export function CaptureView({
  blocks,
  path,
  fov,
  aspect,
  onBack,
}: CaptureData & { onBack?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [opacity, setOpacity] = useState(0.5);
  const [frameAspect, setFrameAspect] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function openCamera() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("카메라를 쓸 수 없는 주소예요. https 주소로 접속했는지 확인해주세요.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setCameraError("카메라를 열 수 없어요. 카메라 권한을 허용했는지 확인해주세요.");
      }
    }

    openCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = pickRecordingMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: RECORDING_BITRATE,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      const extension = type.includes("mp4") ? "mp4" : "webm";
      const link = document.createElement("a");
      link.href = url;
      link.download = `lego-guide-${Date.now()}.${extension}`;
      link.click();
      setSavedUrl(url);
      setStatus("saved");
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  };

  useEffect(() => {
    if (status !== "countdown") return;
    if (countdown === 0) {
      startRecording();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown]);

  const beginCountdown = () => {
    setCountdown(COUNTDOWN_START);
    setStatus("countdown");
  };

  const reset = () => {
    if (savedUrl) URL.revokeObjectURL(savedUrl);
    setSavedUrl(null);
    setStatus("idle");
  };

  const hasPath = path !== null && path.keys.length >= 2;

  return (
    <div className="capture-stage">
      <div
        className="capture-frame"
        style={{ "--frame-aspect": frameAspect ?? 16 / 9 } as CSSProperties}
      >
        <video
          ref={videoRef}
          className="capture-video"
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => setFrameAspect(e.currentTarget.videoWidth / e.currentTarget.videoHeight)}
          onResize={(e) => setFrameAspect(e.currentTarget.videoWidth / e.currentTarget.videoHeight)}
        />

        <div className="capture-overlay" style={{ opacity }}>
          <Canvas
            gl={{ alpha: true, antialias: true }}
            camera={{ position: [0, 2, 6], fov }}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          >
            <CaptureGuide
              path={path}
              blocks={blocks}
              running={status === "recording"}
              onFinished={stopRecording}
            />
          </Canvas>
        </div>

        <AspectMask aspectOverride={aspect} />
      </div>

      {status === "countdown" && <div className="capture-countdown">{countdown}</div>}

      <div className="capture-bar">
        {cameraError && <p className="capture-bar__message">{cameraError}</p>}
        {!cameraError && !hasPath && (
          <p className="capture-bar__message">
            카메라 경로가 없어요. 데스크톱에서 카메라 경로를 녹화한 뒤 다시 연결해주세요
          </p>
        )}
        {!cameraError && hasPath && status === "idle" && (
          <p className="capture-bar__message">시작 자세에 폰을 맞춘 뒤 촬영을 누르세요</p>
        )}
        {status === "recording" && <p className="capture-bar__message">촬영 중 · 가이드를 따라가세요</p>}
        {status === "saved" && (
          <p className="capture-bar__message">
            저장됨 · 안 받아졌다면 <a href={savedUrl ?? undefined} download>여기서 받기</a>
          </p>
        )}

        <label className="capture-bar__opacity">
          가이드 투명도 {Math.round(opacity * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
        </label>

        <div className="capture-bar__buttons">
          {status === "idle" && onBack && (
            <button type="button" className="capture-bar__secondary" onClick={onBack}>
              ◀ 목록
            </button>
          )}
          {status === "idle" && (
            <button type="button" disabled={!hasPath || !!cameraError} onClick={beginCountdown}>
              촬영 시작
            </button>
          )}
          {status === "countdown" && (
            <button type="button" onClick={reset}>
              취소
            </button>
          )}
          {status === "recording" && (
            <button type="button" onClick={stopRecording}>
              촬영 중지
            </button>
          )}
          {status === "saved" && (
            <button type="button" onClick={reset}>
              다시 찍기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
