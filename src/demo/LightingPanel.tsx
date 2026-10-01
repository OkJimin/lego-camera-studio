import { KELVIN_RANGE, useLightingStore } from "./useLightingStore";

export function LightingPanel() {
  const ambientPercent = useLightingStore((s) => s.ambientPercent);
  const keyPercent = useLightingStore((s) => s.keyPercent);
  const keyAzimuth = useLightingStore((s) => s.keyAzimuth);
  const keyElevation = useLightingStore((s) => s.keyElevation);
  const keyTemperature = useLightingStore((s) => s.keyTemperature);
  const setAmbientPercent = useLightingStore((s) => s.setAmbientPercent);
  const setKeyPercent = useLightingStore((s) => s.setKeyPercent);
  const setKeyAzimuth = useLightingStore((s) => s.setKeyAzimuth);
  const setKeyElevation = useLightingStore((s) => s.setKeyElevation);
  const setKeyTemperature = useLightingStore((s) => s.setKeyTemperature);

  return (
    <div className="panel">
      <h2>조명</h2>

      <label className="panel__field">
        전체 광량: {ambientPercent.toFixed(0)}%
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={ambientPercent}
          onChange={(e) => setAmbientPercent(Number(e.target.value))}
        />
      </label>

      <label className="panel__field">
        주광 광량: {keyPercent.toFixed(0)}%
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={keyPercent}
          onChange={(e) => setKeyPercent(Number(e.target.value))}
        />
      </label>

      <label className="panel__field">
        주광 색온도: {keyTemperature.toFixed(0)}K
        <input
          type="range"
          min={KELVIN_RANGE.min}
          max={KELVIN_RANGE.max}
          step={100}
          value={keyTemperature}
          onChange={(e) => setKeyTemperature(Number(e.target.value))}
        />
      </label>

      <label className="panel__field">
        주광 방향(좌우): {keyAzimuth.toFixed(0)}°
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={keyAzimuth}
          onChange={(e) => setKeyAzimuth(Number(e.target.value))}
        />
      </label>

      <label className="panel__field">
        주광 높이: {keyElevation.toFixed(0)}°
        <input
          type="range"
          min={5}
          max={85}
          step={1}
          value={keyElevation}
          onChange={(e) => setKeyElevation(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
