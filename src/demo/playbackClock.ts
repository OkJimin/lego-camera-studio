export const playbackClock = {
  elapsed: 0,
  duration: 1,
};

// A self-contained clock for canvases that play a guide independently of the
// desktop editor (phone recording, video export), so they don't touch the
// shared playbackClock / isPlaying flag the editor's own camera rig is driving.
export interface GuideClock {
  playing: boolean;
  elapsed: number;
  duration: number;
}

export function createGuideClock(): GuideClock {
  return { playing: false, elapsed: 0, duration: 1 };
}
