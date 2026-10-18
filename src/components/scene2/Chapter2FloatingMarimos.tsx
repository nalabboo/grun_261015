"use client";

import { useEffect, useRef, useState } from "react";
import { getChapter2BergViewportBlurPx } from "@/constants/chapter2Config";
import { SCENE_REFERENCE_HEIGHT } from "@/constants/sceneConfig";
import {
  CHAPTER2_MARIMO_INSTANCES,
  type Chapter2MarimoInstance,
} from "@/constants/chapter2MarimoConfig";

type SimBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  halfW: number;
  halfH: number;
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
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

export default function Chapter2FloatingMarimos() {
  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const simRef = useRef<SimBody[] | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const [viewportHeight, setViewportHeight] = useState(SCENE_REFERENCE_HEIGHT);

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
      const sim = simRef.current;
      if (sim && width > 0 && height > 0) {
        for (let i = 0; i < sim.length; i++) {
          const body = sim[i];
          const spec = CHAPTER2_MARIMO_INSTANCES[i];
          body.halfH = (spec.heightVh * height) / 2;
          body.halfW = (body.halfH * spec.width) / spec.height;

          body.x += body.vx * dt;
          body.y += body.vy * dt;
          body.rot += body.spin * dt;
          bounce(body, width, height);

          const el = anchorRefs.current[i];
          if (el) {
            el.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) translate(-50%, -50%) rotate(${body.rot}deg)`;
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
                opacity: marimo.opacity,
                filter,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
