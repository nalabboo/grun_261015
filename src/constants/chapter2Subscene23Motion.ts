import {
  isChapter2PlaybackSubscene23OrLater,
  type Chapter2SubscenePlaybackPhase,
} from "@/constants/chapter2SubscenePlayback";
import type { Chapter2PropId } from "@/constants/chapter2ObjectsConfig";
import type { Chapter2MarimoInstance } from "@/constants/chapter2MarimoConfig";
import type { Chapter2NabiInstance } from "@/constants/chapter2NabiConfig";

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

/** Spore / worm / bird beats start after Laubl fade-in completes. */
export const CHAPTER2_LAUBL_PROPS_MOTION_START_SEC = CHAPTER2_LAUBL_REVEAL_SEC;

/** Berg drop + y2→b2 crossfade (with Laubl intro). */
export const CHAPTER2_SUBSCENE_23_INTRO_MOTION_SEC = 1.35;

/** Elapsed 2-3 time frozen after main blau / Laubl beats (before 2-4 gate). */
export const CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC =
  CHAPTER2_LAUBL_PROPS_MOTION_START_SEC + 0.64 + 1.45 + 0.12;

export function isChapter2Subscene23MotionComplete(elapsedSince23Sec: number) {
  return elapsedSince23Sec >= CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC;
}

export const CHAPTER2_BERG2_SUBSCENE_23_Y = 20;
export const CHAPTER2_BERG3_SUBSCENE_23_Y = 50;
export const CHAPTER2_BERG4_SUBSCENE_23_Y = 70;

export type Chapter2LaublRevealPropMotion = {
  scaleMul: number;
  opacity: number;
  yOffsetPx: number;
};

export type Chapter2VogelLaublExitMotion = {
  active: boolean;
  driftXNorm: number;
  driftYNorm: number;
  bobPx: number;
  opacityMul: number;
};

const LAUBL_SPORE_IDS = [
  "spore1",
  "spore1_1",
  "spore2_0",
  "spore2_1",
  "spore3",
  "spore4",
] as const satisfies readonly Chapter2PropId[];

type LaublSporeShrinkSpec = {
  delaySec: number;
  spanSec: number;
  scaleEnd: number;
  dropPx: number;
};

type LaublWormExitSpec = {
  delaySec: number;
  spanSec: number;
  scaleEnd: number;
  dropPx: number;
};

/** Worm fades only after Laubl is on screen (extra beat delay). */
const CHAPTER2_LAUBL_WORM_EXIT: LaublWormExitSpec = {
  delaySec: 0.42,
  spanSec: 1.15,
  scaleEnd: 0.78,
  dropPx: 40,
};

/** Steady fly-out to the right once Laubl starts appearing (scene 2-3). */
const CHAPTER2_VOGEL_LAUBL_EXIT = {
  /** After 2-3 starts (Laubl fade-in begins). */
  delaySec: 0.06,
  /** Viewport widths per second. */
  speedNormPerSec: 0.32,
  /** Travel from rest until bird is past the right edge. */
  exitClearNorm: 1.2,
  driftYNormMax: 0.05,
};

export const CHAPTER2_GRUN_LAUBL_SCALE = 0.8;
export const CHAPTER2_NARI_LAUBL_SCALE = 0.9;

const CHAPTER2_GRUN_LAUBL_SCALE_BEAT = { delaySec: 0.2, spanSec: 1.05 };
const CHAPTER2_NARI_LAUBL_SCALE_BEAT = { delaySec: 0.95, spanSec: 1.1 };

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
}

function easeOutCubic(t: number) {
  const u = clamp01(t);
  return 1 - (1 - u) ** 3;
}

function laublBeatProgress(elapsedSec: number, delaySec: number, spanSec: number) {
  if (elapsedSec <= delaySec) return 0;
  return clamp01((elapsedSec - delaySec) / Math.max(0.12, spanSec));
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function buildLaublSporeShrinkSpecs(): Record<Chapter2PropId, LaublSporeShrinkSpec> {
  const specs = {} as Record<Chapter2PropId, LaublSporeShrinkSpec>;
  for (let i = 0; i < LAUBL_SPORE_IDS.length; i++) {
    const id = LAUBL_SPORE_IDS[i];
    const rand = seededRandom(91_700 + i * 509);
    specs[id] = {
      delaySec: rand() * 0.48,
      spanSec: 0.34 + rand() * 0.92,
      scaleEnd: 0.5 + rand() * 0.4,
      dropPx: 6 + rand() * 42,
    };
  }
  return specs;
}

const CHAPTER2_LAUBL_SPORE_SHRINK = buildLaublSporeShrinkSpecs();

function isLaublSporeId(propId: Chapter2PropId) {
  return (LAUBL_SPORE_IDS as readonly string[]).includes(propId);
}

function laublPropsBeatElapsed(elapsedSince23Sec: number) {
  return elapsedSince23Sec - CHAPTER2_LAUBL_PROPS_MOTION_START_SEC;
}

/** Spore shrink + worm fade — after Laubl fade-in completes. */
export function getChapter2LaublRevealPropMotion(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
): Chapter2LaublRevealPropMotion | null {
  if (!isChapter2PlaybackSubscene23OrLater(phase)) return null;
  if (phase !== "2-3-playing") return null;
  const beatElapsed = laublPropsBeatElapsed(elapsedSince23Sec);
  if (beatElapsed <= 0) return null;

  if (isLaublSporeId(propId)) {
    const spec = CHAPTER2_LAUBL_SPORE_SHRINK[propId];
    const p = easeInOutSine(
      laublBeatProgress(beatElapsed, spec.delaySec, spec.spanSec),
    );
    if (p <= 0) return { scaleMul: 1, opacity: 1, yOffsetPx: 0 };
    return {
      scaleMul: 1 - p * (1 - spec.scaleEnd),
      opacity: 1,
      yOffsetPx: p * spec.dropPx,
    };
  }

  if (propId === "worm_g") {
    const spec = CHAPTER2_LAUBL_WORM_EXIT;
    const p = easeInOutSine(
      laublBeatProgress(beatElapsed, spec.delaySec, spec.spanSec),
    );
    if (p <= 0) return { scaleMul: 1, opacity: 1, yOffsetPx: 0 };
    const fade = easeOutCubic(p);
    return {
      scaleMul: 1 - fade * (1 - spec.scaleEnd),
      opacity: 1 - fade,
      yOffsetPx: fade * spec.dropPx,
    };
  }

  return null;
}

/** Bird flies steadily right after Laubl appears; unmount visually off-screen. */
export function getChapter2VogelLaublExitMotion(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
): Chapter2VogelLaublExitMotion {
  const idle = {
    active: false,
    driftXNorm: 0,
    driftYNorm: 0,
    bobPx: 0,
    opacityMul: 1,
  };
  if (!isChapter2PlaybackSubscene23OrLater(phase)) return idle;

  const elapsed =
    phase === "2-3-complete" || phase === "2-4-playing"
      ? CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC
      : phase === "2-3-playing"
        ? elapsedSince23Sec
        : 0;

  const spec = CHAPTER2_VOGEL_LAUBL_EXIT;
  if (elapsed <= spec.delaySec) return idle;

  const exitSec = elapsed - spec.delaySec;
  const driftXNorm = exitSec * spec.speedNormPerSec;
  const driftYNorm =
    easeInOutSine(Math.min(1, exitSec / 2.2)) * spec.driftYNormMax;
  const bobPx = Math.sin(exitSec * 2.4) * 5 * Math.max(0, 1 - exitSec / 3.5);
  const cleared = driftXNorm >= spec.exitClearNorm;

  return {
    active: true,
    driftXNorm,
    driftYNorm,
    bobPx,
    opacityMul: cleared ? 0 : 1,
  };
}

type BlauSteinRevealSpec = {
  delaySec: number;
  spanSec: number;
  /** Extra Y below rest (px) at progress 0 — slides up to 0. */
  risePx: number;
};

/** Starts after Laubl fade-in (`CHAPTER2_LAUBL_PROPS_MOTION_START_SEC`). */
const CHAPTER2_BLAU_STEIN_REVEAL: Partial<
  Record<Chapter2PropId, BlauSteinRevealSpec>
> = {
  stein1: { delaySec: 0.06, spanSec: 1.15, risePx: 420 },
  stein2: { delaySec: 0.22, spanSec: 1.05, risePx: 480 },
  stein3: { delaySec: 0.34, spanSec: 1.12, risePx: 380 },
  coral4: { delaySec: 0.3, spanSec: 1.15, risePx: 340 },
  coral5: { delaySec: 0.38, spanSec: 1.1, risePx: 360 },
  coral6: { delaySec: 0.44, spanSec: 1.12, risePx: 440 },
};

type BlauFadeAfterLaublSpec = {
  delaySec: number;
  spanSec: number;
  startScaleMul: number;
};

/** In-place emerge on berg (e.g. ikki) after Laubl beat. */
const CHAPTER2_BLAU_FADE_AFTER_LAUBL: Partial<
  Record<Chapter2PropId, BlauFadeAfterLaublSpec>
> = {
  ikki1: { delaySec: 0.52, spanSec: 1.45, startScaleMul: 0.9 },
  ikki2: { delaySec: 0.58, spanSec: 1.45, startScaleMul: 0.9 },
  ikki3: { delaySec: 0.64, spanSec: 1.45, startScaleMul: 0.9 },
};

export type Chapter2BlauFadeAfterLaublReveal = {
  opacity: number;
  scaleMul: number;
};

export function getChapter2BlauFadeAfterLaublReveal(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
): Chapter2BlauFadeAfterLaublReveal | null {
  const spec = CHAPTER2_BLAU_FADE_AFTER_LAUBL[propId];
  if (!spec) return null;
  if (!isChapter2PlaybackSubscene23OrLater(phase)) {
    return { opacity: 0, scaleMul: spec.startScaleMul };
  }
  if (phase !== "2-3-playing") {
    return { opacity: 1, scaleMul: 1 };
  }
  const beatElapsed = laublPropsBeatElapsed(elapsedSince23Sec);
  if (beatElapsed <= 0) {
    return { opacity: 0, scaleMul: spec.startScaleMul };
  }
  const linear = laublBeatProgress(beatElapsed, spec.delaySec, spec.spanSec);
  if (linear <= 0) {
    return { opacity: 0, scaleMul: spec.startScaleMul };
  }
  const t = easeInOutSine(linear);
  return {
    opacity: Math.min(1, t * 1.05),
    scaleMul: spec.startScaleMul + (1 - spec.startScaleMul) * t,
  };
};

export type Chapter2BlauSteinReveal = {
  opacity: number;
  riseYOffsetPx: number;
};

/** Rise from below viewport after Laubl has appeared. */
export function getChapter2BlauSteinReveal(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
): Chapter2BlauSteinReveal | null {
  const spec = CHAPTER2_BLAU_STEIN_REVEAL[propId];
  if (!spec) return null;
  if (!isChapter2PlaybackSubscene23OrLater(phase)) {
    return { opacity: 0, riseYOffsetPx: spec.risePx };
  }
  if (phase !== "2-3-playing") {
    return { opacity: 1, riseYOffsetPx: 0 };
  }
  const beatElapsed = laublPropsBeatElapsed(elapsedSince23Sec);
  if (beatElapsed <= 0) {
    return { opacity: 0, riseYOffsetPx: spec.risePx };
  }
  const linear = laublBeatProgress(beatElapsed, spec.delaySec, spec.spanSec);
  if (linear <= 0) {
    return { opacity: 0, riseYOffsetPx: spec.risePx };
  }
  const surge = easeOutCubic(linear);
  return {
    opacity: Math.min(1, surge * 1.08),
    riseYOffsetPx: (1 - surge) * spec.risePx,
  };
}

type BlauSlideFromLeftSpec = {
  delaySec: number;
  spanSec: number;
  /** Extra X left of rest (px) at progress 0 — slides right to 0. */
  slideFromLeftPx: number;
};

/** Blau props that enter from off-screen left after Laubl (with stein beat). */
const CHAPTER2_BLAU_SLIDE_FROM_LEFT_REVEAL: Partial<
  Record<Chapter2PropId, BlauSlideFromLeftSpec>
> = {
  coral1: { delaySec: 0.42, spanSec: 1.2, slideFromLeftPx: 1200 },
};

export type Chapter2BlauSlideFromLeftReveal = {
  opacity: number;
  slideXOffsetPx: number;
};

type Berg4PeakRevealSpec = {
  delaySec: number;
  spanSec: number;
  /** Start below rest anchor (px) — grows up the peak. */
  risePx: number;
  startScaleMul: number;
};

/** Laubl beat — corals emerge at berg4 (산4) peak. */
const CHAPTER2_BERG4_PEAK_REVEAL: Partial<Record<Chapter2PropId, Berg4PeakRevealSpec>> = {
  coral3: { delaySec: 0.1, spanSec: 1.2, risePx: 260, startScaleMul: 0.22 },
  coral2: { delaySec: 0.22, spanSec: 1.05, risePx: 200, startScaleMul: 0.3 },
};

export type Chapter2Berg4PeakReveal = {
  opacity: number;
  riseYOffsetPx: number;
  scaleMul: number;
};

export function getChapter2Berg4PeakReveal(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
): Chapter2Berg4PeakReveal | null {
  const spec = CHAPTER2_BERG4_PEAK_REVEAL[propId];
  if (!spec) return null;
  if (!isChapter2PlaybackSubscene23OrLater(phase)) {
    return { opacity: 0, riseYOffsetPx: spec.risePx, scaleMul: spec.startScaleMul };
  }
  if (phase !== "2-3-playing") {
    return { opacity: 1, riseYOffsetPx: 0, scaleMul: 1 };
  }
  const beatElapsed = laublPropsBeatElapsed(elapsedSince23Sec);
  if (beatElapsed <= 0) {
    return { opacity: 0, riseYOffsetPx: spec.risePx, scaleMul: spec.startScaleMul };
  }
  const linear = laublBeatProgress(beatElapsed, spec.delaySec, spec.spanSec);
  if (linear <= 0) {
    return { opacity: 0, riseYOffsetPx: spec.risePx, scaleMul: spec.startScaleMul };
  }
  const surge = easeOutCubic(linear);
  return {
    opacity: Math.min(1, surge * 1.08),
    riseYOffsetPx: (1 - surge) * spec.risePx,
    scaleMul: spec.startScaleMul + (1 - spec.startScaleMul) * surge,
  };
}

export function getChapter2BlauSlideFromLeftReveal(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
): Chapter2BlauSlideFromLeftReveal | null {
  const spec = CHAPTER2_BLAU_SLIDE_FROM_LEFT_REVEAL[propId];
  if (!spec) return null;
  if (!isChapter2PlaybackSubscene23OrLater(phase)) {
    return { opacity: 0, slideXOffsetPx: -spec.slideFromLeftPx };
  }
  if (phase !== "2-3-playing") {
    return { opacity: 1, slideXOffsetPx: 0 };
  }
  const beatElapsed = laublPropsBeatElapsed(elapsedSince23Sec);
  if (beatElapsed <= 0) {
    return { opacity: 0, slideXOffsetPx: -spec.slideFromLeftPx };
  }
  const linear = laublBeatProgress(beatElapsed, spec.delaySec, spec.spanSec);
  if (linear <= 0) {
    return { opacity: 0, slideXOffsetPx: -spec.slideFromLeftPx };
  }
  const surge = easeOutCubic(linear);
  return {
    opacity: Math.min(1, surge * 1.06),
    slideXOffsetPx: -(1 - surge) * spec.slideFromLeftPx,
  };
}

export function getChapter2MarimoLaublExitProgress(
  spec: Chapter2MarimoInstance,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (!spec.laublExit || phase !== "2-3-playing") return 0;
  const beatElapsed = laublPropsBeatElapsed(elapsedSince23Sec);
  if (beatElapsed <= 0) return 0;
  const { delaySec, spanSec } = spec.laublExit;
  return laublBeatProgress(beatElapsed, delaySec, spanSec);
}

export function getChapter2MarimoLaublExitOpacity(
  spec: Chapter2MarimoInstance,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  const exit = getChapter2MarimoLaublExitProgress(spec, phase, elapsedSince23Sec);
  if (exit <= 0) return 1;
  return 1 - easeInOutSine(exit);
}

export function getChapter2GrunSubscene23ScaleMul(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (!isChapter2PlaybackSubscene23OrLater(phase)) return 1;
  if (phase !== "2-3-playing") {
    const beatElapsed = laublPropsBeatElapsed(CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC);
    const { delaySec, spanSec } = CHAPTER2_GRUN_LAUBL_SCALE_BEAT;
    const t = easeInOutSine(laublBeatProgress(beatElapsed, delaySec, spanSec));
    return 1 - t * (1 - CHAPTER2_GRUN_LAUBL_SCALE);
  }
  const beatElapsed = laublPropsBeatElapsed(elapsedSince23Sec);
  if (beatElapsed <= 0) return 1;
  const { delaySec, spanSec } = CHAPTER2_GRUN_LAUBL_SCALE_BEAT;
  const t = easeInOutSine(laublBeatProgress(beatElapsed, delaySec, spanSec));
  return 1 - t * (1 - CHAPTER2_GRUN_LAUBL_SCALE);
}

export function getChapter2NariSubscene23ScaleMul(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (!isChapter2PlaybackSubscene23OrLater(phase)) return 1;
  if (phase !== "2-3-playing") {
    const beatElapsed = laublPropsBeatElapsed(CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC);
    const { delaySec, spanSec } = CHAPTER2_NARI_LAUBL_SCALE_BEAT;
    const t = easeInOutSine(laublBeatProgress(beatElapsed, delaySec, spanSec));
    return 1 - t * (1 - CHAPTER2_NARI_LAUBL_SCALE);
  }
  const beatElapsed = laublPropsBeatElapsed(elapsedSince23Sec);
  if (beatElapsed <= 0) return 1;
  const { delaySec, spanSec } = CHAPTER2_NARI_LAUBL_SCALE_BEAT;
  const t = easeInOutSine(laublBeatProgress(beatElapsed, delaySec, spanSec));
  return 1 - t * (1 - CHAPTER2_NARI_LAUBL_SCALE);
}

export function getChapter2YellowGelbExitVisibility(
  _phase: Chapter2SubscenePlaybackPhase,
  _elapsedSince23Sec: number,
) {
  return 1;
}

/** nabi2 — drift off at 2-3 start (nabi1 / nabi3 stay). */
const CHAPTER2_NABI_SUB23_EXIT_SPAN_SEC = 1.35;

export function getChapter2NabiSubscene23ExitProgress(
  spec: Chapter2NabiInstance,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (!spec.exitAtSubscene23) return 0;
  if (phase !== "2-3-playing") return 0;
  const delay = 0.06;
  if (elapsedSince23Sec <= delay) return 0;
  return clamp01((elapsedSince23Sec - delay) / CHAPTER2_NABI_SUB23_EXIT_SPAN_SEC);
}

export function getChapter2NabiSubscene23ExitOpacity(
  spec: Chapter2NabiInstance,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  const exit = getChapter2NabiSubscene23ExitProgress(spec, phase, elapsedSince23Sec);
  if (exit <= 0) return 1;
  return 1 - easeInOutSine(exit);
}

export function getChapter2Subscene23IntroProgress(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (!isChapter2PlaybackSubscene23OrLater(phase)) return 0;
  if (phase === "2-3-complete" || phase === "2-4-playing") return 1;
  if (phase !== "2-3-playing") return 0;
  const t = clamp01(elapsedSince23Sec / CHAPTER2_SUBSCENE_23_INTRO_MOTION_SEC);
  return easeInOutSine(t);
}

export function getChapter2LaublRevealOpacity(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (!isChapter2PlaybackSubscene23OrLater(phase)) return 0;
  if (phase === "2-3-complete" || phase === "2-4-playing") return 1;
  return clamp01(elapsedSince23Sec / CHAPTER2_LAUBL_REVEAL_SEC);
}

/** Blau bubbles — fade in with scene 2-3 (not 2-2 scroll). */
const CHAPTER2_BUBBLE_SUB23_FADE_DELAY_SEC = 0.1;
const CHAPTER2_BUBBLE_SUB23_FADE_SPAN_SEC = 1;

export function getChapter2BubbleSubscene23Visibility(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince23Sec: number,
) {
  if (!isChapter2PlaybackSubscene23OrLater(phase)) return 0;
  if (phase === "2-3-complete" || phase === "2-4-playing") return 1;
  if (elapsedSince23Sec <= CHAPTER2_BUBBLE_SUB23_FADE_DELAY_SEC) return 0;
  return easeInOutSine(
    clamp01(
      (elapsedSince23Sec - CHAPTER2_BUBBLE_SUB23_FADE_DELAY_SEC) /
        CHAPTER2_BUBBLE_SUB23_FADE_SPAN_SEC,
    ),
  );
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
