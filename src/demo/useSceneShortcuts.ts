import { useEffect } from "react";
import { useBlockStore } from "./useBlockStore";

// True while the user is typing into a form field, where keys mean text, not shortcuts.
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function useSceneShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Without this, Backspace in a name field deletes the selected object and
      // typing 1/2/3 switches the gizmo.
      if (isTypingTarget(e.target)) return;

      const isUndoCombo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
      if (isUndoCombo) {
        e.preventDefault();
        useBlockStore.getState().undo();
        return;
      }

      const { focusedBlockId } = useBlockStore.getState();

      if (e.key === "1") {
        useBlockStore.getState().setGizmoMode("translate");
        return;
      }

      if (e.key === "2") {
        useBlockStore.getState().setGizmoMode("scale");
        return;
      }

      if (e.key === "3") {
        useBlockStore.getState().setGizmoMode("rotate");
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && focusedBlockId) {
        e.preventDefault();
        useBlockStore.getState().removeBlock(focusedBlockId);
      }
    };

    // Capture phase: fire before the canvas or any drei control has a chance
    // to swallow/stop the event during the bubble phase.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
