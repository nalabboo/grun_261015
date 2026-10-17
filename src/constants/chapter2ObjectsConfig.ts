import type { Chapter2BergEditTransform } from "@/constants/chapter2Layout";
import { chapter2AssetUrl } from "@/constants/chapter2Config";
import { getDepthBlurRatio, getDepthBrightness } from "@/constants/sceneConfig";

export type Chapter2PropConfig = {
  id: Chapter2PropId;
  file: string;
  width: number;
  height: number;
  zIndex: number;
  parallax: number;
  heightVh: number;
  /** Scene-1 style depth plane (px at 1080p ref) for DOF blur/brightness. */
  depthPx: number;
  blurRatio: number;
  brightness: number;
  defaultLayout: Chapter2BergEditTransform;
};

export const CHAPTER2_PROP_IDS = ["spore2_0", "spore2_1", "spore3"] as const;
export type Chapter2PropId = (typeof CHAPTER2_PROP_IDS)[number];

/** Production prop transforms — tune here after dev Copy JSON. */
export const CHAPTER2_PROP_FIXED_LAYOUTS: Record<
  Chapter2PropId,
  Chapter2BergEditTransform
> = {
  spore2_0: { x: 98, y: -130, scale: 0.48, scaleY: 0.48, rotate: 0 },
  spore2_1: { x: 287, y: -130, scale: 0.48, scaleY: 0.48, rotate: 0 },
  spore3: { x: 238, y: -175, scale: 0.52, scaleY: 0.52, rotate: 0 },
};

/** When true, prop layout is read-only (no dev drag panel). */
export const CHAPTER2_PROPS_LAYOUT_LOCKED = true;

/** Between berg4 (-260) and berg3 (-80); matched to parallax stacking. */
const SPORE2_0_DEPTH_PX = -210;
const SPORE2_1_DEPTH_PX = -150;
const SPORE3_DEPTH_PX = -120;

const SPORE2_FILE = "grun objekt/spore2.png";
const SPORE2_SIZE = { width: 236, height: 854 } as const;

export const CHAPTER2_SPORE2_0: Chapter2PropConfig = {
  id: "spore2_0",
  file: SPORE2_FILE,
  width: SPORE2_SIZE.width,
  height: SPORE2_SIZE.height,
  zIndex: 22,
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
  zIndex: 22,
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
  zIndex: 22,
  parallax: 44,
  heightVh: 0.32,
  depthPx: SPORE3_DEPTH_PX,
  blurRatio: getDepthBlurRatio(SPORE3_DEPTH_PX),
  brightness: getDepthBrightness(SPORE3_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.spore3,
};

export const CHAPTER2_PROPS = [CHAPTER2_SPORE2_0, CHAPTER2_SPORE2_1, CHAPTER2_SPORE3] as const;

export function chapter2PropAssetUrl(file: string) {
  return chapter2AssetUrl(file);
}

export function getChapter2PropDefaultLayout(id: Chapter2PropId): Chapter2BergEditTransform {
  return { ...CHAPTER2_PROP_FIXED_LAYOUTS[id] };
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
