import { chapter2AssetUrl } from "@/constants/chapter2Config";
import { isChapter2Subscene24MotionComplete } from "@/constants/chapter2Subscene24Motion";
import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";
import type { Chapter2PropId } from "@/constants/chapter2ObjectsConfig";

export const CHAPTER2_CLICK_MARIMO_BURST_MIN = 2;
export const CHAPTER2_CLICK_MARIMO_BURST_MAX = 5;
/** Total visible life (pop + spread + fade) at click #1. */
export const CHAPTER2_CLICK_MARIMO_BURST_SPAN_SEC = 2.9;
/** Base time to reach full scatter distance. */
export const CHAPTER2_CLICK_MARIMO_SPREAD_SEC = 2.35;
export const CHAPTER2_CLICK_MARIMO_HEIGHT_VH = 0.058;
export const CHAPTER2_CLICK_MARIMO_Z_INDEX = 9;

export const CHAPTER2_CLICK_MARIMO_GREEN_SPOTLIGHT_CLICKS = 15;
/** Fade-in duration for the dim overlay (ms). */
export const CHAPTER2_GREEN_SPOTLIGHT_FADE_MS = 2000;
export const CHAPTER2_GREEN_SPOTLIGHT_DARK_ALPHA = 0.88;
/** After dim fade finishes, wait then zoom toward grun_v (초록이) (ms). */
export const CHAPTER2_GREEN_SPOTLIGHT_ZOOM_DELAY_MS = 2000;
export const CHAPTER2_GREEN_SPOTLIGHT_ZOOM_DURATION_MS = 2200;
export const CHAPTER2_GREEN_SPOTLIGHT_ZOOM_SCALE = 1.4;
/** After zoom finishes, wait before showing the chapter 3 page-turn control (ms). */
export const CHAPTER2_GREEN_SPOTLIGHT_CHAPTER3_BUTTON_DELAY_MS = 3000;

export function getChapter2GreenSpotlightSceneScale(zoomProgress: number) {
  const t = Math.min(1, Math.max(0, zoomProgress));
  return 1 + (CHAPTER2_GREEN_SPOTLIGHT_ZOOM_SCALE - 1) * t;
}

/** 초록이 — circular hole + zoom target on 15th click. */
export const CHAPTER2_GREEN_SPOTLIGHT_CHARACTER_PROP_ID = "grun_v" as const satisfies Chapter2PropId;

/** @deprecated Use CHAPTER2_GREEN_SPOTLIGHT_CHARACTER_PROP_ID */
export const CHAPTER2_GREEN_SPOTLIGHT_HOLE_PROP_ID = CHAPTER2_GREEN_SPOTLIGHT_CHARACTER_PROP_ID;

export type Chapter2GreenSpotlightLockedCircle = {
  cx: number;
  cy: number;
  r: number;
};

export function measureChapter2GreenSpotlightHoleRadius(width: number, height: number) {
  return Math.min(155, Math.max(68, Math.hypot(width, height) * 0.48));
}

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
  targetDx: number;
  targetDy: number;
  spreadSecMul: number;
  spanSec: number;
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

/** Shorter lifetime as click count rises (click #1 = full span). */
export function getChapter2ClickMarimoSpanSec(clickIndex: number) {
  const index = Math.min(24, Math.max(1, clickIndex));
  const mul = Math.max(0.2, 1 - (index - 1) * 0.055);
  return CHAPTER2_CLICK_MARIMO_BURST_SPAN_SEC * mul;
}

export function isChapter2ClickMarimoGreenSpotlightActive(clickCount: number) {
  return clickCount >= CHAPTER2_CLICK_MARIMO_GREEN_SPOTLIGHT_CLICKS;
}

export function isChapter2ClickMarimoBurstEnabled(
  playbackPhase: Chapter2SubscenePlaybackPhase,
  subscene24ElapsedSec: number,
) {
  return (
    playbackPhase === "2-4-playing" &&
    isChapter2Subscene24MotionComplete(subscene24ElapsedSec)
  );
}

export function createChapter2ClickMarimoBurst(
  sceneX: number,
  sceneY: number,
  clickIndex: number,
  nowMs = performance.now(),
): Chapter2ClickMarimoBurstParticle[] {
  const spanSec = getChapter2ClickMarimoSpanSec(clickIndex);
  const spreadSecBase = CHAPTER2_CLICK_MARIMO_SPREAD_SEC * (spanSec / CHAPTER2_CLICK_MARIMO_BURST_SPAN_SEC);

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
      spreadSecMul: (0.78 + Math.random() * 0.55) * (spreadSecBase / CHAPTER2_CLICK_MARIMO_SPREAD_SEC),
      spanSec,
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

  const spanMs = particle.spanSec * 1000;
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
  const popT = Math.min(1, elapsedMs / Math.min(420, spanMs * 0.35));
  const pop = 1 - (1 - popT) ** 3;
  const fadeStart = 0.48;
  const fade =
    t <= fadeStart ? 1 : 1 - (t - fadeStart) / Math.max(0.06, 1 - fadeStart);
  const opacity = pop * Math.max(0, fade);
  const scale =
    particle.scale * (0.12 + 0.88 * pop) * (1 + Math.min(1, spreadT) * 0.07);

  return { x, y, rot, opacity, scale };
}

export function isChapter2ClickMarimoBurstAlive(
  particle: Chapter2ClickMarimoBurstParticle,
  nowMs: number,
) {
  return nowMs - particle.bornMs < particle.spanSec * 1000;
}
