import { signInAnonymously } from "firebase/auth";
import { onDisconnect, onValue, ref, set, serverTimestamp } from "firebase/database";
import { auth, realtimeDb } from "../lib/firebase";

export interface PhoneOrientation {
  alpha: number;
  beta: number;
  gamma: number;
  time: number;
}

function randomSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 5; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function ensureAnonymousAuth(): Promise<void> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

export async function createPhoneSession(): Promise<string> {
  await ensureAnonymousAuth();
  const sessionId = randomSessionId();
  await set(ref(realtimeDb, `sessions/${sessionId}`), {
    createdAt: serverTimestamp(),
    phoneConnected: false,
  });
  return sessionId;
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

export function mobileSessionUrl(sessionId: string): string {
  const url = new URL(window.location.href);
  url.search = `?mode=phone&session=${sessionId}`;
  return url.toString();
}
