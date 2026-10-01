export type ShotAction =
  | "zoomIn"
  | "zoomOut"
  | "tiltUp"
  | "tiltDown"
  | "panLeft"
  | "panRight";

export const shotActionState: Record<ShotAction, boolean> = {
  zoomIn: false,
  zoomOut: false,
  tiltUp: false,
  tiltDown: false,
  panLeft: false,
  panRight: false,
};

export function startShotAction(action: ShotAction) {
  shotActionState[action] = true;
}

export function stopAllShotActions() {
  for (const key of Object.keys(shotActionState) as ShotAction[]) {
    shotActionState[key] = false;
  }
}
