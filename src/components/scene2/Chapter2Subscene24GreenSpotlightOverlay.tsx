"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CHAPTER2_GREEN_SPOTLIGHT_DARK_ALPHA,
  CHAPTER2_GREEN_SPOTLIGHT_FADE_MS,
  type Chapter2GreenSpotlightLockedCircle,
} from "@/constants/chapter2Subscene24ClickMarimo";

type Props = {
  active: boolean;
  /** Fixed in scene shell coords when spotlight engages (does not follow zoom). */
  lockedCircle: Chapter2GreenSpotlightLockedCircle | null;
};

export default function Chapter2Subscene24GreenSpotlightOverlay({
  active,
  lockedCircle,
}: Props) {
  const maskId = useId().replace(/:/g, "");
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const fadeStartRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setOverlayOpacity(0);
      fadeStartRef.current = 0;
      return;
    }

    fadeStartRef.current = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const fadeT = Math.min(1, (now - fadeStartRef.current) / CHAPTER2_GREEN_SPOTLIGHT_FADE_MS);
      const eased = 1 - (1 - fadeT) ** 2.2;
      setOverlayOpacity(eased);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active && overlayOpacity <= 0.001) return null;
  if (!lockedCircle) return null;

  const blurFilterId = `${maskId}-hole-blur`;
  const circle = lockedCircle;

  return (
    <div
      className="chapter2-green-spotlight-overlay"
      aria-hidden
      style={{ opacity: overlayOpacity }}
    >
      <svg className="chapter2-green-spotlight-overlay__svg" width="100%" height="100%">
        <defs>
          <filter
            id={blurFilterId}
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="11" />
          </filter>
          <mask id={`${maskId}-mask`}>
            <rect width="100%" height="100%" fill="white" />
            <g filter={`url(#${blurFilterId})`}>
              <circle cx={circle.cx} cy={circle.cy} r={circle.r} fill="black" />
            </g>
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`rgba(2, 5, 4, ${CHAPTER2_GREEN_SPOTLIGHT_DARK_ALPHA})`}
          mask={`url(#${maskId}-mask)`}
        />
      </svg>
    </div>
  );
}
