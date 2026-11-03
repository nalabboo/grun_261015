/** Seconds of forward scrolling before the planet is discovered. */
export const CHAPTER3_PLANET_DISCOVER_SEC = 3;
/** Camera speed (world units / frame) that counts as "scrolling forward". */
export const CHAPTER3_PLANET_FORWARD_MIN_SPEED = 0.6;

/** Planet spawns this far ahead of the camera at discovery (world units). */
export const CHAPTER3_PLANET_SPAWN_DIST = 1900;
/** Camera stops this far in front of the planet. */
export const CHAPTER3_PLANET_STOP_DIST = 720;
/** Planet radius in world units (same space as the stars). */
export const CHAPTER3_PLANET_RADIUS = 210;
/** Planet center offset from the view axis (world units). */
export const CHAPTER3_PLANET_X = 0;
export const CHAPTER3_PLANET_Y = -20;

/** Fade-in after discovery, seconds. */
export const CHAPTER3_PLANET_FADE_IN_SEC = 1.6;
/** Shard ring, in planet radii. */
export const CHAPTER3_RING_INNER = 1.4;
export const CHAPTER3_RING_OUTER = 1.75;
/** Vertical spread of shards around the ring plane, in planet radii. */
export const CHAPTER3_RING_THICKNESS = 0.036;
export const CHAPTER3_RING_FRAGMENTS = 2400;
/** Share of shards that drift outside the band (loose, uneven look). */
export const CHAPTER3_RING_STRAY_SHARE = 0.18;
/** How far strays reach past the band edges, in planet radii. */
export const CHAPTER3_RING_STRAY_SPREAD = 0.28;
/** Strays spread this many times thicker than the band. */
export const CHAPTER3_RING_STRAY_THICKNESS = 4;
/** 0 = even around the ring, 1 = strongly clumped. */
export const CHAPTER3_RING_CLUMPING = 0.35;

/** Planet refraction strength (screen-UV offset at full normal tilt). */
export const CHAPTER3_PLANET_REFRACT = 0.16;
/** Ripples inside the glass that turn with the planet, so rotation shows in the refraction. */
export const CHAPTER3_PLANET_RIPPLE = 0.32;
export const CHAPTER3_PLANET_RIPPLE_SCALE = 2.6;
/** Ring tilt: X opens it from edge-on toward the viewer, Z rolls it (radians). */
export const CHAPTER3_RING_TILT_X = 0.4;
export const CHAPTER3_RING_TILT_Z = -0.26;
/** Grab area around the planet center, in planet radii. */
export const CHAPTER3_PLANET_GRAB_RADIUS = 1.35;
/** Drag rotation, radians per screen px. */
export const CHAPTER3_PLANET_DRAG_SPEED = 0.008;
/** Spin left after release decays by this factor per 60fps frame. */
export const CHAPTER3_PLANET_DRAG_INERTIA = 0.94;

/** Ring orbit speed, radians per second. */
export const CHAPTER3_RING_SPIN = 0.05;
