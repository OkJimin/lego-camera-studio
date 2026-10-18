import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { TAG_LAYER } from "./NameTag";
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

// Editor preview: when the average frame takes longer than this (about 40fps),
// drop the blur's render resolution by a step, down to a floor.
const SLOW_FRAME_SECONDS = 0.025;
const SLOW_CHECK_SECONDS = 1;
const RESOLUTION_STEP = 0.75;
const MIN_RESOLUTION = 0.4;
// A frame this long is a hidden tab or a hiccup, not a sign the effect is slow.
const IGNORED_FRAME_SECONDS = 0.25;
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

// Draws the name tags over the already-blurred image. They're kept out of the
// earlier passes (their layer is switched off for those), so they stay sharp and
// don't leave a stray patch in the depth buffer the blur is computed from.
class TagOverlayPass extends Pass {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    // Draws into the current image instead of producing a new one.
    this.needsSwap = false;
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    const layerMask = this.camera.layers.mask;
    const background = this.scene.background;
    const autoClear = renderer.autoClear;

    this.camera.layers.set(TAG_LAYER);
    // A color background would be painted over the image (even with autoClear off).
    this.scene.background = null;
    renderer.autoClear = false;
    renderer.setRenderTarget(readBuffer);
    renderer.render(this.scene, this.camera);

    renderer.autoClear = autoClear;
    this.scene.background = background;
    this.camera.layers.mask = layerMask;
  }
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
//
// `quality` "editor" keeps the live preview smooth: it draws at most at the page's
// CSS resolution (not the screen's, which can be 4x the pixels on a high-DPI
// display), with lighter antialiasing, and steps the resolution down further by
// itself if frames are still slow. "export" always draws at full quality.
export function DepthOfFieldEffect({
  getFocusPoint,
  quality = "export",
}: {
  getFocusPoint: () => THREE.Vector3 | null;
  quality?: "editor" | "export";
}) {
  const { gl, scene, camera, size, get } = useThree();
  const autofocusRef = useRef<number | null>(null);
  const isEditor = quality === "editor";
  // Fraction of the canvas's own pixel ratio the effect renders at.
  const resolutionRef = useRef(isEditor ? Math.min(1, 1 / gl.getPixelRatio()) : 1);
  const slowTimeRef = useRef({ frames: 0, seconds: 0 });

  const [{ composer, bokeh }] = useState(() => {
    // Multisampled, since the composer draws offscreen where the canvas's own
    // antialiasing doesn't apply.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: isEditor ? 2 : 4,
    });
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
    composer.addPass(new TagOverlayPass(scene, camera));
    // Tone mapping and color space are skipped when drawing offscreen, so apply them last.
    composer.addPass(new OutputPass());
    return { composer, bokeh };
  });

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio() * resolutionRef.current);
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

    // If the live preview can't keep up, render the blur at a lower resolution
    // rather than let the camera move stutter. The blur hides the lost detail.
    if (isEditor && delta < IGNORED_FRAME_SECONDS) {
      const timing = slowTimeRef.current;
      timing.frames += 1;
      timing.seconds += delta;
      if (timing.seconds >= SLOW_CHECK_SECONDS) {
        const average = timing.seconds / timing.frames;
        timing.frames = 0;
        timing.seconds = 0;
        if (average > SLOW_FRAME_SECONDS && resolutionRef.current > MIN_RESOLUTION) {
          resolutionRef.current = Math.max(MIN_RESOLUTION, resolutionRef.current * RESOLUTION_STEP);
          composer.setPixelRatio(gl.getPixelRatio() * resolutionRef.current);
          composer.setSize(get().size.width, get().size.height);
        }
      }
    }
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

    // Name tags are hidden from the camera while the scene and blur are drawn;
    // TagOverlayPass switches them back on just for its own draw.
    persp.layers.disable(TAG_LAYER);
    composer.render(delta);
    persp.layers.enable(TAG_LAYER);
  }, 1);

  return null;
}
