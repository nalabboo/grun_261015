/** Bump when `public/scene3/` assets change. */
export const CHAPTER3_ASSET_VERSION = "20261103-kosmos";

export function chapter3AssetUrl(relativePath: string) {
  const path = relativePath.split("/").map(encodeURIComponent).join("/");
  return `/scene3/${path}?v=${CHAPTER3_ASSET_VERSION}`;
}

/** Distant space backdrop behind the 3D star field. */
export const CHAPTER3_KOSMO_URL = chapter3AssetUrl("kosmos/kosmo.png");

/** White paper backdrop of the screen inside the planet. */
export const CHAPTER3_INSIDE_PAPIER_URL = chapter3AssetUrl("background/papier.jpg");

/** Chapter 3 opening title. */
export const CHAPTER3_TITLE = "색이 없는 소호 행성";

/** Dev: `SceneStage` opens 3장 play by default; `NEXT_PUBLIC_DEV_CHAPTER=1|2` for other chapters. */

export const CHAPTER3_INTRO_TITLE_MS = 2400;
export const CHAPTER3_TITLE_HOLD_MS = 5000;
export const CHAPTER3_INTRO_FADEOUT_MS = 1400;
