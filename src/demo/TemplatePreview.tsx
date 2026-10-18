import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildPath } from "./cameraTemplates";
import type { CameraTemplate } from "./cameraTemplates";
import { createGuideSampler } from "./guidePath";
import { PersonFigure } from "./PersonFigure";
import { SceneLighting } from "./SceneLighting";
import { FloorGrid, StaticGround } from "./StaticGround";

// Pause on the last frame before looping so the end of the move reads clearly.
const HOLD_SECONDS = 0.6;

// Plain shapes standing in for a street, so moves that change perspective
// (dolly, zoom, orbit) are visible against more than an empty floor.
const BACKDROP: Array<{ position: [number, number, number]; size: [number, number, number]; color: string }> = [
  { position: [-6, 1.5, -6], size: [2, 3, 2], color: "#d9d4c7" },
  { position: [5, 2, -8], size: [2.5, 4, 2.5], color: "#cfc9ba" },
  { position: [-10, 1, -2], size: [2, 2, 2], color: "#e0dbcd" },
  { position: [9, 1.2, -2], size: [2, 2.4, 2], color: "#d4cebf" },
  { position: [0, 2.5, -11], size: [3, 5, 3], color: "#cbc5b6" },
  { position: [-3, 0.6, -3], size: [1.2, 1.2, 1.2], color: "#e6c9bd" },
];

// Rests on the first frame; plays the template's real camera path while hovered.
function TemplateScene({ template, hovering }: { template: CameraTemplate; hovering: boolean }) {
  const { camera, invalidate } = useThree();
  const sampler = useMemo(() => createGuideSampler(buildPath(template)), [template]);
  const elapsedRef = useRef(0);

  // The canvas only draws on demand while idle, so redraw the first frame ourselves.
  useEffect(() => {
    if (hovering) return;
    elapsedRef.current = 0;
    sampler.apply(0, camera as THREE.PerspectiveCamera);
    invalidate();
  }, [hovering, sampler, camera, invalidate]);

  useFrame((_, delta) => {
    if (!hovering) return;
    const cycle = sampler.duration + HOLD_SECONDS;
    elapsedRef.current = (elapsedRef.current + delta) % cycle;
    sampler.apply(Math.min(elapsedRef.current, sampler.duration), camera as THREE.PerspectiveCamera);
  });

  return (
    <>
      <SceneLighting />
      <FloorGrid />
      <StaticGround />
      {BACKDROP.map((item, index) => (
        <mesh key={index} position={item.position} scale={item.size}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={item.color} />
        </mesh>
      ))}
      <group position={[0, 0.85, 0]}>
        <PersonFigure color="red" />
      </group>
    </>
  );
}

export function TemplatePreview({ template, hovering }: { template: CameraTemplate; hovering: boolean }) {
  return (
    <Canvas
      frameloop={hovering ? "always" : "demand"}
      dpr={[1, 1.5]}
      camera={{ fov: 50, position: [0, 2, 6] }}
    >
      <TemplateScene template={template} hovering={hovering} />
    </Canvas>
  );
}
