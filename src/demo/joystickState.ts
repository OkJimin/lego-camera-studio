// Shared mutable state: the on-screen joystick (plain HTML, outside the
// Canvas) writes to this, the per-frame movement rig inside the Canvas reads
// it — avoids plumbing React state across the Canvas boundary every frame.
export const joystickState = { x: 0, y: 0 };
