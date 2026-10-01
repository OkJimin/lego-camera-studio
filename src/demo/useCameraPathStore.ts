import { create } from "zustand";
import * as THREE from "three";

const SAMPLE_INTERVAL_SECONDS = 0.03;
export const AUTO_MOVE_DURATION_RANGE = { min: 1, max: 20 };
export const DEFAULT_AUTO_MOVE_DURATION = 4;

export interface CameraKeyframe {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov: number;
  time: number;
}

export type PendingCameraAction = "save-home" | "go-home" | "save-end" | "go-end" | null;

export interface CameraPose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov: number;
}

interface CameraPathState {
  isRecording: boolean;
  isPlaying: boolean;
  keyframes: CameraKeyframe[];
  lastSampleTime: number;
  recordStartTime: number | null;
  home: CameraPose | null;
  end: CameraPose | null;
  autoMoveDuration: number;
  pendingCameraAction: PendingCameraAction;
  pendingFov: number | null;
  startRecording: () => void;
  stopRecording: () => void;
  addKeyframe: (
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    fov: number,
    now: number,
  ) => void;
  clearPath: () => void;
  play: () => void;
  stop: () => void;
  requestSaveHome: () => void;
  requestGoHome: () => void;
  requestSaveEnd: () => void;
  requestGoEnd: () => void;
  setHome: (position: THREE.Vector3, quaternion: THREE.Quaternion, fov: number) => void;
  setEnd: (position: THREE.Vector3, quaternion: THREE.Quaternion, fov: number) => void;
  clearPendingCameraAction: () => void;
  setAutoMoveDuration: (seconds: number) => void;
  generatePath: () => void;
  requestSetFov: (fov: number) => void;
  clearPendingFov: () => void;
}

export const useCameraPathStore = create<CameraPathState>((set, get) => ({
  isRecording: false,
  isPlaying: false,
  keyframes: [],
  lastSampleTime: 0,
  recordStartTime: null,
  home: null,
  end: null,
  autoMoveDuration: DEFAULT_AUTO_MOVE_DURATION,
  pendingCameraAction: null,
  pendingFov: null,
  startRecording: () =>
    set({
      isRecording: true,
      isPlaying: false,
      keyframes: [],
      lastSampleTime: 0,
      recordStartTime: null,
    }),
  stopRecording: () => set({ isRecording: false }),
  addKeyframe: (position, quaternion, fov, now) => {
    const { lastSampleTime, recordStartTime } = get();
    if (now - lastSampleTime < SAMPLE_INTERVAL_SECONDS) return;
    const startTime = recordStartTime ?? now;
    set((state) => ({
      keyframes: [
        ...state.keyframes,
        { position: position.clone(), quaternion: quaternion.clone(), fov, time: now - startTime },
      ],
      lastSampleTime: now,
      recordStartTime: startTime,
    }));
  },
  clearPath: () => set({ keyframes: [], isPlaying: false }),
  play: () => set((state) => (state.keyframes.length >= 2 ? { isPlaying: true } : state)),
  stop: () => set({ isPlaying: false }),
  requestSaveHome: () => set({ pendingCameraAction: "save-home" }),
  requestGoHome: () => set({ pendingCameraAction: "go-home" }),
  requestSaveEnd: () => set({ pendingCameraAction: "save-end" }),
  requestGoEnd: () => set({ pendingCameraAction: "go-end" }),
  setHome: (position, quaternion, fov) =>
    set({ home: { position: position.clone(), quaternion: quaternion.clone(), fov } }),
  setEnd: (position, quaternion, fov) =>
    set({ end: { position: position.clone(), quaternion: quaternion.clone(), fov } }),
  clearPendingCameraAction: () => set({ pendingCameraAction: null }),
  setAutoMoveDuration: (seconds) => set({ autoMoveDuration: seconds }),
  generatePath: () => {
    const { home, end, autoMoveDuration } = get();
    if (!home || !end) return;
    set({
      isRecording: false,
      isPlaying: false,
      keyframes: [
        { position: home.position.clone(), quaternion: home.quaternion.clone(), fov: home.fov, time: 0 },
        {
          position: end.position.clone(),
          quaternion: end.quaternion.clone(),
          fov: end.fov,
          time: autoMoveDuration,
        },
      ],
    });
  },
  requestSetFov: (fov) => set({ pendingFov: fov }),
  clearPendingFov: () => set({ pendingFov: null }),
}));
