import { useEffect, useRef } from "react";

const TRACKED_KEYS = new Set(["w", "a", "s", "d", "q", "e"]);

export function useHeldMoveKeys() {
  const heldRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (TRACKED_KEYS.has(key)) heldRef.current.add(key);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      heldRef.current.delete(e.key.toLowerCase());
    };
    const clearAll = () => heldRef.current.clear();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearAll);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearAll);
    };
  }, []);

  return heldRef;
}
