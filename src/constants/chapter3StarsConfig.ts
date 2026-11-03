import { chapter3AssetUrl } from "@/constants/scene3Config";
import { CHAPTER2_STAGE_HEIGHT, CHAPTER2_STAGE_WIDTH } from "@/constants/chapter2Viewport";

export const CHAPTER3_STAR_FILES = [
  "kosmos/stern_s1.png",
  "kosmos/stern_s2.png",
  "kosmos/stern_s3.png",
  "kosmos/stern_s4.png",
].map(chapter3AssetUrl);

/** Camera focal length in design-frame px; depth equal to this draws at scale 1. */
export const CHAPTER3_FOCAL = 600;
/** Closest depth a star can sit at relative to the camera. */
export const CHAPTER3_NEAR = 60;
/** Depth of the star volume; stars wrap around it so flight never runs out. */
export const CHAPTER3_DEPTH = 2600;
/** Depth band at each end where stars fade so wrapping never pops. */
export const CHAPTER3_FADE_NEAR = 260;
export const CHAPTER3_FADE_FAR = 600;
/** Apparent size grows with `scale ** this` (softer than true perspective). */
export const CHAPTER3_SIZE_EXPONENT = 0.5;

/** Camera travel per wheel delta unit, and easing toward the target. */
export const CHAPTER3_WHEEL_SPEED = 1.4;
export const CHAPTER3_CAMERA_EASE = 0.12;

/** Max camera turn toward the pointer at the window edge, radians (yaw / pitch). */
export const CHAPTER3_LOOK_YAW = 0.16;
export const CHAPTER3_LOOK_PITCH = 0.1;
/** Max sideways camera shift toward the pointer (design px); near stars slide more → parallax. */
export const CHAPTER3_LOOK_SHIFT_X = 160;
export const CHAPTER3_LOOK_SHIFT_Y = 100;
/** Easing of the view toward the pointer per frame. */
export const CHAPTER3_LOOK_EASE = 0.05;

/**
 * Kosmo sits far behind the stars: it follows the same look rotation/shift,
 * but weaker than foreground so depth stays readable.
 */
/** Pan from yaw/pitch as a fraction of the viewport (at full pointer deflection). */
export const CHAPTER3_KOSMO_ROT_GAIN = 0.42;
/** Lateral shift vs star field (0 = none, 1 = same amplitude). */
export const CHAPTER3_KOSMO_SHIFT_RATIO = 0.32;
/** Subtle zoom when looking off-center (sell depth). */
export const CHAPTER3_KOSMO_SCALE_DRIFT = 0.028;
/** Extra cover scale so panning never exposes empty edges. */
export const CHAPTER3_KOSMO_COVER_PAD = 1.26;

/**
 * Scroll zoom of the backdrop. Position part: soft-limited by camera depth
 * (forward → closer, back → farther). Kick part: follows scroll speed and settles when it stops.
 */
export const CHAPTER3_KOSMO_SCROLL_RANGE = 0.4;
/** Camera travel that covers most of the position range. */
export const CHAPTER3_KOSMO_SCROLL_SPAN = 4000;
export const CHAPTER3_KOSMO_KICK_GAIN = 0.004;
export const CHAPTER3_KOSMO_KICK_MAX = 0.14;
export const CHAPTER3_KOSMO_KICK_EASE = 0.07;
/** Floor so zooming out never exposes empty edges. */
export const CHAPTER3_KOSMO_ZOOM_MIN = 0.96;

const STAR_COUNT = 2000;
/** Share of brighter, larger stars (the cross-flare ones in the reference). */
const BRIGHT_STAR_SHARE = 0.025;

export type Chapter3Star = {
  /** Index into `CHAPTER3_STAR_FILES`. */
  fileIndex: number;
  /** Position in camera space, centered on the stage middle. */
  x: number;
  y: number;
  z: number;
  /** Image height at scale 1, design-frame px. */
  baseHeightPx: number;
  rotateRad: number;
  /** Opacity at the dim end of the twinkle. */
  dimOpacity: number;
  twinkleSec: number;
  /** Twinkle phase offset in radians. */
  phase: number;
};

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStars(): Chapter3Star[] {
  const rand = mulberry32(0x5eed_0303);
  const farZ = CHAPTER3_NEAR + CHAPTER3_DEPTH;
  // Wide enough that the far end still fills the frame when the view turns to the pointer.
  const halfX = ((CHAPTER2_STAGE_WIDTH * 0.64) * farZ) / CHAPTER3_FOCAL;
  const halfY = ((CHAPTER2_STAGE_HEIGHT * 0.68) * farZ) / CHAPTER3_FOCAL;
  const stars: Chapter3Star[] = [];

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const bright = rand() < BRIGHT_STAR_SHARE;
    stars.push({
      fileIndex: Math.floor(rand() * CHAPTER3_STAR_FILES.length),
      x: (rand() * 2 - 1) * halfX,
      y: (rand() * 2 - 1) * halfY,
      z: rand() * CHAPTER3_DEPTH,
      baseHeightPx: bright ? 18 + rand() * 6 : 6 + rand() * 5,
      rotateRad: rand() * Math.PI * 2,
      dimOpacity: 0.4 + rand() * 0.3,
      twinkleSec: 1.4 + rand() * 3,
      phase: rand() * Math.PI * 2,
    });
  }
  return stars;
}

export const CHAPTER3_STARS = buildStars();
