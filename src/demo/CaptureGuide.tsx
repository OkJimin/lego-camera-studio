import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Block } from "./Block";
import { createGuideSampler } from "./guidePath";
import type { CameraPathSync } from "./guidePath";
import type { PlacedBlock } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import { playbackClock } from "./playbackClock";

// Drives the guide camera and the objects' motion from one shared clock so the
// blocks move on the same timeline as the camera path, as they do on desktop.
export function CaptureGuide({
  path,
  blocks,
  running,
  onFinished,
}: {
  path: CameraPathSync | null;
  blocks: PlacedBlock[];
  running: boolean;
  onFinished: () => void;
}) {
  const { camera } = useThree();
  const sampler = useMemo(
    () => (path && path.keys.length >= 2 ? createGuideSampler(path) : null),
    [path],
  );
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    elapsedRef.current = 0;
    finishedRef.current = false;
    playbackClock.elapsed = 0;
    if (sampler) playbackClock.duration = sampler.duration;
    useCameraPathStore.setState({ isPlaying: running });
  }, [running, sampler]);

  useEffect(() => () => useCameraPathStore.setState({ isPlaying: false }), []);

  useFrame((_, delta) => {
    if (!sampler) return;
    if (running && !finishedRef.current) {
      elapsedRef.current = Math.min(elapsedRef.current + delta, sampler.duration);
      playbackClock.elapsed = elapsedRef.current;
      if (elapsedRef.current >= sampler.duration) {
        finishedRef.current = true;
        onFinishedRef.current();
      }
    }
    sampler.apply(elapsedRef.current, camera as THREE.PerspectiveCamera);
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 12, 8]} intensity={0.9} />
      {blocks.map((block) => (
        <Block key={block.id} block={block} interactive={false} />
      ))}
    </>
  );
}
