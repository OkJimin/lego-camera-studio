import {
  MOVE_SPEED_RANGE,
  OBJECT_MOTION_SECONDS_RANGE,
  TILT_PAN_SPEED_RANGE,
  ZOOM_SPEED_RANGE,
  useSpeedSettingsStore,
} from "./useSpeedSettingsStore";

// showTiltPan is off for the phone workspace: tilt/pan there come straight
// from the phone's own gyro tilt, not a speed-based nudge, so those sliders
// wouldn't do anything.
export function SpeedSettingsPanel({ showTiltPan = true }: { showTiltPan?: boolean }) {
  const moveSpeed = useSpeedSettingsStore((s) => s.moveSpeed);
  const zoomSpeed = useSpeedSettingsStore((s) => s.zoomSpeed);
  const tiltSpeed = useSpeedSettingsStore((s) => s.tiltSpeed);
  const panSpeed = useSpeedSettingsStore((s) => s.panSpeed);
  const objectMotionSeconds = useSpeedSettingsStore((s) => s.objectMotionSeconds);
  const setMoveSpeed = useSpeedSettingsStore((s) => s.setMoveSpeed);
  const setZoomSpeed = useSpeedSettingsStore((s) => s.setZoomSpeed);
  const setTiltSpeed = useSpeedSettingsStore((s) => s.setTiltSpeed);
  const setPanSpeed = useSpeedSettingsStore((s) => s.setPanSpeed);
  const setObjectMotionSeconds = useSpeedSettingsStore((s) => s.setObjectMotionSeconds);

  return (
    <div className="panel">
      <h2>움직임 속도</h2>

      <label className="panel__field">
        이동 속도: {moveSpeed.toFixed(1)}
        <input
          type="range"
          min={MOVE_SPEED_RANGE.min}
          max={MOVE_SPEED_RANGE.max}
          step={0.5}
          value={moveSpeed}
          onChange={(e) => setMoveSpeed(Number(e.target.value))}
        />
      </label>

      <label className="panel__field">
        줌 속도: {zoomSpeed.toFixed(0)}
        <input
          type="range"
          min={ZOOM_SPEED_RANGE.min}
          max={ZOOM_SPEED_RANGE.max}
          step={1}
          value={zoomSpeed}
          onChange={(e) => setZoomSpeed(Number(e.target.value))}
        />
      </label>

      {showTiltPan && (
        <>
          <label className="panel__field">
            틸트 속도: {tiltSpeed.toFixed(2)}
            <input
              type="range"
              min={TILT_PAN_SPEED_RANGE.min}
              max={TILT_PAN_SPEED_RANGE.max}
              step={0.05}
              value={tiltSpeed}
              onChange={(e) => setTiltSpeed(Number(e.target.value))}
            />
          </label>

          <label className="panel__field">
            패닝 속도: {panSpeed.toFixed(2)}
            <input
              type="range"
              min={TILT_PAN_SPEED_RANGE.min}
              max={TILT_PAN_SPEED_RANGE.max}
              step={0.05}
              value={panSpeed}
              onChange={(e) => setPanSpeed(Number(e.target.value))}
            />
          </label>
        </>
      )}

      <label className="panel__field">
        오브젝트 이동 속도 (한 방향 {objectMotionSeconds.toFixed(1)}초)
        <input
          type="range"
          min={OBJECT_MOTION_SECONDS_RANGE.min}
          max={OBJECT_MOTION_SECONDS_RANGE.max}
          step={0.5}
          value={objectMotionSeconds}
          onChange={(e) => setObjectMotionSeconds(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
