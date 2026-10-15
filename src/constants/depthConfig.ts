import { IMAGE_SIZES, assetUrl } from "@/constants/sceneConfig";

/** Paper colour — also used as fog colour so far layers fade into the page. */
export const DEPTH_BACKGROUND = "#f3efe6";

export const DEPTH_CAMERA = {
  fov: 50,
  near: 0.1,
  far: 500,
  /** Camera starts here and dollies toward -Z as the page scrolls. */
  zStart: 12,
  zEnd: -14,
  xStart: 0,
  /** Slides toward the centre of the landmark group so stein + frosch + kind end up framed. */
  xEnd: 4.4,
  yStart: 0,
  yEnd: -2.6,
  /** The camera always looks at a point this far ahead → mouse offset becomes a real yaw/pitch. */
  focusDistance: 38,
  /** Max camera translation (world units) at the screen edge of the pointer. */
  panX: 2.6,
  panY: 1.5,
  /** Max extra roll (rad) from horizontal pointer movement. */
  roll: 0.018,
  /** Extra fov (deg) added at full scroll velocity — gives a subtle "rush". */
  velocityFov: 5,
} as const;

export const DEPTH_FOG = { near: 25, far: 230 } as const;

/** Paper-tooth / crayon relief applied to every sprite through a normal map. Keep it thin. */
export const PAPER_RELIEF = {
  /** Brightness swing from the relief (higher = rougher paper; 0 = off). */
  shade: 0.35,
  /** Depth of the generated bumps — only affects the normal map's slope. */
  bumpStrength: 2.6,
  /** Grain tile size as a fraction of the visible height at a sprite's start distance. */
  tileFrac: 0.5,
  /** Light direction when the pointer is centred (raking from upper-left). */
  lightBase: [-0.55, 0.6, 0.55],
  /** How far the pointer swings the light (added to x / y before normalising). */
  lightPointerSwing: [0.5, 0.35],
} as const;

/** Exponential smoothing rates (higher = snappier). */
export const DEPTH_DAMPING = {
  scroll: 3.6,
  pointer: 2.8,
} as const;

/** Aspect used to place layers horizontally (independent of the real window). */
const REF_ASPECT = 16 / 9;

export function viewHeightAt(distance: number) {
  return 2 * distance * Math.tan((DEPTH_CAMERA.fov * Math.PI) / 360);
}

const GRUN_S = { file: "grun_s.png", width: 2000, height: 3034 } as const;

export const DEPTH_TEXTURES = {
  ...IMAGE_SIZES,
  grun_s: GRUN_S,
} as const;

type TextureKey = keyof typeof DEPTH_TEXTURES;

export function depthTextureUrl(key: TextureKey) {
  return assetUrl(DEPTH_TEXTURES[key].file);
}

export function textureAspect(key: TextureKey) {
  const { width, height } = DEPTH_TEXTURES[key];
  return width / height;
}

export type DepthLayer = {
  id: string;
  texture: TextureKey;
  /** Colour version cross-faded in when the camera gets close. */
  revealTexture?: TextureKey;
  /** [far, near] camera distance over which the reveal plays. */
  revealRange?: readonly [number, number];
  /** World position of the plane's centre. */
  position: readonly [number, number, number];
  width: number;
  height: number;
  /** Plane fades out between these camera distances so it never pops through the lens. */
  nearFade?: readonly [number, number];
};

/**
 * Backdrop mountains: laid out as a flat composition seen from the start camera
 * (fractions of the visible area at that depth), then left in true 3D space.
 */
function backdropLayer(options: {
  id: string;
  texture: TextureKey;
  z: number;
  /** Height as a fraction of the visible height at the start camera. */
  heightFrac: number;
  /** Left edge as a fraction of the visible width (−0.5 = left screen edge). */
  leftFrac: number;
  /** Bottom edge as a fraction of the visible height (−0.5 = bottom screen edge). */
  bottomFrac: number;
}): DepthLayer {
  const distance = DEPTH_CAMERA.zStart - options.z;
  const viewH = viewHeightAt(distance);
  const viewW = viewH * REF_ASPECT;
  const height = viewH * options.heightFrac;
  const width = height * textureAspect(options.texture);

  return {
    id: options.id,
    texture: options.texture,
    width,
    height,
    position: [
      viewW * options.leftFrac + width / 2,
      DEPTH_CAMERA.yStart + viewH * options.bottomFrac + height / 2,
      options.z,
    ],
    nearFade: [3, 8],
  };
}

export const BACKDROP_LAYERS: DepthLayer[] = [
  backdropLayer({
    id: "berg4",
    texture: "berg4",
    z: -120,
    heightFrac: 1.0,
    leftFrac: -0.68,
    bottomFrac: -0.62,
  }),
  backdropLayer({
    id: "berg3",
    texture: "berg3",
    z: -95,
    heightFrac: 0.78,
    leftFrac: -0.62,
    bottomFrac: -0.6,
  }),
  backdropLayer({
    id: "berg2",
    texture: "berg2",
    z: -68,
    heightFrac: 0.62,
    leftFrac: -0.5,
    bottomFrac: -0.5,
  }),
  backdropLayer({
    id: "berg1",
    texture: "berg1",
    z: -44,
    heightFrac: 0.36,
    leftFrac: -0.75,
    bottomFrac: -0.5,
  }),
];

/** Baseline everything stands on (world Y). */
export const GROUND_Y = -7;

/**
 * Landmark group (stein + frosch + moss + kind). Child offsets are expressed in
 * stein *source pixels* so the original 2D arrangement is preserved.
 */
export const LANDMARK_GROUP = {
  z: -30,
  /** World X of the stein's left edge. */
  x: -4.2,
  /** World height of the stein. */
  steinHeight: 7.2,
} as const;

const STEIN_PX = IMAGE_SIZES.stein;

export type LandmarkChild = {
  id: string;
  texture: TextureKey;
  revealTexture: TextureKey;
  revealRange: readonly [number, number];
  /** Left / bottom in stein source pixels. */
  leftPx: number;
  bottomPx: number;
  /** Multiplier on the texture's source pixel size. */
  scale: number;
  /** Local z offset (world units) so overlaps always sort the same way. */
  z: number;
};

export const LANDMARK_CHILDREN: LandmarkChild[] = [
  {
    id: "moss1",
    texture: "moss1_b",
    revealTexture: "moss1_g",
    revealRange: [27, 19],
    leftPx: 7,
    bottomPx: -83,
    scale: 1,
    z: 0.4,
  },
  {
    id: "moss2-right",
    texture: "moss2_b",
    revealTexture: "moss2_g",
    revealRange: [25, 18],
    leftPx: 476,
    bottomPx: 113,
    scale: 1,
    z: 0.25,
  },
  {
    id: "moss2-left",
    texture: "moss2_b",
    revealTexture: "moss2_g",
    revealRange: [26, 18.5],
    leftPx: 150,
    bottomPx: 260,
    scale: 0.88,
    z: 0.25,
  },
  {
    id: "frosch",
    texture: "frosch_b",
    revealTexture: "frosch_g",
    revealRange: [23, 17],
    leftPx: 304,
    bottomPx: 432,
    scale: 0.72,
    z: 0.15,
  },
  {
    id: "kind",
    texture: "kind_sw",
    revealTexture: "kind_g",
    revealRange: [21, 16],
    leftPx: 880,
    bottomPx: 20,
    scale: 0.82,
    z: 0.3,
  },
];

export function getLandmarkGroupLayout() {
  const pxToWorld = LANDMARK_GROUP.steinHeight / STEIN_PX.height;

  return {
    pxToWorld,
    steinWidth: STEIN_PX.width * pxToWorld,
    steinHeight: LANDMARK_GROUP.steinHeight,
  };
}

/** Foreground sprites the camera flies past (sides of the path). */
export const FOREGROUND_LAYERS: DepthLayer[] = [
  {
    id: "moss-far-left",
    texture: "moss1_g",
    position: [-9.5, GROUND_Y + 1.1, -16],
    width: 6.4,
    height: 6.4 / textureAspect("moss1_g"),
    nearFade: [1.5, 4],
  },
  {
    id: "moss-mid-right",
    texture: "moss1_g",
    position: [8.5, GROUND_Y + 1.6, -10],
    width: 6,
    height: 6 / textureAspect("moss1_g"),
    nearFade: [1.5, 4],
  },
  {
    id: "moss-near-left",
    texture: "moss2_g",
    position: [-8.2, GROUND_Y + 0.7, -1],
    width: 4.4,
    height: 4.4 / textureAspect("moss2_g"),
    nearFade: [1.5, 4],
  },
  {
    id: "grun",
    texture: "grun_s",
    position: [-5.8, GROUND_Y + 4.8, -4],
    width: 9.6 * textureAspect("grun_s"),
    height: 9.6,
    nearFade: [1.5, 4],
  },
];
