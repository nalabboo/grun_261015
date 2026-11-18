"use client";

import { useEffect, useRef } from "react";
import { PAGE_TURN } from "@/constants/pageTurnConfig";
import { SCENE2_PAPIER, tableauAssetUrl } from "@/constants/scene2Config";

type PageTurnCueProps = {
  onTurn: () => void;
  label?: string;
};

/**
 * Bottom-right page corner that invites the reader to turn the page. Scrolling down (wheel,
 * swipe up, ↓ / PageDown / Space) turns it; clicking the corner still works too.
 */
export default function PageTurnCue({ onTurn, label = "2장" }: PageTurnCueProps) {
  const onTurnRef = useRef(onTurn);
  useEffect(() => {
    onTurnRef.current = onTurn;
  }, [onTurn]);

  useEffect(() => {
    // The flipping sheets use the paper texture: make sure it is loaded before the turn.
    const paper = new Image();
    paper.src = tableauAssetUrl(SCENE2_PAPIER);

    const armedAt = performance.now() + PAGE_TURN.armDelayMs;
    let wheelSum = 0;
    let touchStartY: number | null = null;
    let fired = false;
    const turn = () => {
      if (fired || performance.now() < armedAt) return;
      fired = true;
      onTurnRef.current();
    };

    const onWheel = (event: WheelEvent) => {
      if (performance.now() < armedAt) return;
      wheelSum = Math.max(0, wheelSum + event.deltaY);
      if (wheelSum >= PAGE_TURN.wheelThreshold) turn();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (touchStartY === null || y === undefined) return;
      if (touchStartY - y >= PAGE_TURN.swipeThresholdPx) turn();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "ArrowRight"].includes(event.key)) turn();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <button
      type="button"
      className="page-turn"
      aria-label={`스크롤해서 ${label}으로 넘기기`}
      onClick={(event) => {
        event.stopPropagation();
        onTurnRef.current();
      }}
    >
      {/* Dog-eared page: the bottom-right corner is folded over onto the page. */}
      <svg className="page-turn__sheet" viewBox="0 0 100 100" aria-hidden>
        <defs>
          {/* Behind the page, uncovered by the fold: darker close to the fold. */}
          <linearGradient id="page-fold-under" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a9a39a" />
            <stop offset="0.5" stopColor="#c9c4bb" />
            <stop offset="1" stopColor="#dcd8d0" />
          </linearGradient>
          {/* Back of the folded corner: light along the fold, shaded where it curls at the tip. */}
          <linearGradient id="page-fold-flap" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#f5f4f0" />
            <stop offset="0.8" stopColor="#dbd7ce" />
            <stop offset="1" stopColor="#c6c0b3" />
          </linearGradient>
          <filter id="page-fold-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <clipPath id="page-fold-under-clip">
            <polygon points="40,100 100,100 100,40" />
          </clipPath>
        </defs>
        <polygon points="40,100 100,100 100,40" fill="url(#page-fold-under)" />
        {/* The fold casts a soft shadow into the uncovered corner. */}
        <path
          d="M40,100 L100,40"
          stroke="rgba(30, 24, 16, 0.45)"
          strokeWidth="5"
          filter="url(#page-fold-blur)"
          clipPath="url(#page-fold-under-clip)"
        />
        {/* Shadow of the folded corner on the page. */}
        <path
          d="M40,100 Q49,73 46,46 Q73,49 100,40 Z"
          transform="translate(-1.5 1.5)"
          fill="rgba(30, 24, 16, 0.32)"
          filter="url(#page-fold-blur)"
        />
        <path
          d="M40,100 Q49,73 46,46 Q73,49 100,40 Z"
          fill="url(#page-fold-flap)"
          stroke="rgba(120, 110, 95, 0.45)"
          strokeWidth="0.5"
        />
      </svg>
    </button>
  );
}
