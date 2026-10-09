import { Canvas } from "@react-three/fiber";
import { Block } from "./Block";
import { CameraPathPreview } from "./CameraPathPreview";
import { CameraRig } from "./CameraRig";
import { Ground } from "./Ground";
import { SceneLighting } from "./SceneLighting";
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
      frameloop={exporting ? "never" : "always"}
      camera={{ position: [8, 8, 8], fov: 50 }}
    >
      <SceneLighting castShadow />
      <gridHelper args={[24, 24, "#b9b4a4", "#ddd9cc"]} />
      <Ground />
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
      <CameraPathPreview />
      <CameraRig />
      {showDof && <DepthOfFieldEffect getFocusPoint={editorFocusPoint} />}
    </Canvas>
  );
}
