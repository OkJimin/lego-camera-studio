import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { playbackClock } from "./playbackClock";
import { blockPositionAt, useBlockStore } from "./useBlockStore";
import { useCameraPathStore } from "./useCameraPathStore";
import { fovToFocalLength, useCameraSettingsStore } from "./useCameraSettingsStore";

// How blurry the farthest (and the very nearest) surfaces get, as a fraction of
// the image width, for a 50mm lens at the default strength, focused 6 units
// away. Longer lenses and closer focus blur more, as on a real lens.
const FULL_BLUR = 0.009;
const REFERENCE_FOCAL_MM = 50;
const REFERENCE_FOCUS = 6;
// The 0..1 strength slider's middle (0.5) is the reference blur above.
const STRENGTH_SCALE = 2;
// How quickly autofocus settles on a new subject (higher = snappier).
const AUTOFOCUS_SPEED = 8;
// Hard cap on the blur. The shader samples a fixed number of taps, so past about
// this radius the blur breaks into streaks.
const MAX_BLUR = 0.016;
const MIN_FOCUS_DISTANCE = 0.1;

const _direction = new THREE.Vector3();
const _toSubject = new THREE.Vector3();
const _editorFocus = new THREE.Vector3();

// Where the focus object is right now in the editor, following its move during playback.
export function editorFocusPoint(): THREE.Vector3 | null {
  const { focusBlockId } = useCameraSettingsStore.getState();
  if (!focusBlockId) return null;
  const block = useBlockStore.getState().blocks.find((b) => b.id === focusBlockId);
  if (!block) return null;
  const playing = useCameraPathStore.getState().isPlaying;
  return _editorFocus.set(
    ...blockPositionAt(block, playing, playbackClock.elapsed, playbackClock.duration),
  );
}

function fullBlur(focalLengthMm: number, strength: number, focus: number): number {
  const lens = focalLengthMm / REFERENCE_FOCAL_MM;
  const closeness = THREE.MathUtils.clamp(REFERENCE_FOCUS / focus, 0.5, 2);
  return FULL_BLUR * lens * lens * strength * STRENGTH_SCALE * closeness;
}

const _raycaster = new THREE.Raycaster();
const _screenCenter = new THREE.Vector2(0, 0);

// The editor's transform gizmo lives in the scene too; it shouldn't grab the focus.
function isEditorHelper(object: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    const flags = node as unknown as Record<string, unknown>;
    if (flags.isTransformControlsRoot || flags.isTransformControlsGizmo || flags.isTransformControlsPlane) {
      return true;
    }
  }
  return false;
}

// Depth of whatever is at the center of the frame, like a camera's autofocus.
// Null when the center is empty (looking at the sky).
function centerDepth(scene: THREE.Scene, camera: THREE.Camera): number | null {
  _raycaster.setFromCamera(_screenCenter, camera);
  const hit = _raycaster
    .intersectObjects(scene.children, true)
    .find((h) => h.object instanceof THREE.Mesh && h.object.visible && !isEditorHelper(h.object));
  // The center ray runs along the view axis, so its length is the depth.
  return hit ? hit.distance : null;
}

// Replaces the canvas's normal render with one that blurs by depth. Mount it
// only while depth of field is wanted: unmounting hands rendering back to R3F.
// `getFocusPoint` returns the pinned focus object's current world position, or
// null to autofocus on whatever is at the center of the frame.
export function DepthOfFieldEffect({ getFocusPoint }: { getFocusPoint: () => THREE.Vector3 | null }) {
  const { gl, scene, camera, size } = useThree();
  const autofocusRef = useRef<number | null>(null);

  const [{ composer, bokeh }] = useState(() => {
    // Multisampled, since the composer draws offscreen where the canvas's own
    // antialiasing doesn't apply.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(gl, target);
    const bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.0025, maxblur: MAX_BLUR });
    // The stock shader blurs in proportion to how far a surface is from the focus
    // plane, without limit, which smears the distance (the horizon, the ground
    // stretching away) into streaks. Use a blur amount that runs 0..1 on both
    // sides of the focus plane instead: 0 on it, 1 at the camera on the near
    // side and 1 at infinity on the far side. `aperture` then sets that maximum.
    const original = bokeh.materialBokeh.fragmentShader;
    const stockFactor = "float factor = ( focus + viewZ );";
    if (original.includes(stockFactor)) {
      bokeh.materialBokeh.fragmentShader = original.replace(
        stockFactor,
        `float dist = -viewZ;
			float factor = dist < focus
				? ( focus - dist ) / focus
				: -( dist - focus ) / max( dist, 0.1 );`,
      );
      bokeh.materialBokeh.needsUpdate = true;
    }
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bokeh);
    // Tone mapping and color space are skipped when drawing offscreen, so apply them last.
    composer.addPass(new OutputPass());
    return { composer, bokeh };
  });

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.width, size.height]);

  useEffect(
    () => () => {
      bokeh.dispose();
      composer.dispose();
    },
    [composer, bokeh],
  );

  // Priority above 0 makes this the one that renders the frame.
  useFrame((_, delta) => {
    const persp = camera as THREE.PerspectiveCamera;
    const { blurStrength, focusDistance } = useCameraSettingsStore.getState();

    let focus: number;
    const subject = getFocusPoint();
    if (subject) {
      // Depth is measured along the view direction, not as straight-line distance.
      persp.getWorldDirection(_direction);
      focus = _toSubject.copy(subject).sub(persp.position).dot(_direction);
      autofocusRef.current = focus;
    } else {
      // Autofocus eases toward the new subject instead of snapping, like a real lens.
      const target = centerDepth(scene, camera) ?? autofocusRef.current ?? focusDistance;
      const current = autofocusRef.current ?? target;
      focus = current + (target - current) * (1 - Math.exp(-delta * AUTOFOCUS_SPEED));
      autofocusRef.current = focus;
    }

    // The pass types its uniforms as an empty object, though they're plain numbers.
    const uniforms = bokeh.uniforms as Record<string, { value: number }>;
    const focusDepth = Math.max(MIN_FOCUS_DISTANCE, focus);
    uniforms.focus.value = focusDepth;
    uniforms.aperture.value = fullBlur(fovToFocalLength(persp.fov), blurStrength, focusDepth);
    uniforms.aspect.value = persp.aspect;
    composer.render(delta);
  }, 1);

  return null;
}
