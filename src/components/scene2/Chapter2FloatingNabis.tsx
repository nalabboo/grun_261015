"use client";

import { useEffect, useRef } from "react";
import {
  CHAPTER2_NABI_INSTANCES,
  getChapter2NabiBasePosition,
  getChapter2NabiOpacity,
} from "@/constants/chapter2NabiConfig";
import { getChapter2NabiScroll22ExitOpacity } from "@/constants/chapter2Scroll22Motion";
import { getChapter2NabiSubscene23ExitOpacity } from "@/constants/chapter2Subscene23Motion";
import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";

type Props = {
  sporeProgress: number;
  scroll22Progress: number;
  subscene23Phase?: Chapter2SubscenePlaybackPhase;
  subscene23ElapsedSec?: number;
  /** Scene 2-3 yellow gelb exit (1 = visible, 0 = gone). */
  yellowExitVisibility?: number;
};

export default function Chapter2FloatingNabis({
  sporeProgress,
  scroll22Progress,
  subscene23Phase = "2-1",
  subscene23ElapsedSec = 0,
  yellowExitVisibility = 1,
}: Props) {
  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sporeRef = useRef(sporeProgress);
  const scroll22Ref = useRef(scroll22Progress);
  const sub23PhaseRef = useRef(subscene23Phase);
  const sub23ElapsedRef = useRef(subscene23ElapsedSec);
  const yellowVisRef = useRef(yellowExitVisibility);
  const sizeRef = useRef({ width: 0, height: 0 });

  sporeRef.current = sporeProgress;
  scroll22Ref.current = scroll22Progress;
  sub23PhaseRef.current = subscene23Phase;
  sub23ElapsedRef.current = subscene23ElapsedSec;
  yellowVisRef.current = yellowExitVisibility;

  useEffect(() => {
    const syncSize = () => {
      sizeRef.current = { width: window.innerWidth, height: window.innerHeight };
    };
    syncSize();
    window.addEventListener("resize", syncSize);

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const { width, height } = sizeRef.current;
      const spore = sporeRef.current;

      if (width > 0 && height > 0 && spore > 0) {
        for (let i = 0; i < CHAPTER2_NABI_INSTANCES.length; i++) {
          const spec = CHAPTER2_NABI_INSTANCES[i];
          const el = anchorRefs.current[i];
          if (!el) continue;

          const scroll22 = scroll22Ref.current;
          const base = getChapter2NabiBasePosition(spec, spore, width, height);
          const scroll22ExitMul = getChapter2NabiScroll22ExitOpacity(spec, scroll22, spore);
          const sub23ExitMul = getChapter2NabiSubscene23ExitOpacity(
            spec,
            sub23PhaseRef.current,
            sub23ElapsedRef.current,
          );
          const stayMul = scroll22ExitMul * sub23ExitMul;
          const exitPush =
            (1 - stayMul) *
            Math.max(width, height) *
            0.38;
          const exitAngle = Math.atan2(
            spec.patrol.y - 0.5,
            spec.patrol.x - 0.5,
          );
          const opacity =
            getChapter2NabiOpacity(spec, spore) *
            yellowVisRef.current *
            stayMul;
          const baseX =
            base.x + Math.cos(exitAngle) * exitPush;
          const baseY =
            base.y + Math.sin(exitAngle) * exitPush;
          const phase = spec.flutterPhase;

          const driftPx = (spec.driftRadiusVw / 100) * width;
          const wingHz = base.entryComplete ? 6.5 : 4.2;
          const wingAmp = base.entryComplete ? 0.28 : 0.12;
          const wing = Math.sin(t * wingHz + phase * 2.1);
          const scaleY = 0.9 + (wing * 0.5 + 0.5) * wingAmp;
          const scaleX = 1.02 - (wing * 0.5 + 0.5) * (wingAmp * 0.28);
          const driftHz = base.entryComplete ? 0.55 : 0.32;
          const driftHz2 = base.entryComplete ? 0.82 : 0.48;
          const driftX =
            base.entryComplete && opacity > 0.01
              ? Math.sin(t * driftHz + phase) * driftPx +
                Math.sin(t * driftHz2 + phase * 1.3) * driftPx * 0.4
              : Math.sin(t * 0.28 + phase) * driftPx * 0.15 * opacity;
          const driftY =
            base.entryComplete && opacity > 0.01
              ? Math.cos(t * 0.68 + phase * 0.9) * driftPx * 0.5 +
                Math.sin(t * 0.42 + phase) * driftPx * 0.32
              : Math.cos(t * 0.24 + phase) * driftPx * 0.12 * opacity;
          const tilt =
            Math.sin(t * 1.35 + phase) * (base.entryComplete ? 4 : 2) + wing * 2.5;

          el.style.opacity = String(opacity);
          el.style.transform = `translate3d(${baseX + driftX}px, ${baseY + driftY}px, 0) translate(-50%, -50%) rotate(${tilt}deg) scale(${scaleX}, ${scaleY})`;
        }
      } else {
        for (let i = 0; i < anchorRefs.current.length; i++) {
          const el = anchorRefs.current[i];
          if (el) el.style.opacity = "0";
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", syncSize);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (sporeProgress <= 0) {
    return null;
  }

  return (
    <div className="chapter2-nabi-layer" aria-hidden>
      {CHAPTER2_NABI_INSTANCES.map((nabi, index) => {
        const aspect = nabi.width / nabi.height;
        return (
          <div
            key={nabi.id}
            ref={(el) => {
              anchorRefs.current[index] = el;
            }}
            className="chapter2-nabi-anchor"
            style={{ zIndex: nabi.zIndex }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={nabi.src}
              alt=""
              draggable={false}
              decoding="async"
              className="chapter2-nabi"
              style={{
                height: `${nabi.heightVh * 100}vh`,
                width: "auto",
                aspectRatio: String(aspect),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
