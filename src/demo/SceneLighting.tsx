import {
  SCENE_BACKGROUND_COLOR,
  ambientIntensityFromPercent,
  computeKeyLightPosition,
  keyIntensityFromPercent,
  kelvinToColor,
  useLightingStore,
} from "./useLightingStore";
import type { LightingSettings } from "./useLightingStore";

export function SceneLighting({
  castShadow = false,
  settings,
}: {
  castShadow?: boolean;
  // Pass synced settings (e.g. from a paired phone session) to light the scene
  // from that data instead of this page's own lighting store.
  settings?: LightingSettings;
}) {
  const storeAmbientPercent = useLightingStore((s) => s.ambientPercent);
  const storeKeyPercent = useLightingStore((s) => s.keyPercent);
  const storeKeyTemperature = useLightingStore((s) => s.keyTemperature);
  const storeKeyAzimuth = useLightingStore((s) => s.keyAzimuth);
  const storeKeyElevation = useLightingStore((s) => s.keyElevation);

  const {
    ambientPercent,
    keyPercent,
    keyTemperature,
    keyAzimuth,
    keyElevation,
  } = settings ?? {
    ambientPercent: storeAmbientPercent,
    keyPercent: storeKeyPercent,
    keyTemperature: storeKeyTemperature,
    keyAzimuth: storeKeyAzimuth,
    keyElevation: storeKeyElevation,
  };
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
