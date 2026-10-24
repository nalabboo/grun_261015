"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  chapter2ClientToPropCoords,
  chapter2PropXToScreenPx,
  chapter2PropYToScreenTopPx,
} from "@/constants/chapter2PropScreenCoords";

const TICK_STEP = 100;

const RULER_ROOT_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2_147_483_640,
  pointerEvents: "none",
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: 10,
  color: "rgba(0, 0, 0, 0.88)",
};

function rangeTicks(min: number, max: number, step: number) {
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max; v += step) out.push(v);
  return out;
}

export default function Chapter2LayoutRuler() {
  const [size, setSize] = useState({ w: 1920, h: 1080 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const sync = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      setCursor(chapter2ClientToPropCoords(event.clientX, event.clientY, size.w, size.h));
    };
    const onLeave = () => setCursor(null);
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [size.w, size.h]);

  const halfW = size.w / 2;
  const xTicks = useMemo(
    () => rangeTicks(-halfW, halfW, TICK_STEP),
    [halfW],
  );
  const yTicks = useMemo(
    () => rangeTicks(-size.h, 0, TICK_STEP),
    [size.h],
  );

  return (
    <div className="chapter2-layout-ruler" style={RULER_ROOT_STYLE} aria-hidden>
      <div className="chapter2-layout-ruler__y-axis">
        {yTicks.map((y) => (
          <div
            key={y}
            className="chapter2-layout-ruler__y-tick"
            style={{ top: chapter2PropYToScreenTopPx(y, size.h) }}
          >
            <span className="chapter2-layout-ruler__label">{y}</span>
          </div>
        ))}
      </div>

      <div className="chapter2-layout-ruler__x-axis">
        {xTicks.map((x) => (
          <div
            key={x}
            className="chapter2-layout-ruler__x-tick"
            style={{ left: chapter2PropXToScreenPx(x, size.w) }}
          >
            <span className="chapter2-layout-ruler__label">{x}</span>
          </div>
        ))}
      </div>

      {cursor && (
        <>
          <div
            className="chapter2-layout-ruler__crosshair chapter2-layout-ruler__crosshair--v"
            style={{ left: chapter2PropXToScreenPx(cursor.x, size.w) }}
          />
          <div
            className="chapter2-layout-ruler__crosshair chapter2-layout-ruler__crosshair--h"
            style={{ top: chapter2PropYToScreenTopPx(cursor.y, size.h) }}
          />
          <div className="chapter2-layout-ruler__readout">
            x {cursor.x}, y {cursor.y}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Portaled to `document.documentElement` (not `body`) so `html/body { overflow: hidden }`
 * does not clip the fixed ruler in standalone browsers.
 */
export function Chapter2LayoutRulerPortal() {
  const [mountTarget, setMountTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_CHAPTER2_RULER === "0") return;
    setMountTarget(document.documentElement);
  }, []);

  if (!mountTarget) return null;
  return createPortal(<Chapter2LayoutRuler />, mountTarget);
}
