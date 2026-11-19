"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IntroFloaters from "@/components/intro/IntroFloaters";
import {
  BOOK_INTRO_FADEOUT_MS,
  INTRO_PAPIER_URL,
  INTRO_MOND_K_CURSOR_URL,
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

type Dab = { path: Path2D; alpha: number };

/** One rough eraser dab: a ragged blob (not a circle) plus a few crumbs around its edge. */
function roughDab(x: number, y: number, radius: number): Dab[] {
  const { roughness, crumbs } = INTRO_SCRATCH;
  const shapes: Dab[] = [];
  const blob = new Path2D();
  const points = 28;
  const turn = Math.random() * Math.PI * 2;
  for (let i = 0; i <= points; i++) {
    const angle = turn + (i / points) * Math.PI * 2;
    const r = radius * (1 - roughness * Math.random());
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) blob.moveTo(px, py);
    else blob.lineTo(px, py);
  }
  blob.closePath();
  shapes.push({ path: blob, alpha: 1 });
  // Crumbs: tiny ragged specks just outside, so the edge looks rubbed rather than cut.
  for (let i = 0; i < crumbs; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * (0.8 + Math.random() * 0.35);
    const size = radius * (0.025 + Math.random() * 0.05);
    const cx = x + Math.cos(angle) * dist;
    const cy = y + Math.sin(angle) * dist;
    const crumb = new Path2D();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + Math.random();
      const r = size * (0.5 + Math.random() * 0.8);
      if (k === 0) crumb.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else crumb.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    crumb.closePath();
    shapes.push({ path: crumb, alpha: 0.4 + Math.random() * 0.6 });
  }
  return shapes;
}

type Layers = {
  sw: CanvasRenderingContext2D;
  color: CanvasRenderingContext2D;
  colorImage: HTMLImageElement | null;
  width: number;
  height: number;
};

/** Rubs one dab: takes it out of the grey plate and paints the colour plate into that spot. */
function scratchDot(layers: Layers, x: number, y: number, radius: number) {
  const { sw, color, colorImage, width, height } = layers;
  for (const { path, alpha } of roughDab(x, y, radius)) {
    sw.globalCompositeOperation = "destination-out";
    sw.globalAlpha = alpha;
    sw.fill(path);
    if (colorImage) {
      color.save();
      color.globalAlpha = alpha;
      color.clip(path);
      color.drawImage(colorImage, 0, 0, width, height);
      color.restore();
    }
  }
  sw.globalAlpha = 1;
}

function scratchStroke(
  layers: Layers,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / (radius * 0.3)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    scratchDot(layers, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius);
  }
}

/**
 * Opening screen — the grey plate (`RICORI1_2sw`) is multiplied into the paper; rubbing it
 * takes it away and paints the colour plate (`RICORI1_2`) into those spots, in its own colours
 * (a separate, non-blended canvas on top).
 */
export default function BookIntro({ onComplete }: BookIntroProps) {
  const [fadingOut, setFadingOut] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const swCanvasRef = useRef<HTMLCanvasElement>(null);
  const swImageRef = useRef<HTMLImageElement | null>(null);
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);
  const colorImageRef = useRef<HTMLImageElement | null>(null);
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
    // Colour layer starts empty (nothing rubbed yet).
    const colorCanvas = colorCanvasRef.current;
    if (colorCanvas) {
      colorCanvas.width = canvas.width;
      colorCanvas.height = canvas.height;
      colorCanvas.style.width = `${w}px`;
      colorCanvas.style.height = `${h}px`;
      colorCanvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    lastRef.current = null;
  }, []);

  const getLayers = useCallback((): Layers | null => {
    const sw = swCanvasRef.current?.getContext("2d");
    const color = colorCanvasRef.current?.getContext("2d");
    const wrap = logoRef.current;
    if (!sw || !color || !wrap) return null;
    return {
      sw,
      color,
      colorImage: colorImageRef.current,
      width: wrap.clientWidth,
      height: wrap.clientHeight,
    };
  }, []);

  useEffect(() => {
    const sw = new Image();
    sw.decoding = "async";
    sw.src = INTRO_RICORI1_2SW_URL;
    sw.onload = () => {
      swImageRef.current = sw;
      paintSwLayer();
    };
    const color = new Image();
    color.decoding = "async";
    color.src = INTRO_RICORI1_2_URL;
    color.onload = () => {
      colorImageRef.current = color;
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
      const layers = getLayers();
      if (!pos || !layers) return;
      event.preventDefault();
      drawingRef.current = true;
      lastRef.current = pos;
      event.currentTarget.setPointerCapture(event.pointerId);
      scratchDot(layers, pos.x, pos.y, INTRO_SCRATCH.brushRadiusPx);
    },
    [fadingOut, pointerInLogo, getLayers],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawingRef.current || fadingOut) return;
      const pos = pointerInLogo(event.clientX, event.clientY);
      const layers = getLayers();
      const last = lastRef.current;
      if (!pos || !layers || !last) return;
      event.preventDefault();
      scratchStroke(layers, last.x, last.y, pos.x, pos.y, INTRO_SCRATCH.brushRadiusPx);
      lastRef.current = pos;
    },
    [fadingOut, pointerInLogo, getLayers],
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
      style={{
        backgroundImage: `url(${INTRO_PAPIER_URL})`,
        cursor: `url(${INTRO_MOND_K_CURSOR_URL}) 32 32, crosshair`,
      }}
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
        {/* Sizes the logo box only (the colour is painted on the canvas below). */}
        <img
          className="book-intro__ricori book-intro__ricori--sizer"
          src={INTRO_RICORI1_2_URL}
          width={INTRO_RICORI1_2.width}
          height={INTRO_RICORI1_2.height}
          alt=""
          decoding="async"
          draggable={false}
        />
        <canvas ref={swCanvasRef} className="book-intro__ricori-sw-canvas" />
      </div>
      {/* The rubbed-in colour, in its own colours (not blended with the paper). */}
      <div
        className="book-intro__logo book-intro__logo--color"
        style={{
          width: logoWidthCss,
          aspectRatio: `${INTRO_RICORI1_2.width} / ${INTRO_RICORI1_2.height}`,
        }}
        aria-hidden
      >
        <canvas ref={colorCanvasRef} className="book-intro__ricori-sw-canvas" />
      </div>
      <IntroFloaters />
    </div>
  );
}