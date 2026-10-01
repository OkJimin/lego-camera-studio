import {
  FORMAT_PRESETS,
  LENS_PRESETS,
  focalLengthToFov,
  useCameraSettingsStore,
} from "./useCameraSettingsStore";
import { useCameraPathStore } from "./useCameraPathStore";

export function CameraSettingsPanel() {
  const formatIndex = useCameraSettingsStore((s) => s.formatIndex);
  const setFormatIndex = useCameraSettingsStore((s) => s.setFormatIndex);
  const requestSetFov = useCameraPathStore((s) => s.requestSetFov);

  return (
    <div className="panel">
      <h2>카메라 렌즈 / 포맷</h2>

      <p className="panel__hint">렌즈 (초점거리)</p>
      <div className="panel__row">
        {LENS_PRESETS.map((lens) => (
          <button
            key={lens.label}
            type="button"
            className="chip"
            onClick={() => requestSetFov(focalLengthToFov(lens.focalLengthMm))}
          >
            {lens.label}
          </button>
        ))}
      </div>

      <p className="panel__hint">포맷 (카메라 뷰포트 화면비)</p>
      <div className="panel__row">
        {FORMAT_PRESETS.map((format, index) => (
          <button
            key={format.label}
            type="button"
            className={index === formatIndex ? "chip chip--active" : "chip"}
            onClick={() => setFormatIndex(index)}
          >
            {format.label}
          </button>
        ))}
      </div>
    </div>
  );
}
