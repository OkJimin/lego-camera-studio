import { useBlockStore, worldHeight } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import { useClickHandlers } from "./useClickHandlers";

export function Ground() {
  const addBlock = useBlockStore((s) => s.addBlock);
  const selectedKind = useBlockStore((s) => s.selectedKind);
  const focusBlock = useBlockStore((s) => s.focusBlock);
  const isRecording = useCameraPathStore((s) => s.isRecording);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);
  const isBusy = isRecording || isPlaying;

  const height = worldHeight(selectedKind, [1, 1, 1]);

  const { onPointerDown, onPointerUp } = useClickHandlers({
    onLeftClick: (e) => addBlock([e.point.x, height / 2, e.point.z]),
    onRightClick: () => focusBlock(null),
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerDown={isBusy ? undefined : onPointerDown}
      onPointerUp={isBusy ? undefined : onPointerUp}
      receiveShadow
    >
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial color="#e8e4da" />
    </mesh>
  );
}
