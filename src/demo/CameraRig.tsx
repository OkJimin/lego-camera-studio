import { useEffect, useRef } from "react";
import type { ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useBlockStore } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import type { CameraPose } from "./useCameraPathStore";
import { useHeldMoveKeys } from "./useHeldMoveKeys";
import { shotActionState } from "./shotActions";
import { liveCameraPose } from "./liveCameraPose";
import { playbackClock } from "./playbackClock";
import { useSpeedSettingsStore } from "./useSpeedSettingsStore";

const MIN_FOV = 10;
const MAX_FOV = 90;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Scratch objects reused every frame instead of allocating new Vector3s.
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();

type OrbitControlsInstance = ComponentRef<typeof OrbitControls>;

// +1 if `positive` is the one held, -1 if `negative` is held, 0 if neither/both (cancel out).
function axisDelta(positive: boolean, negative: boolean): number {
  if (positive === negative) return 0;
  return positive ? 1 : -1;
}

// Jump the camera straight to an absolute saved pose and keep the orbit target
// (and therefore the next mouse-orbit drag) consistent with it.
function applyCameraPose(
  camera: THREE.Camera,
  orbitControls: OrbitControlsInstance | null,
  pose: CameraPose,
) {
  const persp = camera as THREE.PerspectiveCamera;
  camera.position.copy(pose.position);
  camera.quaternion.copy(pose.quaternion);
  persp.fov = pose.fov;
  persp.updateProjectionMatrix();
  orbitControls?.update();
}

// After rotating the camera in place (tilt/pan), move the orbit target back onto
// the new sightline at the same distance so the next update() doesn't snap the
// camera back to its old orientation.
function resyncOrbitTargetToForward(camera: THREE.Camera, orbitControls: OrbitControlsInstance) {
  const radius = camera.position.distanceTo(orbitControls.target);
  camera.getWorldDirection(_forward);
  orbitControls.target.copy(camera.position).addScaledVector(_forward, radius);
  orbitControls.update();
}

function syncMonitor(camera: THREE.Camera) {
  liveCameraPose.position.copy(camera.position);
  liveCameraPose.quaternion.copy(camera.quaternion);
  liveCameraPose.fov = (camera as THREE.PerspectiveCamera).fov;
}

export function CameraRig() {
  const { camera, clock } = useThree();
  const keyframes = useCameraPathStore((s) => s.keyframes);
  const isRecording = useCameraPathStore((s) => s.isRecording);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);
  const addKeyframe = useCameraPathStore((s) => s.addKeyframe);
  const stop = useCameraPathStore((s) => s.stop);
  const gizmoDragging = useBlockStore((s) => s.gizmoDragging);

  const pendingCameraAction = useCameraPathStore((s) => s.pendingCameraAction);
  const setHome = useCameraPathStore((s) => s.setHome);
  const setEnd = useCameraPathStore((s) => s.setEnd);
  const clearPendingCameraAction = useCameraPathStore((s) => s.clearPendingCameraAction);
  const home = useCameraPathStore((s) => s.home);
  const end = useCameraPathStore((s) => s.end);
  const pendingFov = useCameraPathStore((s) => s.pendingFov);
  const clearPendingFov = useCameraPathStore((s) => s.clearPendingFov);

  const orbitRef = useRef<OrbitControlsInstance>(null);
  const heldKeys = useHeldMoveKeys();
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  const moveSpeed = useSpeedSettingsStore((s) => s.moveSpeed);
  const zoomSpeed = useSpeedSettingsStore((s) => s.zoomSpeed);
  const tiltSpeed = useSpeedSettingsStore((s) => s.tiltSpeed);
  const panSpeed = useSpeedSettingsStore((s) => s.panSpeed);

  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    if (pendingCameraAction === "save-home") {
      setHome(camera.position, camera.quaternion, persp.fov);
    } else if (pendingCameraAction === "go-home" && home) {
      applyCameraPose(camera, orbitRef.current, home);
    } else if (pendingCameraAction === "save-end") {
      setEnd(camera.position, camera.quaternion, persp.fov);
    } else if (pendingCameraAction === "go-end" && end) {
      applyCameraPose(camera, orbitRef.current, end);
    }
    if (pendingCameraAction) clearPendingCameraAction();
  }, [pendingCameraAction, camera, setHome, setEnd, home, end, clearPendingCameraAction]);

  useEffect(() => {
    if (pendingFov !== null) {
      const persp = camera as THREE.PerspectiveCamera;
      persp.fov = pendingFov;
      persp.updateProjectionMatrix();
      clearPendingFov();
    }
  }, [pendingFov, camera, clearPendingFov]);

  useEffect(() => {
    if (isPlaying && keyframes.length >= 2) {
      curveRef.current = new THREE.CatmullRomCurve3(keyframes.map((k) => k.position));
      playbackClock.duration = Math.max(keyframes[keyframes.length - 1].time, 0.001);
      playbackClock.elapsed = 0;
    }
  }, [isPlaying, keyframes]);

  useFrame((_, delta) => {
    if (isPlaying) {
      if (!curveRef.current || keyframes.length < 2) {
        syncMonitor(camera);
        return;
      }

      playbackClock.elapsed += delta;
      const t = Math.min(playbackClock.elapsed / playbackClock.duration, 1);

      // getPoint (NOT getPointAt): index-uniform, matching the roughly time-uniform
      // keyframe sampling, so position keeps the same speed variation as recorded
      // instead of being re-timed to constant arc-length speed.
      camera.position.copy(curveRef.current.getPoint(t));

      const floatIndex = t * (keyframes.length - 1);
      const i0 = Math.floor(floatIndex);
      const i1 = Math.min(i0 + 1, keyframes.length - 1);
      const frac = floatIndex - i0;
      camera.quaternion.slerpQuaternions(
        keyframes[i0].quaternion,
        keyframes[i1].quaternion,
        frac,
      );

      const persp = camera as THREE.PerspectiveCamera;
      persp.fov = THREE.MathUtils.lerp(keyframes[i0].fov, keyframes[i1].fov, frac);
      persp.updateProjectionMatrix();

      if (t >= 1) {
        curveRef.current = null;
        stop();
      }
      syncMonitor(camera);
      return;
    }

    const persp = camera as THREE.PerspectiveCamera;

    const zoomDir = axisDelta(shotActionState.zoomOut, shotActionState.zoomIn);
    if (zoomDir !== 0) {
      persp.fov = THREE.MathUtils.clamp(persp.fov + zoomDir * zoomSpeed * delta, MIN_FOV, MAX_FOV);
      persp.updateProjectionMatrix();
    }

    const tiltDir = axisDelta(shotActionState.tiltUp, shotActionState.tiltDown);
    const panDir = axisDelta(shotActionState.panLeft, shotActionState.panRight);
    if (tiltDir !== 0 || panDir !== 0) {
      if (tiltDir !== 0) camera.rotateX(tiltDir * tiltSpeed * delta);
      if (panDir !== 0) camera.rotateY(panDir * panSpeed * delta);
      if (orbitRef.current) resyncOrbitTargetToForward(camera, orbitRef.current);
    }

    if (isRecording) {
      const keys = heldKeys.current;
      if (keys.size > 0) {
        camera.getWorldDirection(_forward);
        _right.crossVectors(_forward, camera.up).normalize();
        _move.set(0, 0, 0);
        if (keys.has("w")) _move.add(_forward);
        if (keys.has("s")) _move.addScaledVector(_forward, -1);
        if (keys.has("d")) _move.add(_right);
        if (keys.has("a")) _move.addScaledVector(_right, -1);
        if (keys.has("e")) _move.add(WORLD_UP);
        if (keys.has("q")) _move.addScaledVector(WORLD_UP, -1);
        if (_move.lengthSq() > 0) {
          _move.normalize().multiplyScalar(moveSpeed * delta);
          camera.position.add(_move);
          orbitRef.current?.target.add(_move);
          orbitRef.current?.update();
        }
      }

      addKeyframe(camera.position, camera.quaternion, persp.fov, clock.elapsedTime);
    }

    syncMonitor(camera);
  });

  return <OrbitControls ref={orbitRef} makeDefault enabled={!isPlaying && !gizmoDragging} />;
}
