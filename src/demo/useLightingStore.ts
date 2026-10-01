import { create } from "zustand";
import * as THREE from "three";

const KEY_LIGHT_DISTANCE = 14;
const MAX_AMBIENT_INTENSITY = 2;
const MAX_KEY_INTENSITY = 2;

export const KELVIN_RANGE = { min: 2000, max: 10000 };
export const SCENE_BACKGROUND_COLOR = "#f3f1ea";

export function computeKeyLightPosition(
  azimuthDeg: number,
  elevationDeg: number,
): [number, number, number] {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return [
    KEY_LIGHT_DISTANCE * Math.cos(el) * Math.sin(az),
    KEY_LIGHT_DISTANCE * Math.sin(el),
    KEY_LIGHT_DISTANCE * Math.cos(el) * Math.cos(az),
  ];
}

export function ambientIntensityFromPercent(percent: number): number {
  return (percent / 100) * MAX_AMBIENT_INTENSITY;
}

export function keyIntensityFromPercent(percent: number): number {
  return (percent / 100) * MAX_KEY_INTENSITY;
}

// Approximation of blackbody color temperature -> sRGB (Tanner Helland's algorithm).
export function kelvinToColor(kelvin: number): string {
  const temp = kelvin / 100;
  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
  }

  if (temp <= 66) {
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  }

  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface LightingSettings {
  ambientPercent: number;
  keyPercent: number;
  keyAzimuth: number;
  keyElevation: number;
  keyTemperature: number;
}

export const DEFAULT_LIGHTING: LightingSettings = {
  ambientPercent: 35,
  keyPercent: 60,
  keyAzimuth: 35,
  keyElevation: 55,
  keyTemperature: 5500,
};

interface LightingState extends LightingSettings {
  setAmbientPercent: (v: number) => void;
  setKeyPercent: (v: number) => void;
  setKeyAzimuth: (v: number) => void;
  setKeyElevation: (v: number) => void;
  setKeyTemperature: (v: number) => void;
}

export const useLightingStore = create<LightingState>((set) => ({
  ...DEFAULT_LIGHTING,
  setAmbientPercent: (v) => set({ ambientPercent: v }),
  setKeyPercent: (v) => set({ keyPercent: v }),
  setKeyAzimuth: (v) => set({ keyAzimuth: v }),
  setKeyElevation: (v) => set({ keyElevation: v }),
  setKeyTemperature: (v) => set({ keyTemperature: v }),
}));
