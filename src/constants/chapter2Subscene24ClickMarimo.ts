import { chapter2AssetUrl } from "@/constants/chapter2Config";
import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";

export const CHAPTER2_CLICK_MARIMO_BURST_MIN = 2;
export const CHAPTER2_CLICK_MARIMO_BURST_MAX = 5;
/** Total visible life (pop + spread + fade). */
export const CHAPTER2_CLICK_MARIMO_BURST_SPAN_SEC = 2.9;
/** Base time to reach full scatter distance. */
export const CHAPTER2_CLICK_MARIMO_SPREAD_SEC = 2.35;
export const CHAPTER2_CLICK_MARIMO_HEIGHT_VH = 0.058;
export const CHAPTER2_CLICK_MARIMO_Z_INDEX = 9;

const MARIMO_FILES = [
  { file: "grun objekt/marimo1.png", width: 300, height: 299 },
  { file: "grun objekt/marimo2.png", width: 300, height: 288 },
] as const;

export type Chapter2ClickMarimoBurstParticle = {
  id: string;
  src: string;
  width: number;
  height: number;
  originX: number;
  originY: number;
  /** Scatter offset from origin (px). */
  targetDx: number;
  targetDy: number;
  /** Per-particle spread duration multiplier. */
  spreadSecMul: number;
  rot: number;
  spinDegPerSec: number;
  scale: number;
  bornMs: number;
};

let burstIdCounter = 0;

function spreadEase(t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 2.35;
}

export function createChapter2ClickMarimoBurst(
  sceneX: number,
  sceneY: number,
  nowMs = performance.now(),
): Chapter2ClickMarimoBurstParticle[] {
  const count =
    CHAPTER2_CLICK_MARIMO_BURST_MIN +
    Math.floor(
      Math.random() * (CHAPTER2_CLICK_MARIMO_BURST_MAX - CHAPTER2_CLICK_MARIMO_BURST_MIN + 1),
    );

  const particles: Chapter2ClickMarimoBurstParticle[] = [];
  for (let i = 0; i < count; i++) {
    const asset = MARIMO_FILES[Math.random() > 0.5 ? 1 : 0];
    const spawnJitterR = Math.random() * 14;
    const spawnJitterA = Math.random() * Math.PI * 2;
    const originX = sceneX + Math.cos(spawnJitterA) * spawnJitterR;
    const originY = sceneY + Math.sin(spawnJitterA) * spawnJitterR;

    const scatterAngle = Math.random() * Math.PI * 2;
    const scatterDist = 44 + Math.random() * 118;
    const targetDx = Math.cos(scatterAngle) * scatterDist;
    const targetDy = Math.sin(scatterAngle) * scatterDist;

    particles.push({
      id: `click_marimo_${burstIdCounter++}_${i}`,
      src: chapter2AssetUrl(asset.file),
      width: asset.width,
      height: asset.height,
      originX,
      originY,
      targetDx,
      targetDy,
      spreadSecMul: 0.78 + Math.random() * 0.55,
      rot: (Math.random() - 0.5) * 36,
      spinDegPerSec: (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 32),
      scale: 0.72 + Math.random() * 0.48,
      bornMs: nowMs + i * (18 + Math.floor(Math.random() * 40)),
    });
  }
  return particles;
}

export function getChapter2ClickMarimoBurstMotion(
  particle: Chapter2ClickMarimoBurstParticle,
  nowMs: number,
) {
  const elapsedMs = nowMs - particle.bornMs;
  if (elapsedMs <= 0) {
    return {
      x: particle.originX,
      y: particle.originY,
      rot: particle.rot,
      opacity: 0,
      scale: particle.scale * 0.18,
    };
  }

  const spanMs = CHAPTER2_CLICK_MARIMO_BURST_SPAN_SEC * 1000;
  if (elapsedMs >= spanMs) {
    return {
      x: particle.originX + particle.targetDx,
      y: particle.originY + particle.targetDy,
      rot: particle.rot,
      opacity: 0,
      scale: particle.scale,
    };
  }

  const elapsedSec = elapsedMs * 0.001;
  const spreadSec = CHAPTER2_CLICK_MARIMO_SPREAD_SEC * particle.spreadSecMul;
  const spreadT = spreadEase(elapsedSec / spreadSec);
  const x = particle.originX + particle.targetDx * spreadT;
  const y = particle.originY + particle.targetDy * spreadT;
  const rot = particle.rot + particle.spinDegPerSec * elapsedSec;

  const t = elapsedMs / spanMs;
  const popT = Math.min(1, elapsedMs / 420);
  const pop = 1 - (1 - popT) ** 3;
  const fadeStart = 0.55;
  const fade =
    t <= fadeStart ? 1 : 1 - (t - fadeStart) / Math.max(0.08, 1 - fadeStart);
  const opacity = pop * Math.max(0, fade);
  const scale =
    particle.scale * (0.12 + 0.88 * pop) * (1 + Math.min(1, spreadT) * 0.07);

  return { x, y, rot, opacity, scale };
}

export function isChapter2ClickMarimoBurstAlive(
  particle: Chapter2ClickMarimoBurstParticle,
  nowMs: number,
) {
  return nowMs - particle.bornMs < CHAPTER2_CLICK_MARIMO_BURST_SPAN_SEC * 1000;
}

/** Scene 2-3 hold and full 2-4 play (incl. after 2-4 motion ends). */
export function isChapter2ClickMarimoBurstEnabled(
  playbackPhase: Chapter2SubscenePlaybackPhase,
) {
  return playbackPhase === "2-3-complete" || playbackPhase === "2-4-playing";
}
