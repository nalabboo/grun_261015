"use client";

import { useEffect, useRef, useState } from "react";
import { getChapter2BergViewportBlurPx } from "@/constants/chapter2Config";
import { SCENE_REFERENCE_HEIGHT } from "@/constants/sceneConfig";
import {
  CHAPTER2_MARIMO_INSTANCES,
  getChapter2MarimoSporeExitOpacity,
  getChapter2MarimoSporeExitProgress,
  type Chapter2MarimoInstance,
} from "@/constants/chapter2MarimoConfig";
import {
  getChapter2MarimoLaublExitOpacity,
  getChapter2MarimoLaublExitProgress,
} from "@/constants/chapter2Subscene23Motion";
import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";
import {
  getChapter2MarimoScroll22ExitAngleRad,
  getChapter2MarimoScroll22ExitOpacity,
  getChapter2MarimoScroll22ExitProgress,
} from "@/constants/chapter2Scroll22Motion";

type Props = {
  sporeProgress: number;
  scroll22Progress: number;
  subscene23Phase?: Chapter2SubscenePlaybackPhase;
  subscene23ElapsedSec?: number;
};

type SimBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  halfW: number;
  halfH: number;
  retired: boolean;
};

function createSimBodies(
  specs: readonly Chapter2MarimoInstance[],
  width: number,
  height: number,
): SimBody[] {
  const scale = Math.max(0.75, Math.min(1.35, height / 1080));
  return specs.map((spec) => {
    const halfH = (spec.heightVh * height) / 2;
    const halfW = (halfH * spec.width) / spec.height;
    const x = spec.xNorm * width;
    const y = spec.yNorm * height;
    return {
      x: clamp(x, halfW, width - halfW),
      y: clamp(y, halfH, height - halfH),
      vx: spec.vx * scale,
      vy: spec.vy * scale,
      rot: 0,
      spin: spec.spinDegPerSec,
      halfW,
      halfH,
      retired: false,
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function bounce(body: SimBody, width: number, height: number) {
  const restitution = 0.94;
  const wobble = 0.02;

  if (body.x - body.halfW <= 0) {
    body.x = body.halfW;
    body.vx = Math.abs(body.vx) * restitution;
    body.vy += (Math.random() - 0.5) * body.vy * wobble;
  } else if (body.x + body.halfW >= width) {
    body.x = width - body.halfW;
    body.vx = -Math.abs(body.vx) * restitution;
    body.vy += (Math.random() - 0.5) * body.vy * wobble;
  }

  if (body.y - body.halfH <= 0) {
    body.y = body.halfH;
    body.vy = Math.abs(body.vy) * restitution;
    body.vx += (Math.random() - 0.5) * body.vx * wobble;
  } else if (body.y + body.halfH >= height) {
    body.y = height - body.halfH;
    body.vy = -Math.abs(body.vy) * restitution;
    body.vx += (Math.random() - 0.5) * body.vx * wobble;
  }
}

function isOffScreen(body: SimBody, width: number, height: number) {
  const pad = Math.max(body.halfW, body.halfH) * 1.2;
  return (
    body.x < -pad ||
    body.x > width + pad ||
    body.y < -pad ||
    body.y > height + pad
  );
}

export default function Chapter2FloatingMarimos({
  sporeProgress,
  scroll22Progress,
  subscene23Phase = "2-1",
  subscene23ElapsedSec = 0,
}: Props) {
  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const simRef = useRef<SimBody[] | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const sporeRef = useRef(sporeProgress);
  const scroll22Ref = useRef(scroll22Progress);
  const sub23PhaseRef = useRef(subscene23Phase);
  const sub23ElapsedRef = useRef(subscene23ElapsedSec);
  const [viewportHeight, setViewportHeight] = useState(SCENE_REFERENCE_HEIGHT);

  sporeRef.current = sporeProgress;
  scroll22Ref.current = scroll22Progress;
  sub23PhaseRef.current = subscene23Phase;
  sub23ElapsedRef.current = subscene23ElapsedSec;

  useEffect(() => {
    const syncSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      sizeRef.current = { width, height };
      setViewportHeight(height);
      simRef.current = createSimBodies(CHAPTER2_MARIMO_INSTANCES, width, height);
    };

    syncSize();
    window.addEventListener("resize", syncSize);

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const { width, height } = sizeRef.current;
      const spore = sporeRef.current;
      const sim = simRef.current;
      const scale = Math.max(0.75, Math.min(1.35, height / 1080));

      if (sim && width > 0 && height > 0) {
        if (spore <= 0.001) {
          for (let i = 0; i < sim.length; i++) {
            const body = sim[i];
            if (!body.retired) continue;
            const spec = CHAPTER2_MARIMO_INSTANCES[i];
            body.retired = false;
            body.halfH = (spec.heightVh * height) / 2;
            body.halfW = (body.halfH * spec.width) / spec.height;
            body.x = clamp(spec.xNorm * width, body.halfW, width - body.halfW);
            body.y = clamp(spec.yNorm * height, body.halfH, height - body.halfH);
            const scaleReset = Math.max(0.75, Math.min(1.35, height / 1080));
            body.vx = spec.vx * scaleReset;
            body.vy = spec.vy * scaleReset;
            body.rot = 0;
            body.spin = spec.spinDegPerSec;
            const el = anchorRefs.current[i];
            if (el) {
              el.style.visibility = "visible";
              el.style.opacity = String(spec.opacity);
            }
          }
        }

        for (let i = 0; i < sim.length; i++) {
          const body = sim[i];
          const spec = CHAPTER2_MARIMO_INSTANCES[i];
          if (body.retired) continue;

          body.halfH = (spec.heightVh * height) / 2;
          body.halfW = (body.halfH * spec.width) / spec.height;

          const scroll22 = scroll22Ref.current;
          const sporeExitProgress = getChapter2MarimoSporeExitProgress(spec, spore);
          const scroll22ExitProgress = getChapter2MarimoScroll22ExitProgress(i, scroll22);
          const laublExitProgress = getChapter2MarimoLaublExitProgress(
            spec,
            sub23PhaseRef.current,
            sub23ElapsedRef.current,
          );
          const exitProgress = Math.max(
            sporeExitProgress,
            laublExitProgress,
            scroll22ExitProgress,
          );

          let exitOpacity = getChapter2MarimoScroll22ExitOpacity(i, scroll22);
          if (sporeExitProgress > 0 && spec.sporeExit) {
            exitOpacity = Math.min(exitOpacity, getChapter2MarimoSporeExitOpacity(spec, spore));
          }
          if (laublExitProgress > 0 && spec.laublExit) {
            exitOpacity = Math.min(
              exitOpacity,
              getChapter2MarimoLaublExitOpacity(
                spec,
                sub23PhaseRef.current,
                sub23ElapsedRef.current,
              ),
            );
          }

          const exitAngleRad =
            laublExitProgress >= sporeExitProgress &&
            laublExitProgress >= scroll22ExitProgress &&
            spec.laublExit
              ? spec.laublExit.exitAngleRad
              : scroll22ExitProgress >= sporeExitProgress &&
                  scroll22ExitProgress > 0
                ? getChapter2MarimoScroll22ExitAngleRad(spec.xNorm, spec.yNorm)
                : spec.sporeExit?.exitAngleRad;

          if (exitProgress > 0 && exitAngleRad !== undefined) {
            const drift = exitProgress * exitProgress;
            const targetSpeed = (28 + drift * 95) * scale;
            const tx = Math.cos(exitAngleRad) * targetSpeed;
            const ty = Math.sin(exitAngleRad) * targetSpeed;
            const blend = Math.min(1, exitProgress * 2.2);
            body.vx = lerp(body.vx, tx, 0.035 * blend);
            body.vy = lerp(body.vy, ty, 0.035 * blend);
            body.spin = lerp(body.spin, spec.spinDegPerSec * 0.35, 0.02);
          }

          body.x += body.vx * dt;
          body.y += body.vy * dt;
          body.rot += body.spin * dt;

          if (exitProgress <= 0.12) {
            bounce(body, width, height);
          }

          const el = anchorRefs.current[i];
          if (el) {
            const alpha = spec.opacity * exitOpacity;
            if (alpha <= 0.02 && (exitProgress >= 0.92 || isOffScreen(body, width, height))) {
              body.retired = true;
              el.style.opacity = "0";
              el.style.visibility = "hidden";
            } else {
              el.style.opacity = String(alpha);
              el.style.visibility = alpha > 0.01 ? "visible" : "hidden";
              el.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) translate(-50%, -50%) rotate(${body.rot}deg)`;
            }
          }
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

  return (
    <div className="chapter2-marimo-layer" aria-hidden>
      {CHAPTER2_MARIMO_INSTANCES.map((marimo, index) => {
        const aspect = marimo.width / marimo.height;
        const blurPx = getChapter2BergViewportBlurPx(viewportHeight, marimo.blurRatio);
        const filter = blurPx >= 0.35 ? `blur(${blurPx.toFixed(2)}px)` : undefined;
        return (
          <div
            key={marimo.id}
            ref={(el) => {
              anchorRefs.current[index] = el;
            }}
            className="chapter2-marimo-anchor"
            style={{ zIndex: marimo.zIndex }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={marimo.src}
              alt=""
              draggable={false}
              decoding="async"
              className="chapter2-marimo"
              style={{
                height: `${marimo.heightVh * 100}vh`,
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
