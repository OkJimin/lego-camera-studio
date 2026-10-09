import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DeviceOrientationControls } from "three-stdlib";
import { AspectFrame } from "./AspectFrame";
import { Block } from "./Block";
import { PhoneZoomButtons } from "./PhoneZoomButtons";
import { SceneLighting } from "./SceneLighting";
import { StaticGround } from "./StaticGround";
import { VirtualJoystick } from "./VirtualJoystick";
import { resampleToUniform } from "./guidePath";
import type { RawCameraSample } from "./guidePath";
import { joystickState } from "./joystickState";
import { createGuideClock } from "./playbackClock";
import type { GuideClock } from "./playbackClock";
import { shotActionState } from "./shotActions";
import {
  sendRecordedPath,
  watchBlocks,
  watchCameraSettings,
  watchHomePosition,
  watchHomeYaw,
  watchLighting,
  watchSpeedSettings,
} from "./phoneSession";
import type { CameraSettingsSync } from "./phoneSession";
import type { PlacedBlock } from "./useBlockStore";
import { DEFAULT_LENS_FOV, FORMAT_PRESETS } from "./useCameraSettingsStore";
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

// The phone's compass/gyro heading has its own arbitrary zero, so the raw view
// is rotated relative to the laptop's. `pending` asks for the heading to be
// lined up with `desiredYaw` (the laptop camera's) once the first real sensor
// reading has arrived; the "방향 맞추기" button sets it again on demand.
interface YawCalibration {
  desiredYaw: number | null;
  pending: boolean;
}

const _heading = new THREE.Vector3();
// Looking nearly straight up/down leaves heading undefined; wait for a flatter aim.
const MIN_HORIZONTAL_LOOK = 0.25;

function OrientationCamera({ calibration }: { calibration: YawCalibration }) {
  const { camera } = useThree();
  const [controls] = useState(() => new DeviceOrientationControls(camera));
  // The controls start with a placeholder reading; it's replaced by the first sensor event.
  const placeholderRef = useRef(controls.deviceOrientation);

  useEffect(() => {
    controls.connect();
    return () => controls.disconnect();
  }, [controls]);

  useFrame(() => {
    controls.update();

    if (
      !calibration.pending ||
      calibration.desiredYaw === null ||
      controls.deviceOrientation === placeholderRef.current
    ) {
      return;
    }
    camera.getWorldDirection(_heading);
    if (Math.hypot(_heading.x, _heading.z) < MIN_HORIZONTAL_LOOK) return;

    const currentYaw = Math.atan2(-_heading.x, -_heading.z);
    controls.alphaOffset += calibration.desiredYaw - currentYaw;
    controls.update();
    calibration.pending = false;
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

// Samples the camera every frame while recording and advances the guide clock,
// which the objects' one-shot motion follows. Mounted after the orientation and
// movement rigs so it reads the pose they've already updated this frame.
interface PathRecorderState {
  active: boolean;
  samples: RawCameraSample[];
}

function PathRecorder({ recorder, clock }: { recorder: PathRecorderState; clock: GuideClock }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!recorder.active) return;
    clock.elapsed += delta;
    const persp = camera as THREE.PerspectiveCamera;
    recorder.samples.push({
      t: clock.elapsed,
      p: [camera.position.x, camera.position.y, camera.position.z],
      q: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
      fov: persp.fov,
    });
  });

  return null;
}

type RecordStatus = "idle" | "countdown" | "recording" | "sent" | "error";

const RECORD_COUNTDOWN_SECONDS = 3;

export function PhoneViewfinder({ sessionId }: { sessionId: string }) {
  const [blocks, setBlocks] = useState<PlacedBlock[]>([]);
  const [homePosition, setHomePosition] = useState<[number, number, number] | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettingsSync | null>(null);
  const [lighting, setLighting] = useState<LightingSettings | null>(null);
  const [speed, setSpeed] = useState<SpeedSettings | null>(null);

  useEffect(() => watchBlocks(sessionId, setBlocks), [sessionId]);
  useEffect(() => watchHomePosition(sessionId, setHomePosition), [sessionId]);

  const [calibration] = useState<YawCalibration>(() => ({ desiredYaw: null, pending: true }));
  useEffect(
    () =>
      watchHomeYaw(sessionId, (yaw) => {
        calibration.desiredYaw = yaw;
      }),
    [sessionId, calibration],
  );
  useEffect(() => watchCameraSettings(sessionId, setCameraSettings), [sessionId]);
  useEffect(() => watchLighting(sessionId, setLighting), [sessionId]);
  useEffect(() => watchSpeedSettings(sessionId, setSpeed), [sessionId]);

  const { moveSpeed, zoomSpeed } = speed ?? DEFAULT_SPEED_SETTINGS;

  const [clock] = useState(createGuideClock);
  const [recorder] = useState<PathRecorderState>(() => ({ active: false, samples: [] }));
  const [status, setStatus] = useState<RecordStatus>("idle");
  const [countdown, setCountdown] = useState(RECORD_COUNTDOWN_SECONDS);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      recorder.active = false;
      clock.playing = false;
    },
    [recorder, clock],
  );

  const beginRecording = () => {
    recorder.samples = [];
    clock.elapsed = 0;
    // Only read by legacy motions saved without their own duration.
    clock.duration = 10;
    clock.playing = true;
    recorder.active = true;
    setStatus("recording");
  };

  const startCountdown = () => {
    let remaining = RECORD_COUNTDOWN_SECONDS;
    setCountdown(remaining);
    setStatus("countdown");
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        countdownTimerRef.current = null;
        beginRecording();
        return;
      }
      setCountdown(remaining);
      countdownTimerRef.current = setTimeout(tick, 1000);
    };
    countdownTimerRef.current = setTimeout(tick, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    countdownTimerRef.current = null;
    setStatus("idle");
  };

  const stopRecording = () => {
    recorder.active = false;
    clock.playing = false;
    const path = resampleToUniform(recorder.samples);
    if (!path) {
      setStatus("error");
      return;
    }
    setRecordedSeconds(path.duration);
    sendRecordedPath(sessionId, path)
      .then(() => setStatus("sent"))
      .catch(() => setStatus("error"));
  };

  return (
    <div className="phone-viewfinder">
      <AspectFrame aspect={cameraSettings?.aspect ?? FORMAT_PRESETS[0].aspect}>
        <Canvas camera={{ position: DEFAULT_POSITION, fov: cameraSettings?.fov ?? DEFAULT_LENS_FOV }}>
          <SceneLighting settings={lighting ?? DEFAULT_LIGHTING} />
          <StaticGround />
          {blocks.map((block) => (
            <Block key={block.id} block={block} interactive={false} clock={clock} />
          ))}
          <OrientationCamera calibration={calibration} />
          <MovementRig moveSpeed={moveSpeed} zoomSpeed={zoomSpeed} />
          <PathRecorder recorder={recorder} clock={clock} />
          <HomePositionInit position={homePosition} />
          <LensSync fov={cameraSettings?.fov ?? DEFAULT_LENS_FOV} />
        </Canvas>
      </AspectFrame>
      <VirtualJoystick />
      <PhoneZoomButtons />

      <div className="phone-record">
        {status === "countdown" && <span className="phone-record__countdown">{countdown}</span>}
        {status === "recording" && <span className="phone-record__badge">● 녹화 중</span>}
        {status === "sent" && (
          <span className="phone-record__badge">
            ✅ {recordedSeconds.toFixed(1)}초 경로를 노트북으로 보냈어요
          </span>
        )}
        {status === "error" && (
          <span className="phone-record__badge">경로를 보내지 못했어요. 다시 녹화해주세요</span>
        )}

        {status !== "countdown" && status !== "recording" && (
          <button
            type="button"
            className="phone-record__button phone-record__button--ghost"
            onClick={() => {
              calibration.pending = true;
            }}
          >
            방향 맞추기
          </button>
        )}

        {status === "countdown" ? (
          <button type="button" className="phone-record__button" onClick={cancelCountdown}>
            취소
          </button>
        ) : status === "recording" ? (
          <button
            type="button"
            className="phone-record__button phone-record__button--stop"
            onClick={stopRecording}
          >
            녹화 종료
          </button>
        ) : (
          <button type="button" className="phone-record__button" onClick={startCountdown}>
            {status === "idle" ? "녹화 시작" : "다시 녹화"}
          </button>
        )}
      </div>
    </div>
  );
}
