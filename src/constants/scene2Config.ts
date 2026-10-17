import { ASSET_VERSION, assetUrl } from "@/constants/sceneConfig";

/** Chapter 1 closing tableau — files under `public/scene1/`. */
export function tableauAssetUrl(relativePath: string) {
  return assetUrl(relativePath);
}

export const SCENE2_PAINT_TEXTURE = "landmark/paint_bleed.webp";
export const SCENE2_PAPIER = "landmark/papier.jpg";

export const CHAPTER2_TITLE = "작아지는 초록";
/** Title fade-in duration (ms). */
export const CHAPTER2_INTRO_TITLE_MS = 2400;
/** Title stays fully visible before fade-out (ms). */
export const CHAPTER2_TITLE_HOLD_MS = 5000;
/** Papier + title fade-out before chapter 2 scene (ms). */
export const CHAPTER2_INTRO_FADEOUT_MS = 1400;
/** @deprecated use CHAPTER2_TITLE_HOLD_MS */
export const CHAPTER2_INTRO_HOLD_MS = CHAPTER2_TITLE_HOLD_MS;

/** Composition frame aspect (reference image 1024 x 577). */
export const SCENE2_ASPECT = 1024 / 577;

const TABLEAU_ANIM_MS = {
  fade: 600,
  grow: 1400,
  appear: 1100,
  hero: 1800,
} as const;

type TableauItem = {
  id: string;
  file: string;
  left: number;
  bottom: number;
  height: number;
  width?: number;
  z: number;
  delayMs: number;
  animation: keyof typeof TABLEAU_ANIM_MS;
  fit?: "fill" | "cover";
};

/** Appearance order: background → grass → kinder1, 2, 3 → hund → grun_v. */
export const SCENE2_ITEMS: TableauItem[] = [
  {
    id: "hintergrund",
    file: "landmark/hintergrund.webp",
    left: 50,
    bottom: 0,
    height: 100,
    width: 100,
    z: 0,
    delayMs: 0,
    animation: "fade",
    fit: "cover",
  },
  {
    id: "grass",
    file: "landmark/grass.webp",
    left: 50,
    bottom: -2,
    height: 33,
    width: 92,
    z: 1,
    delayMs: 1400,
    animation: "grow",
    fit: "fill",
  },
  {
    id: "kinder1",
    file: "character/kinder1.webp",
    left: 24,
    bottom: 15,
    height: 38,
    z: 3,
    delayMs: 2400,
    animation: "appear",
  },
  {
    id: "kinder2",
    file: "character/kinder2.webp",
    left: 64,
    bottom: 26,
    height: 25,
    z: 3,
    delayMs: 3100,
    animation: "appear",
  },
  {
    id: "kinder3",
    file: "character/kinder3.webp",
    left: 72.5,
    bottom: 9,
    height: 33,
    z: 4,
    delayMs: 3800,
    animation: "appear",
  },
  {
    id: "hund",
    file: "character/hund.webp",
    left: 15,
    bottom: 11,
    height: 17,
    z: 4,
    delayMs: 4500,
    animation: "appear",
  },
  {
    id: "grun_v",
    file: "character/grun_v.webp",
    left: 44.5,
    bottom: 13,
    height: 77,
    z: 2,
    delayMs: 5400,
    animation: "hero",
  },
];

/** When the last tableau layer finishes its entrance animation (ms). */
export function getTableauRevealCompleteMs() {
  let endMs = 0;
  for (const item of SCENE2_ITEMS) {
    endMs = Math.max(endMs, item.delayMs + TABLEAU_ANIM_MS[item.animation]);
  }
  return endMs + 350;
}

/** Wait after the final layer appears before showing the chapter-2 page button (ms). */
export const TABLEAU_PAGE_BUTTON_DELAY_MS = 2000;

export function getTableauPageButtonShowMs() {
  return getTableauRevealCompleteMs() + TABLEAU_PAGE_BUTTON_DELAY_MS;
}

export function preloadChapter1TableauAssets() {
  for (const file of [SCENE2_PAPIER, ...SCENE2_ITEMS.map((item) => item.file)]) {
    const image = new Image();
    image.src = tableauAssetUrl(file);
  }
}

/** @deprecated use preloadChapter1TableauAssets */
export const preloadScene2Assets = preloadChapter1TableauAssets;
