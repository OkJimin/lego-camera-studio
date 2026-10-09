import { useEffect, useState } from "react";
import * as THREE from "three";
import { TransformControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  BLOCK_COLORS,
  ROTATION_SNAP_DEG,
  motionProgress,
  useBlockStore,
  worldHeight,
} from "./useBlockStore";
import type { PlacedBlock } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import { PersonFigure } from "./PersonFigure";
import { useClickHandlers } from "./useClickHandlers";
import { playbackClock } from "./playbackClock";
import type { GuideClock } from "./playbackClock";

// Shared unit geometries: every block of a given kind starts at [1,1,1] and is
// resized purely via the mesh's `scale`, so one geometry instance per kind is
// enough for every placed object (and both the main scene and the monitor canvas).
const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const SPHERE_GEOMETRY = new THREE.SphereGeometry(0.5, 24, 24);
const CONE_GEOMETRY = new THREE.ConeGeometry(0.5, 1, 24);
const EXCLUDED_OPACITY = 0.35;

export function Block({
  block,
  interactive = true,
  clock,
}: {
  block: PlacedBlock;
  interactive?: boolean;
  // Drive the object's motion from this clock instead of the desktop editor's
  // shared playback state. Only for non-interactive canvases.
  clock?: GuideClock;
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

  // While playing, move once from the saved start to the end pose (taking the
  // object's own duration, then holding at the end) on the same timeline as the camera.
  useFrame(() => {
    if (!block.motion || !targetObject) return;
    const playing = clock ? clock.playing : useCameraPathStore.getState().isPlaying;
    if (!playing) {
      // An injected clock can't trigger the isPlaying effect below, so keep the
      // resting pose applied here (those canvases are never edited).
      if (clock) targetObject.position.set(...block.position);
      return;
    }
    const source = clock ?? playbackClock;
    const t = motionProgress(block.motion, source.elapsed, source.duration);
    const [sx, sy, sz] = block.motion.startPosition;
    const [ex, ey, ez] = block.motion.endPosition;
    targetObject.position.set(sx + (ex - sx) * t, sy + (ey - sy) * t, sz + (ez - sz) * t);
  });

  // Once playback stops, snap back to the resting (React-driven) position.
  useEffect(() => {
    if (!clock && !isPlaying && targetObject && block.motion) {
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

  // Objects left out of the exported video show faded in the editor (not in the
  // camera monitor, which is non-interactive and shows what the shot contains).
  const opacity = interactive && block.hideInExport ? EXCLUDED_OPACITY : 1;

  const shape =
    block.kind === "person" ? (
      <group ref={setTargetObject} {...sharedProps}>
        <PersonFigure color={block.color} opacity={opacity} />
      </group>
    ) : (
      <mesh ref={setTargetObject} {...sharedProps} castShadow receiveShadow>
        {block.kind === "sphere" && <primitive object={SPHERE_GEOMETRY} attach="geometry" />}
        {block.kind === "cone" && <primitive object={CONE_GEOMETRY} attach="geometry" />}
        {block.kind === "block" && <primitive object={BOX_GEOMETRY} attach="geometry" />}
        <meshStandardMaterial
          color={BLOCK_COLORS[block.color]}
          transparent={opacity < 1}
          opacity={opacity}
        />
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
