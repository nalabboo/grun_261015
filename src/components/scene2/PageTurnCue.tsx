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
      aria-label="스크롤해서 다음 장으로 넘기기"
      onClick={(event) => {
        event.stopPropagation();
        onTurnRef.current();
      }}
    >
      <svg className="page-turn__sheet" viewBox="0 0 100 100" aria-hidden>
        <defs>
          {/* Next page, seen under the lifted corner: darker close to the fold. */}
          <linearGradient id="page-curl-under" x1="0.35" y1="0.35" x2="1" y2="1">
            <stop offset="0" stopColor="#cfc4ad" />
            <stop offset="0.45" stopColor="#e6decd" />
            <stop offset="1" stopColor="#f3eee3" />
          </linearGradient>
          {/* The curled corner: a rolled paper catching the light in the middle of the roll. */}
          <linearGradient id="page-curl-roll" x1="0.32" y1="0.32" x2="0.78" y2="0.78">
            <stop offset="0" stopColor="#cdbfa2" />
            <stop offset="0.12" stopColor="#e4d9c3" />
            <stop offset="0.34" stopColor="#f8f4ea" />
            <stop offset="0.55" stopColor="#fffefa" />
            <stop offset="0.82" stopColor="#ebe3d2" />
            <stop offset="1" stopColor="#cbbfa5" />
          </linearGradient>
          <filter id="page-curl-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <clipPath id="page-curl-under-clip">
            <polygon points="100,18 100,100 18,100" />
          </clipPath>
        </defs>
        <polygon points="100,18 100,100 18,100" fill="url(#page-curl-under)" />
        {/* Shadow of the curl on the page below it, and along the fold on the scene. */}
        <path
          d="M100,18 C95,55 55,95 18,100 C46,72 72,46 100,18 Z"
          transform="translate(4 4)"
          fill="rgba(40, 30, 18, 0.35)"
          filter="url(#page-curl-blur)"
          clipPath="url(#page-curl-under-clip)"
        />
        <path
          d="M100,18 L18,100"
          stroke="rgba(40, 30, 18, 0.4)"
          strokeWidth="3"
          filter="url(#page-curl-blur)"
        />
        <path
          d="M100,18 C95,55 55,95 18,100 C46,72 72,46 100,18 Z"
          fill="url(#page-curl-roll)"
          stroke="rgba(110, 90, 60, 0.5)"
          strokeWidth="0.7"
        />
        <text className="page-turn__hint" x="62" y="64" transform="rotate(-45 62 64)">
          scroll
        </text>
        <text className="page-turn__label" x="95" y="95" textAnchor="end">
          {label}
        </text>
      </svg>
    </button>
  );
}
