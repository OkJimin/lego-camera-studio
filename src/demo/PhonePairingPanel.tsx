import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  clearRecordedPath,
  forgetPhoneSession,
  getOrCreatePhoneSession,
  mobileSessionUrl,
  syncBlocks,
  syncCameraPath,
  syncCameraSettings,
  syncHomePosition,
  syncHomeYaw,
  syncLighting,
  syncSpeedSettings,
  watchOrientation,
  watchPhoneConnected,
  watchRecordedPath,
} from "./phoneSession";
import type { PhoneOrientation } from "./phoneSession";
import { deserializeKeyframes, serializeKeyframes } from "./guidePath";
import { headingFromQuaternion, liveCameraPose } from "./liveCameraPose";
import { useBlockStore } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import { useGuideExportStore } from "./useGuideExportStore";
import { FORMAT_PRESETS, useCameraSettingsStore } from "./useCameraSettingsStore";
import { useLightingStore } from "./useLightingStore";
import { useSpeedSettingsStore } from "./useSpeedSettingsStore";

const BLOCK_SYNC_INTERVAL_MS = 150;
const HOME_POSITION_SYNC_INTERVAL_MS = 150;

export function PhonePairingPanel() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [orientation, setOrientation] = useState<PhoneOrientation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [receivedSeconds, setReceivedSeconds] = useState<number | null>(null);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);
  const play = useCameraPathStore((s) => s.play);
  const stopPlayback = useCameraPathStore((s) => s.stop);
  const openExport = useGuideExportStore((s) => s.openExport);

  const setUpSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await getOrCreatePhoneSession();
      setSessionId(id);
      setQrDataUrl(await QRCode.toDataURL(mobileSessionUrl(id), { width: 220, margin: 1 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "연결 생성에 실패했어요");
    } finally {
      setLoading(false);
    }
  };

  // Reuse the saved session automatically so returning here doesn't force a
  // fresh QR scan every time — only "새 연결 만들기" below starts a new one.
  useEffect(() => {
    setUpSession();
  }, []);

  const handleNewSession = () => {
    forgetPhoneSession();
    setSessionId(null);
    setConnected(false);
    setOrientation(null);
    setUpSession();
  };

  useEffect(() => {
    if (!sessionId) return;
    const unsubConnected = watchPhoneConnected(sessionId, setConnected);
    const unsubOrientation = watchOrientation(sessionId, setOrientation);
    return () => {
      unsubConnected();
      unsubOrientation();
    };
  }, [sessionId]);

  // Mirror the placed objects to the phone in near-real-time so its viewfinder
  // shows the same scene, throttled so a gizmo drag doesn't flood the database.
  const lastSyncRef = useRef(0);
  const pendingSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    const pushBlocks = () => {
      lastSyncRef.current = Date.now();
      syncBlocks(sessionId, useBlockStore.getState().blocks);
    };
    pushBlocks();
    return useBlockStore.subscribe((state) => {
      const elapsed = Date.now() - lastSyncRef.current;
      if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
      if (elapsed >= BLOCK_SYNC_INTERVAL_MS) {
        lastSyncRef.current = Date.now();
        syncBlocks(sessionId, state.blocks);
      } else {
        pendingSyncRef.current = setTimeout(pushBlocks, BLOCK_SYNC_INTERVAL_MS - elapsed);
      }
    });
  }, [sessionId]);

  // Let the phone's viewfinder start from whatever's currently visible on the
  // desktop's own screen, so connecting just shows that shot with no separate
  // "save a start position" step.
  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      syncHomePosition(sessionId, [
        liveCameraPose.position.x,
        liveCameraPose.position.y,
        liveCameraPose.position.z,
      ]);
      syncHomeYaw(sessionId, headingFromQuaternion(liveCameraPose.quaternion));
    }, HOME_POSITION_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sessionId]);

  // Send the recorded camera path once a recording settles, so the capture
  // page can replay it as a guide. Skipped during recording to avoid flooding RTDB.
  useEffect(() => {
    if (!sessionId) return;
    const pushPath = (state: ReturnType<typeof useCameraPathStore.getState>) => {
      if (state.isRecording || state.keyframes.length < 2) return;
      syncCameraPath(sessionId, serializeKeyframes(state.keyframes));
    };
    pushPath(useCameraPathStore.getState());
    return useCameraPathStore.subscribe((state, prev) => {
      if (state.keyframes !== prev.keyframes || state.isRecording !== prev.isRecording) {
        pushPath(state);
      }
    });
  }, [sessionId]);

  // The path the phone records with its gyro becomes this project's camera path,
  // so it can be previewed, saved and exported like one recorded on the desktop.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let unsubscribe = () => {};
    clearRecordedPath(sessionId)
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        unsubscribe = watchRecordedPath(sessionId, (path) => {
          useCameraPathStore.setState({
            keyframes: deserializeKeyframes(path),
            isPlaying: false,
            isRecording: false,
          });
          setReceivedSeconds(path.duration);
        });
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sessionId]);

  // Mirror lens/format so the phone's viewfinder frames the shot the same
  // way the desktop operator set it up, and relights to match.
  useEffect(() => {
    if (!sessionId) return;
    const pushCameraSettings = (state: ReturnType<typeof useCameraSettingsStore.getState>) => {
      syncCameraSettings(sessionId, {
        fov: state.lensFov,
        aspect: FORMAT_PRESETS[state.formatIndex].aspect,
      });
    };
    pushCameraSettings(useCameraSettingsStore.getState());
    return useCameraSettingsStore.subscribe(pushCameraSettings);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const pushLighting = (state: ReturnType<typeof useLightingStore.getState>) => {
      syncLighting(sessionId, {
        ambientPercent: state.ambientPercent,
        keyPercent: state.keyPercent,
        keyAzimuth: state.keyAzimuth,
        keyElevation: state.keyElevation,
        keyTemperature: state.keyTemperature,
      });
    };
    pushLighting(useLightingStore.getState());
    return useLightingStore.subscribe(pushLighting);
  }, [sessionId]);

  // Mirror movement/zoom speed so the "움직임 속도" sliders tune
  // the phone's own live canvas, which runs in a separate browser process.
  useEffect(() => {
    if (!sessionId) return;
    const pushSpeed = (state: ReturnType<typeof useSpeedSettingsStore.getState>) => {
      syncSpeedSettings(sessionId, {
        moveSpeed: state.moveSpeed,
        zoomSpeed: state.zoomSpeed,
        tiltSpeed: state.tiltSpeed,
        panSpeed: state.panSpeed,
      });
    };
    pushSpeed(useSpeedSettingsStore.getState());
    return useSpeedSettingsStore.subscribe(pushSpeed);
  }, [sessionId]);

  return (
    <div className="panel">
      <h2>폰 연결</h2>

      {loading && <p className="panel__hint">연결 준비 중...</p>}
      {error && <p className="panel__hint">오류: {error}</p>}

      {sessionId && !loading && (
        <>
          <p className="panel__hint">
            폰이 연결되면 지금 노트북 화면에 보이는 위치에서 시작해요
          </p>

          <p className="panel__hint">
            {connected ? "✅ 폰이 연결됐습니다" : "폰에서 아래 QR 코드를 스캔해주세요"}
          </p>
          {connected && (
            <p className="panel__hint">
              폰 화면 오른쪽 위의 "녹화 시작"으로 카메라 무빙을 기록하세요
            </p>
          )}
          {receivedSeconds !== null && (
            <>
              <p className="panel__hint">
                ✅ 폰에서 받은 경로: {receivedSeconds.toFixed(1)}초 — 아래 버튼으로 영상 파일을 받으세요
              </p>
              <div className="panel__row">
                <button type="button" onClick={() => (isPlaying ? stopPlayback() : play())}>
                  {isPlaying ? "재생 중지" : "경로 미리보기"}
                </button>
                <button type="button" onClick={openExport} disabled={isPlaying}>
                  가이드 영상 내보내기
                </button>
              </div>
            </>
          )}
          {qrDataUrl && !connected && (
            <>
              <img src={qrDataUrl} alt="연결 QR 코드" width={180} height={180} />
              <p className="panel__hint">
                한 번 스캔한 뒤엔 폰 브라우저에서 홈 화면에 추가해두면 다음부턴 다시 스캔 안 해도
                돼요
              </p>
            </>
          )}
          <p className="panel__hint">
            가이드 영상을 보며 촬영하려면 시작 화면의 "폰으로 가이드 촬영하기"를 이용하세요
          </p>
          <p className="panel__hint">코드: {sessionId}</p>

          {connected && orientation && (
            <p className="panel__hint">
              실시간 기울기 — α:{orientation.alpha.toFixed(0)}° β:{orientation.beta.toFixed(0)}°
              γ:{orientation.gamma.toFixed(0)}°
            </p>
          )}

          <div className="panel__row">
            <button type="button" onClick={handleNewSession}>
              새 연결 만들기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
