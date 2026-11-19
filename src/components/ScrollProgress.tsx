"use client";

import { useEffect, useRef } from "react";
import type { WorldViewRef } from "@/components/canvas/worldView";
import {
  GRUN_START_RATIO,
  SCROLL_PROGRESS,
  getBackgroundWhiteProgress,
  getGrunAmpelBarrierX,
  type SceneMetrics,
} from "@/constants/sceneConfig";

type ScrollProgressProps = {
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  /** Shown (fades in) — off while the book intro is still up. */
  visible: boolean;
};

/**
 * Chapter 1 scroll indicator: a thin translucent track on the right with a small pill that
 * moves down as grun walks from the start to the traffic light. Updated every frame straight
 * from `viewRef` (no React re-render), eased so it glides.
 */
export default function ScrollProgress({ metrics, viewRef, visible }: ScrollProgressProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const shown = useRef(0);
  /** The sky only ever gets lighter in chapter 1 (as the page background does). */
  const whiteMax = useRef(0);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const thumb = thumbRef.current;
      if (thumb && metrics.width > 0) {
        const start = metrics.width * GRUN_START_RATIO;
        const end = getGrunAmpelBarrierX(metrics);
        const raw = (viewRef.current.grunWorldX - start) / Math.max(1, end - start);
        const target = Math.min(1, Math.max(0, raw));
        shown.current += (target - shown.current) * SCROLL_PROGRESS.ease;
        thumb.style.setProperty("--scroll-progress", shown.current.toFixed(4));
        // Ink: white over the dark sky → dark grey over the bright sky.
        const white = Math.max(
          whiteMax.current,
          getBackgroundWhiteProgress(metrics, viewRef.current.worldScroll),
        );
        whiteMax.current = white;
        const ink = Math.round(255 + (SCROLL_PROGRESS.darkInk - 255) * white);
        trackRef.current?.style.setProperty("--scroll-ink", String(ink));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [metrics, viewRef]);

  return (
    <div
      ref={trackRef}
      className={`scroll-progress${visible ? " scroll-progress--on" : ""}`}
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
