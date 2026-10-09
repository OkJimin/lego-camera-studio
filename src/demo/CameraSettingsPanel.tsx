import { KIND_LABELS, useBlockStore } from "./useBlockStore";
import {
  FORMAT_PRESETS,
  LENS_PRESETS,
  focalLengthToFov,
  fovToFocalLength,
  useCameraSettingsStore,
} from "./useCameraSettingsStore";
import { useCameraPathStore } from "./useCameraPathStore";

export function CameraSettingsPanel() {
  const formatIndex = useCameraSettingsStore((s) => s.formatIndex);
  const lensFov = useCameraSettingsStore((s) => s.lensFov);
  const dofEnabled = useCameraSettingsStore((s) => s.dofEnabled);
  const dofInEditor = useCameraSettingsStore((s) => s.dofInEditor);
  const setDofInEditor = useCameraSettingsStore((s) => s.setDofInEditor);
  const blurStrength = useCameraSettingsStore((s) => s.blurStrength);
  const focusBlockId = useCameraSettingsStore((s) => s.focusBlockId);
  const keepSubjectSize = useCameraSettingsStore((s) => s.keepSubjectSize);
  const setFormatIndex = useCameraSettingsStore((s) => s.setFormatIndex);
  const setLensFov = useCameraSettingsStore((s) => s.setLensFov);
  const setDofEnabled = useCameraSettingsStore((s) => s.setDofEnabled);
  const setBlurStrength = useCameraSettingsStore((s) => s.setBlurStrength);
  const setFocusBlockId = useCameraSettingsStore((s) => s.setFocusBlockId);
  const setKeepSubjectSize = useCameraSettingsStore((s) => s.setKeepSubjectSize);
  const requestSetFov = useCameraPathStore((s) => s.requestSetFov);
  const focusBlock = useBlockStore((s) => s.blocks.find((b) => b.id === focusBlockId));

  const pickLens = (fov: number) => {
    requestSetFov(fov);
    setLensFov(fov);
  };

  const currentMm = Math.round(fovToFocalLength(lensFov));

  return (
    <div className="panel">
      <h2>카메라 렌즈 / 포맷</h2>

      <p className="panel__hint">렌즈 (초점거리) · 지금 {currentMm}mm</p>
      <div className="panel__row">
        {LENS_PRESETS.map((lens) => (
          <button
            key={lens.label}
            type="button"
            className={currentMm === lens.focalLengthMm ? "chip chip--active" : "chip"}
            onClick={() => pickLens(focalLengthToFov(lens.focalLengthMm))}
          >
            {lens.label}
          </button>
        ))}
      </div>

      <label className="panel__check">
        <input
          type="checkbox"
          checked={keepSubjectSize}
          onChange={(e) => setKeepSubjectSize(e.target.checked)}
        />
        렌즈를 바꿀 때 초점 오브젝트 크기 유지 (카메라가 앞뒤로 움직여 원근감이 달라져요)
      </label>

      <p className="panel__hint">포맷 (화면비 — 편집 화면의 밝은 영역이 영상에 담겨요)</p>
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

      <h2>심도 (배경 흐림)</h2>
      <label className="panel__check">
        <input
          type="checkbox"
          checked={dofEnabled}
          onChange={(e) => setDofEnabled(e.target.checked)}
        />
        심도 적용 (편집 화면과 내보낸 영상)
      </label>

      {dofEnabled && (
        <>
          <label className="panel__check">
            <input
              type="checkbox"
              checked={dofInEditor}
              onChange={(e) => setDofInEditor(e.target.checked)}
            />
            편집 화면에서 미리 보기 (끄면 내보낼 때만 적용돼요. 느리면 끄세요)
          </label>

          <label className="panel__field">
            흐림 정도: {Math.round(blurStrength * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={blurStrength}
              onChange={(e) => setBlurStrength(Number(e.target.value))}
            />
          </label>

          {focusBlock ? (
            <div className="panel__row">
              <p className="panel__hint">초점 고정: {KIND_LABELS[focusBlock.kind]}</p>
              <button type="button" onClick={() => setFocusBlockId(null)}>
                자동 초점으로
              </button>
            </div>
          ) : (
            <p className="panel__hint">
              화면 가운데 있는 것에 자동으로 초점이 맞아요. 특정 오브젝트에 고정하려면 선택한 뒤
              "이 오브젝트에 초점"을 누르세요
            </p>
          )}
          <p className="panel__hint">렌즈가 길수록(85mm, 135mm) 배경이 더 많이 흐려져요</p>
        </>
      )}
    </div>
  );
}
