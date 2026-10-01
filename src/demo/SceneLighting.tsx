import {
  SCENE_BACKGROUND_COLOR,
  ambientIntensityFromPercent,
  computeKeyLightPosition,
  keyIntensityFromPercent,
  kelvinToColor,
  useLightingStore,
} from "./useLightingStore";

export function SceneLighting({ castShadow = false }: { castShadow?: boolean }) {
  const ambientPercent = useLightingStore((s) => s.ambientPercent);
  const keyPercent = useLightingStore((s) => s.keyPercent);
  const keyTemperature = useLightingStore((s) => s.keyTemperature);
  const keyAzimuth = useLightingStore((s) => s.keyAzimuth);
  const keyElevation = useLightingStore((s) => s.keyElevation);
  const keyPosition = computeKeyLightPosition(keyAzimuth, keyElevation);

  return (
    <>
      <color attach="background" args={[SCENE_BACKGROUND_COLOR]} />
      <ambientLight intensity={ambientIntensityFromPercent(ambientPercent)} />
      <directionalLight
        position={keyPosition}
        intensity={keyIntensityFromPercent(keyPercent)}
        color={kelvinToColor(keyTemperature)}
        castShadow={castShadow}
      />
    </>
  );
}
