import { create } from "zustand";

export const DEFAULT_MOVE_SPEED = 5;
export const DEFAULT_ZOOM_SPEED = 25;
export const DEFAULT_TILT_SPEED = 0.6;
export const DEFAULT_PAN_SPEED = 0.6;
export const DEFAULT_OBJECT_MOTION_SECONDS = 3;

export const MOVE_SPEED_RANGE = { min: 1, max: 12 };
export const ZOOM_SPEED_RANGE = { min: 5, max: 60 };
export const TILT_PAN_SPEED_RANGE = { min: 0.1, max: 2 };
export const OBJECT_MOTION_SECONDS_RANGE = { min: 0.5, max: 10 };

export interface SpeedSettings {
  moveSpeed: number;
  zoomSpeed: number;
  tiltSpeed: number;
  panSpeed: number;
  objectMotionSeconds: number;
}

export const DEFAULT_SPEED_SETTINGS: SpeedSettings = {
  moveSpeed: DEFAULT_MOVE_SPEED,
  zoomSpeed: DEFAULT_ZOOM_SPEED,
  tiltSpeed: DEFAULT_TILT_SPEED,
  panSpeed: DEFAULT_PAN_SPEED,
  objectMotionSeconds: DEFAULT_OBJECT_MOTION_SECONDS,
};

interface SpeedSettingsState extends SpeedSettings {
  setMoveSpeed: (v: number) => void;
  setZoomSpeed: (v: number) => void;
  setTiltSpeed: (v: number) => void;
  setPanSpeed: (v: number) => void;
  setObjectMotionSeconds: (v: number) => void;
}

export const useSpeedSettingsStore = create<SpeedSettingsState>((set) => ({
  ...DEFAULT_SPEED_SETTINGS,
  setMoveSpeed: (v) => set({ moveSpeed: v }),
  setZoomSpeed: (v) => set({ zoomSpeed: v }),
  setTiltSpeed: (v) => set({ tiltSpeed: v }),
  setPanSpeed: (v) => set({ panSpeed: v }),
  setObjectMotionSeconds: (v) => set({ objectMotionSeconds: v }),
}));
