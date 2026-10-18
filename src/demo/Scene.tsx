import { Canvas } from "@react-three/fiber";
import { Block } from "./Block";
import { CameraPathPreview } from "./CameraPathPreview";
import { CameraRig } from "./CameraRig";
import { Ground } from "./Ground";
import { SceneLighting } from "./SceneLighting";
import { FloorGrid } from "./StaticGround";
import { DepthOfFieldEffect, editorFocusPoint } from "./DepthOfFieldEffect";
import { useBlockStore } from "./useBlockStore";
import { useCameraSettingsStore } from "./useCameraSettingsStore";
import { useGuideExportStore } from "./useGuideExportStore";

export function Scene() {
  const blocks = useBlockStore((s) => s.blocks);
  // Stop rendering the editor while a video export runs so the GPU is spent on it.
  const exporting = useGuideExportStore((s) => s.open);
  const showDof = useCameraSettingsStore((s) => s.dofEnabled && s.dofInEditor);

  return (
    <Canvas
      shadows
      // Capped below the usual 2: on a high-DPI screen that's 4x the pixels to
      // draw every frame, which shows up as choppy camera playback.
      dpr={[1, 1.5]}
      frameloop={exporting ? "never" : "always"}
      camera={{ position: [8, 8, 8], fov: 50 }}
    >
      <SceneLighting castShadow />
      <FloorGrid />
      <Ground />
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
      <CameraPathPreview />
      <CameraRig />
      {showDof && <DepthOfFieldEffect getFocusPoint={editorFocusPoint} quality="editor" />}
    </Canvas>
  );
}
