import {
  getDepthBlurRatio,
  getDepthBrightness,
  SCENE_LAYERS,
  SCENE_REFERENCE_HEIGHT,
} from "@/constants/sceneConfig";
import {
  CHAPTER2_BERG4_LAYOUT_DEFAULT,
  type Chapter2BergEditTransform,
} from "@/constants/chapter2Layout";

export const CHAPTER2_ID = "scene2";

/** Bump when `public/scene2/` berg PNGs change (cache bust). */
export const CHAPTER2_ASSET_VERSION = "20261017-scene2-bg-berg-b";

/** Base fit scale (contain + parallax headroom). Transform depth is normalized on top. */
export const CHAPTER2_BERG_DISPLAY_SCALE = 1.14;

/**
 * How much layers shrink/grow with depth (0 = same size, 1 = full scene-1 perspective).
 * Kept low so stacked PNGs stay aligned and do not clip.
 */
export const CHAPTER2_DEPTH_SIZE_STRENGTH = 0.28;

/**
 * Production berg4 layout. Tune in dev (Ch2 berg edit), then paste into
 * `CHAPTER2_BERG4_LAYOUT_DEFAULT` in chapter2Layout.ts.
 */
export const CHAPTER2_BERG4_FIXED_LAYOUT = CHAPTER2_BERG4_LAYOUT_DEFAULT;

export function chapter2AssetUrl(file: string) {
  return `/${CHAPTER2_ID}/${file}?v=${CHAPTER2_ASSET_VERSION}`;
}

/** Chapter 2 background berg PNGs under `public/scene2/background/`. */
const CH2_BG_BERG = {
  width: 5760,
  height: 1080,
} as const;

/** Depth planes aligned with scene 1 berg4 → berg2 (farthest to nearest). */
const CH2_BERG4_DEPTH_PX = -260;
const CH2_BERG3_DEPTH_PX = -80;
const CH2_BERG2_DEPTH_PX = 90;

export type Chapter2BergLayerConfig = {
  id: string;
  file: string;
  width: number;
  height: number;
  assetRoot?: "scene2" | "scene1";
  /** Horizontal bake stretch (1 = native aspect). */
  stretchX?: number;
  /** Display stretch (1 = uniform). */
  scaleY?: number;
  transformOrigin?: string;
  /** Stacking order (far = low). */
  depth: number;
  /** Mouse parallax strength (px). */
  parallax: number;
  depthRatio: number;
  blurRatio: number;
  brightness: number;
  paper: number;
  relief: number;
  /** Extra scale on top of perspective (matches scene 1 berg scales). */
  layerScale: number;
  /** Used when converting blur ratio → source px (scene 1 berg height ratios). */
  heightRatio: number;
  /** Pin to viewport bottom vs vertical center. */
  anchor?: "center" | "bottom";
  /** Baked layout transform (berg4). */
  fixedLayout?: Chapter2BergEditTransform;
  objectPosition?: string;
};

export const CHAPTER2_BERG_LAYERS: readonly Chapter2BergLayerConfig[] = [
  {
    id: "berg4",
    file: "background/2_berg4.png",
    width: CH2_BG_BERG.width,
    height: CH2_BG_BERG.height,
    anchor: "bottom",
    fixedLayout: CHAPTER2_BERG4_FIXED_LAYOUT,
    transformOrigin: "50% 100%",
    objectPosition: "center bottom",
    depth: 0,
    parallax: 52,
    depthRatio: CH2_BERG4_DEPTH_PX / SCENE_REFERENCE_HEIGHT,
    blurRatio: getDepthBlurRatio(CH2_BERG4_DEPTH_PX),
    brightness: getDepthBrightness(CH2_BERG4_DEPTH_PX),
    paper: SCENE_LAYERS.berg4.paper ?? 0.07,
    relief: SCENE_LAYERS.berg4.relief ?? 0.22,
    layerScale: 1,
    heightRatio: 1,
  },
  {
    id: "berg3",
    file: "background/2_berg3.png",
    width: CH2_BG_BERG.width,
    height: CH2_BG_BERG.height,
    scaleY: 1.12,
    transformOrigin: "50% 34%",
    depth: 2,
    parallax: 32,
    depthRatio: CH2_BERG3_DEPTH_PX / SCENE_REFERENCE_HEIGHT,
    blurRatio: getDepthBlurRatio(CH2_BERG3_DEPTH_PX),
    brightness: getDepthBrightness(CH2_BERG3_DEPTH_PX),
    paper: SCENE_LAYERS.berg3.paper ?? 0.09,
    relief: SCENE_LAYERS.berg3.relief ?? 0.28,
    layerScale: 0.98,
    heightRatio: 1,
  },
  {
    id: "berg2",
    file: "background/2_berg2.png",
    width: CH2_BG_BERG.width,
    height: CH2_BG_BERG.height,
    depth: 3,
    parallax: 16,
    depthRatio: CH2_BERG2_DEPTH_PX / SCENE_REFERENCE_HEIGHT,
    blurRatio: getDepthBlurRatio(CH2_BERG2_DEPTH_PX),
    brightness: getDepthBrightness(CH2_BERG2_DEPTH_PX),
    paper: SCENE_LAYERS.berg2.paper ?? 0.11,
    relief: SCENE_LAYERS.berg2.relief ?? 0.32,
    layerScale: 1,
    heightRatio: 1,
  },
] as const;

export function chapter2LayerAssetUrl(layer: Chapter2BergLayerConfig) {
  return chapter2AssetUrl(layer.file);
}

export function preloadChapter2BergAssets() {
  for (const layer of CHAPTER2_BERG_LAYERS) {
    const image = new Image();
    image.src = chapter2LayerAssetUrl(layer);
  }
}
