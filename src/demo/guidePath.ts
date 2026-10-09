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

export interface RawCameraSample {
  t: number;
  p: [number, number, number];
  q: [number, number, number, number];
  fov: number;
}

// The playback sampler below treats keys as evenly spaced in time, but frame
// timing on a phone wobbles. Resample the raw per-frame samples onto a fixed
// step so the replay keeps the speed it was recorded at.
export function resampleToUniform(raw: RawCameraSample[], fps = 30): CameraPathSync | null {
  if (raw.length < 2) return null;
  const duration = raw[raw.length - 1].t - raw[0].t;
  if (duration <= 0) return null;

  const step = 1 / fps;
  const count = Math.max(2, Math.round(duration / step) + 1);
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const keys: CameraPathKey[] = [];
  let i = 0;

  for (let n = 0; n < count; n++) {
    const t = Math.min(n * step, duration) + raw[0].t;
    while (i < raw.length - 2 && raw[i + 1].t < t) i++;
    const a = raw[i];
    const b = raw[i + 1];
    const span = b.t - a.t;
    const f = span > 0 ? THREE.MathUtils.clamp((t - a.t) / span, 0, 1) : 0;
    qa.set(...a.q);
    qb.set(...b.q);
    qa.slerp(qb, f);
    keys.push({
      t: t - raw[0].t,
      p: [
        a.p[0] + (b.p[0] - a.p[0]) * f,
        a.p[1] + (b.p[1] - a.p[1]) * f,
        a.p[2] + (b.p[2] - a.p[2]) * f,
      ],
      q: [qa.x, qa.y, qa.z, qa.w],
      fov: a.fov + (b.fov - a.fov) * f,
    });
  }

  return { duration: keys[keys.length - 1].t, keys };
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
