import { CHAPTER2_SUBSCENE_SCROLL_MAX } from "@/constants/chapter2ScrollMotion";

/** One-shot 2-1 → 2-2 timeline length (seconds). */
export const CHAPTER2_SUBSCENE_PLAYBACK_SEC = 11.5;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
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
  /** 2-3 timeline (implement in `chapter2ScrollMotion` / playback). */
  | "2-3-playing";

/** Maps playback elapsed time → scroll raw (drives segment order: nari → berg → grun → spore). */
export function getChapter2PlaybackScrollRaw(elapsedSec: number) {
  const t = clamp01(elapsedSec / CHAPTER2_SUBSCENE_PLAYBACK_SEC);
  return easeInOutCubic(t) * CHAPTER2_SUBSCENE_SCROLL_MAX;
}

export function isChapter2PlaybackComplete(elapsedSec: number) {
  return elapsedSec >= CHAPTER2_SUBSCENE_PLAYBACK_SEC;
}
