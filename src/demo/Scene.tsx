import { Canvas } from "@react-three/fiber";
import { Block } from "./Block";
import { CameraPathPreview } from "./CameraPathPreview";
import { CameraRig } from "./CameraRig";
import { Ground } from "./Ground";
import { SceneLighting } from "./SceneLighting";
import { useBlockStore } from "./useBlockStore";

export function Scene() {
  const blocks = useBlockStore((s) => s.blocks);

  return (
    <Canvas shadows camera={{ position: [8, 8, 8], fov: 50 }}>
      <SceneLighting castShadow />
      <gridHelper args={[24, 24, "#b9b4a4", "#ddd9cc"]} />
      <Ground />
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
      <CameraPathPreview />
      <CameraRig />
    </Canvas>
  );
}
