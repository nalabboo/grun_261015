import { RICORI_V_CLIP } from "@/constants/scene2Config";

/**
 * Hand-drawn video clips that replace a chapter 2 prop's still picture (cut from source_videos/
 * by scripts/*.py). A clip plays `intro` (if any) once from when the prop first appears, then
 * repeats `loop`.
 *
 * Placed in the still's own box (e.g. the 455x600 canvas of nari.png): `x` / `y` = top-left of the
 * clip canvas in box px (may be negative when the motion reaches outside the box), `width` /
 * `height` = its size in box px. Frames are `frame_00.webp`, `frame_01.webp`, … in `dir`.
 *
 * No imports here on purpose (chapter2Config preloads these frames).
 */
/**
 * Colour lift for every chapter 2 clip (Nari, butterflies, bird): video encoding turns deep darks
 * a little grey and lowers contrast, so the clips look duller than the stills. Applied live as a
 * CSS filter on the clip canvas — change these and reload, no re-extraction needed (1 = as is).
 * Per clip, `color` on the clip overrides these.
 */
export const CHAPTER2_CLIP_COLOR = {
  /** Colour strength. */
  saturate: 1.35,
  /** Light / dark difference (deepens the greyish darks). */
  contrast: 1.08,
  brightness: 1,
};

export type Chapter2ClipColor = Partial<typeof CHAPTER2_CLIP_COLOR>;

export type Chapter2ClipPart = {
  /** Folder under public/scene2/ (public/scene1/ with `scene1`). */
  dir: string;
  frames: number;
  durationMs: number;
  /** Frames from chapter 1 (same files and cache as there, so nothing is loaded twice). */
  scene1?: boolean;
  /** How long each frame shows (ms) when they differ (hand-drawn clips); else evenly spread. */
  holdMs?: readonly number[];
};

/** A part with its own box (still-box px), e.g. `once`. */
export type Chapter2ClipBoxedPart = Chapter2ClipPart & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Chapter2PropClip = {
  x: number;
  y: number;
  width: number;
  height: number;
  intro?: Chapter2ClipPart;
  loop: Chapter2ClipPart;
  /** Plays one time whenever the prop starts to shrink, then back to `loop` (grun_v). */
  once?: Chapter2ClipBoxedPart;
  /** Overrides `CHAPTER2_CLIP_COLOR` for this clip. */
  color?: Chapter2ClipColor;
};

/**
 * 나리 (scripts/extract_charactor.py nari): nari1.mp4 = she fades in, spins round and settles (once, when
 * she appears in 2-2); nari2.mp4 = idle loop with the cape swaying, afterwards.
 */
export const CHAPTER2_NARI_CLIP: Chapter2PropClip = {
  x: -89,
  y: -16,
  width: 634,
  height: 630,
  intro: { dir: "charactor/nari1", frames: 73, durationMs: 3042 },
  loop: { dir: "charactor/nari2", frames: 37, durationMs: 1233 },
};

/**
 * 라우블 (scripts/extract_charactor.py laubl): lauble1.mp4 = fades in, spins round and settles
 * (once, when Laubl appears in 2-3); laubl2.mp4 = idle loop with the hair blowing, afterwards.
 */
export const CHAPTER2_LAUBL_CLIP: Chapter2PropClip = {
  x: -65,
  y: -38,
  width: 980,
  height: 1088,
  intro: { dir: "charactor/laubl1", frames: 73, durationMs: 3042 },
  loop: { dir: "charactor/laubl2", frames: 73, durationMs: 3042 },
};

/**
 * 코키 (scripts/extract_charactor.py koki): koki1.mp4 = fades in, dances round and settles
 * (once, when Koki appears in 2-4); koki2.mp4 = idle loop with the sleeves swaying, afterwards.
 */
export const CHAPTER2_KOKI_CLIP: Chapter2PropClip = {
  x: -136,
  y: -25,
  width: 770,
  height: 696,
  intro: { dir: "charactor/koki1", frames: 73, durationMs: 3042 },
  loop: { dir: "charactor/koki2", frames: 45, durationMs: 1500 },
};

/**
 * 셀레맨1 (scripts/extract_gelb.py celemen1-2, blue screen): celemen1-1.mp4 = plays once when it
 * slides in (2-4), celemen1-2.mp4 = loop afterwards; in r_celemen1.png's 1435x962 box.
 */
export const CHAPTER2_R_CELEMEN1_CLIP: Chapter2PropClip = {
  x: -20,
  y: -33,
  width: 1398,
  height: 1012,
  intro: { dir: "rot objekt/celemen1-1", frames: 73, durationMs: 3042 },
  loop: { dir: "rot objekt/celemen1-2", frames: 73, durationMs: 3042 },
};

/**
 * 셀레맨2 (scripts/extract_gelb.py celemen2-2, blue screen): celemen2-1.mp4 = plays once when it
 * rises in (2-4), celemen2-2.mp4 = loop afterwards; in r_celemen2.png's 1305x857 box.
 */
export const CHAPTER2_R_CELEMEN2_CLIP: Chapter2PropClip = {
  x: -9,
  y: -87,
  width: 1372,
  height: 989,
  intro: { dir: "rot objekt/celemen2-1", frames: 73, durationMs: 3042 },
  loop: { dir: "rot objekt/celemen2-2", frames: 73, durationMs: 3042 },
};

/**
 * 초록이 (grun_v.png): the same ricori_v.mp4 loop the chapter 1 closing tableau plays
 * (`RICORI_V_CLIP`, public/scene1/character/ricori_v/, 11 drawings, 2.5 s), placed in grun_v.png's
 * 500x750 box (head and feet lined up, iou 0.93; the arms differ as they swing).
 */
export const CHAPTER2_GRUN_V_CLIP: Chapter2PropClip = {
  x: -25,
  y: 11,
  width: 542,
  height: 729,
  loop: {
    dir: RICORI_V_CLIP.dir,
    scene1: true,
    frames: RICORI_V_CLIP.holdMs.length,
    durationMs: RICORI_V_CLIP.holdMs.reduce((sum, ms) => sum + ms, 0),
    holdMs: RICORI_V_CLIP.holdMs,
  },
  // Whenever Grun starts to shrink (2-2, 2-3 and 2-4), ricori_klein.mp4 plays once
  // (scripts/extract_gelb.py ricori_klein, pink screen; lined up with grun_v.png, iou 0.985).
  once: {
    dir: "charactor/ricori_klein",
    frames: 73,
    durationMs: 3042,
    x: 13,
    y: 13,
    width: 467,
    height: 720,
  },
};

/**
 * 노랑 소품 (scripts/extract_gelb.py, blue screen): looping butterflies and bird, each placed in
 * the box of the still it replaces — nabi1.mp4 → g_nabi2.png (500x461), nabi3.mp4 → g_nabi3.png
 * (600x492), vogel.mp4 → g_vogel.png (400x411). nabi3 flies about inside its video, hence its
 * large canvas.
 */
export const CHAPTER2_GELB_CLIPS = {
  nabi1: {
    x: -3,
    y: -10,
    width: 506,
    height: 474,
    loop: { dir: "gelb objekt/nabi1", frames: 43, durationMs: 1433 },
  },
  nabi3: {
    x: -190,
    y: -236,
    width: 813,
    height: 747,
    loop: { dir: "gelb objekt/nabi3", frames: 59, durationMs: 1967 },
  },
  vogel: {
    x: -17,
    y: -51,
    width: 429,
    height: 456,
    loop: { dir: "gelb objekt/vogel", frames: 73, durationMs: 3042 },
  },
} satisfies Record<string, Chapter2PropClip>;

/** Every frame file of a clip (intro and loop). */
export function chapter2ClipFrameFiles(part: Chapter2ClipPart) {
  return Array.from(
    { length: part.frames },
    (_, index) => `${part.dir}/frame_${String(index).padStart(2, "0")}.webp`,
  );
}
