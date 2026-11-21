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

/**
 * A looping hand-drawn clip shown instead of a still image. Frames are
 * `${dir}/frame_XX.webp`; `holdMs[i]` = how long drawing i stays on screen (from the video).
 */
export type TableauClip = {
  dir: string;
  /** Frame size (px). */
  width: number;
  height: number;
  holdMs: readonly number[];
};

/**
 * Grun's idle loop in the closing tableau, cut out of source_videos/ricori_v.mp4 (pink screen)
 * by `scripts/extract_tableau.py`: 11 drawings, 2.5 s loop. Frames keep the framing of the
 * former grun_v.webp (a little wider for the swinging arms), so the layout is unchanged.
 */
export const RICORI_V_CLIP: TableauClip = {
  dir: "character/ricori_v",
  width: 735,
  height: 989,
  holdMs: [183, 250, 250, 250, 250, 250, 250, 250, 250, 250, 67],
};

/**
 * Cheering kid (replaces kinder2.webp), cut out of source_videos/ai1.mp4 by
 * `scripts/extract_tableau.py`: 31 drawings, 1.3 s loop. Matched to kinder2's height, feet line and
 * centre; the frames have extra room above for the raised hands, so the item's `height` is
 * kinder2's 25 x 1.0824.
 */
export const AI1_CLIP: TableauClip = {
  dir: "character/ai1",
  width: 446,
  height: 657,
  holdMs: [
    17, 50, 83, 33, 50, 33, 50, 33, 50, 33, 50, 33, 50, 33, 50, 33, 50, 33, 50, 33, 50, 33, 50, 33,
    50, 33, 50, 33, 50, 33, 50,
  ],
};

/**
 * Girl whose hair swings in the wind (replaces kinder3.webp), cut out of source_videos/ai2.mp4 by
 * `scripts/extract_tableau.py`: 10 drawings, 3 s loop. Matched to kinder3's height, feet line and
 * centre; the frames have extra room on both sides for the hair, and the item's `height` is
 * kinder3's 33 x 1.0049.
 */
export const AI2_CLIP: TableauClip = {
  dir: "character/ai2",
  width: 596,
  height: 615,
  holdMs: [550, 117, 133, 117, 133, 583, 117, 133, 117, 1000],
};

/**
 * Kid reaching up with the dog (replaces kinder1.webp and hund.webp), cut out of
 * source_videos/ai3.mp4 by `scripts/extract_tableau.py`: 18 drawings (wobbling lines and twinkling
 * sparkles), 1.1 s loop. The kid is matched to kinder1's height, feet line and centre; the frames
 * have extra room on the left for the dog and below for its feet, so the item's `height` is
 * kinder1's 38 x 1.0739 and its `bottom` is 15 - 38 x 0.0704.
 */
export const AI3_CLIP: TableauClip = {
  dir: "character/ai3",
  width: 848,
  height: 610,
  holdMs: [67, 67, 67, 50, 67, 67, 67, 50, 67, 67, 67, 50, 67, 67, 67, 50, 67, 33],
};

/** Frame files of a tableau clip (relative to public/scene1/). */
export function tableauClipFrameFiles(clip: TableauClip) {
  return clip.holdMs.map((_, index) => `${clip.dir}/frame_${String(index).padStart(2, "0")}.webp`);
}

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
  /** Play this clip instead of the still `file` (`file` = its first frame). */
  clip?: TableauClip;
};

/** All layers appear together (delayMs 0); background and grass just fade in. */
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
    delayMs: 0,
    // No grow effect: the grass fades in with the background.
    animation: "fade",
    fit: "fill",
  },
  {
    id: "kinder1",
    file: "character/ai3/frame_00.webp",
    clip: AI3_CLIP,
    left: 24,
    bottom: 12.32,
    height: 40.81,
    z: 3,
    delayMs: 0,
    animation: "appear",
  },
  {
    id: "kinder2",
    file: "character/ai1/frame_00.webp",
    clip: AI1_CLIP,
    left: 64,
    bottom: 26,
    height: 27.06,
    z: 3,
    delayMs: 0,
    animation: "appear",
  },
  {
    id: "kinder3",
    file: "character/ai2/frame_00.webp",
    clip: AI2_CLIP,
    left: 72.5,
    bottom: 9,
    height: 33.16,
    z: 4,
    delayMs: 0,
    animation: "appear",
  },
  {
    id: "grun_v",
    file: "character/ricori_v/frame_00.webp",
    clip: RICORI_V_CLIP,
    left: 44.5,
    bottom: 13,
    height: 77,
    z: 2,
    delayMs: 0,
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

/** Every image file of a tableau item (all frames for a clip). */
export function tableauItemFiles(item: TableauItem) {
  return item.clip ? tableauClipFrameFiles(item.clip) : [item.file];
}

export function preloadChapter1TableauAssets() {
  for (const file of [SCENE2_PAPIER, ...SCENE2_ITEMS.flatMap(tableauItemFiles)]) {
    const image = new Image();
    image.src = tableauAssetUrl(file);
  }
}

/** @deprecated use preloadChapter1TableauAssets */
export const preloadScene2Assets = preloadChapter1TableauAssets;
