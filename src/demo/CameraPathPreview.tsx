import { Line } from "@react-three/drei";
import { useCameraPathStore } from "./useCameraPathStore";

export function CameraPathPreview() {
  const keyframes = useCameraPathStore((s) => s.keyframes);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);

  if (isPlaying || keyframes.length < 2) return null;

  const points = keyframes.map((k) => k.position);

  return (
    <>
      <Line points={points} color="#ff5252" lineWidth={2} />
      <mesh position={points[0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#2ecc71" />
      </mesh>
      <mesh position={points[points.length - 1]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#ff5252" />
      </mesh>
    </>
  );
}
