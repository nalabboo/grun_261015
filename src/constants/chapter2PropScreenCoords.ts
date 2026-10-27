import {
  CHAPTER2_STAGE_HEIGHT,
  CHAPTER2_STAGE_WIDTH,
  type Chapter2StageFit,
} from "@/constants/chapter2Viewport";

/**
 * Prop layout space (Chapter2PropLayer): origin at design-frame bottom center.
 * x → right positive; y → up negative (same as CHAPTER2_PROP_FIXED_LAYOUTS).
 */
export function chapter2ClientToPropCoords(
  clientX: number,
  clientY: number,
  fit: Chapter2StageFit,
) {
  return {
    x: Math.round((clientX - fit.left) / fit.scale - CHAPTER2_STAGE_WIDTH / 2),
    y: Math.round((clientY - fit.top) / fit.scale - CHAPTER2_STAGE_HEIGHT),
  };
}

export function chapter2PropXToScreenPx(propX: number, fit: Chapter2StageFit) {
  return fit.left + (CHAPTER2_STAGE_WIDTH / 2 + propX) * fit.scale;
}

/** Screen `top` (px) for a prop layout y. */
export function chapter2PropYToScreenTopPx(propY: number, fit: Chapter2StageFit) {
  return fit.top + (CHAPTER2_STAGE_HEIGHT + propY) * fit.scale;
}
