import { useEffect } from "react";
import { startShotAction, stopAllShotActions } from "./shotActions";

export function PhoneZoomButtons() {
  useEffect(() => {
    window.addEventListener("pointerup", stopAllShotActions);
    window.addEventListener("pointercancel", stopAllShotActions);
    return () => {
      window.removeEventListener("pointerup", stopAllShotActions);
      window.removeEventListener("pointercancel", stopAllShotActions);
    };
  }, []);

  return (
    <div className="phone-zoom-buttons">
      <button
        type="button"
        className="phone-zoom-buttons__button"
        onPointerDown={() => startShotAction("zoomOut")}
      >
        −
      </button>
      <button
        type="button"
        className="phone-zoom-buttons__button"
        onPointerDown={() => startShotAction("zoomIn")}
      >
        ＋
      </button>
    </div>
  );
}
