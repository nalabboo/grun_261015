/** Files under `public/intro/`. */
export const INTRO_ASSET_VERSION = "7";

export function introAssetUrl(relativePath: string) {
  return `/intro/${relativePath}?v=${INTRO_ASSET_VERSION}`;
}

export const INTRO_PAPIER_URL = introAssetUrl("intro_papier.jpg");

/** 64×64 from `mond_k.png` — browsers cap custom cursor size. */
export const INTRO_MOND_K_CURSOR_URL = introAssetUrl("mond_k_cursor.png");

export const INTRO_RICORI_LOGO = {
  width: 3833,
  height: 979,
  /** Logo width as a share of the viewport (wide wordmark). */
  widthVw: 72,
  maxWidthPx: 1120,
} as const;

export const INTRO_RICORI1_2 = {
  ...INTRO_RICORI_LOGO,
  file: "RICORI1_2.png",
} as const;

/**
 * Grey plate. `_clean` = RICORI1_2sw.png with its edge grown 1–2 px (light grey) so it fully
 * covers the colour plate's anti-aliased edge — otherwise a thin green outline showed through.
 */
export const INTRO_RICORI1_2SW = {
  ...INTRO_RICORI_LOGO,
  file: "RICORI1_2sw_clean.png",
} as const;

export const INTRO_RICORI1_2_URL = introAssetUrl(INTRO_RICORI1_2.file);
export const INTRO_RICORI1_2SW_URL = introAssetUrl(INTRO_RICORI1_2SW.file);

/** Opaque coat on the scratch canvas; erased strokes reveal `RICORI1_2sw` below. */
export const INTRO_SCRATCH = {
  brushRadiusPx: 38,
  /** Rough brush: how ragged the outline is (0 = circle) and how many crumbs fly off its edge. */
  roughness: 0.32,
  crumbs: 12,
  /** Match `.book-intro` `background-color` when papier is still loading. */
  coverColor: "#f4efe4",
} as const;

/** Crossfade when leaving the book intro for scene 1. */
export const BOOK_INTRO_FADEOUT_MS = 1400;