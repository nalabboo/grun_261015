"use client";

import { useEffect, useRef } from "react";

/** Time for the green paint to fully cover the screen (ms). */
const COVER_MS = 3000;
/** Time for the paint layer to fade away and reveal the next scene (ms). */
const REVEAL_MS = 1800;
const STAMP_COUNT = 46;
const STAMP_GROW_MS = 1400;
const WASH_COLORS = ["58,160,112", "96,184,120", "34,128,96", "150,204,104", "62,170,150"];
const BASE_COLOR = "52,148,104";

type Stamp = {
  x: number;
  y: number;
  /** Final stamp width (css px). */
  size: number;
  rotation: number;
  flip: boolean;
  startMs: number;
  wash: string;
};

type PaintBleedTransitionProps = {
  /** Screen point (css px) where the paint starts spreading. */
  originX: number;
  originY: number;
  /** Transparent watercolor splash used as the paint stamp. */
  textureUrl: string;
  /** False while covering; true once the next scene is mounted underneath. */
  revealing: boolean;
  onCovered: () => void;
  onDone: () => void;
};

function easeOutCubic(t: number) {
  const c = Math.max(0, Math.min(1, t));
  return 1 - (1 - c) ** 3;
}

function createStamps(width: number, height: number, originX: number, originY: number) {
  const maxDist = Math.hypot(
    Math.max(originX, width - originX),
    Math.max(originY, height - originY),
  );
  const diag = Math.hypot(width, height);
  const stamps: Stamp[] = [];

  for (let i = 0; i < STAMP_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * maxDist;
    stamps.push({
      x: originX + Math.cos(angle) * dist,
      y: originY + Math.sin(angle) * dist * 0.8,
      size: diag * (0.8 + Math.random() * 0.7),
      rotation: (Math.random() - 0.5) * Math.PI * 0.9,
      flip: Math.random() < 0.5,
      startMs: (dist / maxDist) * COVER_MS * 0.5 + Math.random() * 260,
      wash: WASH_COLORS[i % WASH_COLORS.length],
    });
  }

  return stamps.sort((a, b) => a.startMs - b.startMs);
}

function drawStamp(
  ctx: CanvasRenderingContext2D,
  texture: HTMLImageElement,
  stamp: Stamp,
  elapsed: number,
) {
  const t = easeOutCubic((elapsed - stamp.startMs) / STAMP_GROW_MS);
  if (t <= 0) return;

  const w = stamp.size * (0.25 + 0.75 * t);
  const h = w * (texture.naturalHeight / texture.naturalWidth);

  ctx.save();
  ctx.translate(stamp.x, stamp.y);
  ctx.rotate(stamp.rotation);
  if (stamp.flip) ctx.scale(-1, 1);

  // Soft wash underneath so the stamps knit together into a solid layer.
  const washR = w * 0.32;
  const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, washR);
  wash.addColorStop(0, `rgba(${stamp.wash},${0.4 * t})`);
  wash.addColorStop(0.55, `rgba(${stamp.wash},${0.25 * t})`);
  wash.addColorStop(1, `rgba(${stamp.wash},0)`);
  ctx.fillStyle = wash;
  ctx.fillRect(-washR, -washR, washR * 2, washR * 2);

  ctx.globalAlpha = Math.min(1, t * 1.3);
  ctx.drawImage(texture, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export default function PaintBleedTransition({
  originX,
  originY,
  textureUrl,
  revealing,
  onCovered,
  onDone,
}: PaintBleedTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const texture = new Image();
    texture.src = textureUrl;
    const stamps = createStamps(width, height, originX, originY);
    let start = 0;
    let frameId = 0;
    let covered = false;

    const frame = (now: number) => {
      if (!texture.complete || texture.naturalWidth === 0) {
        frameId = requestAnimationFrame(frame);
        return;
      }
      if (start === 0) start = now;

      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);

      for (const stamp of stamps) drawStamp(ctx, texture, stamp, elapsed);

      // Final flood so the screen is guaranteed solid paint before the cut.
      const flood = easeOutCubic((elapsed - COVER_MS * 0.6) / (COVER_MS * 0.4));
      if (flood > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = `rgba(${BASE_COLOR},${flood})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if (!covered && elapsed >= COVER_MS) {
        covered = true;
        onCovered();
        return;
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [originX, originY, textureUrl, onCovered]);

  useEffect(() => {
    if (!revealing) return;
    const timer = window.setTimeout(onDone, REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [revealing, onDone]);

  return (
    <canvas
      ref={canvasRef}
      className={`paint-bleed${revealing ? " paint-bleed--revealing" : ""}`}
      style={{ transitionDuration: `${REVEAL_MS}ms` }}
    />
  );
}
