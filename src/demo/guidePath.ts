import * as THREE from "three";
import type { CameraKeyframe } from "./useCameraPathStore";

export function deserializeKeyframes(path: CameraPathSync): CameraKeyframe[] {
  return path.keys.map((k) => ({
    position: new THREE.Vector3(...k.p),
    quaternion: new THREE.Quaternion(...k.q),
    fov: k.fov,
    time: k.t,
  }));
}

export interface CameraPathKey {
  t: number;
  p: [number, number, number];
  q: [number, number, number, number];
  fov: number;
}

export interface CameraPathSync {
  duration: number;
  keys: CameraPathKey[];
}

export function serializeKeyframes(keyframes: CameraKeyframe[]): CameraPathSync {
  return {
    duration: keyframes[keyframes.length - 1].time,
    keys: keyframes.map((k) => ({
      t: k.time,
      p: [k.position.x, k.position.y, k.position.z],
      q: [k.quaternion.x, k.quaternion.y, k.quaternion.z, k.quaternion.w],
      fov: k.fov,
    })),
  };
}

// Same interpolation as the desktop playback in CameraRig: spline through the
// keyframe positions, index-based slerp for rotation and lerp for fov.
export function createGuideSampler(path: CameraPathSync) {
  const { keys } = path;
  const curve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.p)));
  const duration = Math.max(path.duration, 0.001);
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();

  return {
    duration,
    apply(elapsed: number, camera: THREE.PerspectiveCamera) {
      const u = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
      curve.getPoint(u, camera.position);

      const floatIndex = u * (keys.length - 1);
      const i0 = Math.min(Math.floor(floatIndex), keys.length - 2);
      const frac = floatIndex - i0;
      qa.set(...keys[i0].q);
      qb.set(...keys[i0 + 1].q);
      camera.quaternion.slerpQuaternions(qa, qb, frac);

      camera.fov = THREE.MathUtils.lerp(keys[i0].fov, keys[i0 + 1].fov, frac);
      camera.updateProjectionMatrix();
    },
  };
}
