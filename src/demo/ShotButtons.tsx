import { useEffect } from "react";
import { startShotAction, stopAllShotActions } from "./shotActions";
import type { ShotAction } from "./shotActions";

const SHOTS: { action: ShotAction; label: string }[] = [
  { action: "zoomIn", label: "줌 인" },
  { action: "zoomOut", label: "줌 아웃" },
  { action: "tiltUp", label: "틸트 업" },
  { action: "tiltDown", label: "틸트 다운" },
  { action: "panLeft", label: "패닝 좌" },
  { action: "panRight", label: "패닝 우" },
];

export function ShotButtons() {
  useEffect(() => {
    window.addEventListener("pointerup", stopAllShotActions);
    window.addEventListener("pointercancel", stopAllShotActions);
    return () => {
      window.removeEventListener("pointerup", stopAllShotActions);
      window.removeEventListener("pointercancel", stopAllShotActions);
    };
  }, []);

  return (
    <div className="panel">
      <h2>샷 조작</h2>
      <p className="panel__hint">누르고 있는 동안 적용됩니다 (녹화 중이면 그대로 기록됨)</p>
      <div className="panel__row">
        {SHOTS.map(({ action, label }) => (
          <button
            key={action}
            type="button"
            onPointerDown={() => startShotAction(action)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
