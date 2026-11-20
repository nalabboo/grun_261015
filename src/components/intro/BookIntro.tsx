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
  INTRO_ZOOM,
} from "@/constants/introConfig";
import { unlockAudio } from "@/lib/audioContext";

type BookIntroProps = {
  onComplete: () => void;
  /**
   * Scene 1 is set up behind the intro (the zoom shows it through the title). Setting it up
   * blocks the page for a moment, so the floaters only start once it is ready and the page draws
   * smoothly again — a still screen doesn't look frozen.
   */
  sceneReady?: boolean;
};

/**
 * Paper mask with a title-shaped hole, set from the start with the hole parked far off screen:
 * switching a mask on at the start of the zoom made the paper flash away for a frame or two.
 */
const BG_MASK = `url(${INTRO_RICORI1_2_URL}), linear-gradient(#000, #000)`;
const bgMaskStyle: React.CSSProperties = {
  maskImage: BG_MASK,
  WebkitMaskImage: BG_MASK,
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskSize: "100px 26px, 100% 100%",
  WebkitMaskSize: "100px 26px, 100% 100%",
  // Just off the top-left corner (a huge offset was not honoured and the hole showed on screen).
  maskPosition: "-400px -400px, 0 0",
  WebkitMaskPosition: "-400px -400px, 0 0",
  maskComposite: "exclude",
  WebkitMaskComposite: "xor",
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

/** The paper cover over the colour layer reaches this far past the logo box (px), so the title's
 * shadow and the brush's edge stay covered until rubbed. */
const COVER_PAD = 48;

type Layers = {
  sw: CanvasRenderingContext2D;
  cover: CanvasRenderingContext2D;
};

/**
 * Rubs one dab: takes it out of the grey plate and out of the paper cover, uncovering the
 * (pre-lit, static) colour title underneath. Only cheap shape fills — nothing is redrawn.
 */
function scratchDot(layers: Layers, x: number, y: number, radius: number) {
  const { sw, cover } = layers;
  sw.globalCompositeOperation = "destination-out";
  cover.globalCompositeOperation = "destination-out";
  for (const { path, alpha } of roughDab(x, y, radius)) {
    sw.globalAlpha = alpha;
    sw.fill(path);
    cover.globalAlpha = alpha;
    cover.fill(path);
  }
  sw.globalAlpha = 1;
  cover.globalAlpha = 1;
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
 * Opening screen. Back to front: page paper + veil, the colour title (`RICORI1_2`, drawn once and
 * never changed), a paper cover over it (canvas: same paper and veil light as the page), and the
 * grey plate (`RICORI1_2sw`, multiplied into the paper). Rubbing erases the grey plate and the
 * cover in the same rough shapes, uncovering the colour title.
 */
export default function BookIntro({
  onComplete,
  sceneReady = true,
}: BookIntroProps) {
  const [fadingOut, setFadingOut] = useState(false);
  /** The title is complete: zoom into it (once scene 1 is ready). */
  const [titleDone, setTitleDone] = useState(false);
  const [zooming, setZooming] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);
  const colorLayerRef = useRef<HTMLDivElement>(null);
  /** Title-shape pixels of the grey canvas (alpha), to measure how much has been rubbed. */
  const plateMaskRef = useRef<Uint8Array | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const swCanvasRef = useRef<HTMLCanvasElement>(null);
  const swImageRef = useRef<HTMLImageElement | null>(null);
  const coverCanvasRef = useRef<HTMLCanvasElement>(null);
  const paperImageRef = useRef<HTMLImageElement | null>(null);
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
    // Which grey-canvas pixels belong to the title (to measure rubbing progress).
    {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const mask = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 128 ? 1 : 0;
      plateMaskRef.current = mask;
    }

    // Paper cover: the page's paper (same `cover` placement), cut to the logo box + padding.
    const coverCanvas = coverCanvasRef.current;
    const page = wrap.offsetParent as HTMLElement | null;
    if (!coverCanvas || !page) return;
    const cw = w + COVER_PAD * 2;
    const ch = h + COVER_PAD * 2;
    coverCanvas.width = Math.round(cw * dpr);
    coverCanvas.height = Math.round(ch * dpr);
    coverCanvas.style.width = `${cw}px`;
    coverCanvas.style.height = `${ch}px`;
    const cover = coverCanvas.getContext("2d");
    if (!cover) return;
    cover.setTransform(dpr, 0, 0, dpr, 0, 0);
    cover.globalCompositeOperation = "source-over";
    cover.fillStyle = INTRO_SCRATCH.coverColor;
    cover.fillRect(0, 0, cw, ch);
    const paper = paperImageRef.current;
    if (paper?.complete && paper.naturalWidth > 0) {
      const pageRect = page.getBoundingClientRect();
      const logoRect = wrap.getBoundingClientRect();
      const scale = Math.max(
        pageRect.width / paper.naturalWidth,
        pageRect.height / paper.naturalHeight,
      );
      const dw = paper.naturalWidth * scale;
      const dh = paper.naturalHeight * scale;
      const originX = logoRect.left - pageRect.left - COVER_PAD;
      const originY = logoRect.top - pageRect.top - COVER_PAD;
      cover.drawImage(
        paper,
        (pageRect.width - dw) / 2 - originX,
        (pageRect.height - dh) / 2 - originY,
        dw,
        dh,
      );
    }
    // The veil's light (`.book-intro__veil`: radial-gradient(ellipse at 50% 42%, ...), sized to
    // the farthest corner), so the cover matches the page around it.
    {
      const pageRect = page.getBoundingClientRect();
      const logoRect = wrap.getBoundingClientRect();
      const pw = pageRect.width;
      const ph = pageRect.height;
      const cx = pw * 0.5;
      const cy = ph * 0.42;
      const rx = Math.max(cx, pw - cx) * Math.SQRT2;
      const ry = Math.max(cy, ph - cy) * Math.SQRT2;
      const originX = logoRect.left - pageRect.left - COVER_PAD;
      const originY = logoRect.top - pageRect.top - COVER_PAD;
      cover.save();
      cover.translate(cx - originX, cy - originY);
      cover.scale(1, ry / rx);
      const light = cover.createRadialGradient(0, 0, 0, 0, 0, rx);
      light.addColorStop(0, "rgba(255, 255, 255, 0.28)");
      light.addColorStop(0.55, "rgba(255, 255, 255, 0.06)");
      light.addColorStop(1, "rgba(0, 0, 0, 0.05)");
      cover.fillStyle = light;
      cover.fillRect(-rx * 2, -rx * 2, rx * 4, rx * 4);
      cover.restore();
    }
    // Dabs are given in logo-box coordinates.
    cover.setTransform(dpr, 0, 0, dpr, COVER_PAD * dpr, COVER_PAD * dpr);
  }, []);

  const getLayers = useCallback((): Layers | null => {
    const sw = swCanvasRef.current?.getContext("2d");
    const cover = coverCanvasRef.current?.getContext("2d");
    if (!sw || !cover) return null;
    return { sw, cover };
  }, []);

  useEffect(() => {
    const sw = new Image();
    sw.decoding = "async";
    sw.src = INTRO_RICORI1_2SW_URL;
    sw.onload = () => {
      swImageRef.current = sw;
      paintSwLayer();
    };
    const paper = new Image();
    paper.decoding = "async";
    paper.src = INTRO_PAPIER_URL;
    paper.onload = () => {
      paperImageRef.current = paper;
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
      unlockAudio();
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

  /** Share of the title already rubbed green (sampled every 3rd pixel). */
  const revealedRatio = useCallback(() => {
    const canvas = swCanvasRef.current;
    const mask = plateMaskRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !mask || !ctx || mask.length !== canvas.width * canvas.height) return 0;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let plate = 0;
    let rubbed = 0;
    for (let i = 0; i < mask.length; i += 3) {
      if (!mask[i]) continue;
      plate++;
      if (data[i * 4 + 3] < 60) rubbed++;
    }
    return plate > 0 ? rubbed / plate : 0;
  }, []);

  const endStroke = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      lastRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!titleDone && revealedRatio() >= INTRO_ZOOM.revealedRatio) setTitleDone(true);
    },
    [titleDone, revealedRatio],
  );

  /** Scene 1 is ready and the page draws smoothly: floaters may move, the zoom may start. */
  const [warm, setWarm] = useState(false);
  const titleDoneAtRef = useRef(0);
  useEffect(() => {
    if (titleDone) titleDoneAtRef.current = performance.now();
  }, [titleDone]);

  // Scene 1 keeps uploading pictures for a moment after it reports ready: wait until the page
  // draws smoothly again (enough short frames in a row).
  useEffect(() => {
    if (!sceneReady || warm) return;
    let frame = 0;
    let smooth = 0;
    let last = performance.now();
    const watch = (now: number) => {
      smooth = now - last < INTRO_ZOOM.smoothFrameMs ? smooth + 1 : 0;
      last = now;
      if (smooth >= INTRO_ZOOM.smoothFrames) setWarm(true);
      else frame = requestAnimationFrame(watch);
    };
    frame = requestAnimationFrame(watch);
    return () => cancelAnimationFrame(frame);
  }, [sceneReady, warm]);

  // Zoom into the title: it grows (speeding up) round a thick spot in a letter; outside it the
  // paper stays (masked), inside it the colour fades so scene 1 shows through, until it fills
  // the screen.
  useEffect(() => {
    if (!titleDone || !warm || fadingOut) return;
    let frame = 0;
    let started = 0;
    // `delayMs` after the title was completed (at once if scene 1 only got ready later).
    const wait = Math.max(0, INTRO_ZOOM.delayMs - (performance.now() - titleDoneAtRef.current));
    const timer = window.setTimeout(() => startZoom(), wait);
    const startZoom = () => {
      const logo = logoRef.current;
      const bg = bgRef.current;
      const layer = colorLayerRef.current;
      if (!logo || !bg || !layer) return;
      setZooming(true);
      const rect = logo.getBoundingClientRect();
      const ox = rect.width * INTRO_ZOOM.origin[0];
      const oy = rect.height * INTRO_ZOOM.origin[1];
      const originX = rect.left + ox;
      const originY = rect.top + oy;
      layer.style.transformOrigin = `${ox}px ${oy}px`;
      const apply = (t: number) => {
        // Speeding up, evenly in "zoom" (exponential scale).
        const eased = t * t * t;
        const scale = Math.exp(Math.log(INTRO_ZOOM.maxScale) * eased);
        layer.style.transform = `translate(-50%, -50%) scale(${scale})`;
        const w = rect.width * scale;
        const h = rect.height * scale;
        const size = `${w}px ${h}px, 100% 100%`;
        const pos = `${originX - ox * scale}px ${originY - oy * scale}px, 0 0`;
        bg.style.maskSize = size;
        bg.style.webkitMaskSize = size;
        bg.style.maskPosition = pos;
        bg.style.webkitMaskPosition = pos;
        const win = Math.min(
          1,
          Math.max(0, (t - INTRO_ZOOM.windowFrom) / (INTRO_ZOOM.windowTo - INTRO_ZOOM.windowFrom)),
        );
        layer.style.opacity = String(1 - win);
      };
      // The mask is on from the start (hole parked off screen, see bgMaskStyle): only move it.
      apply(0);
      const tick = (now: number) => {
        if (!started) started = now;
        const t = Math.min(1, (now - started) / INTRO_ZOOM.durationMs);
        apply(t);
        if (t < 1) frame = requestAnimationFrame(tick);
        else onComplete();
      };
      frame = requestAnimationFrame(tick);
    };
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [titleDone, warm, fadingOut, onComplete]);

  const beginExit = useCallback(() => {
    if (fadingOut || zooming) return;
    setFadingOut(true);
    window.setTimeout(onComplete, BOOK_INTRO_FADEOUT_MS);
  }, [fadingOut, zooming, onComplete]);

  return (
    <div
      className={`book-intro${fadingOut ? " book-intro--out" : ""}${titleDone ? " book-intro--done" : ""}${zooming ? " book-intro--zooming" : ""}`}
      style={{
        cursor: `url(${INTRO_MOND_K_CURSOR_URL}) 32 32, crosshair`,
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          unlockAudio();
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
      {/* Paper + veil. During the zoom it is masked: a hole in the title's shape lets scene 1
          show through. */}
      <div
        ref={bgRef}
        className="book-intro__bg"
        style={{ backgroundImage: `url(${INTRO_PAPIER_URL})`, ...bgMaskStyle }}
        aria-hidden
      >
        <div className="book-intro__veil" />
      </div>
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
      {/* Colour title in its own colours, under a paper cover that rubbing erases. */}
      <div
        ref={colorLayerRef}
        className="book-intro__logo book-intro__logo--color"
        style={{ width: logoWidthCss }}
        aria-hidden
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
        <canvas
          ref={coverCanvasRef}
          className="book-intro__ricori-cover"
          style={{ left: -COVER_PAD, top: -COVER_PAD }}
        />
      </div>
      {/* Floaters start once scene 1 is set up (see `warm`). */}
      <div className={`book-intro__floaters-wrap${warm ? " book-intro__floaters-wrap--on" : ""}`}>
        {warm && <IntroFloaters />}
      </div>
    </div>
  );
}