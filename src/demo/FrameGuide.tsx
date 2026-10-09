import { AspectFrame } from "./AspectFrame";
import { FORMAT_PRESETS, useCameraSettingsStore } from "./useCameraSettingsStore";

// Outlines the part of the editor view that ends up in the exported video (the
// chosen aspect ratio, centered) and dims the rest. It doesn't block the view or
// take clicks, so the scene stays editable underneath.
export function FrameGuide() {
  const formatIndex = useCameraSettingsStore((s) => s.formatIndex);
  const format = FORMAT_PRESETS[formatIndex];

  return (
    <div className="frame-guide-layer" aria-hidden>
      <AspectFrame aspect={format.aspect} background="transparent">
        <div className="frame-guide">
          <span className="frame-guide__label">{format.label}</span>
        </div>
      </AspectFrame>
    </div>
  );
}
