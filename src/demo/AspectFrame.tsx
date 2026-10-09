import type { CSSProperties, ReactNode } from "react";

// Fits a box of exactly `aspect` inside its parent and renders children in it.
// A canvas drawn at the target aspect with the same vertical fov frames the shot
// exactly like the exported guide video does. Drawing a differently shaped canvas
// and covering the excess with bars (AspectMask) shows a different crop instead.
export function AspectFrame({
  aspect,
  background = "#000",
  children,
}: {
  aspect: number;
  // Color of the bars around the frame; "transparent" lets what's behind show.
  background?: string;
  children: ReactNode;
}) {
  return (
    <div className="aspect-host" style={{ background }}>
      <div className="aspect-frame" style={{ "--frame-aspect": aspect } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}
