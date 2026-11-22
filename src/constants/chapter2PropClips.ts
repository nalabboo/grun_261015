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
  saturate: 1.2,
  /** Light / dark difference (deepens the greyish darks). */
  contrast: 1.08,
  brightness: 1,
};

export type Chapter2ClipColor = Partial<typeof CHAPTER2_CLIP_COLOR>;

export type Chapter2ClipPart = {
  /** Folder under public/scene2/. */
  dir: string;
  frames: number;
  durationMs: number;
};

export type Chapter2PropClip = {
  x: number;
  y: number;
  width: number;
  height: number;
  intro?: Chapter2ClipPart;
  loop: Chapter2ClipPart;
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
export function chapter2ClipAllFrameFiles(clip: Chapter2PropClip) {
  return [...(clip.intro ? chapter2ClipFrameFiles(clip.intro) : []), ...chapter2ClipFrameFiles(clip.loop)];
}

export function chapter2ClipFrameFiles(part: Chapter2ClipPart) {
  return Array.from(
    { length: part.frames },
    (_, index) => `${part.dir}/frame_${String(index).padStart(2, "0")}.webp`,
  );
}
