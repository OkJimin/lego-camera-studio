import { BlockPalette } from "./BlockPalette";
import { PhonePairingPanel } from "./PhonePairingPanel";
import { SaveAccountPanel } from "./SaveAccountPanel";
import { Scene } from "./Scene";
import { SelectionHint } from "./SelectionHint";
import { useSceneShortcuts } from "./useSceneShortcuts";
import { useWorkflowStore } from "./useWorkflowStore";

export function PhoneWorkspace() {
  useSceneShortcuts();
  const setMode = useWorkflowStore((s) => s.setMode);

  return (
    <div className="demo-shell" onContextMenu={(e) => e.preventDefault()}>
      <Scene />
      <div className="side-stack side-stack--left">
        <button type="button" className="back-to-start" onClick={() => setMode("start")}>
          ◀ 처음으로
        </button>
        <BlockPalette />
        <PhonePairingPanel />
      </div>
      <div className="right-rail">
        <SelectionHint />
        <SaveAccountPanel />
      </div>
    </div>
  );
}
