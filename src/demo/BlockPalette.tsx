import { BLOCK_COLORS, KIND_LABELS, type BlockColor, type ItemKind, useBlockStore } from "./useBlockStore";

export function BlockPalette() {
  const selectedKind = useBlockStore((s) => s.selectedKind);
  const setSelectedKind = useBlockStore((s) => s.setSelectedKind);
  const selectedColor = useBlockStore((s) => s.selectedColor);
  const setSelectedColor = useBlockStore((s) => s.setSelectedColor);
  const undo = useBlockStore((s) => s.undo);
  const canUndo = useBlockStore((s) => s.history.length > 0);
  const clearBlocks = useBlockStore((s) => s.clearBlocks);
  const blockCount = useBlockStore((s) => s.blocks.length);

  return (
    <div className="panel">
      <h2>배치 팔레트</h2>
      <p className="panel__hint">좌클릭: 배치 · 드래그: 카메라 회전 · 우클릭: 선택</p>
      <p className="panel__hint">선택 후 1: 이동 · 2: 크기 · 3: 회전(10°) · Delete: 삭제</p>

      <div className="panel__row">
        {(Object.keys(KIND_LABELS) as ItemKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            className={kind === selectedKind ? "chip chip--active" : "chip"}
            onClick={() => setSelectedKind(kind)}
          >
            {KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="panel__row">
        {(Object.keys(BLOCK_COLORS) as BlockColor[]).map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            className={color === selectedColor ? "swatch swatch--active" : "swatch"}
            style={{ backgroundColor: BLOCK_COLORS[color] }}
            onClick={() => setSelectedColor(color)}
          />
        ))}
      </div>

      <div className="panel__row">
        <button type="button" onClick={undo} disabled={!canUndo}>
          실행 취소 (Ctrl+Z)
        </button>
        <button type="button" onClick={clearBlocks} disabled={blockCount === 0}>
          전체 삭제
        </button>
      </div>

      <p className="panel__hint">배치된 오브젝트: {blockCount}개</p>
    </div>
  );
}
