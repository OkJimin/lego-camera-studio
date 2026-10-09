import { create } from "zustand";

export interface LensPreset {
  label: string;
  focalLengthMm: number;
}

// Focal length presets computed against a full-frame (24mm sensor height) reference.
export const LENS_PRESETS: LensPreset[] = [
  { label: "24mm", focalLengthMm: 24 },
  { label: "35mm", focalLengthMm: 35 },
  { label: "50mm", focalLengthMm: 50 },
  { label: "70mm", focalLengthMm: 70 },
  { label: "85mm", focalLengthMm: 85 },
  { label: "135mm", focalLengthMm: 135 },
];

const SENSOR_HEIGHT_MM = 24;

export function focalLengthToFov(focalLengthMm: number): number {
  const radians = 2 * Math.atan(SENSOR_HEIGHT_MM / (2 * focalLengthMm));
  return (radians * 180) / Math.PI;
}

export interface FormatPreset {
  label: string;
  aspect: number;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  { label: "16:9", aspect: 16 / 9 },
  { label: "1.85:1", aspect: 1.85 },
  { label: "2.39:1 (시네마스코프)", aspect: 2.39 },
  { label: "IMAX (1.43:1)", aspect: 1.43 },
];

export const DEFAULT_LENS_FOV = 50;

export function fovToFocalLength(fovDeg: number): number {
  return SENSOR_HEIGHT_MM / (2 * Math.tan((fovDeg * Math.PI) / 360));
}

export interface DepthOfFieldSettings {
  dofEnabled: boolean;
  // 0..1, how blurry out-of-focus areas get (the longer the lens, the more).
  blurStrength: number;
  // An object pinned as the focus (tracked as it moves). Without one, the camera
  // autofocuses on whatever is at the center of the frame.
  focusBlockId: string | null;
  // Only used when autofocus finds nothing at the center (e.g. it's pointing at the sky).
  focusDistance: number;
  // On a lens change, move the camera along its line to the focus object so the
  // object keeps its size on screen — which is what makes the perspective differ.
  keepSubjectSize: boolean;
}

export const DEFAULT_DOF_SETTINGS: DepthOfFieldSettings = {
  dofEnabled: false,
  blurStrength: 0.5,
  focusBlockId: null,
  focusDistance: 8,
  keepSubjectSize: true,
};

interface CameraSettingsState extends DepthOfFieldSettings {
  // Preview the blur in the editor view (off: it only shows in the exported video).
  // A view preference rather than part of the shot, so it isn't saved with the project.
  dofInEditor: boolean;
  setDofInEditor: (enabled: boolean) => void;
  formatIndex: number;
  // Mirrors the last lens preset picked, kept reactive (unlike the main scene
  // camera's live fov) so it can be pushed to a paired phone's viewfinder.
  lensFov: number;
  setFormatIndex: (index: number) => void;
  setLensFov: (fov: number) => void;
  setDofEnabled: (enabled: boolean) => void;
  setBlurStrength: (strength: number) => void;
  setFocusBlockId: (id: string | null) => void;
  setKeepSubjectSize: (keep: boolean) => void;
}

export const useCameraSettingsStore = create<CameraSettingsState>((set) => ({
  formatIndex: 0,
  lensFov: DEFAULT_LENS_FOV,
  ...DEFAULT_DOF_SETTINGS,
  dofInEditor: true,
  setDofInEditor: (enabled) => set({ dofInEditor: enabled }),
  setFormatIndex: (index) => set({ formatIndex: index }),
  setLensFov: (fov) => set({ lensFov: fov }),
  setDofEnabled: (enabled) => set({ dofEnabled: enabled }),
  setBlurStrength: (strength) => set({ blurStrength: strength }),
  setFocusBlockId: (id) => set({ focusBlockId: id }),
  setKeepSubjectSize: (keep) => set({ keepSubjectSize: keep }),
}));
