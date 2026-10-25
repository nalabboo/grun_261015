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

/** @deprecated Use `CHAPTER2_PLAY_SUBSCENE_2_1` from `chapter2PlaySubscenes.ts`. */
export const CHAPTER2_PLAY_SUBSCENE_BASELINE = "2-1" as const;

/** Sub-scene docs: `chapter2PlaySubscenes.ts`. Dev editor only — manual 2-1↔2-2 scrub. */
export const CHAPTER2_SUBSCENE_SCROLL_WHEEL_GAIN = 0.0018;

/** Extra Y (px) at scroll progress 1 — scene 2-1 → 2-2 berg drift. */
export const CHAPTER2_SCROLL_BERG3_Y = 20;
export const CHAPTER2_SCROLL_BERG4_Y = 40;

/** Bump when `public/scene2/` berg PNGs change (cache bust). */
export const CHAPTER2_ASSET_VERSION = "20261018-scene2-y2-berg";

/** Base fit scale (contain + parallax headroom). Transform depth is normalized on top. */
export const CHAPTER2_BERG_DISPLAY_SCALE = 1.14;

/** Mouse parallax strength for all berg layers and props (1 = legacy). */
export const CHAPTER2_MOUSE_PARALLAX_GAIN = 1.45;

/**
 * Dev: `2-3-complete` (2-3 motions done — scroll after 3 s → 2-4).
 * Default when chapter 2 dev load is on. Override with `NEXT_PUBLIC_DEV_CHAPTER2_START_2_1=1`.
 */
export const DEV_CHAPTER2_START_AT_SUBSCENE_23_HOLD =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_CHAPTER2 !== "0" &&
  process.env.NEXT_PUBLIC_DEV_CHAPTER2_START_2_1 !== "1" &&
  process.env.NEXT_PUBLIC_DEV_CHAPTER2_START_23 !== "1";

/** Dev: jump to `2-3-playing` (mid Laubl beat). `NEXT_PUBLIC_DEV_CHAPTER2_START_23=1`. */
export const DEV_CHAPTER2_START_AT_SUBSCENE_23 =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_CHAPTER2_START_23 === "1";

/** CSS z-index on berg PNGs (`Chapter2BergLayer` uses `layer.depth`). */
export const CHAPTER2_BERG3_LAYER_Z = 2;
export const CHAPTER2_BERG2_LAYER_Z = 3;
/** Props behind 산3 PNG — below berg3 `layer.depth` (2); render before berg3 in DOM. */
export const CHAPTER2_PROP_Z_BEHIND_BERG3 = 1;
/**
 * Props between 산3 and 산2: same z as berg2 but must render before berg2 PNG in DOM
 * so the nearer mountain paints on top.
 */
export const CHAPTER2_PROP_Z_BETWEEN_BERG3_AND_BERG2 = CHAPTER2_BERG2_LAYER_Z;
/**
 * Props behind 산4 PNG — same z as berg4 (`layer.depth` 0); must render before
 * `Chapter2BergLayer` in DOM. Do not use negative z (papier bg is also 0).
 */
export const CHAPTER2_PROP_Z_BEHIND_BERG4 = 0;

/**
 * How much layers shrink/grow with depth (0 = same size, 1 = full scene-1 perspective).
 * Kept low so stacked PNGs stay aligned and do not clip.
 */
export const CHAPTER2_DEPTH_SIZE_STRENGTH = 0.28;

/** Multiplier on scene-1 depth blur (display / CSS path). */
export const CHAPTER2_DOF_BLUR_STRENGTH = 1;

/** Viewport blur px from layer `blurRatio` (ratio × ref height, same as scene 1). */
export function getChapter2BergViewportBlurPx(
  viewportHeight: number,
  blurRatio: number,
  strength = CHAPTER2_DOF_BLUR_STRENGTH,
) {
  if (blurRatio <= 0 || viewportHeight <= 0) return 0;
  return blurRatio * viewportHeight * strength;
}

/**
 * Production berg4 layout. Tune in dev (Ch2 berg edit), then paste into
 * `CHAPTER2_BERG4_LAYOUT_DEFAULT` in chapter2Layout.ts.
 */
export const CHAPTER2_BERG4_FIXED_LAYOUT = CHAPTER2_BERG4_LAYOUT_DEFAULT;

export function chapter2AssetUrl(file: string) {
  const path = file.split("/").map(encodeURIComponent).join("/");
  return `/${CHAPTER2_ID}/${path}?v=${CHAPTER2_ASSET_VERSION}`;
}

/** Paper backdrop behind berg4 (scene 2-1 base). */
export const CHAPTER2_PAPIER_BG_URL = chapter2AssetUrl("background/papier.jpg");

/** Chapter 2 background berg PNGs under `public/scene2/background/` (1600×300). */
const CH2_BG_BERG = {
  width: 1600,
  height: 300,
} as const;

/** Keeps CPU bake blur strength aligned with the previous 1080px-tall berg exports. */
const CH2_BERG_BAKE_HEIGHT_RATIO = CH2_BG_BERG.height / 1080;

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
  /** Scene 2-2 PNG crossfaded in at scroll progress 1. */
  scrollAltFile?: string;
  /** Scene 2-3 PNG crossfaded from scrollAlt at intro progress 1. */
  subscene23AltFile?: string;
};

export const CHAPTER2_BERG_LAYERS: readonly Chapter2BergLayerConfig[] = [
  {
    id: "berg4",
    file: "background/2_berg4.png",
    scrollAltFile: "background/y2_berg4.png",
    subscene23AltFile: "background/b2_berg4.png",
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
    heightRatio: CH2_BERG_BAKE_HEIGHT_RATIO,
  },
  {
    id: "berg3",
    file: "background/2_berg3.png",
    scrollAltFile: "background/y2_berg3.png",
    subscene23AltFile: "background/b2_berg3.png",
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
    heightRatio: CH2_BERG_BAKE_HEIGHT_RATIO,
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
    heightRatio: CH2_BERG_BAKE_HEIGHT_RATIO,
  },
] as const;

export function chapter2LayerAssetUrl(layer: Chapter2BergLayerConfig) {
  return chapter2AssetUrl(layer.file);
}

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

/** Waits until berg + prop PNGs are in the browser cache (decode may still run later). */
export function preloadChapter2BergAssets(): Promise<void> {
  const urls = [
    CHAPTER2_PAPIER_BG_URL,
    ...CHAPTER2_BERG_LAYERS.flatMap((layer) => [
      chapter2LayerAssetUrl(layer),
      ...(layer.scrollAltFile ? [chapter2AssetUrl(layer.scrollAltFile)] : []),
      ...(layer.subscene23AltFile ? [chapter2AssetUrl(layer.subscene23AltFile)] : []),
    ]),
    chapter2AssetUrl("grun objekt/spore1.png"),
    chapter2AssetUrl("grun objekt/spore2.png"),
    chapter2AssetUrl("grun objekt/spore3.png"),
    chapter2AssetUrl("grun objekt/spore4.png"),
    chapter2AssetUrl("grun objekt/marimo1.png"),
    chapter2AssetUrl("grun objekt/marimo2.png"),
    chapter2AssetUrl("charactor/grun_v.png"),
    chapter2AssetUrl("charactor/nari.png"),
    chapter2AssetUrl("charactor/laubl.png"),
    chapter2AssetUrl("charactor/koki.png"),
    chapter2AssetUrl("rot objekt/r_vulkan.png"),
    chapter2AssetUrl("rot objekt/r_celemen1.png"),
    chapter2AssetUrl("rot objekt/r_celemen2.png"),
    chapter2AssetUrl("rot objekt/r_blume1.png"),
    chapter2AssetUrl("rot objekt/r_blume2.png"),
    chapter2AssetUrl("rot objekt/r_blume3.png"),
    chapter2AssetUrl("blau objekt/b_stein1.png"),
    chapter2AssetUrl("blau objekt/b_stein2.png"),
    chapter2AssetUrl("blau objekt/b_coral1.png"),
    chapter2AssetUrl("blau objekt/b_coral2.png"),
    chapter2AssetUrl("blau objekt/b_coral3.png"),
    chapter2AssetUrl("blau objekt/b_coral4.png"),
    chapter2AssetUrl("blau objekt/b_coral5.png"),
    chapter2AssetUrl("blau objekt/b_coral6.png"),
    chapter2AssetUrl("blau objekt/b_moss1.png"),
    chapter2AssetUrl("blau objekt/b_moss2.png"),
    chapter2AssetUrl("blau objekt/b_moss3.png"),
    chapter2AssetUrl("blau objekt/b_bubble 2.png"),
    chapter2AssetUrl("grun objekt/worm_g.png"),
    chapter2AssetUrl("gelb objekt/g_nabi1.png"),
    chapter2AssetUrl("gelb objekt/g_nabi2.png"),
    chapter2AssetUrl("gelb objekt/g_nabi3.png"),
    chapter2AssetUrl("gelb objekt/g_vogel.png"),
  ];
  return Promise.all(urls.map((src) => loadImage(src))).then(() => undefined);
}

/** Dev: skip CPU blur/grain bake and use raw PNGs (much faster first paint). */
export const CHAPTER2_SKIP_BERG_BAKE =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_CHAPTER2_RAW_BERG !== "0";
