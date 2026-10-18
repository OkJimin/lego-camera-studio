// Non-interactive ground plane for canvases that only display the scene
// (phone viewfinder, video export). The editor's own Ground adds click-to-place.
export function StaticGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial color="#e8e4da" />
    </mesh>
  );
}

// The grid drawn over the ground, shared by the editor and the canvases that mirror it.
export function FloorGrid() {
  return <gridHelper args={[24, 24, "#b9b4a4", "#ddd9cc"]} />;
}
