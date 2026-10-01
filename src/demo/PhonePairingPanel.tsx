import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  createPhoneSession,
  mobileSessionUrl,
  watchOrientation,
  watchPhoneConnected,
} from "./phoneSession";
import type { PhoneOrientation } from "./phoneSession";

export function PhonePairingPanel() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [orientation, setOrientation] = useState<PhoneOrientation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreateSession = async () => {
    setCreating(true);
    setError(null);
    try {
      const id = await createPhoneSession();
      setSessionId(id);
      const url = mobileSessionUrl(id);
      const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "연결 생성에 실패했어요");
    } finally {
      setCreating(false);
    }
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

  return (
    <div className="panel">
      <h2>폰 연결</h2>

      {!sessionId && (
        <>
          <p className="panel__hint">폰으로 카메라를 조작하려면 먼저 연결을 만들어주세요</p>
          <button type="button" onClick={handleCreateSession} disabled={creating}>
            {creating ? "생성 중..." : "연결 만들기"}
          </button>
          {error && <p className="panel__hint">오류: {error}</p>}
        </>
      )}

      {sessionId && (
        <>
          <p className="panel__hint">
            {connected ? "✅ 폰이 연결됐습니다" : "폰에서 아래 QR 코드를 스캔해주세요"}
          </p>
          {qrDataUrl && !connected && (
            <img src={qrDataUrl} alt="연결 QR 코드" width={180} height={180} />
          )}
          <p className="panel__hint">코드: {sessionId}</p>

          {connected && orientation && (
            <p className="panel__hint">
              실시간 기울기 — α:{orientation.alpha.toFixed(0)}° β:{orientation.beta.toFixed(0)}°
              γ:{orientation.gamma.toFixed(0)}°
            </p>
          )}
        </>
      )}
    </div>
  );
}
