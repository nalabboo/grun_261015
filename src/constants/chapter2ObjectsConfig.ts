import type { Chapter2BergEditTransform } from "@/constants/chapter2Layout";
import { chapter2AssetUrl } from "@/constants/chapter2Config";
import { getDepthBlurRatio, getDepthBrightness } from "@/constants/sceneConfig";

export type Chapter2PropStack =
  | "aboveBerg4"
  | "aboveBerg3"
  | "behindBerg2"
  | "midBerg2"
  | "aboveBerg2";

export type Chapter2PropEdit = Chapter2BergEditTransform & {
  blurRatio?: number;
};

export type Chapter2PropConfig = {
  id: Chapter2PropId;
  file: string;
  width: number;
  height: number;
  zIndex: number;
  stack: Chapter2PropStack;
  parallax: number;
  heightVh: number;
  /** Scene-1 style depth plane (px at 1080p ref) for DOF blur/brightness. */
  depthPx: number;
  blurRatio: number;
  brightness: number;
  defaultLayout: Chapter2BergEditTransform;
  /** Move/scale with this berg layer (same parallax + depth scale). */
  attachToBergId?: "berg2";
};

export const CHAPTER2_PROP_IDS = [
  "spore1",
  "spore1_1",
  "spore2_0",
  "spore2_1",
  "spore3",
  "spore4",
  "grun_v",
  "worm_g",
] as const;
export type Chapter2PropId = (typeof CHAPTER2_PROP_IDS)[number];

/** Dev-tunable props (spore1 + spore4 are production-fixed). */
export const CHAPTER2_TUNABLE_PROP_IDS = ["spore2_0", "spore2_1", "spore3"] as const;
export type Chapter2TunablePropId = (typeof CHAPTER2_TUNABLE_PROP_IDS)[number];

export function isChapter2PropTunable(id: Chapter2PropId): id is Chapter2TunablePropId {
  return (CHAPTER2_TUNABLE_PROP_IDS as readonly string[]).includes(id);
}

/** Production prop transforms — tune here after dev Copy JSON. */
export const CHAPTER2_PROP_FIXED_LAYOUTS: Record<
  Chapter2PropId,
  Chapter2BergEditTransform
> = {
  spore1: { x: 620, y: 40, scale: 2.56, scaleY: 2.56, rotate: 0 },
  spore1_1: { x: 125, y: 100, scale: 2, scaleY: 2, rotate: 0 },
  spore2_0: { x: 97.6, y: -564.8, scale: 1.44, scaleY: 1.44, rotate: 0 },
  spore2_1: { x: 286.6, y: -564.8, scale: 1.44, scaleY: 1.44, rotate: 0 },
  spore3: { x: 237.6, y: -604.8, scale: 1.56, scaleY: 1.56, rotate: 0 },
  spore4: { x: -370, y: -35, scale: 1.58, scaleY: 1.58, rotate: 0 },
  grun_v: { x: -250, y: -2, scale: 1.9, scaleY: 1.9, rotate: 0 },
  /** 벌레 — bottom-right, in front of berg2 */
  worm_g: { x: 450, y: -244, scale: 1.12, scaleY: 1.12, rotate: 0 },
};

/** Production spore1 / spore4 — same as fixed layouts in this file. */
export const CHAPTER2_SPORE1_PRODUCTION_LAYOUT = CHAPTER2_PROP_FIXED_LAYOUTS.spore1;
export const CHAPTER2_SPORE4_PRODUCTION_LAYOUT = CHAPTER2_PROP_FIXED_LAYOUTS.spore4;

/** Optional prod blur overrides (spore4 `blurRatio` when set). */
export const CHAPTER2_PROP_FIXED_BLUR: Partial<Record<Chapter2PropId, number>> = {};

/** When true, front props use fixed layout only. */
export const CHAPTER2_PROPS_LAYOUT_LOCKED = true;

/** When true, spore1 uses fixed layout/blur (not localStorage). */
export const CHAPTER2_SPORE1_LAYOUT_LOCKED = true;

/** When true, spore1_1 uses fixed layout/blur (not localStorage). */
export const CHAPTER2_SPORE1_1_LAYOUT_LOCKED = true;

/** When true, spore4 uses fixed layout/blur (not localStorage). */
export const CHAPTER2_SPORE4_LAYOUT_LOCKED = true;

/** When true, grun_v uses fixed layout/blur (not localStorage). */
export const CHAPTER2_GRUN_V_LAYOUT_LOCKED = true;

/** When true, worm_g (벌레) uses fixed layout/blur (not localStorage). */
export const CHAPTER2_WORM_G_LAYOUT_LOCKED = true;

/** Between berg4 (-260) and berg3 (-80); matched to parallax stacking. */
const SPORE1_DEPTH_PX = -180;
/** Between spore4 (35) and berg2 (90); in front of berg2. */
const SPORE1_1_DEPTH_PX = 62;
const SPORE2_0_DEPTH_PX = -210;
const SPORE2_1_DEPTH_PX = -150;
const SPORE3_DEPTH_PX = -120;
const SPORE4_DEPTH_PX = 35;
/** Between spore4 and berg2 foreground ridge. */
const GRUN_V_DEPTH_PX = 58;
/** Foreground critter on berg2 (벌레). */
const WORM_G_DEPTH_PX = 72;

const SPORE2_FILE = "grun objekt/spore2.png";
const SPORE2_SIZE = { width: 236, height: 854 } as const;

/** Match spore4 DOF softness (depth plane differs; blur is shared). */
const SPORE4_BLUR = getDepthBlurRatio(SPORE4_DEPTH_PX);

export const CHAPTER2_SPORE1: Chapter2PropConfig = {
  id: "spore1",
  file: "grun objekt/spore1.png",
  width: 180,
  height: 693,
  zIndex: 3,
  stack: "aboveBerg3",
  parallax: 40,
  heightVh: 0.34,
  depthPx: SPORE1_DEPTH_PX,
  blurRatio: SPORE4_BLUR,
  brightness: getDepthBrightness(SPORE1_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.spore1,
};

export const CHAPTER2_SPORE1_1: Chapter2PropConfig = {
  id: "spore1_1",
  file: "grun objekt/spore1.png",
  width: 180,
  height: 693,
  zIndex: 4,
  stack: "aboveBerg2",
  parallax: 28,
  heightVh: 0.34,
  depthPx: SPORE1_1_DEPTH_PX,
  blurRatio: SPORE4_BLUR,
  brightness: getDepthBrightness(SPORE1_1_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.spore1_1,
};

export const CHAPTER2_SPORE2_0: Chapter2PropConfig = {
  id: "spore2_0",
  file: SPORE2_FILE,
  width: SPORE2_SIZE.width,
  height: SPORE2_SIZE.height,
  zIndex: 2,
  stack: "aboveBerg4",
  parallax: 42,
  heightVh: 0.36,
  depthPx: SPORE2_0_DEPTH_PX,
  blurRatio: getDepthBlurRatio(SPORE2_0_DEPTH_PX),
  brightness: getDepthBrightness(SPORE2_0_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.spore2_0,
};

export const CHAPTER2_SPORE2_1: Chapter2PropConfig = {
  id: "spore2_1",
  file: SPORE2_FILE,
  width: SPORE2_SIZE.width,
  height: SPORE2_SIZE.height,
  zIndex: 1,
  stack: "aboveBerg4",
  parallax: 46,
  heightVh: 0.36,
  depthPx: SPORE2_1_DEPTH_PX,
  blurRatio: getDepthBlurRatio(SPORE2_1_DEPTH_PX),
  brightness: getDepthBrightness(SPORE2_1_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.spore2_1,
};

export const CHAPTER2_SPORE3: Chapter2PropConfig = {
  id: "spore3",
  file: "grun objekt/spore3.png",
  width: 182,
  height: 645,
  zIndex: 1,
  stack: "aboveBerg4",
  parallax: 44,
  heightVh: 0.32,
  depthPx: SPORE3_DEPTH_PX,
  blurRatio: getDepthBlurRatio(SPORE3_DEPTH_PX),
  brightness: getDepthBrightness(SPORE3_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.spore3,
};

export const CHAPTER2_SPORE4: Chapter2PropConfig = {
  id: "spore4",
  file: "grun objekt/spore4.png",
  width: 821,
  height: 1000,
  zIndex: 2,
  stack: "behindBerg2",
  parallax: 22,
  heightVh: 0.58,
  depthPx: SPORE4_DEPTH_PX,
  blurRatio: SPORE4_BLUR,
  brightness: getDepthBrightness(SPORE4_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.spore4,
};

export const CHAPTER2_GRUN_V: Chapter2PropConfig = {
  id: "grun_v",
  file: "charactor/grun_v.png",
  width: 500,
  height: 750,
  zIndex: 2,
  stack: "midBerg2",
  parallax: 20,
  heightVh: 0.42,
  depthPx: GRUN_V_DEPTH_PX,
  blurRatio: getDepthBlurRatio(GRUN_V_DEPTH_PX),
  brightness: getDepthBrightness(GRUN_V_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.grun_v,
};

/** 벌레 */
export const CHAPTER2_WORM_G: Chapter2PropConfig = {
  id: "worm_g",
  file: "grun objekt/worm_g.png",
  width: 604,
  height: 700,
  zIndex: 5,
  stack: "aboveBerg2",
  attachToBergId: "berg2",
  parallax: 16,
  heightVh: 0.26,
  depthPx: WORM_G_DEPTH_PX,
  blurRatio: getDepthBlurRatio(WORM_G_DEPTH_PX),
  brightness: getDepthBrightness(WORM_G_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.worm_g,
};

export const CHAPTER2_PROPS = [
  CHAPTER2_SPORE1,
  CHAPTER2_SPORE1_1,
  CHAPTER2_SPORE2_1,
  CHAPTER2_SPORE3,
  CHAPTER2_SPORE2_0,
  CHAPTER2_SPORE4,
  CHAPTER2_GRUN_V,
  CHAPTER2_WORM_G,
] as const;

export function chapter2PropAssetUrl(file: string) {
  return chapter2AssetUrl(file);
}

export function getChapter2PropDefaultBlurRatio(id: Chapter2PropId): number | undefined {
  const prop = CHAPTER2_PROPS.find((p) => p.id === id);
  if (!prop) return undefined;
  return CHAPTER2_PROP_FIXED_BLUR[id] ?? prop.blurRatio;
}

export function getChapter2PropDefaultEdit(id: Chapter2PropId): Chapter2PropEdit {
  const blurRatio = getChapter2PropDefaultBlurRatio(id);
  return {
    ...CHAPTER2_PROP_FIXED_LAYOUTS[id],
    ...(isChapter2PropTunable(id) && blurRatio !== undefined ? { blurRatio } : {}),
  };
}

export function getChapter2PropDefaultLayout(id: Chapter2PropId): Chapter2BergEditTransform {
  return { ...CHAPTER2_PROP_FIXED_LAYOUTS[id] };
}

export function sanitizeChapter2PropEdit(
  source: Partial<Chapter2PropEdit> | null | undefined,
  seed: Chapter2PropEdit,
): Chapter2PropEdit {
  const layout = sanitizeChapter2PropLayout(source, seed);
  const blurRatio = Number.isFinite(source?.blurRatio)
    ? (source!.blurRatio as number)
    : seed.blurRatio;
  return blurRatio !== undefined ? { ...layout, blurRatio } : layout;
}

export function resolveChapter2PropBlurRatio(
  prop: Chapter2PropConfig,
  edit: Chapter2PropEdit,
): number {
  return Number.isFinite(edit.blurRatio) ? (edit.blurRatio as number) : prop.blurRatio;
}

export function withChapter2PropUniformScale(
  patch: Partial<Chapter2BergEditTransform>,
  current: Chapter2BergEditTransform,
): Partial<Chapter2BergEditTransform> {
  const next = { ...patch };
  const scale = next.scale ?? next.scaleY ?? current.scale;
  if (next.scale !== undefined || next.scaleY !== undefined) {
    next.scale = scale;
    next.scaleY = scale;
  }
  return next;
}

export function sanitizeChapter2PropLayout(
  source: Partial<Chapter2BergEditTransform> | null | undefined,
  seed: Chapter2BergEditTransform,
): Chapter2BergEditTransform {
  const uniform = Number.isFinite(source?.scale) ? (source!.scale as number) : seed.scale;
  return {
    x: Number.isFinite(source?.x) ? (source!.x as number) : seed.x,
    y: Number.isFinite(source?.y) ? (source!.y as number) : seed.y,
    scale: uniform,
    scaleY: uniform,
    rotate: Number.isFinite(source?.rotate) ? (source!.rotate as number) : seed.rotate,
  };
}
