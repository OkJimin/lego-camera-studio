import { useEffect, useState } from "react";
import QRCode from "qrcode";

// QR to the phone's shooting page (?mode=shoot): pick a guide video, shoot over it.
// The page needs no pairing session, so one fixed code serves every project.
export function PhoneShootQr() {
  const url = `${window.location.origin}/?mode=shoot`;
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 220, margin: 1 })
      .then((value) => {
        if (!cancelled) setDataUrl(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="shoot-qr">
      {dataUrl && <img src={dataUrl} alt="폰 가이드 촬영 QR 코드" width={180} height={180} />}
      <p className="shoot-qr__url">{url}</p>
      {isLocalhost && (
        <p className="shoot-qr__warning">
          지금 localhost로 열려 있어서 폰에서는 이 QR이 열리지 않아요. 터널(https) 주소로 이
          사이트를 연 다음 다시 확인해주세요
        </p>
      )}
    </div>
  );
}
