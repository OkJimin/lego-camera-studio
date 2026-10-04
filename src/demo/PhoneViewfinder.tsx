import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DeviceOrientationControls } from "three-stdlib";
import { AspectMask } from "./AspectMask";
import { Block } from "./Block";
import { PhoneZoomButtons } from "./PhoneZoomButtons";
import { SceneLighting } from "./SceneLighting";
import { VirtualJoystick } from "./VirtualJoystick";
import { joystickState } from "./joystickState";
import { shotActionState } from "./shotActions";
import {
  watchBlocks,
  watchCameraSettings,
  watchHomePosition,
  watchLighting,
  watchSpeedSettings,
} from "./phoneSession";
import type { CameraSettingsSync } from "./phoneSession";
import type { PlacedBlock } from "./useBlockStore";
import { DEFAULT_LENS_FOV } from "./useCameraSettingsStore";
import { DEFAULT_LIGHTING } from "./useLightingStore";
import type { LightingSettings } from "./useLightingStore";
import { DEFAULT_SPEED_SETTINGS } from "./useSpeedSettingsStore";
import type { SpeedSettings } from "./useSpeedSettingsStore";

const MIN_FOV = 10;
const MAX_FOV = 90;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const DEFAULT_POSITION: [number, number, number] = [0, 2, 6];

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();

function OrientationCamera() {
  const { camera } = useThree();
  const [controls] = useState(() => new DeviceOrientationControls(camera));

  useEffect(() => {
    controls.connect();
    return () => controls.disconnect();
  }, [controls]);

  useFrame(() => {
    controls.update();
  });

  return null;
}

// Joystick drives ground-plane walking, zoom buttons drive fov — look
// direction is left entirely to the phone's own orientation (above).
function MovementRig({ moveSpeed, zoomSpeed }: { moveSpeed: number; zoomSpeed: number }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const { x, y } = joystickState;
    if (x !== 0 || y !== 0) {
      camera.getWorldDirection(_forward);
      _forward.y = 0;
      if (_forward.lengthSq() > 0) _forward.normalize();
      _right.crossVectors(_forward, WORLD_UP).normalize();

      _move.set(0, 0, 0);
      _move.addScaledVector(_forward, -y);
      _move.addScaledVector(_right, x);
      if (_move.lengthSq() > 0) {
        _move.normalize().multiplyScalar(moveSpeed * delta);
        camera.position.add(_move);
      }
    }

    if (shotActionState.zoomIn !== shotActionState.zoomOut) {
      const persp = camera as THREE.PerspectiveCamera;
      const dir = shotActionState.zoomIn ? -1 : 1;
      persp.fov = THREE.MathUtils.clamp(persp.fov + dir * zoomSpeed * delta, MIN_FOV, MAX_FOV);
      persp.updateProjectionMatrix();
    }
  });

  return null;
}

// Snaps the live fov to whatever lens the desktop operator last picked,
// overriding any zoom the phone itself has done since — a deliberate
// reframing action from desktop, not a continuous sync.
function LensSync({ fov }: { fov: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    persp.fov = fov;
    persp.updateProjectionMatrix();
  }, [fov, camera]);
  return null;
}

function HomePositionInit({ position }: { position: [number, number, number] | null }) {
  const { camera } = useThree();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!position || appliedRef.current) return;
    camera.position.set(...position);
    appliedRef.current = true;
  }, [position, camera]);

  return null;
}

function PhoneGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial color="#e8e4da" />
    </mesh>
  );
}

export function PhoneViewfinder({ sessionId }: { sessionId: string }) {
  const [blocks, setBlocks] = useState<PlacedBlock[]>([]);
  const [homePosition, setHomePosition] = useState<[number, number, number] | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettingsSync | null>(null);
  const [lighting, setLighting] = useState<LightingSettings | null>(null);
  const [speed, setSpeed] = useState<SpeedSettings | null>(null);

  useEffect(() => watchBlocks(sessionId, setBlocks), [sessionId]);
  useEffect(() => watchHomePosition(sessionId, setHomePosition), [sessionId]);
  useEffect(() => watchCameraSettings(sessionId, setCameraSettings), [sessionId]);
  useEffect(() => watchLighting(sessionId, setLighting), [sessionId]);
  useEffect(() => watchSpeedSettings(sessionId, setSpeed), [sessionId]);

  const { moveSpeed, zoomSpeed, objectMotionSeconds } = speed ?? DEFAULT_SPEED_SETTINGS;

  return (
    <div className="phone-viewfinder">
      <Canvas camera={{ position: DEFAULT_POSITION, fov: cameraSettings?.fov ?? DEFAULT_LENS_FOV }}>
        <SceneLighting settings={lighting ?? DEFAULT_LIGHTING} />
        <PhoneGround />
        {blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            interactive={false}
            loopMotion
            loopLegSeconds={objectMotionSeconds}
          />
        ))}
        <OrientationCamera />
        <MovementRig moveSpeed={moveSpeed} zoomSpeed={zoomSpeed} />
        <HomePositionInit position={homePosition} />
        <LensSync fov={cameraSettings?.fov ?? DEFAULT_LENS_FOV} />
      </Canvas>
      <AspectMask aspectOverride={cameraSettings?.aspect} />
      <VirtualJoystick />
      <PhoneZoomButtons />
    </div>
  );
}
