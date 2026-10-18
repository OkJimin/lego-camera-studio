import { useEffect, useMemo } from "react";
import type { RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Name tags live on their own layer so the depth-of-field pass can leave them
// out of the blur and draw them crisply on top afterwards (see DepthOfFieldEffect).
export const TAG_LAYER = 1;

// Tag height as a fraction of the canvas height, whatever the lens or distance.
const TAG_SCREEN_HEIGHT = 0.04;
const FONT_FAMILY = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const CANVAS_HEIGHT = 80;
const PADDING_X = 24;

// Drawn with the browser's own 2D text so Korean renders without loading a font file.
function makeTagTexture(text: string) {
  const font = `600 46px ${FONT_FAMILY}`;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const width = Math.ceil(measure.measureText(text).width + PADDING_X * 2);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.beginPath();
  ctx.roundRect(0, 0, width, CANVAS_HEIGHT, 16);
  ctx.fill();
  ctx.font = font;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, PADDING_X, CANVAS_HEIGHT / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, aspect: width / CANVAS_HEIGHT };
}

// A billboard label that always faces the camera. Its position is set by the
// owner through `spriteRef` each frame (it follows a moving object).
export function NameTag({
  text,
  spriteRef,
  position,
}: {
  text: string;
  spriteRef: RefObject<THREE.Sprite | null>;
  position: [number, number, number];
}) {
  const camera = useThree((s) => s.camera);
  const tag = useMemo(() => makeTagTexture(text), [text]);

  useEffect(() => () => tag.texture.dispose(), [tag]);

  useEffect(() => {
    camera.layers.enable(TAG_LAYER);
    spriteRef.current?.layers.set(TAG_LAYER);
  }, [camera, spriteRef, tag]);

  useFrame(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    // With sizeAttenuation off, a sprite of scale.y covers scale.y / (2 tan(fov/2))
    // of the screen height, so size it from the lens to keep the tag a steady size.
    const fov = (camera as THREE.PerspectiveCamera).fov;
    const height = 2 * TAG_SCREEN_HEIGHT * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    sprite.scale.set(height * tag.aspect, height, 1);
  });

  return (
    <sprite ref={spriteRef} position={position} renderOrder={1000}>
      <spriteMaterial
        map={tag.texture}
        sizeAttenuation={false}
        depthTest={false}
        depthWrite={false}
        transparent
        toneMapped={false}
      />
    </sprite>
  );
}
