import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  forgetPhoneSession,
  getOrCreatePhoneSession,
  mobileSessionUrl,
  syncBlocks,
  syncCameraSettings,
  syncHomePosition,
  syncLighting,
  syncSpeedSettings,
  watchOrientation,
  watchPhoneConnected,
} from "./phoneSession";
import type { PhoneOrientation } from "./phoneSession";
import { liveCameraPose } from "./liveCameraPose";
import { useBlockStore } from "./useBlockStore";
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

  const setUpSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await getOrCreatePhoneSession();
      setSessionId(id);
      const url = mobileSessionUrl(id);
      const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
      setQrDataUrl(dataUrl);
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
    }, HOME_POSITION_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
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

  // Mirror movement/zoom/object-loop speed so the "움직임 속도" sliders tune
  // the phone's own live canvas, which runs in a separate browser process.
  useEffect(() => {
    if (!sessionId) return;
    const pushSpeed = (state: ReturnType<typeof useSpeedSettingsStore.getState>) => {
      syncSpeedSettings(sessionId, {
        moveSpeed: state.moveSpeed,
        zoomSpeed: state.zoomSpeed,
        tiltSpeed: state.tiltSpeed,
        panSpeed: state.panSpeed,
        objectMotionSeconds: state.objectMotionSeconds,
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
          {qrDataUrl && !connected && (
            <>
              <img src={qrDataUrl} alt="연결 QR 코드" width={180} height={180} />
              <p className="panel__hint">
                한 번 스캔한 뒤엔 폰 브라우저에서 홈 화면에 추가해두면 다음부턴 다시 스캔 안 해도
                돼요
              </p>
            </>
          )}
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
