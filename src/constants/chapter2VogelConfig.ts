import { chapter2AssetUrl } from "@/constants/chapter2Config";
import {
  CHAPTER2_PROP_FIXED_LAYOUTS,
  CHAPTER2_SPORE4,
} from "@/constants/chapter2ObjectsConfig";
import { getDepthBlurRatio, getDepthBrightness } from "@/constants/sceneConfig";

const SPORE4_DEPTH_PX = 35;

/** 새 (`g_vogel`) — scene 2-2; fly-in tracks scroll nari segment (with Nari). */
export const CHAPTER2_VOGEL = {
  src: chapter2AssetUrl("gelb objekt/g_vogel.png"),
  width: 400,
  height: 411,
  heightVh: 0.6336,
  /** Behind spore4 (`zIndex` 2). */
  zIndex: 1,
  /** Same parallax plane as spore4. */
  parallax: CHAPTER2_SPORE4.parallax,
  /** Nari segment (0–1) before fly-in starts. */
  flyNariDelay: 0.38,
  /** Nari segment length used for fly-in after delay. */
  flyNariSpan: 0.62,
  /** Off-screen left at fly progress 0; enters from the left edge. */
  entryStartXNorm: -0.16,
  /** Softer than spore4 DOF. */
  blurRatio: getDepthBlurRatio(SPORE4_DEPTH_PX) * 0.22,
  brightness: getDepthBrightness(SPORE4_DEPTH_PX),
  /** Offset from spore4 anchor (px) for rest pose behind the spore. */
  restOffsetPx: { x: -250, y: 132 },
} as const;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** 0 until delay within nari segment; then 0→1 over fly span. */
export function getChapter2SaFlyProgress(nariSegment: number) {
  const { flyNariDelay, flyNariSpan } = CHAPTER2_VOGEL;
  if (nariSegment <= flyNariDelay) return 0;
  return clamp01((nariSegment - flyNariDelay) / Math.max(0.08, flyNariSpan));
}

/** Fade in while crossing the left edge (invisible until fly starts). */
export function getChapter2SaFlyOpacity(flyProgress: number) {
  if (flyProgress <= 0) return 0;
  return clamp01(flyProgress / 0.24);
}

export function getChapter2SaShouldMount(nariSegment: number) {
  return nariSegment > CHAPTER2_VOGEL.flyNariDelay;
}

/** Center position (px, viewport top-left) aligned with spore4 layout. */
export function getChapter2SaRestCenterPx(
  viewportWidth: number,
  viewportHeight: number,
  shiftX: number,
  shiftY: number,
) {
  const layout = CHAPTER2_PROP_FIXED_LAYOUTS.spore4;
  const scale = layout.scale;
  const sporeDisplayH = CHAPTER2_SPORE4.heightVh * viewportHeight * scale;
  const sporeBottomX = viewportWidth / 2 + shiftX + layout.x;
  const sporeBottomY = viewportHeight + shiftY + layout.y;
  const sporeCenterY = sporeBottomY - sporeDisplayH * 0.5;

  return {
    x: sporeBottomX + CHAPTER2_VOGEL.restOffsetPx.x,
    y: sporeCenterY + CHAPTER2_VOGEL.restOffsetPx.y,
  };
}
