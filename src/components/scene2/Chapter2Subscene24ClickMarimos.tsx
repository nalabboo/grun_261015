"use client";

import { useEffect, useRef, useState } from "react";
import { getChapter2BergViewportBlurPx } from "@/constants/chapter2Config";
import { CHAPTER2_STAGE_HEIGHT, chapter2StageVh } from "@/constants/chapter2Viewport";
import {
  CHAPTER2_CLICK_MARIMO_HEIGHT_VH,
  CHAPTER2_CLICK_MARIMO_Z_INDEX,
  createChapter2ClickMarimoBurst,
  getChapter2ClickMarimoBurstMotion,
  isChapter2ClickMarimoBurstAlive,
  type Chapter2ClickMarimoBurstParticle,
} from "@/constants/chapter2Subscene24ClickMarimo";

type Props = {
  enabled: boolean;
  burstSeq: number;
  burstX: number;
  burstY: number;
};

export default function Chapter2Subscene24ClickMarimos({
  enabled,
  burstSeq,
  burstX,
  burstY,
}: Props) {
  const particlesRef = useRef<Chapter2ClickMarimoBurstParticle[]>([]);
  const [renderTick, setRenderTick] = useState({ now: 0, particles: [] as Chapter2ClickMarimoBurstParticle[] });
  const lastBurstSeqRef = useRef(0);

  useEffect(() => {
    if (!enabled || burstSeq <= 0 || burstSeq === lastBurstSeqRef.current) return;
    lastBurstSeqRef.current = burstSeq;
    particlesRef.current = [
      ...particlesRef.current,
      ...createChapter2ClickMarimoBurst(burstX, burstY, burstSeq, performance.now()),
    ];
  }, [enabled, burstSeq, burstX, burstY]);

  useEffect(() => {
    if (!enabled) {
      particlesRef.current = [];
      setRenderTick({ now: 0, particles: [] });
      return;
    }

    let raf = 0;

    const loop = (now: number) => {
      const next = particlesRef.current.filter((p) => isChapter2ClickMarimoBurstAlive(p, now));
      particlesRef.current = next;
      setRenderTick({ now, particles: [...next] });
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  if (!enabled) return null;

  const blurPx = getChapter2BergViewportBlurPx(CHAPTER2_STAGE_HEIGHT, 0.0028);
  const filter = blurPx >= 0.35 ? `blur(${blurPx.toFixed(2)}px)` : undefined;
  const { now, particles: renderParticles } = renderTick;

  return (
    <div
      className="chapter2-click-marimo-layer"
      aria-hidden
    >
      {renderParticles.map((particle) => {
        const motion = getChapter2ClickMarimoBurstMotion(particle, now);
        if (motion.opacity <= 0.02) return null;
        const aspect = particle.width / particle.height;
        return (
          <div
            key={particle.id}
            className="chapter2-click-marimo-anchor"
            style={{
              zIndex: CHAPTER2_CLICK_MARIMO_Z_INDEX,
              opacity: motion.opacity,
              transform: `translate3d(${motion.x}px, ${motion.y}px, 0) translate(-50%, -50%) rotate(${motion.rot}deg) scale(${motion.scale})`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={particle.src}
              alt=""
              draggable={false}
              decoding="async"
              className="chapter2-click-marimo"
              style={{
                height: chapter2StageVh(CHAPTER2_CLICK_MARIMO_HEIGHT_VH),
                width: "auto",
                aspectRatio: String(aspect),
                filter,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
