"use client";

import { useEffect, useRef } from "react";
import {
  PAGE_TURN,
  PAGE_TURN_COVERED_MS,
  PAGE_TURN_TOTAL_MS,
} from "@/constants/pageTurnConfig";
import { SCENE2_PAPIER, tableauAssetUrl } from "@/constants/scene2Config";

type Point = { x: number; y: number };

/**
 * Wraps the scene being left. Idle it has no box of its own (`display: contents`); while
 * `turning` it becomes the first page, peeled away by PageFlipOverlay.
 */
export function PageFlipLeaf({
  turning,
  children,
}: {
  turning: boolean;
  children: React.ReactNode;
}) {
  return <div className={turning ? "page-flip-leaf" : "page-flip-idle"}>{children}</div>;
}

type PageFlipOverlayProps = {
  /** The scene page has turned away and sheets cover the screen: mount the next chapter now. */
  onCovered: () => void;
  /** The last sheet has turned away. */
  onDone: () => void;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Part of `poly` on the side of the line through `m` with normal `n` where (p - m)·n <= 0. */
function clipHalfPlane(poly: Point[], m: Point, n: Point): Point[] {
  const side = (p: Point) => (p.x - m.x) * n.x + (p.y - m.y) * n.y;
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

function reflect(p: Point, m: Point, n: Point): Point {
  const d = 2 * ((p.x - m.x) * n.x + (p.y - m.y) * n.y);
  return { x: p.x - d * n.x, y: p.y - d * n.y };
}

const toClipPath = (poly: Point[]) =>
  poly.length < 3
    ? "polygon(0 0, 0 0, 0 0)"
    : `polygon(${poly.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;

/**
 * One page peel at progress `t` (0..1): the bottom-right corner C is lifted to P, which travels
 * left past the screen while rising by `lift`. The fold line is the perpendicular bisector of
 * C and P. Returns the page part still lying flat, the folded-over flap (the cut-off part
 * mirrored across the fold) and the CSS angle that points from the fold across the flap.
 */
function peel(t: number, w: number, h: number, lift: number) {
  const c = { x: w, y: h };
  const p = { x: w - t * 2.6 * w, y: h - Math.sin(t * Math.PI) * lift * h };
  const len = Math.hypot(c.x - p.x, c.y - p.y);
  const rect = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  if (len < 0.5) return { flat: rect, flap: [] as Point[], angle: 0 };
  // Normal pointing from the fold towards the lifted corner's original spot.
  const n = { x: (c.x - p.x) / len, y: (c.y - p.y) / len };
  const m = { x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 };
  const flat = clipHalfPlane(rect, m, n);
  const cut = clipHalfPlane(rect, m, { x: -n.x, y: -n.y });
  const flap = cut.map((q) => reflect(q, m, n));
  // Flap extends from the fold in direction -n; CSS gradient angle (0deg = up, 90deg = right).
  const angle = (Math.atan2(-n.x, n.y) * 180) / Math.PI;
  return { flat, flap, angle };
}

/**
 * Blank paper sheets that are peeled over one after another, plus the folded flaps of every
 * page (the scene page `.page-flip-leaf` first). Stacking: next chapter (z 35) < sheets (z 41-52)
 * < scene page (z 60) < flaps (z 61+, later pages land on top of earlier ones).
 */
export default function PageFlipOverlay({ onCovered, onDone }: PageFlipOverlayProps) {
  const callbacks = useRef({ onCovered, onDone });
  useEffect(() => {
    callbacks.current = { onCovered, onDone };
  }, [onCovered, onDone]);

  const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flapRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const covered = window.setTimeout(() => callbacks.current.onCovered(), PAGE_TURN_COVERED_MS);
    const done = window.setTimeout(() => callbacks.current.onDone(), PAGE_TURN_TOTAL_MS);

    // Page 0 = the scene page, pages 1.. = blank sheets.
    const pages = [
      { start: 0, duration: PAGE_TURN.leafMs, lift: PAGE_TURN.leafLift },
      ...Array.from({ length: PAGE_TURN.sheetCount }, (_, i) => ({
        start: PAGE_TURN.sheetStartMs + i * PAGE_TURN.sheetStaggerMs,
        duration: PAGE_TURN.sheetMs,
        lift:
          PAGE_TURN.sheetLiftMin +
          (PAGE_TURN.sheetLiftMax - PAGE_TURN.sheetLiftMin) * (((i * 7) % 5) / 4),
      })),
    ];

    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const elapsed = now - startedAt;
      pages.forEach((page, index) => {
        const target =
          index === 0
            ? document.querySelector<HTMLElement>(".page-flip-leaf")
            : sheetRefs.current[index - 1];
        const flap = flapRefs.current[index];
        const raw = (elapsed - page.start) / page.duration;
        if (raw <= 0) {
          if (target) target.style.clipPath = "";
          if (flap) flap.style.visibility = "hidden";
          return;
        }
        if (raw >= 1) {
          if (target) target.style.visibility = "hidden";
          if (flap) flap.style.visibility = "hidden";
          return;
        }
        const { flat, flap: flapPoly, angle } = peel(easeInOut(raw), w, h, page.lift);
        if (target) target.style.clipPath = toClipPath(flat);
        if (flap) {
          flap.style.visibility = flapPoly.length >= 3 ? "visible" : "hidden";
          const clipPath = toClipPath(flapPoly);
          for (const layer of Array.from(flap.children) as HTMLElement[]) {
            layer.style.clipPath = clipPath;
          }
          flap.style.setProperty("--page-flip-angle", `${angle.toFixed(1)}deg`);
        }
      });
      if (elapsed < PAGE_TURN_TOTAL_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(covered);
      window.clearTimeout(done);
      cancelAnimationFrame(frame);
    };
  }, []);

  const paper = `url(${tableauAssetUrl(SCENE2_PAPIER)})`;
  const sheets = Array.from({ length: PAGE_TURN.sheetCount }, (_, index) => index);

  return (
    <>
      {sheets.map((index) => (
        <div
          key={`sheet-${index}`}
          ref={(el) => {
            sheetRefs.current[index] = el;
          }}
          className="page-flip-sheet"
          aria-hidden
          style={
            {
              zIndex: 40 + PAGE_TURN.sheetCount - index,
              backgroundImage: paper,
              "--page-flip-tone": `${0.02 + (index % 4) * 0.025}`,
            } as React.CSSProperties
          }
        />
      ))}
      {[-1, ...sheets].map((index) => (
        <div
          key={`flap-${index}`}
          ref={(el) => {
            flapRefs.current[index + 1] = el;
          }}
          className="page-flip-flap"
          aria-hidden
          style={{ zIndex: 62 + index, visibility: "hidden" }}
        >
          <div className="page-flip-flap__shadow page-flip-flap__shadow--far" />
          <div className="page-flip-flap__shadow" />
          <div className="page-flip-flap__paper" style={{ backgroundImage: paper }} />
        </div>
      ))}
    </>
  );
}
