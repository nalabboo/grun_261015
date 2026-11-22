import {
  CHAPTER2_SCROLL_NARI_LENGTH,
  CHAPTER2_SUBSCENE_SCROLL_MAX,
} from "@/constants/chapter2ScrollMotion";

/**
 * 2-1 → 2-2 timeline after the first scroll, in two parts:
 *  1. Nari (and the bird flying in with her) fades in right away over `nariSec`, quick at first
 *     and settling at the end — so the scroll is answered at once.
 *  2. The rest (berg y2 → grun shrink → spores) follows over `restSec`.
 * (It used to be one 11.5 s ease-in-out curve; Nari, at its slow start, took ~4.5 s and was barely
 * visible for the first 2 s.)
 */
export const CHAPTER2_SUBSCENE_PLAYBACK_TIMING = {
  nariSec: 1.4,
  restSec: 7,
} as const;

/** One-shot 2-1 → 2-2 timeline length (seconds). */
export const CHAPTER2_SUBSCENE_PLAYBACK_SEC =
  CHAPTER2_SUBSCENE_PLAYBACK_TIMING.nariSec + CHAPTER2_SUBSCENE_PLAYBACK_TIMING.restSec;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(t: number) {
  const u = clamp01(t);
  return 1 - (1 - u) ** 3;
}

function easeInOutCubic(t: number) {
  const u = clamp01(t);
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}

export type Chapter2SubscenePlaybackPhase =
  | "2-1"
  | "2-2-playing"
  /** 2-2 end state — scroll raw at max; wait for scroll to begin 2-3. */
  | "2-2-complete"
  /** 2-3 timeline (Laubl + blau beats). */
  | "2-3-playing"
  /** 2-3 motions finished — wait 3 s, then scroll starts 2-4. */
  | "2-3-complete"
  /** Berg drop motion (scene 2-4). */
  | "2-4-playing";

export function isChapter2PlaybackSubscene23OrLater(
  phase: Chapter2SubscenePlaybackPhase,
): boolean {
  return (
    phase === "2-3-playing" ||
    phase === "2-3-complete" ||
    phase === "2-4-playing"
  );
}

/** Maps playback elapsed time → scroll raw (drives segment order: nari → berg → grun → spore). */
export function getChapter2PlaybackScrollRaw(elapsedSec: number) {
  const { nariSec, restSec } = CHAPTER2_SUBSCENE_PLAYBACK_TIMING;
  const nariRaw = CHAPTER2_SCROLL_NARI_LENGTH;
  if (elapsedSec < nariSec) {
    return easeOutCubic(elapsedSec / nariSec) * nariRaw;
  }
  const t = clamp01((elapsedSec - nariSec) / restSec);
  return nariRaw + easeInOutCubic(t) * (CHAPTER2_SUBSCENE_SCROLL_MAX - nariRaw);
}

export function isChapter2PlaybackComplete(elapsedSec: number) {
  return elapsedSec >= CHAPTER2_SUBSCENE_PLAYBACK_SEC;
}
