import { useEffect } from "react";
import { useBlockStore } from "./useBlockStore";

export function useSceneShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
