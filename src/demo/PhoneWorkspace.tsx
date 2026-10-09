import { BlockPalette } from "./BlockPalette";
import { CameraSettingsPanel } from "./CameraSettingsPanel";
import { FrameGuide } from "./FrameGuide";
import { GuideExporter } from "./GuideExporter";
import { GuideExportPanel } from "./GuideExportPanel";
import { LightingPanel } from "./LightingPanel";
import { PhonePairingPanel } from "./PhonePairingPanel";
import { SaveAccountPanel } from "./SaveAccountPanel";
import { Scene } from "./Scene";
import { SelectionHint } from "./SelectionHint";
import { SettingsDrawer } from "./SettingsDrawer";
import { SpeedSettingsPanel } from "./SpeedSettingsPanel";
import { useSceneShortcuts } from "./useSceneShortcuts";
import { useWorkflowStore } from "./useWorkflowStore";

export function PhoneWorkspace() {
  useSceneShortcuts();
  const setMode = useWorkflowStore((s) => s.setMode);

  return (
    <div className="demo-shell" onContextMenu={(e) => e.preventDefault()}>
      <Scene />
      <FrameGuide />
      <div className="side-stack side-stack--left">
        <button type="button" className="back-to-start" onClick={() => setMode("start")}>
          ◀ 처음으로
        </button>
        <BlockPalette />
        <PhonePairingPanel />
      </div>
      <div className="right-rail">
        <SelectionHint />
        <SettingsDrawer>
          <SaveAccountPanel />
          <GuideExportPanel showPlayback />
          <LightingPanel />
          <CameraSettingsPanel />
          <SpeedSettingsPanel showTiltPan={false} />
        </SettingsDrawer>
      </div>
      <GuideExporter />
    </div>
  );
}
