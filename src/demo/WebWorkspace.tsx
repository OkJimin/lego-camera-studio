import { BlockPalette } from "./BlockPalette";
import { CameraMonitor } from "./CameraMonitor";
import { CameraSettingsPanel } from "./CameraSettingsPanel";
import { LightingPanel } from "./LightingPanel";
import { PathControls } from "./PathControls";
import { Scene } from "./Scene";
import { SaveAccountPanel } from "./SaveAccountPanel";
import { SelectionHint } from "./SelectionHint";
import { SettingsDrawer } from "./SettingsDrawer";
import { ShotButtons } from "./ShotButtons";
import { useSceneShortcuts } from "./useSceneShortcuts";
import { useWorkflowStore } from "./useWorkflowStore";

export function WebWorkspace() {
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
        <PathControls />
      </div>
      <CameraMonitor />
      <div className="right-rail">
        <SelectionHint />
        <SettingsDrawer>
          <SaveAccountPanel />
          <LightingPanel />
          <CameraSettingsPanel />
          <ShotButtons />
        </SettingsDrawer>
      </div>
    </div>
  );
}
