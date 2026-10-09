import {
  DEFAULT_OBJECT_MOTION_SECONDS,
  KIND_LABELS,
  OBJECT_MOTION_SECONDS_RANGE,
  useBlockStore,
} from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import { useCameraSettingsStore } from "./useCameraSettingsStore";

export function SelectionHint() {
  const focusedBlockId = useBlockStore((s) => s.focusedBlockId);
  const block = useBlockStore((s) => s.blocks.find((b) => b.id === s.focusedBlockId));
  const removeBlock = useBlockStore((s) => s.removeBlock);
  const focusBlock = useBlockStore((s) => s.focusBlock);
  const setMotionStart = useBlockStore((s) => s.setMotionStart);
  const setMotionEnd = useBlockStore((s) => s.setMotionEnd);
  const setMotionDuration = useBlockStore((s) => s.setMotionDuration);
  const setHideInExport = useBlockStore((s) => s.setHideInExport);
  const focusBlockId = useCameraSettingsStore((s) => s.focusBlockId);
  const setFocusBlockId = useCameraSettingsStore((s) => s.setFocusBlockId);
  const setDofEnabled = useCameraSettingsStore((s) => s.setDofEnabled);
  const clearMotion = useBlockStore((s) => s.clearMotion);
  const isRecording = useCameraPathStore((s) => s.isRecording);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);

  if (!focusedBlockId || !block) return null;

  const busy = isRecording || isPlaying;
  const hasMotion = Boolean(block.motion);
  const isFocusTarget = focusBlockId === block.id;

  return (
    <div className="panel">
      <h2>{KIND_LABELS[block.kind]} 선택됨</h2>
      <p className="panel__hint">1: 이동 · 2: 크기 · 3: 회전(10° 단위)</p>
      <p className="panel__hint">기즈모 화살표/박스를 드래그해서 조절하세요</p>

      <p className="panel__hint">
        이 오브젝트의 움직임 (카메라 재생과 같은 타임라인)
      </p>
      <div className="panel__row">
        <button type="button" onClick={() => setMotionStart(block.id)} disabled={busy}>
          시작 위치 지정
        </button>
        <button type="button" onClick={() => setMotionEnd(block.id)} disabled={busy}>
          끝 위치 지정
        </button>
      </div>
      {hasMotion && (
        <>
          <label className="panel__field">
            {block.motion?.durationSeconds !== undefined
              ? `이동 시간: ${block.motion.durationSeconds.toFixed(1)}초`
              : "이동 시간: 카메라 전체 시간"}
            <input
              type="range"
              min={OBJECT_MOTION_SECONDS_RANGE.min}
              max={OBJECT_MOTION_SECONDS_RANGE.max}
              step={0.5}
              value={block.motion?.durationSeconds ?? DEFAULT_OBJECT_MOTION_SECONDS}
              disabled={busy}
              onChange={(e) => setMotionDuration(block.id, Number(e.target.value))}
            />
          </label>
          <div className="panel__row">
            <button type="button" onClick={() => clearMotion(block.id)} disabled={busy}>
              움직임 지우기
            </button>
          </div>
        </>
      )}
      <p className="panel__hint">
        {hasMotion
          ? "재생 시작과 동시에 한 번 이동하고, 끝 위치에서 멈춰요"
          : "아직 무빙이 설정되지 않았어요"}
      </p>

      <div className="panel__row">
        <button
          type="button"
          onClick={() => {
            if (isFocusTarget) {
              setFocusBlockId(null);
            } else {
              setFocusBlockId(block.id);
              setDofEnabled(true);
            }
          }}
        >
          {isFocusTarget ? "초점 해제" : "이 오브젝트에 초점"}
        </button>
      </div>

      <label className="panel__check">
        <input
          type="checkbox"
          checked={Boolean(block.hideInExport)}
          onChange={(e) => setHideInExport(block.id, e.target.checked)}
        />
        가이드 영상에서 제외 (에디터에서는 반투명으로 보여요)
      </label>

      <div className="panel__row">
        <button type="button" onClick={() => removeBlock(block.id)}>
          삭제 (Delete)
        </button>
        <button type="button" onClick={() => focusBlock(null)}>
          선택 해제
        </button>
      </div>
    </div>
  );
}
