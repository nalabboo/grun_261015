import { chapter2AssetUrl } from "@/constants/chapter2Config";

export const CHAPTER2_MARIMO_COUNT = 21;

const MARIMO_ASSETS = {
  marimo1: { file: "grun objekt/marimo1.png", width: 300, height: 299 },
  marimo2: { file: "grun objekt/marimo2.png", width: 300, height: 288 },
} as const;

export type Chapter2MarimoInstance = {
  id: string;
  src: string;
  width: number;
  height: number;
  /** Display height as fraction of viewport height (seed-random per instance). */
  heightVh: number;
  /** Initial center position (0–1 of viewport). */
  xNorm: number;
  yNorm: number;
  /** Velocity px/s at 1080p ref; scaled with viewport in sim. */
  vx: number;
  vy: number;
  spinDegPerSec: number;
  /** Scene-1 style blur ratio (scaled with viewport height). */
  blurRatio: number;
  /** 0–1 display opacity (seed-random per instance). */
  opacity: number;
  zIndex: number;
  /** Drift off-screen during spore / nabi segment (3 marimos). */
  sporeExit?: {
    delay: number;
    span: number;
    exitAngleRad: number;
  };
  /** Drift off-screen after Laubl appears (scene 2-3). */
  laublExit?: {
    delaySec: number;
    spanSec: number;
    exitAngleRad: number;
  };
};

/** Same exit slots as the original 7-pack (0, 3, 5) repeated per block of 7. */
export function chapter2MarimoHasSporeExit(index: number) {
  const slot = index % 7;
  return slot === 0 || slot === 3 || slot === 5;
}

/** >50% of marimos exit when Laubl beat starts (even indices → 11 / 21). */
export function chapter2MarimoHasLaublExit(index: number) {
  return index % 2 === 0;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function getChapter2MarimoSporeExitProgress(
  spec: Chapter2MarimoInstance,
  sporeProgress: number,
) {
  if (!spec.sporeExit || sporeProgress <= 0) return 0;
  const { delay, span } = spec.sporeExit;
  if (sporeProgress <= delay) return 0;
  return clamp01((sporeProgress - delay) / Math.max(0.12, span));
}

export function getChapter2MarimoSporeExitOpacity(
  spec: Chapter2MarimoInstance,
  sporeProgress: number,
) {
  const exit = getChapter2MarimoSporeExitProgress(spec, sporeProgress);
  if (exit <= 0) return 1;
  return 1 - easeInOutSine(exit);
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function buildMarimoInstances(): Chapter2MarimoInstance[] {
  return Array.from({ length: CHAPTER2_MARIMO_COUNT }, (_, index) => {
    const seed = 42_000 + index * 997;
    const rand = seededRandom(seed);
    const assetKey = rand() > 0.5 ? "marimo2" : "marimo1";
    const asset = MARIMO_ASSETS[assetKey];
    const heightVh = 0.032 + rand() * 0.088;
    const blurRatio = 0.00135 + rand() * 0.00385;
    const xNorm = 0.12 + rand() * 0.76;
    const yNorm = 0.1 + rand() * 0.72;
    const speed = 22 + rand() * 44;
    const angle = rand() * Math.PI * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const spinDegPerSec = (rand() > 0.5 ? 1 : -1) * (4 + rand() * 12);
    const opacity = 0.38 + rand() * 0.52;

    const id = `marimo_${index}`;
    const exitAngleRad = Math.atan2(yNorm - 0.5, xNorm - 0.5);
    const sporeExit = chapter2MarimoHasSporeExit(index)
      ? {
          delay: 0.04 + (index % 3) * 0.07,
          span: 0.58,
          exitAngleRad,
        }
      : undefined;

    const laublExit = chapter2MarimoHasLaublExit(index)
      ? {
          delaySec: 0.08 + (index % 5) * 0.14,
          spanSec: 0.72 + (index % 4) * 0.22,
          exitAngleRad,
        }
      : undefined;

    return {
      id,
      src: chapter2AssetUrl(asset.file),
      width: asset.width,
      height: asset.height,
      heightVh,
      xNorm,
      yNorm,
      vx,
      vy,
      spinDegPerSec,
      blurRatio,
      opacity,
      zIndex: 5 + (index % 3),
      sporeExit,
      laublExit,
    };
  });
}

export const CHAPTER2_MARIMO_INSTANCES = buildMarimoInstances();
