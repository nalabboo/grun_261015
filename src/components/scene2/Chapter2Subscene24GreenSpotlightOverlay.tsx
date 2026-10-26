"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import {
  CHAPTER2_GREEN_SPOTLIGHT_DARK_ALPHA,
  CHAPTER2_GREEN_SPOTLIGHT_FADE_MS,
} from "@/constants/chapter2Subscene24ClickMarimo";

type CircleHole = {
  cx: number;
  cy: number;
  r: number;
};

type Props = {
  active: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
};

function collectGreenSpotlightCircles(root: HTMLDivElement): CircleHole[] {
  const rootRect = root.getBoundingClientRect();
  const nodes = root.querySelectorAll(".chapter2-green-spotlight-target");
  const circles: CircleHole[] = [];

  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return;
    const opacity = Number.parseFloat(style.opacity);
    if (Number.isFinite(opacity) && opacity <= 0.04) return;

    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    const cx = rect.left + rect.width / 2 - rootRect.left;
    const cy = rect.top + rect.height / 2 - rootRect.top;
    const isHero = node.classList.contains("chapter2-green-spotlight-target-hero");
    const r = isHero
      ? Math.min(155, Math.max(68, Math.hypot(rect.width, rect.height) * 0.48))
      : Math.min(96, Math.max(20, Math.min(rect.width, rect.height) * 0.56));
    circles.push({ cx, cy, r });
  });

  return circles;
}

export default function Chapter2Subscene24GreenSpotlightOverlay({
  active,
  rootRef,
}: Props) {
  const maskId = useId().replace(/:/g, "");
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [circles, setCircles] = useState<CircleHole[]>([]);
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

      const root = rootRef.current;
      if (root) {
        setCircles(collectGreenSpotlightCircles(root));
      }

      if (active) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, rootRef]);

  if (!active && overlayOpacity <= 0.001) return null;

  const blurFilterId = `${maskId}-hole-blur`;

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
              {circles.map((circle, index) => (
                <circle
                  key={`hole-${index}`}
                  cx={circle.cx}
                  cy={circle.cy}
                  r={circle.r}
                  fill="black"
                />
              ))}
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
