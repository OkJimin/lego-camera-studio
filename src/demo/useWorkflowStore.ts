import { create } from "zustand";

export type WorkflowMode = "start" | "web" | "phone-setup";

function readPhoneSessionIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "phone") return null;
  return params.get("session");
}

interface WorkflowState {
  mode: WorkflowMode;
  // Set once at load from the URL (?mode=phone&session=...); when present the
  // app renders the mobile controller regardless of `mode`.
  phoneSessionId: string | null;
  setMode: (mode: WorkflowMode) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  mode: "start",
  phoneSessionId: readPhoneSessionIdFromUrl(),
  setMode: (mode) => set({ mode }),
}));
