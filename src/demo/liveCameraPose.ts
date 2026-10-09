import * as THREE from "three";

export const liveCameraPose = {
  position: new THREE.Vector3(8, 8, 8),
  quaternion: new THREE.Quaternion(),
  fov: 50,
};

const _forward = new THREE.Vector3();

// Heading of a camera orientation on the ground plane, counter-clockwise about +Y
// (0 = looking down -Z). Pitch and roll don't change it.
export function headingFromQuaternion(quaternion: THREE.Quaternion): number {
  _forward.set(0, 0, -1).applyQuaternion(quaternion);
  return Math.atan2(-_forward.x, -_forward.z);
}
