import { useRef } from "react";
import { joystickState } from "./joystickState";

const MAX_RADIUS = 42;

export function VirtualJoystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  const updateFromPoint = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    joystickState.x = dx / MAX_RADIUS;
    joystickState.y = dy / MAX_RADIUS;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const reset = () => {
    activePointerId.current = null;
    joystickState.x = 0;
    joystickState.y = 0;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
  };

  return (
    <div
      ref={baseRef}
      className="joystick-base"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointerId.current = e.pointerId;
        updateFromPoint(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activePointerId.current !== e.pointerId) return;
        updateFromPoint(e.clientX, e.clientY);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div ref={knobRef} className="joystick-knob" />
    </div>
  );
}
