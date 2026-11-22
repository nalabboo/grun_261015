"use client";

import Chapter2ClipCanvas from "@/components/scene2/Chapter2ClipCanvas";
import { useEffect, useRef } from "react";
import {
  CHAPTER2_STAGE_HEIGHT,
  CHAPTER2_STAGE_WIDTH,
  chapter2StageVh,
} from "@/constants/chapter2Viewport";
import {
  CHAPTER2_NABI_INSTANCES,
  getChapter2NabiBasePosition,
  getChapter2NabiOpacity,
} from "@/constants/chapter2NabiConfig";
import { getChapter2NabiScroll22ExitOpacity } from "@/constants/chapter2Scroll22Motion";
import { getChapter2NabiSubscene23ExitOpacity } from "@/constants/chapter2Subscene23Motion";
import { getChapter2NabiSubscene24Exit } from "@/constants/chapter2Subscene24Motion";
import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";

type Props = {
  sporeProgress: number;
  scroll22Progress: number;
  subscene23Phase?: Chapter2SubscenePlaybackPhase;
  subscene23ElapsedSec?: number;
  subscene24ElapsedSec?: number;
  /** Scene 2-3 yellow gelb exit (1 = visible, 0 = gone). */
  yellowExitVisibility?: number;
};

export default function Chapter2FloatingNabis({
  sporeProgress,
  scroll22Progress,
  subscene23Phase = "2-1",
  subscene23ElapsedSec = 0,
  subscene24ElapsedSec = 0,
  yellowExitVisibility = 1,
}: Props) {
  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sporeRef = useRef(sporeProgress);
  const scroll22Ref = useRef(scroll22Progress);
  const sub23PhaseRef = useRef(subscene23Phase);
  const sub23ElapsedRef = useRef(subscene23ElapsedSec);
  const sub24ElapsedRef = useRef(subscene24ElapsedSec);
  const yellowVisRef = useRef(yellowExitVisibility);
  const sizeRef = useRef({ width: 0, height: 0 });

  sporeRef.current = sporeProgress;
  scroll22Ref.current = scroll22Progress;
  sub23PhaseRef.current = subscene23Phase;
  sub23ElapsedRef.current = subscene23ElapsedSec;
  sub24ElapsedRef.current = subscene24ElapsedSec;
  yellowVisRef.current = yellowExitVisibility;

  useEffect(() => {
    sizeRef.current = { width: CHAPTER2_STAGE_WIDTH, height: CHAPTER2_STAGE_HEIGHT };

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
          const sub24Exit = getChapter2NabiSubscene24Exit(
            spec,
            sub23PhaseRef.current,
            sub24ElapsedRef.current,
            width,
            height,
          );
          const opacity =
            getChapter2NabiOpacity(spec, spore) *
            yellowVisRef.current *
            stayMul *
            sub24Exit.opacityMul;
          const baseX =
            base.x +
            Math.cos(exitAngle) * exitPush +
            sub24Exit.offsetX;
          const baseY =
            base.y +
            Math.sin(exitAngle) * exitPush +
            sub24Exit.offsetY;
          const phase = spec.flutterPhase;

          const driftPx = (spec.driftRadiusVw / 100) * width;
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
          // The wings flap in the clip itself; only a gentle sway here.
          const tilt = Math.sin(t * 1.35 + phase) * (base.entryComplete ? 4 : 2);

          el.style.opacity = String(opacity);
          el.style.transform = `translate3d(${baseX + driftX}px, ${baseY + driftY}px, 0) translate(-50%, -50%) rotate(${tilt}deg)`;
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
    return () => cancelAnimationFrame(raf);
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
            <div
              className="chapter2-nabi"
              style={{
                position: "relative",
                height: chapter2StageVh(nabi.heightVh),
                width: "auto",
                aspectRatio: String(aspect),
              }}
            >
              <Chapter2ClipCanvas clip={nabi.clip} boxWidth={nabi.width} boxHeight={nabi.height} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
