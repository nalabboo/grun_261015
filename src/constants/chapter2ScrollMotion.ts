import type {
  Chapter2PropConfig,
  Chapter2PropEdit,
  Chapter2PropId,
} from "@/constants/chapter2ObjectsConfig";

/** Nari fade-in before berg y2 (scroll units). */
const SCROLL_NARI_LENGTH = 1.9;
/** Berg y2 segment — starts after Nari is fully in. */
const SCROLL_BERG_LENGTH = 1;
const SCROLL_BERG_START = SCROLL_NARI_LENGTH;
/** Grun shrink segment — longer = slower shrink while scrolling. */
const SCROLL_GRUN_LENGTH = 1.85;
/** Spore shrink segment — longer = slower shrink while scrolling. */
const SCROLL_SPORE_LENGTH = 3.4;

const SCROLL_GRUN_START = SCROLL_BERG_START + SCROLL_BERG_LENGTH;
const SCROLL_SPORE_START = SCROLL_GRUN_START + SCROLL_GRUN_LENGTH;

/** Total wheel travel (nari → berg → grun → spore). */
export const CHAPTER2_SUBSCENE_SCROLL_MAX =
  SCROLL_SPORE_START + SCROLL_SPORE_LENGTH;

/** Grun: at most 20% smaller than layout scale (color + scroll combined). */
export const CHAPTER2_GRUN_MIN_SCALE = 0.8;

/** Spore uniform scale at spore segment progress 1 (30% smaller). */
export const CHAPTER2_SCROLL_SPORE_SCALE_AT_END = 0.7;

/** Per-spore shrink timing within the spore scroll segment (delay + span). */
const CHAPTER2_SPORE_SHRINK_STAGGER: Partial<
  Record<Chapter2PropId, { delay: number; span: number }>
> = {
  spore4: { delay: 0, span: 0.58 },
  spore2_0: { delay: 0.1, span: 0.68 },
  spore2_1: { delay: 0.26, span: 0.55 },
  spore3: { delay: 0.38, span: 0.62 },
  spore1_1: { delay: 0.48, span: 0.5 },
  spore1: { delay: 0.16, span: 0.78 },
};

function sporeShrinkProgress(propId: Chapter2PropId, segmentSpore: number) {
  const spec = CHAPTER2_SPORE_SHRINK_STAGGER[propId];
  if (!spec) return segmentSpore;
  const { delay, span } = spec;
  const safeSpan = Math.max(0.12, span);
  if (segmentSpore <= delay) return 0;
  return clamp01((segmentSpore - delay) / safeSpan);
}

/** Character scale at opposite scene color (berg crossfade 0↔1). */
export const CHAPTER2_CHARACTER_COLOR_SCALE_MIN = 0.48;

export type Chapter2SceneColorRatios = {
  /** Yellow berg dominance (nari) — `berg` segment progress. */
  yellow: number;
  /** Green berg dominance (grun_v). */
  green: number;
};

export function getChapter2SceneColorRatios(
  segments: Chapter2ScrollSegments,
): Chapter2SceneColorRatios {
  const yellow = segments.berg;
  return { yellow, green: 1 - yellow };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function characterScaleForColorRatio(ratio: number, minScale = CHAPTER2_CHARACTER_COLOR_SCALE_MIN) {
  const t = Math.min(1, Math.max(0, ratio));
  return minScale + (1 - minScale) * t;
}

export type Chapter2ScrollSegments = {
  raw: number;
  /** Nari fade-in (0–1), before berg changes. */
  nari: number;
  /** Berg y2 crossfade (0–1). */
  berg: number;
  /** After berg: grun_v shrink (0–1). */
  grun: number;
  /** After grun: spore scale (0–1). */
  spore: number;
};

function segmentProgress(raw: number, start: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(1, Math.max(0, (raw - start) / length));
}

export function getChapter2ScrollSegments(scroll: number): Chapter2ScrollSegments {
  const raw = Math.min(CHAPTER2_SUBSCENE_SCROLL_MAX, Math.max(0, scroll));
  return {
    raw,
    nari: segmentProgress(raw, 0, SCROLL_NARI_LENGTH),
    berg: segmentProgress(raw, SCROLL_BERG_START, SCROLL_BERG_LENGTH),
    grun: segmentProgress(raw, SCROLL_GRUN_START, SCROLL_GRUN_LENGTH),
    spore: segmentProgress(raw, SCROLL_SPORE_START, SCROLL_SPORE_LENGTH),
  };
}

export function getChapter2PropScrollOpacity(
  prop: Chapter2PropConfig,
  segments: Chapter2ScrollSegments,
): number {
  if (prop.revealOnScroll) {
    return segments.nari;
  }
  return 1;
}

export function getChapter2PropScrollScaleMultiplier(
  prop: Chapter2PropConfig,
  _layout: Chapter2PropEdit,
  _viewportHeight: number,
  _bergScale: number,
  segments: Chapter2ScrollSegments,
): number {
  if (prop.id === "nari") {
    return 1;
  }

  if (prop.id === "grun_v") {
    // Shrink after berg y2 finishes (`segments.grun`), not during berg crossfade.
    const t = segments.grun;
    return 1 - t * (1 - CHAPTER2_GRUN_MIN_SCALE);
  }

  if (prop.id.startsWith("spore") && segments.spore > 0) {
    const t = sporeShrinkProgress(prop.id, segments.spore);
    return 1 - t * (1 - CHAPTER2_SCROLL_SPORE_SCALE_AT_END);
  }

  return 1;
}
