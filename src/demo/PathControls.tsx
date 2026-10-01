import { AUTO_MOVE_DURATION_RANGE, useCameraPathStore } from "./useCameraPathStore";

export function PathControls() {
  const isRecording = useCameraPathStore((s) => s.isRecording);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);
  const keyframeCount = useCameraPathStore((s) => s.keyframes.length);
  const hasHome = useCameraPathStore((s) => s.home !== null);
  const hasEnd = useCameraPathStore((s) => s.end !== null);
  const autoMoveDuration = useCameraPathStore((s) => s.autoMoveDuration);
  const setAutoMoveDuration = useCameraPathStore((s) => s.setAutoMoveDuration);
  const startRecording = useCameraPathStore((s) => s.startRecording);
  const stopRecording = useCameraPathStore((s) => s.stopRecording);
  const clearPath = useCameraPathStore((s) => s.clearPath);
  const play = useCameraPathStore((s) => s.play);
  const stop = useCameraPathStore((s) => s.stop);
  const requestSaveHome = useCameraPathStore((s) => s.requestSaveHome);
  const requestGoHome = useCameraPathStore((s) => s.requestGoHome);
  const requestSaveEnd = useCameraPathStore((s) => s.requestSaveEnd);
  const requestGoEnd = useCameraPathStore((s) => s.requestGoEnd);
  const generatePath = useCameraPathStore((s) => s.generatePath);

  const busy = isRecording || isPlaying;

  return (
    <div className="panel">
      <h2>카메라 무빙</h2>

      <p className="panel__hint">시작/끝 구도를 잡아 저장하고, 속도를 정해 무빙을 생성하세요</p>
      <div className="panel__row">
        <button type="button" onClick={requestSaveHome} disabled={busy}>
          시작 위치 저장
        </button>
        <button type="button" onClick={requestGoHome} disabled={busy || !hasHome}>
          시작으로 이동
        </button>
      </div>
      <div className="panel__row">
        <button type="button" onClick={requestSaveEnd} disabled={busy}>
          끝 위치 저장
        </button>
        <button type="button" onClick={requestGoEnd} disabled={busy || !hasEnd}>
          끝으로 이동
        </button>
      </div>

      <label className="panel__field">
        무빙 속도(시간): {autoMoveDuration.toFixed(1)}초
        <input
          type="range"
          min={AUTO_MOVE_DURATION_RANGE.min}
          max={AUTO_MOVE_DURATION_RANGE.max}
          step={0.5}
          value={autoMoveDuration}
          onChange={(e) => setAutoMoveDuration(Number(e.target.value))}
        />
      </label>

      <div className="panel__row">
        <button type="button" onClick={generatePath} disabled={busy || !hasHome || !hasEnd}>
          시작→끝 무빙 생성
        </button>
      </div>

      <p className="panel__hint">
        또는 직접 날아다니며 녹화: 마우스 시점 회전 · WASD 이동 · Q/E 아래/위
      </p>
      <div className="panel__row">
        {!isRecording ? (
          <button type="button" onClick={startRecording} disabled={isPlaying}>
            녹화 시작
          </button>
        ) : (
          <button type="button" onClick={stopRecording}>
            녹화 종료
          </button>
        )}
        <button
          type="button"
          onClick={() => (isPlaying ? stop() : play())}
          disabled={isRecording || keyframeCount < 2}
        >
          {isPlaying ? "재생 중지" : "경로 재생"}
        </button>
        <button type="button" onClick={clearPath} disabled={keyframeCount === 0}>
          경로 지우기
        </button>
      </div>

      <p className="panel__hint">키프레임: {keyframeCount}개</p>
    </div>
  );
}
