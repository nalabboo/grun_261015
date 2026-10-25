import type { Chapter2BergEditTransform } from "@/constants/chapter2Layout";
import {
  CHAPTER2_BERG3_LAYER_Z,
  CHAPTER2_PROP_Z_BEHIND_BERG3,
  CHAPTER2_PROP_Z_BEHIND_BERG4,
  CHAPTER2_PROP_Z_BETWEEN_BERG3_AND_BERG2,
  chapter2AssetUrl,
} from "@/constants/chapter2Config";
import { getDepthBlurRatio, getDepthBrightness } from "@/constants/sceneConfig";

export type Chapter2PropStack =
  | "behindBerg4"
  | "aboveBerg4"
  | "behindBerg3"
  | "aboveBerg3"
  | "betweenBerg3AndBerg2"
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
  attachToBergId?: "berg2" | "berg3" | "berg4";
  /** Opacity follows scroll nari segment (before berg y2). */
  revealOnScroll?: boolean;
  /** Scene 2-3 reveal (see `getChapter2LaublRevealOpacity`). */
  revealOnSubscene23?: boolean;
  /** After Laubl — rise from below viewport (`getChapter2BlauSteinReveal`). */
  revealFromBottomAfterLaubl?: boolean;
  /** After Laubl — slide in from left (`getChapter2BlauSlideFromLeftReveal`). */
  revealFromLeftAfterLaubl?: boolean;
  /** After Laubl — emerge at berg4 peak (`getChapter2Berg4PeakReveal`). */
  revealFromBerg4PeakAfterLaubl?: boolean;
  /** After Laubl — in-place fade (+ optional scale), no slide/rise. */
  revealFadeAfterLaubl?: boolean;
  /** Scene 2-4 — first beat (Koki), before berg drop. */
  revealOnSubscene24?: boolean;
  /** Scene 2-4 — rise from below while bergs drop (`getChapter2RVulkanSubscene24Reveal`). */
  revealWithBerg24Drop?: boolean;
  /** Scene 2-4 — after volcano, enter from bottom-left (`getChapter2RCelemenSubscene24Enter`). */
  revealFromBottomLeftAfterVulkan?: boolean;
  /** Scene 2-4 — slide from bottom-right during celem1 enter (`getChapter2RCelemen2Subscene24Enter`). */
  revealRiseDuringCelem1Enter?: boolean;
  /** Scene 2-4 — bloom on coral1 after volcano (`getChapter2RBlumeSubscene24Bloom`). */
  revealBloomAfterVulkan?: boolean;
};

/** Hidden until scene 2-3 starts (Laubl beat and blau reveals). */
export function chapter2PropIsSubscene23Exclusive(prop: Chapter2PropConfig): boolean {
  return Boolean(
    prop.revealOnSubscene23 ||
      prop.revealFromBottomAfterLaubl ||
      prop.revealFromLeftAfterLaubl ||
      prop.revealFromBerg4PeakAfterLaubl ||
      prop.revealFadeAfterLaubl,
  );
}

export function chapter2PropIsSubscene24Exclusive(prop: Chapter2PropConfig): boolean {
  return Boolean(
    prop.revealOnSubscene24 ||
      prop.revealWithBerg24Drop ||
      prop.revealFromBottomLeftAfterVulkan ||
      prop.revealRiseDuringCelem1Enter ||
      prop.revealBloomAfterVulkan,
  );
}

export const CHAPTER2_PROP_IDS = [
  "spore1",
  "spore1_1",
  "spore2_0",
  "spore2_1",
  "spore3",
  "spore4",
  "grun_v",
  "worm_g",
  "nari",
  "laubl",
  "stein1",
  "stein2",
  "stein3",
  "coral1",
  "coral2",
  "coral3",
  "coral4",
  "coral5",
  "coral6",
  "ikki1",
  "ikki2",
  "ikki3",
  "koki",
  "r_vulkan",
  "r_celemen1",
  "r_celemen2",
  "r_blume1",
  "r_blume2",
  "r_blume3",
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
  worm_g: { x: 250, y: -350, scale: 1.12, scaleY: 1.12, rotate: 0 },
  nari: { x: 360, y: -392, scale: 1.35, scaleY: 1.35, rotate: 0 },
  /** 라우블 — same slot as worm_g (scene 2-3). */
  laubl: { x: 450, y: -144, scale: 2.000, scaleY: 1.512, rotate: 0 },
  /** Blau 돌 — ref layout 2026-10-24 (stein2 right of stein1). */
  stein1: { x: -650, y: 90, scale: 2.138, scaleY: 2.138, rotate: 0 },
  stein2: { x: -68, y: 100, scale: 1.53, scaleY: 1.53, rotate: 0 },
  /** 돌3 — between berg3/berg2; −30% scale, −100px X. */
  stein3: { x: 280, y: -90, scale: 1.928, scaleY: 1.928, rotate: 0 },
  coral1: { x: -970, y: -400, scale: 4.05, scaleY: 4.05, rotate: 45 },
  /** berg4 peak — in front of 산4 PNG, right of coral3. */
  coral2: { x: -450, y: -380, scale: 2, scaleY: 2, rotate: -10 },
  /** berg4 peak — behind 산4 PNG. */
  coral3: { x: -350, y: -250, scale: 2.44, scaleY: 2.44, rotate: 15 },
  /** berg3 — behind 산3 PNG (initial layout). */
  coral4: { x: 120, y: -180, scale: 2.2, scaleY: 2.2, rotate: 0 },
  /** berg3 앞 · berg2 뒤 (`betweenBerg3AndBerg2`). */
  coral5: { x: 560, y: -160, scale: 3.5, scaleY: 3, rotate: -5 },
  /** berg2 앞 (aboveBerg2). */
  coral6: { x: 320, y: 100, scale: 3, scaleY: 5, rotate: -10 },
  /** 이끼1 (b_moss1) — berg3 레이어 (initial layout). */
  ikki1: { x: -950, y: -457, scale: 1.8, scaleY: 2.6, rotate: 0 },
  /** 이끼2 (b_moss2) — berg3 (initial layout). */
  ikki2: { x: -320, y: -500, scale: 2.1, scaleY: 2.1, rotate: -15 },
  /** 이끼3 (b_moss3) — berg2 (initial layout). */
  ikki3: { x: 470, y: -340, scale: 1.2, scaleY: 2.4, rotate: -23 },
  /** 코키 — scene 2-4 lead (initial layout). */
  koki: { x: -500, y: -400, scale: 1.65, scaleY: 1.65, rotate: 0 },
  /** 불칸 — center-bottom, rises during 2-4 berg drop. */
  r_vulkan: { x: -60, y: 50, scale: 2.50, scaleY: 2.50, rotate: 5 },
  r_celemen1: { x: -540, y: 130, scale: 1.20, scaleY: 1.30, rotate: -15 },
  r_celemen2: { x: 200, y: -500, scale: 0.50, scaleY: 0.50, rotate: 28 },
  /** On coral1 tip — bloom after volcano (2-4). */
  r_blume1: { x: -820, y: -620, scale: 2.00, scaleY: 2.00, rotate: -8 },
  r_blume2: { x: -680, y: -520, scale: 1.00, scaleY: 1.00, rotate: 15 },
  /** On coral5 — bloom after volcano (2-4). */
  r_blume3: { x: 650, y: -400, scale: 1.50, scaleY: 1.50, rotate: 6 },
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

/** When true, nari uses fixed layout/blur (not localStorage). */
export const CHAPTER2_NARI_LAYOUT_LOCKED = true;

/** When true, laubl (라우블) uses fixed layout/blur (not localStorage). */
export const CHAPTER2_LAUBL_LAYOUT_LOCKED = true;

export const CHAPTER2_STEIN1_LAYOUT_LOCKED = true;
export const CHAPTER2_STEIN2_LAYOUT_LOCKED = true;
export const CHAPTER2_STEIN3_LAYOUT_LOCKED = true;
export const CHAPTER2_CORAL1_LAYOUT_LOCKED = true;
export const CHAPTER2_CORAL2_LAYOUT_LOCKED = true;
export const CHAPTER2_CORAL3_LAYOUT_LOCKED = true;
export const CHAPTER2_CORAL4_LAYOUT_LOCKED = true;
export const CHAPTER2_CORAL5_LAYOUT_LOCKED = true;
export const CHAPTER2_CORAL6_LAYOUT_LOCKED = true;
export const CHAPTER2_IKKI1_LAYOUT_LOCKED = true;
export const CHAPTER2_IKKI2_LAYOUT_LOCKED = true;
export const CHAPTER2_IKKI3_LAYOUT_LOCKED = true;
export const CHAPTER2_KOKI_LAYOUT_LOCKED = true;

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
const NARI_DEPTH_PX = 55;
/** Foreground critter on berg2 (벌레). */
const WORM_G_DEPTH_PX = 72;
/** Blau 돌 depth planes (px @ 1080p) — nearer = sharper. */
const STEIN1_DEPTH_PX = 88;
const STEIN2_DEPTH_PX = 74;
/** Between berg3 (−80) and berg2 (90) depth planes. */
const STEIN3_DEPTH_PX = 5;
const CORAL1_DEPTH_PX = 76;
/** Behind coral1 — reads as mid-ground when Koki appears in 2-4. */
const KOKI_DEPTH_PX = 68;
/** In front of berg2 focus (90) — Laubl / coral6 read as foreground. */
const LAUBL_DEPTH_PX = 102;
const CORAL6_DEPTH_PX = 118;
const IKKI1_DEPTH_PX = -72;
const IKKI2_DEPTH_PX = -74;
/** Same depth plane as berg2 (90) — moss blur matches the mountain bake. */
const IKKI3_DEPTH_PX = 90;
/** Just in front of berg4 plane, in front of coral3. */
const CORAL2_DEPTH_PX = -175;
/** Behind berg4 ridge, in front of far spores. */
const CORAL3_DEPTH_PX = -228;
/** Behind berg3 plane (−80), in front of berg4 stack. */
const CORAL4_DEPTH_PX = -110;
/** Between berg3 and berg2 planes (with stein3). */
const CORAL5_DEPTH_PX = 12;
/** Behind grun_v — volcano under characters during 2-4. */
const R_VULKAN_DEPTH_PX = 42;
const R_CELEMEN1_DEPTH_PX = 66;
/** Just in front of r_vulkan (42). */
const R_CELEMEN2_DEPTH_PX = 48;
/** Slightly in front of coral1 — reads on top of the branch. */
const R_BLUME1_DEPTH_PX = 84;
const R_BLUME2_DEPTH_PX = 86;
/** Slightly in front of coral5. */
const R_BLUME3_DEPTH_PX = 20;

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

/** 나리 — scroll fade-in before berg y2. */
export const CHAPTER2_NARI: Chapter2PropConfig = {
  id: "nari",
  file: "charactor/nari.png",
  width: 455,
  height: 600,
  zIndex: 3,
  stack: "midBerg2",
  revealOnScroll: true,
  parallax: 18,
  heightVh: 0.38,
  depthPx: NARI_DEPTH_PX,
  blurRatio: getDepthBlurRatio(NARI_DEPTH_PX),
  brightness: getDepthBrightness(NARI_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.nari,
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

/** 라우블 — scene 2-3, worm_g slot; independent parallax (not berg2-attached). */
export const CHAPTER2_LAUBL: Chapter2PropConfig = {
  id: "laubl",
  file: "charactor/laubl.png",
  width: 700,
  height: 1046,
  zIndex: 6,
  stack: "aboveBerg2",
  revealOnSubscene23: true,
  parallax: 19,
  heightVh: 0.26,
  depthPx: LAUBL_DEPTH_PX,
  blurRatio: 0,
  brightness: getDepthBrightness(LAUBL_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.laubl,
};

export const CHAPTER2_STEIN1: Chapter2PropConfig = {
  id: "stein1",
  file: "blau objekt/b_stein1.png",
  width: 793,
  height: 1072,
  zIndex: 4,
  stack: "aboveBerg2",
  revealFromBottomAfterLaubl: true,
  parallax: 15,
  heightVh: 0.22,
  depthPx: STEIN1_DEPTH_PX,
  blurRatio: getDepthBlurRatio(STEIN1_DEPTH_PX),
  brightness: getDepthBrightness(STEIN1_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.stein1,
};

export const CHAPTER2_STEIN2: Chapter2PropConfig = {
  id: "stein2",
  file: "blau objekt/b_stein2.png",
  width: 602,
  height: 719,
  zIndex: 4,
  stack: "aboveBerg2",
  revealFromBottomAfterLaubl: true,
  parallax: 14,
  heightVh: 0.18,
  depthPx: STEIN2_DEPTH_PX,
  blurRatio: getDepthBlurRatio(STEIN2_DEPTH_PX),
  brightness: getDepthBrightness(STEIN2_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.stein2,
};

/** 돌3 — 산3 PNG와 산2 PNG 사이 (`betweenBerg3AndBerg2` + z below berg2 paint). */
export const CHAPTER2_STEIN3: Chapter2PropConfig = {
  id: "stein3",
  file: "blau objekt/b_stein2.png",
  width: 602,
  height: 719,
  zIndex: CHAPTER2_PROP_Z_BETWEEN_BERG3_AND_BERG2,
  stack: "betweenBerg3AndBerg2",
  revealFromBottomAfterLaubl: true,
  parallax: 24,
  heightVh: 0.18,
  depthPx: STEIN3_DEPTH_PX,
  blurRatio: getDepthBlurRatio(STEIN3_DEPTH_PX),
  brightness: getDepthBrightness(STEIN3_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.stein3,
};

/** 이끼1 (b_moss1) — 산3 PNG 위, berg3 motion에 부착. */
export const CHAPTER2_IKKI1: Chapter2PropConfig = {
  id: "ikki1",
  file: "blau objekt/b_moss1.png",
  width: 533,
  height: 257,
  zIndex: CHAPTER2_BERG3_LAYER_Z,
  stack: "aboveBerg3",
  attachToBergId: "berg3",
  revealFadeAfterLaubl: true,
  parallax: 32,
  heightVh: 0.09,
  depthPx: IKKI1_DEPTH_PX,
  blurRatio: getDepthBlurRatio(IKKI1_DEPTH_PX),
  brightness: getDepthBrightness(IKKI1_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.ikki1,
};

/** 이끼2 (b_moss2) — 산3 PNG 위, berg3 motion에 부착. */
export const CHAPTER2_IKKI2: Chapter2PropConfig = {
  id: "ikki2",
  file: "blau objekt/b_moss2.png",
  width: 533,
  height: 257,
  zIndex: CHAPTER2_BERG3_LAYER_Z,
  stack: "aboveBerg3",
  attachToBergId: "berg3",
  revealFadeAfterLaubl: true,
  parallax: 32,
  heightVh: 0.09,
  depthPx: IKKI2_DEPTH_PX,
  blurRatio: getDepthBlurRatio(IKKI2_DEPTH_PX),
  brightness: getDepthBrightness(IKKI2_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.ikki2,
};

/** 이끼3 (b_moss3) — 산2 PNG 위, berg2 motion에 부착. */
export const CHAPTER2_IKKI3: Chapter2PropConfig = {
  id: "ikki3",
  file: "blau objekt/b_moss3.png",
  width: 533,
  height: 257,
  zIndex: 5,
  stack: "aboveBerg2",
  attachToBergId: "berg2",
  revealFadeAfterLaubl: true,
  parallax: 16,
  heightVh: 0.09,
  depthPx: IKKI3_DEPTH_PX,
  blurRatio: getDepthBlurRatio(IKKI3_DEPTH_PX),
  brightness: getDepthBrightness(IKKI3_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.ikki3,
};

/** 불칸 — rot objekt/r_vulkan.png; rises as bergs drop in 2-4. */
export const CHAPTER2_R_VULKAN: Chapter2PropConfig = {
  id: "r_vulkan",
  file: "rot objekt/r_vulkan.png",
  width: 1000,
  height: 677,
  /** Below grun_v (z 2) and nari (z 3); above stein3/coral5 back stack. */
  zIndex: 1,
  stack: "midBerg2",
  revealWithBerg24Drop: true,
  parallax: 18,
  heightVh: 0.38,
  depthPx: R_VULKAN_DEPTH_PX,
  blurRatio: 0,
  brightness: getDepthBrightness(R_VULKAN_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.r_vulkan,
};

/** celem1 — enters from bottom-left after volcano (rot objekt/r_celemen1.png). */
export const CHAPTER2_R_CELEMEN1: Chapter2PropConfig = {
  id: "r_celemen1",
  file: "rot objekt/r_celemen1.png",
  width: 1435,
  height: 962,
  zIndex: 5,
  stack: "midBerg2",
  revealFromBottomLeftAfterVulkan: true,
  parallax: 17,
  heightVh: 0.32,
  depthPx: R_CELEMEN1_DEPTH_PX,
  blurRatio: 0,
  brightness: getDepthBrightness(R_CELEMEN1_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.r_celemen1,
};

/** 셀레맨2 — directly in front of 불칸; enters from bottom-right during 셀레맨1 enter. */
export const CHAPTER2_R_CELEMEN2: Chapter2PropConfig = {
  id: "r_celemen2",
  file: "rot objekt/r_celemen2.png",
  width: 1305,
  height: 857,
  zIndex: 2,
  stack: "midBerg2",
  revealRiseDuringCelem1Enter: true,
  parallax: 16,
  heightVh: 0.34,
  depthPx: R_CELEMEN2_DEPTH_PX,
  blurRatio: 0,
  brightness: getDepthBrightness(R_CELEMEN2_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.r_celemen2,
};

/** 블루메1 — blooms on coral1 after volcano appears. */
export const CHAPTER2_R_BLUME1: Chapter2PropConfig = {
  id: "r_blume1",
  file: "rot objekt/r_blume1.png",
  width: 520,
  height: 480,
  zIndex: 6,
  stack: "aboveBerg2",
  attachToBergId: "berg2",
  revealBloomAfterVulkan: true,
  parallax: 15,
  heightVh: 0.14,
  depthPx: R_BLUME1_DEPTH_PX,
  blurRatio: getDepthBlurRatio(R_BLUME1_DEPTH_PX),
  brightness: getDepthBrightness(R_BLUME1_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.r_blume1,
};

/** 블루메2 — second bloom on coral1 (staggered after blume1). */
export const CHAPTER2_R_BLUME2: Chapter2PropConfig = {
  id: "r_blume2",
  file: "rot objekt/r_blume2.png",
  width: 520,
  height: 480,
  zIndex: 7,
  stack: "aboveBerg2",
  attachToBergId: "berg2",
  revealBloomAfterVulkan: true,
  parallax: 15,
  heightVh: 0.14,
  depthPx: R_BLUME2_DEPTH_PX,
  blurRatio: getDepthBlurRatio(R_BLUME2_DEPTH_PX),
  brightness: getDepthBrightness(R_BLUME2_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.r_blume2,
};

/** 블루메3 — blooms on coral5 after volcano appears. */
export const CHAPTER2_R_BLUME3: Chapter2PropConfig = {
  id: "r_blume3",
  file: "rot objekt/r_blume3.png",
  width: 520,
  height: 480,
  zIndex: CHAPTER2_PROP_Z_BETWEEN_BERG3_AND_BERG2,
  stack: "betweenBerg3AndBerg2",
  revealBloomAfterVulkan: true,
  parallax: 22,
  heightVh: 0.12,
  depthPx: R_BLUME3_DEPTH_PX,
  blurRatio: getDepthBlurRatio(R_BLUME3_DEPTH_PX),
  brightness: getDepthBrightness(R_BLUME3_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.r_blume3,
};

/** 코키 — scene 2-4 first beat (charactor/koki.png). */
export const CHAPTER2_KOKI: Chapter2PropConfig = {
  id: "koki",
  file: "charactor/koki.png",
  width: 500,
  height: 683,
  zIndex: 4,
  stack: "aboveBerg2",
  revealOnSubscene24: true,
  parallax: 20,
  heightVh: 0.28,
  depthPx: KOKI_DEPTH_PX,
  blurRatio: getDepthBlurRatio(KOKI_DEPTH_PX),
  brightness: getDepthBrightness(KOKI_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.koki,
};

/** 코랄6 — above Laubl (z 7); independent parallax (not berg2-attached). */
export const CHAPTER2_CORAL6: Chapter2PropConfig = {
  id: "coral6",
  file: "blau objekt/b_coral6.png",
  width: 600,
  height: 820,
  zIndex: 7,
  stack: "aboveBerg2",
  revealFromBottomAfterLaubl: true,
  parallax: 22,
  heightVh: 0.21,
  depthPx: CORAL6_DEPTH_PX,
  blurRatio: getDepthBlurRatio(CORAL6_DEPTH_PX),
  brightness: getDepthBrightness(CORAL6_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.coral6,
};

/** 코랄1 — b_coral1, above berg2. */
export const CHAPTER2_CORAL1: Chapter2PropConfig = {
  id: "coral1",
  file: "blau objekt/b_coral1.png",
  width: 600,
  height: 820,
  zIndex: 5,
  stack: "aboveBerg2",
  attachToBergId: "berg2",
  revealFromLeftAfterLaubl: true,
  parallax: 15,
  heightVh: 0.22,
  depthPx: CORAL1_DEPTH_PX,
  blurRatio: getDepthBlurRatio(CORAL1_DEPTH_PX),
  brightness: getDepthBrightness(CORAL1_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.coral1,
};

/** 코랄2 — berg4 봉우리 앞, coral3 오른쪽. */
export const CHAPTER2_CORAL2: Chapter2PropConfig = {
  id: "coral2",
  file: "blau objekt/b_coral2.png",
  width: 600,
  height: 820,
  zIndex: 0,
  stack: "aboveBerg4",
  attachToBergId: "berg4",
  revealFromBerg4PeakAfterLaubl: true,
  parallax: 52,
  heightVh: 0.22,
  depthPx: CORAL2_DEPTH_PX,
  blurRatio: getDepthBlurRatio(CORAL2_DEPTH_PX),
  brightness: getDepthBrightness(CORAL2_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.coral2,
};

/** 코랄5 — 산3 앞 · 산2 뒤 (`betweenBerg3AndBerg2`). */
export const CHAPTER2_CORAL5: Chapter2PropConfig = {
  id: "coral5",
  file: "blau objekt/b_coral5.png",
  width: 600,
  height: 820,
  zIndex: CHAPTER2_PROP_Z_BETWEEN_BERG3_AND_BERG2,
  stack: "betweenBerg3AndBerg2",
  revealFromBottomAfterLaubl: true,
  parallax: 22,
  heightVh: 0.2,
  depthPx: CORAL5_DEPTH_PX,
  blurRatio: getDepthBlurRatio(CORAL5_DEPTH_PX),
  brightness: getDepthBrightness(CORAL5_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.coral5,
};

/** 코랄4 — berg3 PNG 뒤. */
export const CHAPTER2_CORAL4: Chapter2PropConfig = {
  id: "coral4",
  file: "blau objekt/b_coral4.png",
  width: 600,
  height: 820,
  zIndex: CHAPTER2_PROP_Z_BEHIND_BERG3,
  stack: "behindBerg3",
  revealFromBottomAfterLaubl: true,
  parallax: 34,
  heightVh: 0.22,
  depthPx: CORAL4_DEPTH_PX,
  blurRatio: 0,
  brightness: 1,
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.coral4,
};

/** 코랄3 — berg4 PNG 뒤(z/DOM), 패럴랙스는 산4와 분리. */
export const CHAPTER2_CORAL3: Chapter2PropConfig = {
  id: "coral3",
  file: "blau objekt/b_coral3.png",
  width: 600,
  height: 820,
  zIndex: CHAPTER2_PROP_Z_BEHIND_BERG4,
  stack: "behindBerg4",
  revealFromBerg4PeakAfterLaubl: true,
  parallax: 60,
  heightVh: 0.22,
  depthPx: CORAL3_DEPTH_PX,
  blurRatio: getDepthBlurRatio(CORAL3_DEPTH_PX),
  brightness: getDepthBrightness(CORAL3_DEPTH_PX),
  defaultLayout: CHAPTER2_PROP_FIXED_LAYOUTS.coral3,
};

export const CHAPTER2_PROPS = [
  CHAPTER2_SPORE1,
  CHAPTER2_SPORE1_1,
  CHAPTER2_SPORE2_1,
  CHAPTER2_SPORE3,
  CHAPTER2_SPORE2_0,
  CHAPTER2_SPORE4,
  CHAPTER2_GRUN_V,
  CHAPTER2_NARI,
  CHAPTER2_WORM_G,
  CHAPTER2_LAUBL,
  CHAPTER2_STEIN1,
  CHAPTER2_STEIN2,
  CHAPTER2_STEIN3,
  CHAPTER2_CORAL1,
  CHAPTER2_R_BLUME1,
  CHAPTER2_R_BLUME2,
  CHAPTER2_CORAL2,
  CHAPTER2_CORAL3,
  CHAPTER2_CORAL4,
  CHAPTER2_CORAL5,
  CHAPTER2_R_BLUME3,
  CHAPTER2_CORAL6,
  CHAPTER2_R_VULKAN,
  CHAPTER2_R_CELEMEN1,
  CHAPTER2_R_CELEMEN2,
  CHAPTER2_IKKI1,
  CHAPTER2_IKKI2,
  CHAPTER2_IKKI3,
  CHAPTER2_KOKI,
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
