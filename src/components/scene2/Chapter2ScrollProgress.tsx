"use client";

import { useEffect, useRef } from "react";
import { SCROLL_PROGRESS } from "@/constants/sceneConfig";

type Chapter2ScrollProgressProps = {
  /** 0..1, updated every frame from Chapter2Scene. */
  progressRef: React.RefObject<number>;
  visible: boolean;
};

/**
 * Chapter 2 scroll indicator — same look as chapter 1 (`ScrollProgress.tsx`), fixed on the viewport.
 */
export default function Chapter2ScrollProgress({ progressRef, visible }: Chapter2ScrollProgressProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const thumb = thumbRef.current;
      if (thumb) {
        const target = Math.min(1, Math.max(0, progressRef.current));
        shown.current += (target - shown.current) * SCROLL_PROGRESS.ease;
        thumb.style.setProperty("--scroll-progress", shown.current.toFixed(4));
        trackRef.current?.style.setProperty("--scroll-ink", String(SCROLL_PROGRESS.darkInk));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [progressRef]);

  return (
    <div
      ref={trackRef}
      className={`scroll-progress scroll-progress--viewport${visible ? " scroll-progress--on" : ""}`}
      aria-hidden
      style={
        {
          "--scroll-track-h": `${SCROLL_PROGRESS.trackHeightVh}vh`,
          "--scroll-thumb-h": `${SCROLL_PROGRESS.thumbHeightPx}px`,
        } as React.CSSProperties
      }
    >
      <div ref={thumbRef} className="scroll-progress__thumb" />
    </div>
  );
}