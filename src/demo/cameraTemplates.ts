import * as THREE from "three";
import { deserializeKeyframes } from "./guidePath";
import type { CameraPathKey, CameraPathSync } from "./guidePath";
import { generateId } from "./id";
import { useBlockStore } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import { DEFAULT_DOF_SETTINGS, focalLengthToFov, useCameraSettingsStore } from "./useCameraSettingsStore";
import { useProjectStore } from "./useProjectStore";

const PATH_FPS = 30;
const UP = new THREE.Vector3(0, 1, 0);
// Every template frames a person standing at the origin, chest height.
const SUBJECT_CENTER = new THREE.Vector3(0, 1.1, 0);
const SUBJECT_POSITION: [number, number, number] = [0, 0.85, 0];
const EYE_HEIGHT = 1.6;

interface Pose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

export interface CameraTemplate {
  id: string;
  name: string;
  description: string;
  focalLengthMm: number;
  durationSeconds: number;
  poseAt: (u: number) => Pose;
}

// Gentle start and stop, like a camera operator easing in and out of a move.
function easeInOut(u: number): number {
  return u * u * (3 - 2 * u);
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function lookAt(position: THREE.Vector3, target: THREE.Vector3): Pose {
  const matrix = new THREE.Matrix4().lookAt(position, target, UP);
  return { position, quaternion: new THREE.Quaternion().setFromRotationMatrix(matrix) };
}

// Camera at a fixed spot, turned by yaw (left is positive) and pitch (up is positive).
function turnedPose(position: THREE.Vector3, yawDeg: number, pitchDeg: number): Pose {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(pitchDeg),
    THREE.MathUtils.degToRad(yawDeg),
    0,
    "YXZ",
  );
  return { position, quaternion: new THREE.Quaternion().setFromEuler(euler) };
}

function onCircle(radius: number, azimuthDeg: number, y: number): THREE.Vector3 {
  const a = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3(radius * Math.sin(a), y, radius * Math.cos(a));
}

export const CAMERA_TEMPLATES: CameraTemplate[] = [
  {
    id: "dolly-in",
    name: "돌리 인",
    description: "피사체 쪽으로 천천히 다가가요",
    focalLengthMm: 35,
    durationSeconds: 5,
    poseAt: (u) => lookAt(onCircle(lerp(9, 3.5, u), 20, lerp(1.7, 1.4, u)), SUBJECT_CENTER),
  },
  {
    id: "dolly-out",
    name: "돌리 아웃",
    description: "피사체에서 멀어지며 공간을 보여줘요",
    focalLengthMm: 35,
    durationSeconds: 5,
    poseAt: (u) => lookAt(onCircle(lerp(3.5, 9, u), -20, lerp(1.4, 1.7, u)), SUBJECT_CENTER),
  },
  {
    id: "orbit",
    name: "오빗",
    description: "피사체 주위를 반 바퀴 돌아요",
    focalLengthMm: 35,
    durationSeconds: 8,
    poseAt: (u) => lookAt(onCircle(5, lerp(-90, 90, u), EYE_HEIGHT), SUBJECT_CENTER),
  },
  {
    id: "tracking",
    name: "트래킹",
    description: "피사체 앞을 옆으로 나란히 지나가요",
    focalLengthMm: 35,
    durationSeconds: 7,
    poseAt: (u) => turnedPose(new THREE.Vector3(lerp(-5, 5, u), 1.5, 6), 0, 0),
  },
  {
    id: "crane-up",
    name: "크레인 업",
    description: "낮은 곳에서 높이 올라가며 내려다봐요",
    focalLengthMm: 35,
    durationSeconds: 6,
    poseAt: (u) => lookAt(new THREE.Vector3(0, lerp(0.8, 6.5, u), 7), SUBJECT_CENTER),
  },
  {
    id: "crane-down",
    name: "크레인 다운",
    description: "높은 곳에서 내려오며 피사체에 가까워져요",
    focalLengthMm: 35,
    durationSeconds: 6,
    poseAt: (u) => lookAt(new THREE.Vector3(0, lerp(6.5, 0.8, u), 7), SUBJECT_CENTER),
  },
  {
    id: "pan",
    name: "팬",
    description: "제자리에서 왼쪽에서 오른쪽으로 돌려요",
    focalLengthMm: 50,
    durationSeconds: 6,
    poseAt: (u) => turnedPose(new THREE.Vector3(0, EYE_HEIGHT, 7), lerp(30, -30, u), 0),
  },
  {
    id: "tilt-up",
    name: "틸트 업",
    description: "제자리에서 아래에서 위로 올려다봐요",
    focalLengthMm: 50,
    durationSeconds: 5,
    poseAt: (u) => turnedPose(new THREE.Vector3(0, 1, 6), 0, lerp(-25, 25, u)),
  },
];

function buildPath(template: CameraTemplate, fov: number): CameraPathSync {
  const count = Math.round(template.durationSeconds * PATH_FPS) + 1;
  const keys: CameraPathKey[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const { position, quaternion } = template.poseAt(easeInOut(progress));
    keys.push({
      t: progress * template.durationSeconds,
      p: [position.x, position.y, position.z],
      q: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      fov,
    });
  }
  return { duration: template.durationSeconds, keys };
}

// Starts a fresh project whose camera move, lens and focus are already set up
// around a stand-in person at the origin. It's all editable afterwards.
export function startFromTemplate(template: CameraTemplate) {
  useProjectStore.getState().startNewProject();

  const fov = focalLengthToFov(template.focalLengthMm);
  const keyframes = deserializeKeyframes(buildPath(template, fov));
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  const subjectId = generateId();
  useBlockStore.setState({
    blocks: [
      {
        id: subjectId,
        kind: "person",
        position: SUBJECT_POSITION,
        rotation: [0, 0, 0],
        size: [1, 1, 1],
        color: "red",
      },
    ],
    history: [],
    focusedBlockId: null,
  });

  useCameraPathStore.setState({
    keyframes,
    home: { position: first.position.clone(), quaternion: first.quaternion.clone(), fov },
    end: { position: last.position.clone(), quaternion: last.quaternion.clone(), fov },
    autoMoveDuration: template.durationSeconds,
    isPlaying: false,
    isRecording: false,
    // The editor camera jumps to the first frame once the workspace is on screen.
    pendingCameraAction: "go-home",
  });

  useCameraSettingsStore.setState({
    lensFov: fov,
    formatIndex: 0,
    ...DEFAULT_DOF_SETTINGS,
    dofEnabled: true,
    focusBlockId: subjectId,
  });

  useProjectStore.setState({ currentProjectName: template.name });
}
