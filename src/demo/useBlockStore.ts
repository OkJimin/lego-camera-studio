import { create } from "zustand";

export type BlockColor = "red" | "yellow" | "blue";
export type ItemKind = "block" | "sphere" | "cone" | "person";
export type GizmoMode = "translate" | "scale" | "rotate";
export const ROTATION_SNAP_DEG = 10;

export interface ObjectMotion {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
}

export interface PlacedBlock {
  id: string;
  kind: ItemKind;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  color: BlockColor;
  motion?: ObjectMotion;
}

export const BLOCK_COLORS: Record<BlockColor, string> = {
  red: "#d92b2b",
  yellow: "#f2c227",
  blue: "#2a5cd9",
};

export const KIND_LABELS: Record<ItemKind, string> = {
  block: "사각 블록",
  sphere: "구",
  cone: "원뿔",
  person: "사람",
};

// World-space height of each shape's base geometry at scale 1.
const BASE_ITEM_HEIGHT: Record<ItemKind, number> = {
  block: 1,
  sphere: 1,
  cone: 1,
  person: 1.7,
};

export function worldHeight(kind: ItemKind, size: [number, number, number]) {
  return BASE_ITEM_HEIGHT[kind] * size[1];
}

const HISTORY_LIMIT = 50;

interface BlockState {
  blocks: PlacedBlock[];
  history: PlacedBlock[][];
  selectedKind: ItemKind;
  selectedColor: BlockColor;
  focusedBlockId: string | null;
  gizmoMode: GizmoMode;
  gizmoDragging: boolean;
  setSelectedKind: (kind: ItemKind) => void;
  setSelectedColor: (color: BlockColor) => void;
  addBlock: (position: [number, number, number]) => void;
  clearBlocks: () => void;
  focusBlock: (id: string | null) => void;
  beginEdit: () => void;
  updateBlockPosition: (id: string, position: [number, number, number]) => void;
  updateBlockRotation: (id: string, rotation: [number, number, number]) => void;
  updateBlockSize: (id: string, size: [number, number, number]) => void;
  removeBlock: (id: string) => void;
  setGizmoMode: (mode: GizmoMode) => void;
  setGizmoDragging: (dragging: boolean) => void;
  undo: () => void;
  setMotionStart: (id: string) => void;
  setMotionEnd: (id: string) => void;
  clearMotion: (id: string) => void;
}

function pushHistory(history: PlacedBlock[][], blocks: PlacedBlock[]) {
  return [...history, blocks].slice(-HISTORY_LIMIT);
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],
  history: [],
  selectedKind: "block",
  selectedColor: "red",
  focusedBlockId: null,
  gizmoMode: "translate",
  gizmoDragging: false,
  setSelectedKind: (kind) => set({ selectedKind: kind }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  addBlock: (position) =>
    set((state) => ({
      history: pushHistory(state.history, state.blocks),
      blocks: [
        ...state.blocks,
        {
          id: crypto.randomUUID(),
          kind: state.selectedKind,
          position,
          rotation: [0, 0, 0],
          size: [1, 1, 1],
          color: state.selectedColor,
        },
      ],
    })),
  clearBlocks: () =>
    set((state) => ({
      history: pushHistory(state.history, state.blocks),
      blocks: [],
      focusedBlockId: null,
    })),
  focusBlock: (id) => set({ focusedBlockId: id }),
  // Call once when a gizmo drag starts, so the whole drag undoes in one step
  // instead of every intermediate onObjectChange sample becoming its own undo entry.
  beginEdit: () => set((state) => ({ history: pushHistory(state.history, state.blocks) })),
  updateBlockPosition: (id, position) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, position } : b)),
    })),
  updateBlockRotation: (id, rotation) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, rotation } : b)),
    })),
  updateBlockSize: (id, size) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, size } : b)),
    })),
  removeBlock: (id) =>
    set((state) => ({
      history: pushHistory(state.history, state.blocks),
      blocks: state.blocks.filter((b) => b.id !== id),
      focusedBlockId: state.focusedBlockId === id ? null : state.focusedBlockId,
    })),
  setGizmoMode: (mode) => set({ gizmoMode: mode }),
  setGizmoDragging: (dragging) => set({ gizmoDragging: dragging }),
  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({ blocks: previous, history: history.slice(0, -1) });
  },
  setMotionStart: (id) =>
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.id === id
          ? { ...b, motion: { startPosition: b.position, endPosition: b.motion?.endPosition ?? b.position } }
          : b,
      ),
    })),
  setMotionEnd: (id) =>
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.id === id
          ? { ...b, motion: { startPosition: b.motion?.startPosition ?? b.position, endPosition: b.position } }
          : b,
      ),
    })),
  clearMotion: (id) =>
    set((state) => ({
      blocks: state.blocks.map((b) => {
        if (b.id !== id || !b.motion) return b;
        const copy = { ...b };
        delete copy.motion;
        return copy;
      }),
    })),
}));
