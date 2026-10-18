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

function sessionRef(sessionId: string, key: string) {
  return ref(realtimeDb, `sessions/${sessionId}/${key}`);
}

// Subscribes to one key of the session, passing `fallback` while it's unset.
function watchKey<T>(sessionId: string, key: string, fallback: T, callback: (value: T) => void) {
  return onValue(sessionRef(sessionId, key), (snapshot) => callback(snapshot.val() ?? fallback));
}

export function watchPhoneConnected(sessionId: string, callback: (connected: boolean) => void) {
  return onValue(sessionRef(sessionId, "phoneConnected"), (snapshot) =>
    callback(Boolean(snapshot.val())),
  );
}

export function watchOrientation(
  sessionId: string,
  callback: (orientation: PhoneOrientation | null) => void,
) {
  return watchKey<PhoneOrientation | null>(sessionId, "orientation", null, callback);
}

export async function joinPhoneSession(sessionId: string): Promise<void> {
  await ensureAnonymousAuth();
  const connectedRef = sessionRef(sessionId, "phoneConnected");
  await set(connectedRef, true);
  onDisconnect(connectedRef).set(false);
}

export function sendOrientation(sessionId: string, orientation: PhoneOrientation) {
  set(sessionRef(sessionId, "orientation"), orientation);
}

export function syncBlocks(sessionId: string, blocks: PlacedBlock[]) {
  set(sessionRef(sessionId, "blocks"), blocks);
}

export function watchBlocks(sessionId: string, callback: (blocks: PlacedBlock[]) => void) {
  return watchKey<PlacedBlock[]>(sessionId, "blocks", [], callback);
}

export function syncHomePosition(sessionId: string, position: [number, number, number] | null) {
  set(sessionRef(sessionId, "homePosition"), position);
}

export function watchHomePosition(
  sessionId: string,
  callback: (position: [number, number, number] | null) => void,
) {
  return watchKey<[number, number, number] | null>(sessionId, "homePosition", null, callback);
}

// Which way the desktop camera is facing (radians), so the phone can line its
// gyro heading up with the laptop screen instead of its own arbitrary zero.
export function syncHomeYaw(sessionId: string, yaw: number) {
  set(sessionRef(sessionId, "homeYaw"), yaw);
}

export function watchHomeYaw(sessionId: string, callback: (yaw: number | null) => void) {
  return onValue(sessionRef(sessionId, "homeYaw"), (snapshot) => {
    const value = snapshot.val();
    callback(typeof value === "number" ? value : null);
  });
}

export interface CameraSettingsSync {
  fov: number;
  aspect: number;
}

export function syncCameraSettings(sessionId: string, settings: CameraSettingsSync) {
  set(sessionRef(sessionId, "cameraSettings"), settings);
}

export function watchCameraSettings(
  sessionId: string,
  callback: (settings: CameraSettingsSync | null) => void,
) {
  return watchKey<CameraSettingsSync | null>(sessionId, "cameraSettings", null, callback);
}

export function syncLighting(sessionId: string, lighting: LightingSettings) {
  set(sessionRef(sessionId, "lighting"), lighting);
}

export function watchLighting(
  sessionId: string,
  callback: (lighting: LightingSettings | null) => void,
) {
  return watchKey<LightingSettings | null>(sessionId, "lighting", null, callback);
}

export function syncSpeedSettings(sessionId: string, speed: SpeedSettings) {
  set(sessionRef(sessionId, "speedSettings"), speed);
}

export function watchSpeedSettings(
  sessionId: string,
  callback: (speed: SpeedSettings | null) => void,
) {
  return watchKey<SpeedSettings | null>(sessionId, "speedSettings", null, callback);
}

export function syncCameraPath(sessionId: string, path: CameraPathSync) {
  set(sessionRef(sessionId, "cameraPath"), path);
}

export function watchCameraPath(sessionId: string, callback: (path: CameraPathSync | null) => void) {
  return watchKey<CameraPathSync | null>(sessionId, "cameraPath", null, callback);
}

// Phone -> desktop: the camera path the phone just recorded with its gyro.
// Kept apart from `cameraPath` (desktop -> capture page) so the two directions
// can't echo each other.
export function sendRecordedPath(sessionId: string, path: CameraPathSync) {
  return set(sessionRef(sessionId, "recordedPath"), path);
}

// Wipe any recording left over from an earlier visit, so a stale one isn't
// mistaken for something the phone just recorded.
export function clearRecordedPath(sessionId: string) {
  return set(sessionRef(sessionId, "recordedPath"), null);
}

export function watchRecordedPath(sessionId: string, callback: (path: CameraPathSync) => void) {
  return onValue(sessionRef(sessionId, "recordedPath"), (snapshot) => {
    const value = snapshot.val() as CameraPathSync | null;
    if (value && Array.isArray(value.keys) && value.keys.length >= 2) callback(value);
  });
}

export function mobileSessionUrl(sessionId: string, mode: "phone" | "capture" = "phone"): string {
  const url = new URL(window.location.href);
  url.search = `?mode=${mode}&session=${sessionId}`;
  return url.toString();
}
