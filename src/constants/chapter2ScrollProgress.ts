import { CHAPTER2_SUBSCENE_SCROLL_MAX } from "@/constants/chapter2ScrollMotion";
import {
  CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC,
  CHAPTER2_SUBSCENE_23_SCROLL_ACCUM_MAX,
} from "@/constants/chapter2Subscene23Motion";
import {
  CHAPTER2_SUBSCENE_24_SCROLL_ACCUM_MAX,
  getChapter2Subscene24MotionCompleteSec,
} from "@/constants/chapter2Subscene24Motion";
import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export type Chapter2ScrollIndicatorInput = {
  phase: Chapter2SubscenePlaybackPhase;
  scroll22: number;
  scroll23Accum: number;
  scroll24Accum: number;
  elapsed23Sec: number;
  elapsed24Sec: number;
  /** Green spotlight zoom 0..1 (end of chapter 2). */
  greenSpotlightZoom: number;
};

/** 0..1 progress for the chapter 2 scroll bar (2-1 through 2-4 / spotlight). */
export function getChapter2ScrollIndicatorProgress(input: Chapter2ScrollIndicatorInput) {
  const { phase } = input;

  if (phase === "2-1") {
    return 0;
  }

  if (phase === "2-2-playing") {
    return clamp01(input.scroll22 / CHAPTER2_SUBSCENE_SCROLL_MAX) * 0.2;
  }

  if (phase === "2-2-complete") {
    const wheel = clamp01(input.scroll23Accum / CHAPTER2_SUBSCENE_23_SCROLL_ACCUM_MAX);
    return 0.2 + wheel * 0.2;
  }

  if (phase === "2-3-playing") {
    const motion = clamp01(input.elapsed23Sec / CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC);
    return 0.4 + motion * 0.2;
  }

  if (phase === "2-3-complete") {
    const wheel = clamp01(input.scroll24Accum / CHAPTER2_SUBSCENE_24_SCROLL_ACCUM_MAX);
    return 0.6 + wheel * 0.2;
  }

  if (phase === "2-4-playing") {
    const completeSec = getChapter2Subscene24MotionCompleteSec();
    const motion = clamp01(input.elapsed24Sec / completeSec);
    const zoom = clamp01(input.greenSpotlightZoom);
    return 0.8 + motion * 0.15 + zoom * 0.05;
  }

  return 1;
}