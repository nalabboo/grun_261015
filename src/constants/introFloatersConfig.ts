import { introAssetUrl } from "@/constants/introConfig";

const MARIMO_ASSETS = {
  marimo1: { file: "marimo1.png", width: 300, height: 299 },
  marimo2: { file: "marimo2.png", width: 300, height: 288 },
} as const;

export type IntroMarimoKind = keyof typeof MARIMO_ASSETS;

export type IntroFloaterInstance = {
  id: string;
  kind: IntroMarimoKind;
  src: string;
  width: number;
  height: number;
  /** Display height as a share of viewport height (1080p reference). */
  heightVh: number;
  xNorm: number;
  yNorm: number;
  /** Slow orbit radius in px at 1080p viewport height. */
  driftRadiusPx: number;
  driftHz: number;
  driftHz2: number;
  phase: number;
  spinDegPerSec: number;
};

export const INTRO_FLOATER_COUNT = 10;

/** One unique display height per marimo (vh). Shuffled when instances are built. */
export const INTRO_MARIMO_HEIGHT_VH = [
  0.095,
  0.115,
  0.132,
  0.148,
  0.165,
  0.182,
  0.2,
  0.218,
  0.24,
  0.265,
] as const;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function shuffleHeights(count: number, rand: () => number): number[] {
  const pool = INTRO_MARIMO_HEIGHT_VH.slice(0, count);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return [...pool];
}

const INTRO_MARIMO_HEIGHTS = shuffleHeights(
  INTRO_FLOATER_COUNT,
  seededRandom(88_001),
);

/** Cursor repulsion + spring home (Lusion-style soft bounce). */
export const INTRO_MARIMO_PHYSICS = {
  /** Cursor influence radius at 1080p height (px). */
  cursorRadiusPx: 2000,
  /** Outward push when the cursor is near. */
  pushStrength: 8000,
  /** Velocity retention per frame (~60fps); lower = longer slide / livelier bounce. */
  damping: 0.90,
  /** Pull toward idle orbit anchor (overshoot when cursor lets go). */
  spring: 5.2,
  maxSpeedPx: 980,
  /** Extra spin (deg/s) on cursor hit. */
  cursorSpinBurst: 42,
  /** Spin added on marimo–marimo bounce (scaled by impulse). */
  collisionSpinScale: 5,
  /** Cap angular velocity (deg/s). */
  maxSpinDegPerSec: 26,
  /** Spin fades faster than linear motion (per frame @ 60fps). */
  spinDamping: 0.84,
  /** Marimo–marimo and wall bounce (0–1). */
  collisionRestitution: 0.88,
  wallRestitution: 0.72,
  /** Collision solver passes per frame (stops overlap). */
  collisionIterations: 4,
} as const;

function buildIntroFloaters(): IntroFloaterInstance[] {
  return Array.from({ length: INTRO_FLOATER_COUNT }, (_, index) => {
    const rand = seededRandom(88_001 + index * 791);
    const kind: IntroMarimoKind = rand() > 0.5 ? "marimo2" : "marimo1";
    const asset = MARIMO_ASSETS[kind];
    const heightVh = INTRO_MARIMO_HEIGHTS[index];
    const xNorm = 0.04 + rand() * 0.92;
    const yNorm = 0.06 + rand() * 0.88;

    return {
      id: `intro_marimo_${index}`,
      kind,
      src: introAssetUrl(asset.file),
      width: asset.width,
      height: asset.height,
      heightVh,
      xNorm,
      yNorm,
      driftRadiusPx: 32 + rand() * 72,
      driftHz: 0.38 + rand() * 0.55,
      driftHz2: 0.52 + rand() * 0.68,
      phase: rand() * Math.PI * 2,
      spinDegPerSec: (rand() > 0.45 ? 1 : -1) * (1.5 + rand() * 7),
    };
  });
}

export const INTRO_FLOATER_INSTANCES = buildIntroFloaters();