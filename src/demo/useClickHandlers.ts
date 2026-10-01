import { useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";

const CLICK_MOVE_THRESHOLD_PX = 6;

interface ClickHandlers {
  onLeftClick?: (e: ThreeEvent<PointerEvent>) => void;
  onRightClick?: (e: ThreeEvent<PointerEvent>) => void;
}

export function useClickHandlers({ onLeftClick, onRightClick }: ClickHandlers) {
  const downRef = useRef<{ x: number; y: number; button: number } | null>(null);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    downRef.current = { x: e.clientX, y: e.clientY, button: e.button };
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const start = downRef.current;
    downRef.current = null;
    if (!start || start.button !== e.button) return;

    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved > CLICK_MOVE_THRESHOLD_PX) return;

    if (e.button === 0) onLeftClick?.(e);
    else if (e.button === 2) onRightClick?.(e);
  };

  return { onPointerDown, onPointerUp };
}
