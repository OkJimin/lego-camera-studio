import { create } from "zustand";

// Open/close flag for the guide-video export dialog. It lives in a store (not in
// the settings panel) because the panel unmounts whenever the drawer is closed,
// which would otherwise cancel an export in progress.
interface GuideExportState {
  open: boolean;
  openExport: () => void;
  closeExport: () => void;
}

export const useGuideExportStore = create<GuideExportState>((set) => ({
  open: false,
  openExport: () => set({ open: true }),
  closeExport: () => set({ open: false }),
}));
