import { KIND_LABELS, useBlockStore } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";

export function SelectionHint() {
  const focusedBlockId = useBlockStore((s) => s.focusedBlockId);
  const block = useBlockStore((s) => s.blocks.find((b) => b.id === s.focusedBlockId));
  const removeBlock = useBlockStore((s) => s.removeBlock);
  const focusBlock = useBlockStore((s) => s.focusBlock);
  const setMotionStart = useBlockStore((s) => s.setMotionStart);
  const setMotionEnd = useBlockStore((s) => s.setMotionEnd);
  const clearMotion = useBlockStore((s) => s.clearMotion);
  const isRecording = useCameraPathStore((s) => s.isRecording);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);

  if (!focusedBlockId || !block) return null;

  const busy = isRecording || isPlaying;
  const hasMotion = Boolean(block.motion);

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
        <div className="panel__row">
          <button type="button" onClick={() => clearMotion(block.id)} disabled={busy}>
            움직임 지우기
          </button>
        </div>
      )}
      <p className="panel__hint">
        {hasMotion ? "무빙 설정됨 — 경로 재생 시 같이 움직입니다" : "아직 무빙이 설정되지 않았어요"}
      </p>

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
