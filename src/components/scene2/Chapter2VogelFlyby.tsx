"use client";

import { useEffect, useRef } from "react";
import { getChapter2BergViewportBlurPx } from "@/constants/chapter2Config";
import {
  CHAPTER2_VOGEL,
  getChapter2SaFlyOpacity,
  getChapter2SaFlyProgress,
  getChapter2SaRestCenterPx,
  getChapter2SaShouldMount,
} from "@/constants/chapter2VogelConfig";

type Props = {
  viewportHeight: number;
  shiftX: number;
  shiftY: number;
  /** Scene 2-2 — same scroll segment as Nari reveal (0–1). */
  nariProgress: number;
};

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export default function Chapter2VogelFlyby({
  viewportHeight,
  shiftX,
  shiftY,
  nariProgress,
}: Props) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const shiftRef = useRef({ shiftX, shiftY });
  const nariRef = useRef(nariProgress);
  const landedAtRef = useRef<number | null>(null);

  shiftRef.current = { shiftX, shiftY };
  nariRef.current = nariProgress;

  useEffect(() => {
    let raf = 0;

    const tick = (now: number) => {
      const el = anchorRef.current;
      if (el) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const { shiftX: sx, shiftY: sy } = shiftRef.current;
        const rawProgress = getChapter2SaFlyProgress(nariRef.current);

        if (rawProgress <= 0) {
          landedAtRef.current = null;
          el.style.opacity = "0";
          raf = requestAnimationFrame(tick);
          return;
        }

        const progress = smoothstep(rawProgress);
        const flyOpacity = getChapter2SaFlyOpacity(rawProgress);
        if (progress >= 1 && landedAtRef.current === null) {
          landedAtRef.current = now;
        }
        if (progress < 1) {
          landedAtRef.current = null;
        }

        const ease = progress;
        const rest = getChapter2SaRestCenterPx(width, height, sx, sy);
        const startX = width * CHAPTER2_VOGEL.entryStartXNorm + sx;
        const startY = rest.y - height * 0.05;
        const flyBob =
          progress < 1
            ? Math.sin(progress * Math.PI * 3.5) * height * 0.008 * (1 - progress)
            : 0;
        const idleBob =
          progress >= 1 && landedAtRef.current !== null
            ? Math.sin((now - landedAtRef.current) / 1000 * 1.2) * height * 0.003
            : 0;

        const x = startX + (rest.x - startX) * ease;
        const y = startY + (rest.y - startY) * ease + flyBob + idleBob;

        el.style.opacity = String(flyOpacity);
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const aspect = CHAPTER2_VOGEL.width / CHAPTER2_VOGEL.height;
  const blurPx = getChapter2BergViewportBlurPx(viewportHeight, CHAPTER2_VOGEL.blurRatio);
  const filterParts = [`brightness(${CHAPTER2_VOGEL.brightness})`];
  if (blurPx >= 0.2) {
    filterParts.push(`blur(${blurPx.toFixed(2)}px)`);
  }

  if (!getChapter2SaShouldMount(nariProgress)) {
    return null;
  }

  return (
    <div
      ref={anchorRef}
      className="chapter2-vogel-anchor"
      style={{ zIndex: CHAPTER2_VOGEL.zIndex, opacity: 0 }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CHAPTER2_VOGEL.src}
        alt=""
        draggable={false}
        decoding="async"
        className="chapter2-vogel"
        style={{
          height: `${CHAPTER2_VOGEL.heightVh * 100}vh`,
          width: "auto",
          aspectRatio: String(aspect),
          filter: filterParts.join(" "),
        }}
      />
    </div>
  );
}
