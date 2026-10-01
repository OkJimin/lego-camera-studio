import { useEffect, useState } from "react";
import * as THREE from "three";
import { TransformControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { BLOCK_COLORS, ROTATION_SNAP_DEG, useBlockStore, worldHeight } from "./useBlockStore";
import type { PlacedBlock } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import { PersonFigure } from "./PersonFigure";
import { useClickHandlers } from "./useClickHandlers";
import { playbackClock } from "./playbackClock";

// Shared unit geometries: every block of a given kind starts at [1,1,1] and is
// resized purely via the mesh's `scale`, so one geometry instance per kind is
// enough for every placed object (and both the main scene and the monitor canvas).
const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const SPHERE_GEOMETRY = new THREE.SphereGeometry(0.5, 24, 24);
const CONE_GEOMETRY = new THREE.ConeGeometry(0.5, 1, 24);

export function Block({
  block,
  interactive = true,
}: {
  block: PlacedBlock;
  interactive?: boolean;
}) {
  const addBlock = useBlockStore((s) => s.addBlock);
  const selectedKind = useBlockStore((s) => s.selectedKind);
  const focusedBlockId = useBlockStore((s) => s.focusedBlockId);
  const focusBlock = useBlockStore((s) => s.focusBlock);
  const gizmoMode = useBlockStore((s) => s.gizmoMode);
  const beginEdit = useBlockStore((s) => s.beginEdit);
  const setGizmoDragging = useBlockStore((s) => s.setGizmoDragging);
  const updateBlockPosition = useBlockStore((s) => s.updateBlockPosition);
  const updateBlockRotation = useBlockStore((s) => s.updateBlockRotation);
  const updateBlockSize = useBlockStore((s) => s.updateBlockSize);
  const isRecording = useCameraPathStore((s) => s.isRecording);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);

  const [targetObject, setTargetObject] = useState<THREE.Object3D | null>(null);
  const isFocused = focusedBlockId === block.id;
  const isBusy = isRecording || isPlaying;

  const { onPointerDown, onPointerUp } = useClickHandlers({
    onLeftClick: (e) => {
      const existingTop = block.position[1] + worldHeight(block.kind, block.size) / 2;
      const newHalfHeight = worldHeight(selectedKind, [1, 1, 1]) / 2;
      addBlock([e.point.x, existingTop + newHalfHeight, e.point.z]);
    },
    onRightClick: () => focusBlock(block.id),
  });

  const handleGizmoChange = () => {
    if (!targetObject) return;
    updateBlockPosition(block.id, [
      targetObject.position.x,
      targetObject.position.y,
      targetObject.position.z,
    ]);
    updateBlockSize(block.id, [
      Math.max(0.1, targetObject.scale.x),
      Math.max(0.1, targetObject.scale.y),
      Math.max(0.1, targetObject.scale.z),
    ]);
    updateBlockRotation(block.id, [
      targetObject.rotation.x,
      targetObject.rotation.y,
      targetObject.rotation.z,
    ]);
  };

  // While the camera path is playing, animate between the saved start/end
  // pose on the same shared timeline as the camera, instead of the static position.
  useFrame(() => {
    if (!isPlaying || !block.motion || !targetObject) return;
    const t =
      playbackClock.duration > 0
        ? Math.min(Math.max(playbackClock.elapsed / playbackClock.duration, 0), 1)
        : 0;
    const [sx, sy, sz] = block.motion.startPosition;
    const [ex, ey, ez] = block.motion.endPosition;
    targetObject.position.set(sx + (ex - sx) * t, sy + (ey - sy) * t, sz + (ez - sz) * t);
  });

  // Once playback stops, snap back to the resting (React-driven) position.
  useEffect(() => {
    if (!isPlaying && targetObject && block.motion) {
      targetObject.position.set(...block.position);
    }
  }, [isPlaying]);

  const sharedProps = {
    position: block.position,
    rotation: block.rotation,
    scale: block.size,
    onPointerDown: interactive && !isBusy ? onPointerDown : undefined,
    onPointerUp: interactive && !isBusy ? onPointerUp : undefined,
  };

  const shape =
    block.kind === "person" ? (
      <group ref={setTargetObject} {...sharedProps}>
        <PersonFigure color={block.color} />
      </group>
    ) : (
      <mesh ref={setTargetObject} {...sharedProps} castShadow receiveShadow>
        {block.kind === "sphere" && <primitive object={SPHERE_GEOMETRY} attach="geometry" />}
        {block.kind === "cone" && <primitive object={CONE_GEOMETRY} attach="geometry" />}
        {block.kind === "block" && <primitive object={BOX_GEOMETRY} attach="geometry" />}
        <meshStandardMaterial color={BLOCK_COLORS[block.color]} />
      </mesh>
    );

  return (
    <>
      {shape}
      {interactive && isFocused && !isBusy && targetObject && (
        <TransformControls
          object={targetObject}
          mode={gizmoMode}
          size={gizmoMode === "rotate" ? 1.4 : 1}
          rotationSnap={
            gizmoMode === "rotate" ? THREE.MathUtils.degToRad(ROTATION_SNAP_DEG) : undefined
          }
          onMouseDown={() => {
            beginEdit();
            setGizmoDragging(true);
          }}
          onMouseUp={() => setGizmoDragging(false)}
          onObjectChange={handleGizmoChange}
        />
      )}
    </>
  );
}
