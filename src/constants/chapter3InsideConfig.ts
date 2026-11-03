/** Alien drops in after this delay, falls for `FALL_MS`, then settles with a jelly bounce. */
export const CHAPTER3_ALIEN_DELAY_MS = 600;
export const CHAPTER3_ALIEN_FALL_MS = 680;
export const CHAPTER3_ALIEN_DROP_HEIGHT = 4.6;
/** Landing squash: spring stiffness and damping of the jelly settle. */
export const CHAPTER3_ALIEN_SQUASH = 0.26;
export const CHAPTER3_ALIEN_SETTLE_HZ = 2.6;
export const CHAPTER3_ALIEN_SETTLE_DAMP = 3.4;

/** Alien body length in world units. */
export const CHAPTER3_ALIEN_WIDTH = 3.05;
/** Idle jelly wobble amplitude and breathing squash. */
export const CHAPTER3_ALIEN_WOBBLE = 0;
export const CHAPTER3_ALIEN_BREATH = 0.02;
/** Idle sway of the body around Y (radians), and base turn toward the viewer. */
export const CHAPTER3_ALIEN_SWAY = 0.1;
export const CHAPTER3_ALIEN_TURN = -0.14;

/** Clear glass look (Cycles-style transmission). */
export const CHAPTER3_ALIEN_IOR = 1.55;
export const CHAPTER3_ALIEN_THICKNESS = 2.4;
export const CHAPTER3_ALIEN_DISPERSION = 1.6;

/** Eye blink every 3s; one blink duration (ms). */
export const CHAPTER3_ALIEN_BLINK_INTERVAL_MS = 3000;
export const CHAPTER3_ALIEN_BLINK_MS = 240;

/** Tap gulp (water-dog-style poke): extra wobble and squash while `poke` decays. */
export const CHAPTER3_ALIEN_POKE_WOBBLE = 0.038;
export const CHAPTER3_ALIEN_POKE_SQUASH = 0.28;

/** Metaball shape panel on the inside screen (off for now). */
export const CHAPTER3_ALIEN_SHAPE_EDITOR = false;
