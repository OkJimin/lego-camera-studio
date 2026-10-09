import { create } from "zustand";

export type WorkflowMode = "start" | "web" | "phone-setup";

function readSessionIdFromUrl(urlMode: "phone" | "capture"): string | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== urlMode) return null;
  return params.get("session");
}

function isShootModeInUrl(): boolean {
  return new URLSearchParams(window.location.search).get("mode") === "shoot";
}

interface WorkflowState {
  mode: WorkflowMode;
  // Set once at load from the URL (?mode=phone|capture&session=...); when present
  // the app renders that paired-device screen regardless of `mode`.
  phoneSessionId: string | null;
  captureSessionId: string | null;
  // ?mode=shoot: phone-side project library, no pairing session needed.
  shootMode: boolean;
  setMode: (mode: WorkflowMode) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  mode: "start",
  phoneSessionId: readSessionIdFromUrl("phone"),
  captureSessionId: readSessionIdFromUrl("capture"),
  shootMode: isShootModeInUrl(),
  setMode: (mode) => set({ mode }),
}));
