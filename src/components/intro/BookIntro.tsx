"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IntroFloaters from "@/components/intro/IntroFloaters";
import {
  BOOK_INTRO_FADEOUT_MS,
  INTRO_PAPIER_URL,
  INTRO_RICORI1_2,
  INTRO_RICORI1_2_URL,
  INTRO_RICORI1_2SW,
  INTRO_RICORI1_2SW_URL,
  INTRO_SCRATCH,
} from "@/constants/introConfig";

type BookIntroProps = {
  onComplete: () => void;
};

const logoWidthCss = `min(${INTRO_RICORI1_2SW.widthVw}vw, ${INTRO_RICORI1_2SW.maxWidthPx}px)`;

function scratchDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function scratchStroke(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / (radius * 0.35)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    scratchDot(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius);
  }
}

/** Opening screen — `RICORI1_2sw` stays visible; scratching reveals `RICORI1_2` underneath. */
export default function BookIntro({ onComplete }: BookIntroProps) {
  const [fadingOut, setFadingOut] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const swCanvasRef = useRef<HTMLCanvasElement>(null);
  const swImageRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const paintSwLayer = useCallback(() => {
    const wrap = logoRef.current;
    const canvas = swCanvasRef.current;
    const sw = swImageRef.current;
    if (!wrap || !canvas || !sw?.complete) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sw, 0, 0, w, h);
    lastRef.current = null;
  }, []);

  useEffect(() => {
    const sw = new Image();
    sw.decoding = "async";
    sw.src = INTRO_RICORI1_2SW_URL;
    sw.onload = () => {
      swImageRef.current = sw;
      paintSwLayer();
    };
  }, [paintSwLayer]);

  useEffect(() => {
    const wrap = logoRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => paintSwLayer());
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [paintSwLayer]);

  const pointerInLogo = useCallback((clientX: number, clientY: number) => {
    const wrap = logoRef.current;
    if (!wrap) return null;
    const pad = INTRO_SCRATCH.brushRadiusPx;
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < -pad || y < -pad || x > rect.width + pad || y > rect.height + pad) return null;
    return { x, y };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (fadingOut) return;
      const pos = pointerInLogo(event.clientX, event.clientY);
      const ctx = swCanvasRef.current?.getContext("2d");
      if (!pos || !ctx) return;
      event.preventDefault();
      drawingRef.current = true;
      lastRef.current = pos;
      event.currentTarget.setPointerCapture(event.pointerId);
      scratchDot(ctx, pos.x, pos.y, INTRO_SCRATCH.brushRadiusPx);
    },
    [fadingOut, pointerInLogo],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawingRef.current || fadingOut) return;
      const pos = pointerInLogo(event.clientX, event.clientY);
      const ctx = swCanvasRef.current?.getContext("2d");
      const last = lastRef.current;
      if (!pos || !ctx || !last) return;
      event.preventDefault();
      scratchStroke(ctx, last.x, last.y, pos.x, pos.y, INTRO_SCRATCH.brushRadiusPx);
      lastRef.current = pos;
    },
    [fadingOut, pointerInLogo],
  );

  const endStroke = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const beginExit = useCallback(() => {
    if (fadingOut) return;
    setFadingOut(true);
    window.setTimeout(onComplete, BOOK_INTRO_FADEOUT_MS);
  }, [fadingOut, onComplete]);

  return (
    <div
      className={`book-intro${fadingOut ? " book-intro--out" : ""}`}
      style={{ backgroundImage: `url(${INTRO_PAPIER_URL})` }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          beginExit();
        }
      }}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
    >
      <div className="book-intro__veil" aria-hidden />
      <div
        ref={logoRef}
        className="book-intro__logo"
        style={{ width: logoWidthCss }}
        aria-label="마우스로 문질러 색이 나타나게 하세요"
      >
        <img
          className="book-intro__ricori book-intro__ricori--color"
          src={INTRO_RICORI1_2_URL}
          width={INTRO_RICORI1_2.width}
          height={INTRO_RICORI1_2.height}
          alt=""
          decoding="async"
          draggable={false}
        />
        <canvas ref={swCanvasRef} className="book-intro__ricori-sw-canvas" />
      </div>
      <IntroFloaters />
    </div>
  );
}