import { introAssetUrl } from "@/constants/introConfig";

/**
 * Custom mouse cursor for the whole site (src/components/CustomCursor.tsx): the green brush star
 * `public/intro/cursor.png` (shown from a small copy `cursor.webp`; re-make it when the PNG
 * changes). Every turn of the mouse wheel spins it; the spin glides to a stop.
 */
export const CUSTOM_CURSOR = {
  enabled: true,
  url: introAssetUrl("cursor.webp"),
  /** Size on screen (px). */
  sizePx: 40,
  /** Degrees of spin per pixel of wheel scroll (scroll up spins the other way). */
  degPerWheelPx: 0.6,
  /** Most spin one wheel event can add (degrees), so a hard flick doesn't blur. */
  maxStepDeg: 90,
  /** How quickly the star catches up with the spin, 0..1 per frame (lower = longer glide). */
  ease: 0.12,
} as const;
