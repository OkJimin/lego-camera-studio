import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Block } from "./Block";
import { Ground } from "./Ground";
import { SceneLighting } from "./SceneLighting";
import { useBlockStore } from "./useBlockStore";
import { liveCameraPose } from "./liveCameraPose";
import { AspectMask } from "./AspectMask";

function MonitorCameraSync() {
  const { camera } = useThree();
  const lastFov = useRef<number | null>(null);

  useFrame(() => {
    camera.position.copy(liveCameraPose.position);
    camera.quaternion.copy(liveCameraPose.quaternion);
    const persp = camera as THREE.PerspectiveCamera;
    if (lastFov.current !== liveCameraPose.fov) {
      persp.fov = liveCameraPose.fov;
      persp.updateProjectionMatrix();
      lastFov.current = liveCameraPose.fov;
    }
  });

  return null;
}

function MonitorScene() {
  const blocks = useBlockStore((s) => s.blocks);

  return (
    <>
      <SceneLighting />
      <Ground />
      {blocks.map((block) => (
        <Block key={block.id} block={block} interactive={false} />
      ))}
      <MonitorCameraSync />
    </>
  );
}

export function CameraMonitor() {
  return (
    <div className="monitor">
      <p className="monitor__label">카메라 뷰포트</p>
      <div className="monitor__frame">
        <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
          <MonitorScene />
        </Canvas>
        <AspectMask />
      </div>
    </div>
  );
}
