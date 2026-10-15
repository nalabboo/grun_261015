/** Timing helpers that mirror the former CSS watercolor reveal animation. */

export const REVEAL_MS = 1200;
/** Small safety margin before reporting completion (kept from the DOM version). */
export const REVEAL_COMPLETE_DELAY_MS = REVEAL_MS + 80;
/** Duration of the "b" layer fade-out once the reveal has completed. */
export const B_FADE_MS = 500;

/** Final mask size (fraction of the sprite box) of the reveal animation. */
export const REVEAL_MASK_FINAL = 2.4;

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-5) return sampleY(t);
      const slope = sampleDX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }

    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i += 1) {
      const value = sampleX(t);
      if (Math.abs(value - x) < 1e-5) break;
      if (value < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** CSS `ease-out`. */
export const easeOut = cubicBezier(0, 0, 0.58, 1);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type RevealValues = {
  opacity: number;
  blurPx: number;
  maskSize: number;
};

/** Keyframes of `landmark-watercolor-in`: 0% → 45% → 100%, ease-out per segment. */
export function getRevealValues(elapsedMs: number): RevealValues {
  const t = Math.min(Math.max(elapsedMs / REVEAL_MS, 0), 1);

  if (t < 0.45) {
    const k = easeOut(t / 0.45);
    return {
      opacity: lerp(0, 0.55, k),
      blurPx: lerp(5, 2, k),
      maskSize: lerp(0.12, 1.2, k),
    };
  }

  const k = easeOut((t - 0.45) / 0.55);
  return {
    opacity: lerp(0.55, 1, k),
    blurPx: lerp(2, 0, k),
    maskSize: lerp(1.2, REVEAL_MASK_FINAL, k),
  };
}
