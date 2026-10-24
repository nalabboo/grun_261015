"use client";

import { useEffect, useRef } from "react";
import {
  CHAPTER2_BUBBLE_INSTANCES,
  type Chapter2BubbleInstance,
} from "@/constants/chapter2BubbleConfig";
import { getChapter2BubbleScroll22Visibility } from "@/constants/chapter2Scroll22Motion";

type Props = {
  scroll22Progress: number;
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
};

function createSimBodies(
  specs: readonly Chapter2BubbleInstance[],
  width: number,
  height: number,
): SimBody[] {
  const scale = Math.max(0.75, Math.min(1.35, height / 1080)) * 0.62;
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
  const restitution = 0.96;
  const wobble = 0.012;

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

export default function Chapter2FloatingBubbles({ scroll22Progress }: Props) {
  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const simRef = useRef<SimBody[] | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const scroll22Ref = useRef(scroll22Progress);
  scroll22Ref.current = scroll22Progress;

  useEffect(() => {
    const syncSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      sizeRef.current = { width, height };
      simRef.current = createSimBodies(CHAPTER2_BUBBLE_INSTANCES, width, height);
    };

    syncSize();
    window.addEventListener("resize", syncSize);

    let raf = 0;
    let last = performance.now();
    const start = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;
      const { width, height } = sizeRef.current;
      const sim = simRef.current;
      const layerVis = getChapter2BubbleScroll22Visibility(scroll22Ref.current);

      if (sim && width > 0 && height > 0 && layerVis > 0.01) {
        for (let i = 0; i < sim.length; i++) {
          const body = sim[i];
          const spec = CHAPTER2_BUBBLE_INSTANCES[i];

          body.halfH = (spec.heightVh * height) / 2;
          body.halfW = (body.halfH * spec.width) / spec.height;

          body.x += body.vx * dt;
          body.y += body.vy * dt;
          body.rot += body.spin * dt;
          bounce(body, width, height);

          const bobX = Math.sin(t * 0.35 + i * 0.7) * 14;
          const bobY = Math.cos(t * 0.42 + i * 0.5) * 18;

          const el = anchorRefs.current[i];
          if (el) {
            const alpha = spec.opacity * layerVis;
            el.style.opacity = String(alpha);
            el.style.visibility = alpha > 0.01 ? "visible" : "hidden";
            el.style.transform = `translate3d(${body.x + bobX}px, ${body.y + bobY}px, 0) translate(-50%, -50%) rotate(${body.rot}deg)`;
          }
        }
      } else {
        for (let i = 0; i < anchorRefs.current.length; i++) {
          const el = anchorRefs.current[i];
          if (el) {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
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

  if (scroll22Progress <= 0.001) {
    return null;
  }

  return (
    <div className="chapter2-bubble-layer" aria-hidden>
      {CHAPTER2_BUBBLE_INSTANCES.map((bubble, index) => {
        const aspect = bubble.width / bubble.height;
        return (
          <div
            key={bubble.id}
            ref={(el) => {
              anchorRefs.current[index] = el;
            }}
            className="chapter2-bubble-anchor"
            style={{ zIndex: bubble.zIndex }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bubble.src}
              alt=""
              draggable={false}
              decoding="async"
              className="chapter2-bubble"
              style={{
                height: `${bubble.heightVh * 100}vh`,
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
