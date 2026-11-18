/** Files under `public/intro/`. */
export const INTRO_ASSET_VERSION = "5";

export function introAssetUrl(relativePath: string) {
  return `/intro/${relativePath}?v=${INTRO_ASSET_VERSION}`;
}

export const INTRO_PAPIER_URL = introAssetUrl("intro_papier.jpg");

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

export const INTRO_RICORI1_2SW = {
  ...INTRO_RICORI_LOGO,
  file: "RICORI1_2sw.png",
} as const;

export const INTRO_RICORI1_2_URL = introAssetUrl(INTRO_RICORI1_2.file);
export const INTRO_RICORI1_2SW_URL = introAssetUrl(INTRO_RICORI1_2SW.file);

/** Opaque coat on the scratch canvas; erased strokes reveal `RICORI1_2sw` below. */
export const INTRO_SCRATCH = {
  brushRadiusPx: 38,
  /** Match `.book-intro` `background-color` when papier is still loading. */
  coverColor: "#f4efe4",
} as const;

/** Crossfade when leaving the book intro for scene 1. */
export const BOOK_INTRO_FADEOUT_MS = 1400;