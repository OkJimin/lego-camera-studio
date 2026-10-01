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

interface CameraSettingsState {
  formatIndex: number;
  setFormatIndex: (index: number) => void;
}

export const useCameraSettingsStore = create<CameraSettingsState>((set) => ({
  formatIndex: 0,
  setFormatIndex: (index) => set({ formatIndex: index }),
}));
