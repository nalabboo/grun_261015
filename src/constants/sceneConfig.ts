/** Design reference height — depths/blur scale relative to live scene height. */
export const SCENE_REFERENCE_HEIGHT = 1080;

/** Virtual camera distance (as a ratio of stage height) used for berg layer depth. */
export const SCENE_PERSPECTIVE_RATIO = 1.111;

/** Active scene folder under `public/` (was `#1`). */
export const SCENE_ID = "scene1";

/** Bump when scene assets change to bust browser cache. */
export const ASSET_VERSION = "20261017c-scene1";

/** URL for a file under `public/scene1/` (path is relative to that folder). */
export function assetUrl(relativePath: string) {
  return `/${SCENE_ID}/${relativePath}?v=${ASSET_VERSION}`;
}

/**
 * Pixel sizes for textures the WebGL scene loads.
 * Files live under `public/scene1/{berg|character|landmark}/`.
 */
export const IMAGE_SIZES = {
  // berg/
  berg1: { file: "berg/berg1_3.png", width: 6568, height: 540 },
  berg2: { file: "berg/berg2_4.png", width: 5760, height: 1080 },
  berg3: { file: "berg/berg3_3.png", width: 5760, height: 1304 },
  berg4: { file: "berg/berg4_3.png", width: 5760, height: 1305 },
  // character/
  kind_sw: { file: "character/kind_sw.png", width: 509, height: 678 },
  kind_g: { file: "character/kind_g.png", width: 509, height: 678 },
  // landmark/
  worm_b: { file: "landmark/worm_b.png", width: 604, height: 700 },
  worm_g: { file: "landmark/worm_g.png", width: 604, height: 700 },
  ampel_b: { file: "landmark/ampel_b.png", width: 821, height: 1000 },
  ampel_g: { file: "landmark/ampel_g.png", width: 821, height: 1000 },
  spore1: { file: "landmark/spore1.png", width: 180, height: 693 },
  spore2: { file: "landmark/spore2.png", width: 236, height: 854 },
  spore3: { file: "landmark/spore3.png", width: 182, height: 645 },
  stein: { file: "landmark/stein.png", width: 700, height: 637 },
  moss1_b: { file: "landmark/moss1_b.png", width: 426, height: 242 },
  moss1_g: { file: "landmark/moss1_g.png", width: 426, height: 242 },
  moss2_b: { file: "landmark/moss2_b.png", width: 278, height: 144 },
  moss2_g: { file: "landmark/moss2_g.png", width: 278, height: 144 },
} as const;

/**
 * Grun walk cycle: PNG frames extracted from the Kling-made grun_t.gif by
 * `scripts/extract_grun_walk.py` (every 3rd frame, watermark removed).
 * Each frame is the region `crop` of a logical `width` x `height` frame, so layout stays as before.
 */
export const GRUN_WALK = {
  dir: "character/grun_walk",
  frames: 29,
  width: 1000,
  height: 1080,
  cropX: 110,
  cropY: 20,
  loopMs: 1720,
} as const;

export function grunWalkFrameUrl(index: number) {
  return assetUrl(`${GRUN_WALK.dir}/frame_${String(index).padStart(2, "0")}.png`);
}

/** Preload / runtime keys grouped by asset folder (same entries as `IMAGE_SIZES`). */
export const SCENE_ASSET_GROUPS = {
  berg: ["berg1", "berg2", "berg3", "berg4"],
  character: ["kind_sw", "kind_g"],
  landmark: [
    "stein", "worm_b", "worm_g", "ampel_b", "ampel_g",
    "spore1", "spore2", "spore3",
    "moss1_b", "moss1_g", "moss2_b", "moss2_g",
  ],
} as const satisfies Record<string, readonly (keyof typeof IMAGE_SIZES)[]>;

export const BERG_WIDTH_RATIO = IMAGE_SIZES.berg2.width / SCENE_REFERENCE_HEIGHT;
export const BERG1_WIDTH_RATIO = (IMAGE_SIZES.berg1.width / SCENE_REFERENCE_HEIGHT) * 1.22;
export const BERG1_HEIGHT_RATIO = IMAGE_SIZES.berg1.height / SCENE_REFERENCE_HEIGHT;
export const BERG4_WIDTH_RATIO = (IMAGE_SIZES.berg4.width / SCENE_REFERENCE_HEIGHT) * 0.9;

/** Black margin visible after berg right edge when fully scrolled (~18%). */
export const RIGHT_MARGIN_RATIO = 0.18;

/** Total world width at reference height (1080px). Scales with viewport height. */
export const WORLD_TOTAL_WIDTH = 18500;

export const GRUN_FOLLOW_RATIO = 0.32;

/** World scroll so grun sits at `GRUN_FOLLOW_RATIO` across the viewport. */
export function getGrunFollowScroll(
  metrics: SceneMetrics,
  grunWorldX: number,
  maxScroll: number,
) {
  const followMargin = metrics.width * GRUN_FOLLOW_RATIO;

  return Math.max(0, Math.min(grunWorldX - followMargin, maxScroll));
}

/** Grun walk speed (px/s at reference height 1080). */
export const GRUN_WALK_SPEED_BASE = 280;

/** Camera pan speed when focusing on stein/worm (px/s at reference height). */
export const LANDMARK_CAMERA_PAN_SPEED = 160;

/** Start landmark camera when grun is within this distance of worm (viewport width ratio). */
export const LANDMARK_GRUN_PROXIMITY_RATIO = 0.55;

/** Scroll lead before worm enters view where white fade begins (viewport width ratio). */
export const WORM_BACKGROUND_FADE_LEAD_RATIO = 0.34;

/** Scroll span until background is fully white after fade begins (viewport width ratio). */
export const WORM_BACKGROUND_FADE_SPAN_RATIO = 1.55;

export const GRUN_START_RATIO = 0.1;
export const GRUN_SCALE = 0.85;
export const GRUN_OFFSET_Y_RATIO = 10 / SCENE_REFERENCE_HEIGHT;
/** Full playback duration of one walk cycle (ms). */
export const GRUN_WALK_LOOP_MS = GRUN_WALK.loopMs;

export function getRemainingWalkLoopMs(walkPlayStartMs: number, now = Date.now()) {
  if (walkPlayStartMs <= 0) return GRUN_WALK_LOOP_MS;

  const elapsed = now - walkPlayStartMs;
  let remaining = GRUN_WALK_LOOP_MS - (elapsed % GRUN_WALK_LOOP_MS);
  if (remaining < 20) remaining = GRUN_WALK_LOOP_MS;

  return remaining;
}

/** Set false to hide stein/worm while tuning the scene. */
export const SHOW_LANDMARKS = true;

/** Depth (px at 1080p) that is perfectly sharp; layers away from it blur. */
export const DOF_FOCUS_DEPTH_PX = 90;
/** Blur (px at 1080p) per px of depth behind the focus plane. */
export const DOF_FAR_BLUR_PER_PX = 0.012;
/** Blur (px at 1080p) per px of depth in front of the focus plane. */
export const DOF_NEAR_BLUR_PER_PX = 0.06;

/** Depth-of-field blur as a ratio of stage height (far = softer haze, near = out-of-focus foreground). */
export function getDepthBlurRatio(depthPx: number) {
  const delta = depthPx - DOF_FOCUS_DEPTH_PX;
  const blurPx =
    delta < 0 ? -delta * DOF_FAR_BLUR_PER_PX : delta * DOF_NEAR_BLUR_PER_PX;

  return blurPx / SCENE_REFERENCE_HEIGHT;
}

const BERG4_DEPTH_PX = -260;
const BERG3_DEPTH_PX = -80;
const BERG2_DEPTH_PX = 90;
const BERG1_DEPTH_PX = 140;

/**
 * Depth lighting, from the farthest berg to the nearest.
 * DEPTH_LIGHT_FAR is the back (lower = darker). DEPTH_LIGHT_NEAR is the front
 * (1 = the painting's own color).
 */
export const DEPTH_LIGHT_FAR = 0.62;
export const DEPTH_LIGHT_NEAR = 1;

/** Brightness for a berg depth: far layers are darker, near layers stay bright. */
export function getDepthBrightness(depthPx: number) {
  const span = BERG1_DEPTH_PX - BERG4_DEPTH_PX;
  const t = span === 0 ? 1 : (depthPx - BERG4_DEPTH_PX) / span;
  const clamped = Math.min(1, Math.max(0, t));
  return DEPTH_LIGHT_FAR + (DEPTH_LIGHT_NEAR - DEPTH_LIGHT_FAR) * clamped;
}

export const SCENE_LAYERS = {
  berg4: {
    widthRatio: BERG4_WIDTH_RATIO,
    scale: 0.8,
    heightRatio: 1.1,
    blurRatio: getDepthBlurRatio(BERG4_DEPTH_PX),
    brightness: getDepthBrightness(BERG4_DEPTH_PX),
    parallax: 0.07,
    depthRatio: BERG4_DEPTH_PX / SCENE_REFERENCE_HEIGHT,
    paper: 0.07,
    relief: 0.22,
    zIndex: 1,
    offsetYRatio: -0.1,
  },
  berg3: {
    widthRatio: BERG_WIDTH_RATIO,
    scale: 0.9,
    heightRatio: 1.15,
    blurRatio: getDepthBlurRatio(BERG3_DEPTH_PX),
    brightness: getDepthBrightness(BERG3_DEPTH_PX),
    parallax: 0.22,
    depthRatio: BERG3_DEPTH_PX / SCENE_REFERENCE_HEIGHT,
    paper: 0.09,
    relief: 0.28,
    zIndex: 2,
    offsetXRatio: 0.00,
    offsetYRatio: 0.05,
  },
  berg2: {
    widthRatio: BERG_WIDTH_RATIO,
    scale: 1,
    heightRatio: 1,
    blurRatio: getDepthBlurRatio(BERG2_DEPTH_PX),
    brightness: getDepthBrightness(BERG2_DEPTH_PX),
    parallax: 0.48,
    depthRatio: BERG2_DEPTH_PX / SCENE_REFERENCE_HEIGHT,
    paper: 0.11,
    relief: 0.32,
    zIndex: 4,
    offsetYRatio: 0.1,
  },
  berg1: {
    widthRatio: BERG1_WIDTH_RATIO,
    scale: 1,
    heightRatio: BERG1_HEIGHT_RATIO,
    blurRatio: getDepthBlurRatio(BERG1_DEPTH_PX),
    brightness: getDepthBrightness(BERG1_DEPTH_PX),
    parallax: 0.82,
    depthRatio: BERG1_DEPTH_PX / SCENE_REFERENCE_HEIGHT,
    paper: 0.08,
    relief: 0.28,
    zIndex: 5,
    offsetXRatio: -0.045,
    offsetXPx: -1,
    offsetYPx: 2,
  },
} as const;

export const STEIN_HEIGHT_RATIO = IMAGE_SIZES.stein.height / SCENE_REFERENCE_HEIGHT;
export const STEIN_WIDTH_RATIO = IMAGE_SIZES.stein.width / SCENE_REFERENCE_HEIGHT;
const KIND_SCALE = 0.58;
export const KIND_HEIGHT_RATIO = (IMAGE_SIZES.kind_sw.height / SCENE_REFERENCE_HEIGHT) * KIND_SCALE;
export const KIND_WIDTH_RATIO = (IMAGE_SIZES.kind_sw.width / SCENE_REFERENCE_HEIGHT) * KIND_SCALE;
/** Gap between stein right edge and kind_sw left edge (reference px at 1080p). */
export const KIND_STEIN_GAP_PX = -100;
/** Extra rightward offset for kind_sw (reference px at 1080p). */
export const KIND_OFFSET_X_PX = 0;
/** Upward screen offset for kind_sw (reference px at 1080p). */
export const KIND_OFFSET_Y_PX = 40;
/** How far left of kind center grun stops after auto-walk (reference px at 1080p). */
export const GRUN_KIND_STAND_LEFT_OFFSET_PX = 56;

/** Grun stop anchor into stein width after worm/moss reveal (0 = stein left edge). */
export const GRUN_POST_REVEAL_STEIN_X_RATIO = 0.22;
/** Extra rightward offset after worm/moss reveal (reference px at 1080p). */
export const GRUN_POST_REVEAL_OFFSET_X_PX = 700;
/** Extra rightward offset after kind reveal (reference px at 1080p). */
export const GRUN_POST_KIND_REVEAL_OFFSET_X_PX = 100;
export const WORM_HEIGHT_RATIO = IMAGE_SIZES.worm_b.height / SCENE_REFERENCE_HEIGHT;
export const WORM_WIDTH_RATIO = IMAGE_SIZES.worm_b.width / SCENE_REFERENCE_HEIGHT;
export const WORM_SCALE = 0.42;
/** Downward screen offset for worm_b (reference px at 1080p). */
export const WORM_OFFSET_Y_PX = 0;
/** Peak landing surface on stein where worm sits (source px from image bottom). */
export const STEIN_LANDING_SURFACE_FROM_BOTTOM_PX = 268;
/** Horizontal center of stein peak in source image (ratio of stein width). */
export const STEIN_PEAK_CENTER_X_RATIO = 224 / IMAGE_SIZES.stein.width;
/** worm_b feet row (source px from image bottom). */
export const WORM_FEET_FROM_BOTTOM_PX = 40;

/** Gap after berg1 right edge before stein (viewport width ratio). */
export const STEIN_AFTER_BERG1_GAP_RATIO = 0.02;

/** Extra horizontal offset for stein/worm (viewport width ratio). */
export const STEIN_OFFSET_X_RATIO = 1.02;

/** Landmark group screen center when camera pauses (viewport width ratio). */
export const LANDMARK_FOCUS_CENTER_RATIO = 0.5;

/** Gap between grun right edge and stein left edge when camera settles (reference px at 1080p). */
export const GRUN_LANDMARK_STEIN_GAP_PX = 12;

/** Minimum gap fallback — viewport width ratio (whichever is larger applies). */
export const GRUN_LANDMARK_STEIN_GAP_RATIO = 0.012;

/** Min left screen margin so grun is not clipped when landmark camera pauses. */
export const GRUN_LANDMARK_MIN_SCREEN_RATIO = 0.04;

/** Open space after stein before world end (viewport width ratio). */
export const STEIN_TAIL_RATIO = 0.3;

/** Extra scrollable distance after landmark reveals (viewport width ratio). */
export const POST_LANDMARK_EXTENSION_RATIO = 1.8;

export function getBergLayerOffsetX(
  baseOffsetX: number,
  worldScroll: number,
  parallax: number,
) {
  return baseOffsetX - worldScroll * parallax;
}

export function getSteinDimensions(metrics: SceneMetrics) {
  const height = metrics.height * STEIN_HEIGHT_RATIO;
  const width = metrics.height * STEIN_WIDTH_RATIO;
  return { width, height };
}

export function getBerg1DisplayWidth(metrics: SceneMetrics) {
  return metrics.height * BERG1_WIDTH_RATIO;
}

/** Scroll at which berg1's right edge reaches the viewport's right side. */
export function getBerg1EndScroll(metrics: SceneMetrics) {
  const margin = metrics.width * RIGHT_MARGIN_RATIO;
  const { parallax } = SCENE_LAYERS.berg1;
  const berg1Width = getBerg1DisplayWidth(metrics);

  return Math.max(0, (berg1Width - metrics.width + margin) / parallax);
}

/** World X aligned with berg1's right edge when berg1 finishes scrolling. */
export function getBerg1EndWorldX(metrics: SceneMetrics) {
  const scroll = getBerg1EndScroll(metrics);
  const berg1Width = getBerg1DisplayWidth(metrics);
  const { parallax, offsetXPx = 0 } = SCENE_LAYERS.berg1;
  const berg1RightScreen = offsetXPx + berg1Width - scroll * parallax;

  return scroll + berg1RightScreen;
}

/** stein/worm sit in world space where berg1's right edge ends. */
export function getSteinWorldX(metrics: SceneMetrics) {
  return (
    getBerg1EndWorldX(metrics) +
    metrics.width * (STEIN_AFTER_BERG1_GAP_RATIO + STEIN_OFFSET_X_RATIO)
  );
}

export function getSteinLayout(metrics: SceneMetrics) {
  const { width, height } = getSteinDimensions(metrics);
  return {
    worldX: getSteinWorldX(metrics),
    width,
    height,
  };
}

export function getKindDimensions(metrics: SceneMetrics) {
  const height = metrics.height * KIND_HEIGHT_RATIO;
  const width = metrics.height * KIND_WIDTH_RATIO;
  return { width, height };
}

export function getKindLayout(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const { width, height } = getKindDimensions(metrics);
  const gap = KIND_STEIN_GAP_PX * (metrics.height / SCENE_REFERENCE_HEIGHT);
  const offsetX = KIND_OFFSET_X_PX * (metrics.height / SCENE_REFERENCE_HEIGHT);

  return {
    worldX: stein.worldX + stein.width + gap + offsetX,
    width,
    height,
    bottom: KIND_OFFSET_Y_PX * (metrics.height / SCENE_REFERENCE_HEIGHT),
  };
}

export function getKindAnchorWorldX(metrics: SceneMetrics) {
  const kind = getKindLayout(metrics);
  return kind.worldX + kind.width / 2;
}

/** World X for grun when standing beside kind. */
export function getGrunBesideKindWorldX(metrics: SceneMetrics) {
  const grunWidth = getGrunDisplayWidth(metrics);
  const standLeft =
    GRUN_KIND_STAND_LEFT_OFFSET_PX * (metrics.height / SCENE_REFERENCE_HEIGHT);

  return getKindAnchorWorldX(metrics) - grunWidth / 2 - standLeft;
}

/** World X where grun stops after worm/moss reveals — partially behind stein. */
export function getGrunPostRevealStandX(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const grunWidth = getGrunDisplayWidth(metrics);
  const anchorX = stein.worldX + stein.width * GRUN_POST_REVEAL_STEIN_X_RATIO;
  const offsetX =
    GRUN_POST_REVEAL_OFFSET_X_PX * (metrics.height / SCENE_REFERENCE_HEIGHT);

  return anchorX - grunWidth + offsetX;
}

/** World X where grun stops after kind reveal. */
export function getGrunPostKindRevealStandX(metrics: SceneMetrics) {
  const offset =
    GRUN_POST_KIND_REVEAL_OFFSET_X_PX * (metrics.height / SCENE_REFERENCE_HEIGHT);

  return getGrunPostRevealStandX(metrics) + offset;
}

type MossOnSteinLayer = {
  id: MossInstanceId;
  assetKey: "moss1_b" | "moss2_b";
  leftPx: number;
  bottomPx: number;
  scale?: number;
};

export type MossInstanceId = "moss1_b" | "moss2_b-left" | "moss2_b-right";

export const MOSS_INSTANCE_IDS: MossInstanceId[] = [
  "moss1_b",
  "moss2_b-left",
  "moss2_b-right",
];

export type MossPhases = Record<MossInstanceId, "b" | "revealing" | "g">;

export const INITIAL_MOSS_PHASES: MossPhases = {
  moss1_b: "b",
  "moss2_b-left": "b",
  "moss2_b-right": "b",
};

const MOSS_G_ASSET_KEY = {
  moss1_b: "moss1_g",
  moss2_b: "moss2_g",
} as const;

/** Moss placement on stein source canvas (px from stein bottom-left). */
const MOSS_ON_STEIN_LAYERS: MossOnSteinLayer[] = [
  { id: "moss1_b", assetKey: "moss1_b", leftPx: 20, bottomPx: -10, scale: 0.55 },
  { id: "moss2_b-right", assetKey: "moss2_b", leftPx: 343, bottomPx: -5, scale: 0.95 },
  { id: "moss2_b-left", assetKey: "moss2_b", leftPx: 110, bottomPx: 520, scale: 0.4 },
];

export function getMossOnSteinLayouts(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const scaleX = stein.width / IMAGE_SIZES.stein.width;
  const scaleY = stein.height / IMAGE_SIZES.stein.height;

  return MOSS_ON_STEIN_LAYERS.map((layer) => {
    const bAsset = IMAGE_SIZES[layer.assetKey];
    const gAsset = IMAGE_SIZES[MOSS_G_ASSET_KEY[layer.assetKey]];
    const mossScale = layer.scale ?? 1;

    return {
      id: layer.id,
      bFile: bAsset.file,
      gFile: gAsset.file,
      left: layer.leftPx * scaleX,
      bottom: layer.bottomPx * scaleY,
      width: bAsset.width * mossScale * scaleX,
      height: bAsset.height * mossScale * scaleY,
    };
  });
}

/**
 * Layout units follow the reference composite: the rock is 235 "ref px" wide there,
 * so one ref px = rock width / 235. Positions are measured from the rock's left edge.
 */
const REF_ROCK_WIDTH = 235;
const REF_GROUND_Y = 284;

function getRefUnit(metrics: SceneMetrics) {
  return getSteinDimensions(metrics).width / REF_ROCK_WIDTH;
}

export function getAmpelLayout(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const u = getRefUnit(metrics);
  const width = 146 * u;
  const height = width * (IMAGE_SIZES.ampel_g.height / IMAGE_SIZES.ampel_g.width);

  return {
    worldX: stein.worldX + (775 - 365) * u,
    width,
    height,
    bottom: 49 * u,
  };
}

/** Spore trees: x center / crown top / crown width are in ref px of the composite. */
export const SPORE_TREES = [
  { id: "spore_0", asset: "spore2", xc: 185, top: 35, crown: 100, front: false, blur: 2 },
  { id: "spore_1", asset: "spore1", xc: 70, top: 135, crown: 80, front: true, blur: 0 },
  { id: "spore_2", asset: "spore3", xc: 148, top: 155, crown: 40, front: true, blur: 0 },
  { id: "spore_3", asset: "spore1", xc: 215, top: 100, crown: 45, front: false, blur: 1.5 },
  { id: "spore_4", asset: "spore1", xc: 315, top: 80, crown: 35, front: false, blur: 1.5 },
  { id: "spore_5", asset: "spore3", xc: 320, top: 0, crown: 80, front: false, blur: 2 },
  { id: "spore_6", asset: "spore1", xc: 372, top: 5, crown: 50, front: false, blur: 2 },
  { id: "spore_7", asset: "spore2", xc: 335, top: 160, crown: 70, front: true, blur: 0 },
  { id: "spore_8", asset: "spore1", xc: 680, top: 150, crown: 45, front: true, blur: 0 },
  { id: "spore_9", asset: "spore2", xc: 740, top: 95, crown: 50, front: false, blur: 1 },
  { id: "spore_10", asset: "spore3", xc: 820, top: 165, crown: 38, front: true, blur: 0 },
  { id: "spore_11", asset: "spore1", xc: 945, top: 175, crown: 50, front: true, blur: 0 },
  { id: "spore_12", asset: "spore2", xc: 130, top: -175, crown: 120, front: false, blur: 3 },
  { id: "spore_13", asset: "spore2", xc: 560, top: -170, crown: 110, front: false, blur: 3 },
  { id: "spore_14", asset: "spore2", xc: 775, top: -390, crown: 330, front: false, blur: 6 },
] as const;

export type SporeId = (typeof SPORE_TREES)[number]["id"];

export function getSporeLayouts(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const u = getRefUnit(metrics);

  return SPORE_TREES.map((tree) => {
    const size = IMAGE_SIZES[tree.asset];
    const width = tree.crown * u * (size.width / (size.width * 0.96));
    const height = width * (size.height / size.width);

    return {
      id: tree.id,
      file: size.file,
      front: tree.front,
      blurSrcPx: (tree.blur * size.width) / tree.crown,
      worldX: stein.worldX + (tree.xc - 365) * u - width / 2,
      width,
      height,
      bottom: (REF_GROUND_Y - tree.top) * u - height,
    };
  });
}

export function getLandmarkZoneEnd(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const kind = getKindLayout(metrics);
  const ampel = getAmpelLayout(metrics);
  const zoneRight = Math.max(
    stein.worldX + stein.width,
    kind.worldX + kind.width,
    ampel.worldX + ampel.width,
  );

  return zoneRight + metrics.width * STEIN_TAIL_RATIO;
}

export function getScaledWorldWidth(metrics: SceneMetrics) {
  return WORLD_TOTAL_WIDTH * (metrics.height / SCENE_REFERENCE_HEIGHT);
}

/** Scroll needed so berg1's right edge clears the viewport (parallax-adjusted). */
export function getBergMaxScroll(metrics: SceneMetrics) {
  return getBerg1EndScroll(metrics);
}

/** Total world width — design minimum, extended past landmark zone if needed. */
export function getTotalWorldWidth(metrics: SceneMetrics) {
  return Math.max(getScaledWorldWidth(metrics), getLandmarkZoneEnd(metrics));
}

export function getGrunDisplayWidth(metrics: SceneMetrics) {
  const aspect = GRUN_WALK.width / GRUN_WALK.height;

  return metrics.height * aspect * GRUN_SCALE;
}

export function getWormLayout(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const height = metrics.height * WORM_HEIGHT_RATIO * WORM_SCALE;
  const width = metrics.height * WORM_WIDTH_RATIO * WORM_SCALE;
  const landingY =
    stein.height * (STEIN_LANDING_SURFACE_FROM_BOTTOM_PX / IMAGE_SIZES.stein.height);
  const feetY = height * (WORM_FEET_FROM_BOTTOM_PX / IMAGE_SIZES.worm_b.height);
  const offsetY = WORM_OFFSET_Y_PX * (metrics.height / SCENE_REFERENCE_HEIGHT);

  return {
    worldX: stein.worldX + stein.width * STEIN_PEAK_CENTER_X_RATIO - width / 2,
    width,
    height,
    bottom: landingY - feetY - offsetY,
  };
}

/** Scroll needed to center stein/worm on screen. */
export function getLandmarkFocusScroll(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const worm = getWormLayout(metrics);
  const kind = getKindLayout(metrics);
  const groupLeft = Math.min(stein.worldX, worm.worldX);
  const groupRight = Math.max(
    stein.worldX + stein.width,
    worm.worldX + worm.width,
    kind.worldX + kind.width,
    getAmpelLayout(metrics).worldX + getAmpelLayout(metrics).width,
  );
  const groupCenterWorldX = (groupLeft + groupRight) / 2;

  return Math.max(0, Math.min(getMaxScroll(metrics), groupCenterWorldX - metrics.width * LANDMARK_FOCUS_CENTER_RATIO));
}

/** World X where grun stands left of stein when camera pauses. */
export function getGrunLandmarkStandX(metrics: SceneMetrics) {
  const stein = getSteinLayout(metrics);
  const grunWidth = getGrunDisplayWidth(metrics);
  const gap = Math.max(
    GRUN_LANDMARK_STEIN_GAP_PX * (metrics.height / SCENE_REFERENCE_HEIGHT),
    metrics.width * GRUN_LANDMARK_STEIN_GAP_RATIO,
  );
  const focusScroll = getLandmarkFocusScroll(metrics);
  const maxWorldX = stein.worldX - gap - grunWidth;
  const minWorldX = focusScroll + metrics.width * GRUN_LANDMARK_MIN_SCREEN_RATIO;

  return Math.max(0, Math.max(minWorldX, maxWorldX));
}

export function isGrunNearWorm(metrics: SceneMetrics, grunWorldX: number) {
  const worm = getWormLayout(metrics);
  const proximity = metrics.width * LANDMARK_GRUN_PROXIMITY_RATIO;

  return grunWorldX >= worm.worldX - proximity;
}

function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** 0 = black, 1 = white — eases in just before worm enters view. */
export function getBackgroundWhiteProgress(metrics: SceneMetrics, worldScroll: number) {
  const worm = getWormLayout(metrics);
  const wormEnterScroll = worm.worldX - metrics.width;
  const fadeStartScroll =
    wormEnterScroll - metrics.width * WORM_BACKGROUND_FADE_LEAD_RATIO;
  const fadeEndScroll = fadeStartScroll + metrics.width * WORM_BACKGROUND_FADE_SPAN_RATIO;

  if (worldScroll <= fadeStartScroll) return 0;
  if (worldScroll >= fadeEndScroll) return 1;

  return smoothstep((worldScroll - fadeStartScroll) / (fadeEndScroll - fadeStartScroll));
}

export function areWormMossRevealsComplete(
  wormPhase: string,
  mossPhases: MossPhases,
) {
  return (
    wormPhase === "g" &&
    MOSS_INSTANCE_IDS.every((id) => mossPhases[id] === "g")
  );
}

export function areLandmarkRevealsComplete(
  wormPhase: string,
  kindPhase: string,
  mossPhases: MossPhases,
) {
  return (
    wormPhase === "g" &&
    kindPhase === "g" &&
    MOSS_INSTANCE_IDS.every((id) => mossPhases[id] === "g")
  );
}

/** Max scroll once Grun may continue past the landmark zone. */
export function getPostLandmarkMaxScroll(metrics: SceneMetrics) {
  const focusScroll = getLandmarkFocusScroll(metrics);

  return focusScroll + metrics.width * POST_LANDMARK_EXTENSION_RATIO;
}

export function getPostLandmarkMaxGrunWorldX(metrics: SceneMetrics) {
  return getPostLandmarkMaxScroll(metrics) + metrics.width * GRUN_FOLLOW_RATIO + 40;
}

/** Grun (left edge) world X that ends scene1: grun's center reaches the ampel. */
export function getSceneEndGrunWorldX(metrics: SceneMetrics) {
  const ampel = getAmpelLayout(metrics);
  const grunWidth = getGrunDisplayWidth(metrics);

  return Math.min(
    ampel.worldX - grunWidth / 2,
    getPostLandmarkMaxGrunWorldX(metrics) - 8,
  );
}

export type SceneMetrics = {
  height: number;
  width: number;
  panoramaWidth: number;
};

export function getSceneMetrics(height: number, width: number): SceneMetrics {
  return {
    height,
    width,
    panoramaWidth: height * BERG_WIDTH_RATIO,
  };
}

export function getPanoramaWidth(viewportHeight: number) {
  return viewportHeight * BERG_WIDTH_RATIO;
}

/** Empty zone after berg panorama ends (black margin for max scroll). */
export function getWorldExtension(_viewportHeight: number, viewportWidth: number) {
  return viewportWidth * RIGHT_MARGIN_RATIO;
}

/**
 * Max scroll to world end. Ensures berg right edges are visible when parallax requires
 * more distance than the 6700px design width alone.
 */
export function getMaxScroll(metrics: SceneMetrics) {
  return Math.max(0, getTotalWorldWidth(metrics) - metrics.width);
}

/** Grun must reach here (follow margin included) for the camera to hit maxScroll. */
export function getMaxGrunWorldX(metrics: SceneMetrics) {
  return getMaxScroll(metrics) + metrics.width * GRUN_FOLLOW_RATIO + 40;
}

export function scaleWorldX(value: number, fromHeight: number, toHeight: number) {
  if (fromHeight <= 0) return value;
  return value * (toHeight / fromHeight);
}
