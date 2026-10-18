import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";
import type { Chapter2PropId } from "@/constants/chapter2ObjectsConfig";

/** After 2-2 hold — ignore scroll until this delay, then wheel starts 2-3. */
export const CHAPTER2_SUBSCENE_23_SCROLL_GATE_DELAY_MS = 3000;

/** Wheel travel after gate opens (trackpad-friendly; not one big wheel tick). */
export const CHAPTER2_SUBSCENE_23_SCROLL_ACCUM_MAX = 1;
export const CHAPTER2_SUBSCENE_23_SCROLL_WHEEL_GAIN = 0.0016;

export function canChapter2ScrollStartSubscene23(completeAtMs: number, nowMs = performance.now()) {
  if (completeAtMs <= 0) return false;
  return nowMs - completeAtMs >= CHAPTER2_SUBSCENE_23_SCROLL_GATE_DELAY_MS;
}

export function isChapter2Subscene23ScrollAccumReady(scrollAccum: number) {
  return scrollAccum >= CHAPTER2_SUBSCENE_23_SCROLL_ACCUM_MAX;
}

/** 라우블 fade-in duration after 2-3 starts (seconds). */
export const CHAPTER2_LAUBL_REVEAL_SEC = 1.1;

/** Berg drop + y2→b2 crossfade (with Laubl intro). */
export const CHAPTER2_SUBSCENE_23_INTRO_MOTION_SEC = 1.35;

export const CHAPTER2_BERG2_SUBSCENE_23_Y = 20;
export const CHAPTER2_BERG3_SUBSCENE_23_Y = 50;
export const CHAPTER2_BERG4_SUBSCENE_23_Y = 70;

/** Spore 2-3 motions begin after berg intro finishes. */
export const CHAPTER2_SUBSCENE_23_SPORE_START_SEC = CHAPTER2_SUBSCENE_23_INTRO_MOTION_SEC;
/** Normalized timeline length for spore stagger (seconds). */
export const CHAPTER2_SUBSCENE_23_SPORE_MOTION_SEC = 2.25;

type Spore23Spec = {
  delay: number;
  span: number;
  mode: "exit" | "shrink";
  /** Final scale multiplier at progress 1 (shrink only). */
  scaleEnd?: number;
  dropPx?: number;
};

const CHAPTER2_SPORE_23_MOTION: Partial<Record<Chapter2PropId, Spore23Spec>> = {
  spore2_0: { delay: 0, span: 0.48, mode: "exit", dropPx: 140 },
  spore2_1: { delay: 0.14, span: 0.52, mode: "exit", dropPx: 130 },
  spore3: { delay: 0.26, span: 0.5, mode: "exit", dropPx: 150 },
  spore4: { delay: 0.1, span: 0.58, mode: "shrink", scaleEnd: 0.72, dropPx: 55 },
  spore1: { delay: 0.2, span: 0.62, mode: "shrink", scaleEnd: 0.82, dropPx: 45 },
  spore1_1: { delay: 0.32, span: 0.54, mode: "shrink", scaleEnd: 0.9, dropPx: 38 },
  worm_g: { delay: 0.18, span: 0.55, mode: "exit", dropPx: 90 },
};

/** 초록이 — 20% smaller when green assets finish exiting. */
export const CHAPTER2_GRUN_SUBSCENE_23_SCALE = 0.8;

/** 나리 — 10% smaller when yellow assets finish exiting. */
export const CHAPTER2_NARI_SUBSCENE_23_SCALE = 0.9;

const GREEN_EXIT_ON_TIMELINE = { delay: 0.12, span: 0.82 };
const YELLOW_EXIT_SEC = { delay: 0.35, span: 1.85 };

export type Chapter2SporeSubscene23Motion = {
  scaleMul: number;
  opacity: number;
  yOffsetPx: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
}

function easeInCubic(t: number) {
  const u = clamp01(t);
  return u * u * u;
}

function spore23TimelineProgress(elapsedSince23Sec: number) {
  if (elapsedSince23Sec <= CHAPTER2_SUBSCENE_23_SPORE_START_SEC) return 0;
  return clamp01(
    (elapsedSince23Sec - CHAPTER2_SUBSCENE_23_SPORE_START_SEC) /
      CHAPTER2_SUBSCENE_23_SPORE_MOTION_SEC,
  );
}

function spore23ItemProgress(timeline: number, spec: Spore23Spec) {
  if (timeline <= spec.delay) return 0;
  return clamp01((timeline - spec.delay) / Math.max(0.1, spec.span));
}

export function getChapter2SporeSubscene23Motion(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
): Chapter2SporeSubscene23Motion | null {
  const spec = CHAPTER2_SPORE_23_MOTION[propId];
  if (!spec || phase !== "2-3-playing") return null;

  const timeline = spore23TimelineProgress(elapsedSince23Sec);
  if (timeline <= 0) {
    return { scaleMul: 1, opacity: 1, yOffsetPx: 0 };
  }

  const p = easeInOutSine(spore23ItemProgress(timeline, spec));
  const drop = spec.dropPx ?? 80;

  if (spec.mode === "exit") {
    const shrink = 1 - easeInCubic(p);
    return {
      scaleMul: shrink,
      opacity: 1 - p,
      yOffsetPx: p * drop,
    };
  }

  const end = spec.scaleEnd ?? 0.85;
  return {
    scaleMul: 1 - p * (1 - end),
    opacity: 1 - p * 0.92,
    yOffsetPx: p * drop,
  };
}

/** 0→1 while green spores / worm exit (scene 2-3 spore phase). */
export function getChapter2GreenAssetsExitProgress(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (phase !== "2-3-playing") return 0;
  const timeline = spore23TimelineProgress(elapsedSince23Sec);
  if (timeline <= GREEN_EXIT_ON_TIMELINE.delay) return 0;
  return easeInOutSine(
    clamp01(
      (timeline - GREEN_EXIT_ON_TIMELINE.delay) / Math.max(0.1, GREEN_EXIT_ON_TIMELINE.span),
    ),
  );
}

export function getChapter2GrunSubscene23ScaleMul(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  const t = getChapter2GreenAssetsExitProgress(phase, elapsedSince23Sec);
  return 1 - t * (1 - CHAPTER2_GRUN_SUBSCENE_23_SCALE);
}

/** 0→1 while yellow gelb assets exit (nabi, bird). */
export function getChapter2YellowAssetsExitProgress(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (phase !== "2-3-playing") return 0;
  const t0 = CHAPTER2_SUBSCENE_23_SPORE_START_SEC + YELLOW_EXIT_SEC.delay;
  if (elapsedSince23Sec <= t0) return 0;
  return easeInOutSine(
    clamp01((elapsedSince23Sec - t0) / Math.max(0.1, YELLOW_EXIT_SEC.span)),
  );
}

export function getChapter2NariSubscene23ScaleMul(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  const t = getChapter2YellowAssetsExitProgress(phase, elapsedSince23Sec);
  return 1 - t * (1 - CHAPTER2_NARI_SUBSCENE_23_SCALE);
}

/** Multiply on nabi / bird opacity during yellow exit. */
export function getChapter2YellowGelbExitVisibility(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  return 1 - getChapter2YellowAssetsExitProgress(phase, elapsedSince23Sec);
}

export function getChapter2Subscene23IntroProgress(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (phase !== "2-3-playing") return 0;
  return easeInOutSine(elapsedSince23Sec / CHAPTER2_SUBSCENE_23_INTRO_MOTION_SEC);
}

export function getChapter2LaublRevealOpacity(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (phase !== "2-3-playing") return 0;
  return clamp01(elapsedSince23Sec / CHAPTER2_LAUBL_REVEAL_SEC);
}

export function getChapter2BergSubscene23YOffset(
  bergId: "berg2" | "berg3" | "berg4",
  introProgress: number,
) {
  const px =
    bergId === "berg2"
      ? CHAPTER2_BERG2_SUBSCENE_23_Y
      : bergId === "berg3"
        ? CHAPTER2_BERG3_SUBSCENE_23_Y
        : CHAPTER2_BERG4_SUBSCENE_23_Y;
  return px * introProgress;
}

export const CHAPTER2_SUBSCENE_23_SCROLL_MAX = 0;

export function getChapter2Subscene23ScrollProgress(_scroll23: number) {
  return 0;
}
