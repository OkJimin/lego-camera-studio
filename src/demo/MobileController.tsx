import { useEffect, useRef, useState } from "react";
import { joinPhoneSession, sendOrientation } from "./phoneSession";

const SEND_INTERVAL_MS = 50;

interface DeviceOrientationEventIOS {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export function MobileController({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [angles, setAngles] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const lastSentRef = useRef(0);
  const orientationHandlerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (orientationHandlerRef.current) {
        window.removeEventListener("deviceorientation", orientationHandlerRef.current);
      }
    };
  }, []);

  const handleStart = async () => {
    setStatus("connecting");
    setErrorMessage(null);
    try {
      const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEventIOS;
      if (typeof ctor.requestPermission === "function") {
        const result = await ctor.requestPermission();
        if (result !== "granted") {
          setStatus("error");
          setErrorMessage("센서 권한이 거부됐어요. 브라우저 설정에서 허용해주세요.");
          return;
        }
      }

      await joinPhoneSession(sessionId);

      if (orientationHandlerRef.current) {
        window.removeEventListener("deviceorientation", orientationHandlerRef.current);
      }
      orientationHandlerRef.current = (event: DeviceOrientationEvent) => {
        const alpha = event.alpha ?? 0;
        const beta = event.beta ?? 0;
        const gamma = event.gamma ?? 0;
        setAngles({ alpha, beta, gamma });

        const now = performance.now();
        if (now - lastSentRef.current < SEND_INTERVAL_MS) return;
        lastSentRef.current = now;
        sendOrientation(sessionId, { alpha, beta, gamma, time: now });
      };
      window.addEventListener("deviceorientation", orientationHandlerRef.current);

      setStatus("connected");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "연결에 실패했어요");
    }
  };

  return (
    <div className="mobile-controller">
      <h1>레고 카메라 스튜디오</h1>
      <p className="mobile-controller__code">코드: {sessionId}</p>

      {status === "idle" && (
        <button type="button" className="mobile-controller__button" onClick={handleStart}>
          센서 권한 허용하고 시작
        </button>
      )}

      {status === "connecting" && <p>연결 중...</p>}

      {status === "error" && (
        <>
          <p className="mobile-controller__error">{errorMessage}</p>
          <button type="button" className="mobile-controller__button" onClick={handleStart}>
            다시 시도
          </button>
        </>
      )}

      {status === "connected" && (
        <div className="mobile-controller__readout">
          <p>✅ 연결됨 — 폰을 움직여서 카메라 시점을 잡아보세요</p>
          <p>α (방향): {angles.alpha.toFixed(0)}°</p>
          <p>β (앞뒤 기울기): {angles.beta.toFixed(0)}°</p>
          <p>γ (좌우 기울기): {angles.gamma.toFixed(0)}°</p>
        </div>
      )}
    </div>
  );
}
