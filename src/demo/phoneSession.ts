import { signInAnonymously } from "firebase/auth";
import { onDisconnect, onValue, ref, set, serverTimestamp } from "firebase/database";
import { auth, realtimeDb } from "../lib/firebase";
import type { PlacedBlock } from "./useBlockStore";
import type { LightingSettings } from "./useLightingStore";
import type { SpeedSettings } from "./useSpeedSettingsStore";
import type { CameraPathSync } from "./guidePath";

export interface PhoneOrientation {
  alpha: number;
  beta: number;
  gamma: number;
  time: number;
}

const PERSISTED_SESSION_KEY = "lego-camera-studio:phoneSessionId";

function randomSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 5; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function readPersistedSessionId(): string | null {
  try {
    return localStorage.getItem(PERSISTED_SESSION_KEY);
  } catch {
    return null;
  }
}

function writePersistedSessionId(sessionId: string) {
  try {
    localStorage.setItem(PERSISTED_SESSION_KEY, sessionId);
  } catch {
    // localStorage unavailable (private browsing etc.) — the session still
    // works for this page load, it just won't be remembered next time.
  }
}

export async function ensureAnonymousAuth(): Promise<void> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

// Reuses the same session (and therefore the same QR code / URL) across
// visits so the phone only has to scan once — after that it can just
// reopen the bookmarked page instead of re-pairing every time.
export async function getOrCreatePhoneSession(): Promise<string> {
  await ensureAnonymousAuth();
  const existing = readPersistedSessionId();
  const sessionId = existing ?? randomSessionId();

  await set(ref(realtimeDb, `sessions/${sessionId}`), {
    createdAt: serverTimestamp(),
    phoneConnected: false,
  });

  writePersistedSessionId(sessionId);
  return sessionId;
}

export function forgetPhoneSession() {
  try {
    localStorage.removeItem(PERSISTED_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function watchPhoneConnected(sessionId: string, callback: (connected: boolean) => void) {
  const connectedRef = ref(realtimeDb, `sessions/${sessionId}/phoneConnected`);
  return onValue(connectedRef, (snapshot) => callback(Boolean(snapshot.val())));
}

export function watchOrientation(
  sessionId: string,
  callback: (orientation: PhoneOrientation | null) => void,
) {
  const orientationRef = ref(realtimeDb, `sessions/${sessionId}/orientation`);
  return onValue(orientationRef, (snapshot) => callback(snapshot.val()));
}

export async function joinPhoneSession(sessionId: string): Promise<void> {
  await ensureAnonymousAuth();
  const connectedRef = ref(realtimeDb, `sessions/${sessionId}/phoneConnected`);
  await set(connectedRef, true);
  onDisconnect(connectedRef).set(false);
}

export function sendOrientation(sessionId: string, orientation: PhoneOrientation) {
  set(ref(realtimeDb, `sessions/${sessionId}/orientation`), orientation);
}

export function syncBlocks(sessionId: string, blocks: PlacedBlock[]) {
  set(ref(realtimeDb, `sessions/${sessionId}/blocks`), blocks);
}

export function watchBlocks(sessionId: string, callback: (blocks: PlacedBlock[]) => void) {
  const blocksRef = ref(realtimeDb, `sessions/${sessionId}/blocks`);
  return onValue(blocksRef, (snapshot) => callback(snapshot.val() ?? []));
}

export function syncHomePosition(sessionId: string, position: [number, number, number] | null) {
  set(ref(realtimeDb, `sessions/${sessionId}/homePosition`), position);
}

export function watchHomePosition(
  sessionId: string,
  callback: (position: [number, number, number] | null) => void,
) {
  const posRef = ref(realtimeDb, `sessions/${sessionId}/homePosition`);
  return onValue(posRef, (snapshot) => callback(snapshot.val() ?? null));
}

// Which way the desktop camera is facing (radians), so the phone can line its
// gyro heading up with the laptop screen instead of its own arbitrary zero.
export function syncHomeYaw(sessionId: string, yaw: number) {
  set(ref(realtimeDb, `sessions/${sessionId}/homeYaw`), yaw);
}

export function watchHomeYaw(sessionId: string, callback: (yaw: number | null) => void) {
  const yawRef = ref(realtimeDb, `sessions/${sessionId}/homeYaw`);
  return onValue(yawRef, (snapshot) => {
    const value = snapshot.val();
    callback(typeof value === "number" ? value : null);
  });
}

export interface CameraSettingsSync {
  fov: number;
  aspect: number;
}

export function syncCameraSettings(sessionId: string, settings: CameraSettingsSync) {
  set(ref(realtimeDb, `sessions/${sessionId}/cameraSettings`), settings);
}

export function watchCameraSettings(
  sessionId: string,
  callback: (settings: CameraSettingsSync | null) => void,
) {
  const settingsRef = ref(realtimeDb, `sessions/${sessionId}/cameraSettings`);
  return onValue(settingsRef, (snapshot) => callback(snapshot.val() ?? null));
}

export function syncLighting(sessionId: string, lighting: LightingSettings) {
  set(ref(realtimeDb, `sessions/${sessionId}/lighting`), lighting);
}

export function watchLighting(
  sessionId: string,
  callback: (lighting: LightingSettings | null) => void,
) {
  const lightingRef = ref(realtimeDb, `sessions/${sessionId}/lighting`);
  return onValue(lightingRef, (snapshot) => callback(snapshot.val() ?? null));
}

export function syncSpeedSettings(sessionId: string, speed: SpeedSettings) {
  set(ref(realtimeDb, `sessions/${sessionId}/speedSettings`), speed);
}

export function watchSpeedSettings(
  sessionId: string,
  callback: (speed: SpeedSettings | null) => void,
) {
  const speedRef = ref(realtimeDb, `sessions/${sessionId}/speedSettings`);
  return onValue(speedRef, (snapshot) => callback(snapshot.val() ?? null));
}

export function syncCameraPath(sessionId: string, path: CameraPathSync) {
  set(ref(realtimeDb, `sessions/${sessionId}/cameraPath`), path);
}

export function watchCameraPath(sessionId: string, callback: (path: CameraPathSync | null) => void) {
  const pathRef = ref(realtimeDb, `sessions/${sessionId}/cameraPath`);
  return onValue(pathRef, (snapshot) => callback(snapshot.val() ?? null));
}

// Phone -> desktop: the camera path the phone just recorded with its gyro.
// Kept apart from `cameraPath` (desktop -> capture page) so the two directions
// can't echo each other.
export function sendRecordedPath(sessionId: string, path: CameraPathSync) {
  return set(ref(realtimeDb, `sessions/${sessionId}/recordedPath`), path);
}

// Wipe any recording left over from an earlier visit, so a stale one isn't
// mistaken for something the phone just recorded.
export function clearRecordedPath(sessionId: string) {
  return set(ref(realtimeDb, `sessions/${sessionId}/recordedPath`), null);
}

export function watchRecordedPath(sessionId: string, callback: (path: CameraPathSync) => void) {
  const pathRef = ref(realtimeDb, `sessions/${sessionId}/recordedPath`);
  return onValue(pathRef, (snapshot) => {
    const value = snapshot.val() as CameraPathSync | null;
    if (value && Array.isArray(value.keys) && value.keys.length >= 2) callback(value);
  });
}

export function mobileSessionUrl(sessionId: string, mode: "phone" | "capture" = "phone"): string {
  const url = new URL(window.location.href);
  url.search = `?mode=${mode}&session=${sessionId}`;
  return url.toString();
}
