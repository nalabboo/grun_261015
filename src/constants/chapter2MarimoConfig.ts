import { chapter2AssetUrl } from "@/constants/chapter2Config";

export const CHAPTER2_MARIMO_COUNT = 7;

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
};

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

    return {
      id: `marimo_${index}`,
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
    };
  });
}

export const CHAPTER2_MARIMO_INSTANCES = buildMarimoInstances();
