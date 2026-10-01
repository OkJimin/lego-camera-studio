import { BLOCK_COLORS } from "./useBlockStore";
import type { BlockColor } from "./useBlockStore";

const SKIN_COLOR = "#f2c9a0";
const EYE_COLOR = "#222222";

export function PersonFigure({ color }: { color: BlockColor }) {
  return (
    <group>
      {/* body (torso) */}
      <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.16, 0.75, 4, 8]} />
        <meshStandardMaterial color={BLOCK_COLORS[color]} />
      </mesh>

      {/* arms hanging at the sides, mark left/right */}
      <mesh position={[-0.21, -0.12, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.045, 0.35, 4, 8]} />
        <meshStandardMaterial color={BLOCK_COLORS[color]} />
      </mesh>
      <mesh position={[0.21, -0.12, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.045, 0.35, 4, 8]} />
        <meshStandardMaterial color={BLOCK_COLORS[color]} />
      </mesh>

      {/* head */}
      <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color={SKIN_COLOR} />
      </mesh>

      {/* eyes, mark the front (+Z) */}
      <mesh position={[-0.06, 0.6, 0.155]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color={EYE_COLOR} />
      </mesh>
      <mesh position={[0.06, 0.6, 0.155]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color={EYE_COLOR} />
      </mesh>
    </group>
  );
}
