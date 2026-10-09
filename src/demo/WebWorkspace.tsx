import { BlockPalette } from "./BlockPalette";
import { CameraSettingsPanel } from "./CameraSettingsPanel";
import { FrameGuide } from "./FrameGuide";
import { GuideExporter } from "./GuideExporter";
import { GuideExportPanel } from "./GuideExportPanel";
import { LightingPanel } from "./LightingPanel";
import { PathControls } from "./PathControls";
import { Scene } from "./Scene";
import { SaveAccountPanel } from "./SaveAccountPanel";
import { SelectionHint } from "./SelectionHint";
import { SettingsDrawer } from "./SettingsDrawer";
import { ShotButtons } from "./ShotButtons";
import { SpeedSettingsPanel } from "./SpeedSettingsPanel";
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
      <FrameGuide />
      <div className="right-rail">
        <SelectionHint />
        <SettingsDrawer>
          <SaveAccountPanel />
          <GuideExportPanel />
          <LightingPanel />
          <CameraSettingsPanel />
          <SpeedSettingsPanel />
          <ShotButtons />
        </SettingsDrawer>
      </div>
      <GuideExporter />
    </div>
  );
}
