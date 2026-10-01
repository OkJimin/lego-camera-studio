import { useEffect, useRef, useState } from "react";
import { FORMAT_PRESETS, useCameraSettingsStore } from "./useCameraSettingsStore";

export function AspectMask() {
  const formatIndex = useCameraSettingsStore((s) => s.formatIndex);
  const targetAspect = FORMAT_PRESETS[formatIndex].aspect;
  const rootRef = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState({ vertical: 0, horizontal: 0 });

  useEffect(() => {
    const container = rootRef.current?.parentElement;
    if (!container) return;

    const update = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const containerAspect = width / height;
      if (containerAspect > targetAspect) {
        setBars({ vertical: 0, horizontal: (width - height * targetAspect) / 2 });
      } else {
        setBars({ vertical: (height - width / targetAspect) / 2, horizontal: 0 });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [targetAspect]);

  return (
    <div ref={rootRef} className="aspect-mask" aria-hidden>
      <div className="aspect-mask__bar" style={{ top: 0, left: 0, right: 0, height: bars.vertical }} />
      <div
        className="aspect-mask__bar"
        style={{ bottom: 0, left: 0, right: 0, height: bars.vertical }}
      />
      <div
        className="aspect-mask__bar"
        style={{ top: 0, bottom: 0, left: 0, width: bars.horizontal }}
      />
      <div
        className="aspect-mask__bar"
        style={{ top: 0, bottom: 0, right: 0, width: bars.horizontal }}
      />
    </div>
  );
}
