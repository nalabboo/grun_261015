import type { Chapter2NabiInstance } from "@/constants/chapter2NabiConfig";
import { getChapter2NabiEntryProgress } from "@/constants/chapter2NabiConfig";
import { CHAPTER2_SUBSCENE_SCROLL_MAX } from "@/constants/chapter2ScrollMotion";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** Scene 2-2 auto-scroll progress 0–1 (nari → spore end). */
export function getChapter2Scroll22Progress(scrollRaw: number) {
  if (CHAPTER2_SUBSCENE_SCROLL_MAX <= 0) return 0;
  return clamp01(scrollRaw / CHAPTER2_SUBSCENE_SCROLL_MAX);
}

export function getChapter2MarimoScroll22ExitProgress(index: number, scroll22: number) {
  const delay = 0.02 + (index % 7) * 0.045;
  const span = 0.36 + (index % 5) * 0.07;
  if (scroll22 <= delay) return 0;
  return clamp01((scroll22 - delay) / span);
}

export function getChapter2MarimoScroll22ExitOpacity(index: number, scroll22: number) {
  const exit = getChapter2MarimoScroll22ExitProgress(index, scroll22);
  if (exit <= 0) return 1;
  return 1 - easeInOutSine(exit);
}

export function getChapter2MarimoScroll22ExitAngleRad(xNorm: number, yNorm: number) {
  return Math.atan2(yNorm - 0.5, xNorm - 0.5);
}

export function getChapter2NabiScroll22ExitProgress(
  spec: Chapter2NabiInstance,
  scroll22: number,
  sporeProgress: number,
) {
  if (spec.keepAfterLaubl || spec.exitAtSubscene23) return 0;
  const entry = getChapter2NabiEntryProgress(spec, sporeProgress);
  if (entry < 0.55) return 0;
  const delay = 0.42 + spec.entryDelay * 0.12;
  const span = 0.48;
  if (scroll22 <= delay) return 0;
  return clamp01((scroll22 - delay) / span);
}

export function getChapter2NabiScroll22ExitOpacity(
  spec: Chapter2NabiInstance,
  scroll22: number,
  sporeProgress: number,
) {
  const exit = getChapter2NabiScroll22ExitProgress(spec, scroll22, sporeProgress);
  if (exit <= 0) return 1;
  return 1 - easeInOutSine(exit);
}

/** Bubbles fade in during mid 2-2 scroll (blau atmosphere). */
export function getChapter2BubbleScroll22Visibility(scroll22: number) {
  if (scroll22 <= 0.18) return 0;
  if (scroll22 >= 0.36) return 1;
  return easeInOutSine((scroll22 - 0.18) / 0.18);
}
