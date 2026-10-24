/**
 * Prop layout space (Chapter2PropLayer): origin at viewport bottom center.
 * x → right positive; y → up negative (same as CHAPTER2_PROP_FIXED_LAYOUTS).
 */
export function chapter2ClientToPropCoords(
  clientX: number,
  clientY: number,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 1080,
) {
  return {
    x: Math.round(clientX - viewportWidth / 2),
    y: Math.round(clientY - viewportHeight),
  };
}

export function chapter2PropXToScreenPx(
  propX: number,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920,
) {
  return viewportWidth / 2 + propX;
}

/** Screen `top` (px) for a prop layout y. */
export function chapter2PropYToScreenTopPx(
  propY: number,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 1080,
) {
  return viewportHeight + propY;
}
