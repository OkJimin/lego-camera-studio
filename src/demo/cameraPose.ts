import * as THREE from "three";
import type { CameraPose } from "./useCameraPathStore";

export interface SerializedPose {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number;
}

export function serializePose(pose: CameraPose | null): SerializedPose | null {
  if (!pose) return null;
  return {
    position: [pose.position.x, pose.position.y, pose.position.z],
    quaternion: [pose.quaternion.x, pose.quaternion.y, pose.quaternion.z, pose.quaternion.w],
    fov: pose.fov,
  };
}

export function deserializePose(raw: SerializedPose | null | undefined): CameraPose | null {
  if (!raw) return null;
  return {
    position: new THREE.Vector3(...raw.position),
    quaternion: new THREE.Quaternion(...raw.quaternion),
    fov: raw.fov,
  };
}
