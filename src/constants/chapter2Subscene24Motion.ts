import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";

/** After 2-3 motions finish — wait, then wheel starts 2-4 (same feel as 2-2 → 2-3). */
export const CHAPTER2_SUBSCENE_24_SCROLL_GATE_DELAY_MS = 3000;

export const CHAPTER2_SUBSCENE_24_SCROLL_ACCUM_MAX = 1;
export const CHAPTER2_SUBSCENE_24_SCROLL_WHEEL_GAIN = 0.0016;

export function canChapter2ScrollStartSubscene24(completeAtMs: number, nowMs = performance.now()) {
  if (completeAtMs <= 0) return false;
  return nowMs - completeAtMs >= CHAPTER2_SUBSCENE_24_SCROLL_GATE_DELAY_MS;
}

export function isChapter2Subscene24ScrollAccumReady(scrollAccum: number) {
  return scrollAccum >= CHAPTER2_SUBSCENE_24_SCROLL_ACCUM_MAX;
}

export const CHAPTER2_BERG2_SUBSCENE_24_Y = 80;
export const CHAPTER2_BERG3_SUBSCENE_24_Y = 50;

/** berg4 — full viewport drop (multiplier on viewport height). */
export const CHAPTER2_BERG4_SUBSCENE_24_VIEWPORT_EXIT = 1.12;

type Chapter2Berg24Id = "berg2" | "berg3" | "berg4";

type Chapter2Berg24MotionSpec = {
  delaySec: number;
  spanSec: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** Staggered per-berg timing (stable across reloads). */
function buildChapter2Berg24MotionSpecs(): Record<Chapter2Berg24Id, Chapter2Berg24MotionSpec> {
  const rand = seededRandom(0x2_04_0_24);
  const mk = () => ({
    delaySec: 0.55 + rand() * 0.95,
    spanSec: 1.45 + rand() * 1.35,
  });
  return {
    berg4: mk(),
    berg3: mk(),
    berg2: mk(),
  };
}

export const CHAPTER2_BERG24_MOTION_SPECS = buildChapter2Berg24MotionSpecs();

export function getChapter2Berg24MotionProgress(
  bergId: Chapter2Berg24Id,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
) {
  if (phase !== "2-4-playing") return 0;
  const { delaySec, spanSec } = CHAPTER2_BERG24_MOTION_SPECS[bergId];
  if (elapsedSince24Sec <= delaySec) return 0;
  return easeInOutSine((elapsedSince24Sec - delaySec) / Math.max(0.12, spanSec));
}

export function getChapter2BergSubscene24YOffset(
  bergId: Chapter2Berg24Id,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  viewportHeight: number,
) {
  const progress = getChapter2Berg24MotionProgress(bergId, phase, elapsedSince24Sec);
  if (progress <= 0) return 0;

  if (bergId === "berg4") {
    return progress * viewportHeight * CHAPTER2_BERG4_SUBSCENE_24_VIEWPORT_EXIT;
  }
  if (bergId === "berg3") {
    return progress * CHAPTER2_BERG3_SUBSCENE_24_Y;
  }
  return progress * CHAPTER2_BERG2_SUBSCENE_24_Y;
}

export function getChapter2Subscene24MotionCompleteSec() {
  let maxEnd = 0;
  for (const spec of Object.values(CHAPTER2_BERG24_MOTION_SPECS)) {
    maxEnd = Math.max(maxEnd, spec.delaySec + spec.spanSec);
  }
  return maxEnd + 0.08;
}

export function isChapter2Subscene24MotionComplete(elapsedSince24Sec: number) {
  return elapsedSince24Sec >= getChapter2Subscene24MotionCompleteSec();
}
