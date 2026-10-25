import {
  CHAPTER2_BUBBLE_COUNT,
  CHAPTER2_BUBBLE_INSTANCES,
} from "@/constants/chapter2BubbleConfig";
import {
  CHAPTER2_NABI_INSTANCES,
  type Chapter2NabiInstance,
} from "@/constants/chapter2NabiConfig";
import type { Chapter2SubscenePlaybackPhase } from "@/constants/chapter2SubscenePlayback";
import type { Chapter2PropId } from "@/constants/chapter2ObjectsConfig";
import {
  CHAPTER2_LAUBL_REVEAL_SEC,
  CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC,
  getChapter2GrunSubscene23ScaleMul,
  getChapter2NariSubscene23ScaleMul,
} from "@/constants/chapter2Subscene23Motion";

/** After 2-3 motions finish — wait, then wheel starts 2-4 (same feel as 2-2 → 2-3). */
export const CHAPTER2_SUBSCENE_24_SCROLL_GATE_DELAY_MS = 3000;

export const CHAPTER2_SUBSCENE_24_SCROLL_ACCUM_MAX = 1;
export const CHAPTER2_SUBSCENE_24_SCROLL_WHEEL_GAIN = 0.0016;

export function canChapter2ScrollStartSubscene24(completeAtMs: number, nowMs = performance.now()) {
  if (completeAtMs <= 0) return false;
  return nowMs - completeAtMs >= CHAPTER2_SUBSCENE_24_SCROLL_GATE_DELAY_MS;
}

export function isChapter2Subscene24ScrollAccumReady(scrollAccum: number) {
  return scrollAccum >= CHAPTER2_SUBSCENE_24_SCROLL_ACCUM_MAX;
}

export const CHAPTER2_BERG2_SUBSCENE_24_Y = 80;
export const CHAPTER2_BERG3_SUBSCENE_24_Y = 50;

/** Less downward travel for berg2 + grun_v during 2-4 (px at progress 1). */
export const CHAPTER2_SUBSCENE_24_BERG2_GRUN_DESCENT_LIFT_PX = 50;

/** berg4 — fixed drop while volcano rises (px @ ref layout). */
export const CHAPTER2_BERG4_SUBSCENE_24_Y = 200;

/** Berg4 + volcano — start at 2-4 beat (berg2/3 still wait for Koki gate). */
export const CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC = 0;
export const CHAPTER2_BERG4_SUBSCENE_24_SYNC_DELAY_SEC = 0;
export const CHAPTER2_BERG4_SUBSCENE_24_SYNC_SPAN_SEC = 4.85;

/** Koki fade — same duration as Laubl (`CHAPTER2_LAUBL_REVEAL_SEC`); berg drops after. */
export const CHAPTER2_SUBSCENE_24_BERG_MOTION_START_SEC = CHAPTER2_LAUBL_REVEAL_SEC + 0.12;

/** Same fade-in curve as `getChapter2LaublRevealOpacity` (scroll → subscene start → fade). */
export function getChapter2KokiRevealOpacity(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
) {
  if (phase !== "2-4-playing") return 0;
  return clamp01(elapsedSince24Sec / CHAPTER2_LAUBL_REVEAL_SEC);
}

type Chapter2KokiCharacterShrinkSpec = {
  scaleEnd: number;
  dropPx: number;
  delaySec: number;
  spanSec: number;
};

/** Per-character shrink beat (stable seeded stagger). */
function buildChapter2KokiCharacterShrinkSpecs(): Partial<
  Record<Chapter2PropId, Chapter2KokiCharacterShrinkSpec>
> {
  const entries: {
    id: Chapter2PropId;
    scaleEnd: number;
    dropPx: number;
    seed: number;
    delayBaseSec: number;
    delayJitterSec: number;
  }[] = [
    { id: "grun_v", scaleEnd: 0.45, dropPx: 22, seed: 0x20404b01, delayBaseSec: 0, delayJitterSec: 0.22 },
    { id: "laubl", scaleEnd: 0.8, dropPx: 44, seed: 0x20404b02, delayBaseSec: 0.05, delayJitterSec: 0.28 },
    { id: "nari", scaleEnd: 0.6, dropPx: 40, seed: 0x20404b03, delayBaseSec: 0.1, delayJitterSec: 0.32 },
  ];
  const specs: Partial<Record<Chapter2PropId, Chapter2KokiCharacterShrinkSpec>> = {};
  for (const row of entries) {
    const rand = seededRandom(row.seed);
    specs[row.id] = {
      scaleEnd: row.scaleEnd,
      dropPx: row.dropPx,
      delaySec: row.delayBaseSec + rand() * row.delayJitterSec,
      spanSec: 1.4 + rand() * 1.2,
    };
  }
  return specs;
}

const CHAPTER2_KOKI_CHARACTER_SHRINK = buildChapter2KokiCharacterShrinkSpecs();

export type Chapter2Subscene24CharacterShrink = {
  scaleMul: number;
  yOffsetPx: number;
};

export function getChapter2Subscene24CharacterShrink(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
): Chapter2Subscene24CharacterShrink | null {
  if (phase !== "2-4-playing") return null;
  const spec = CHAPTER2_KOKI_CHARACTER_SHRINK[propId];
  if (!spec) return null;

  if (elapsedSince24Sec <= spec.delaySec) return null;
  const t = easeInOutSine(
    clamp01((elapsedSince24Sec - spec.delaySec) / Math.max(0.12, spec.spanSec)),
  );
  if (t <= 0) return null;

  let startScale = 1;
  if (propId === "grun_v") {
    startScale = getChapter2GrunSubscene23ScaleMul(
      "2-3-complete",
      CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC,
    );
  } else if (propId === "nari") {
    startScale = getChapter2NariSubscene23ScaleMul(
      "2-3-complete",
      CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC,
    );
  }

  let yOffsetPx = t * spec.dropPx;
  if (propId === "grun_v") {
    yOffsetPx -= t * CHAPTER2_SUBSCENE_24_BERG2_GRUN_DESCENT_LIFT_PX;
  }

  return {
    scaleMul: startScale + (spec.scaleEnd - startScale) * t,
    yOffsetPx,
  };
}

type Chapter2Coral24ShrinkSpec = {
  scaleEnd: number;
  dropPx: number;
  delaySec: number;
  spanSec: number;
};

const CHAPTER2_SUBSCENE_24_CORAL_SHRINK_IDS = [
  "coral2",
  "coral3",
  "coral4",
  "coral5",
] as const satisfies readonly Chapter2PropId[];

function buildChapter2Coral24ShrinkSpecs(): Record<Chapter2PropId, Chapter2Coral24ShrinkSpec> {
  const specs = {} as Record<Chapter2PropId, Chapter2Coral24ShrinkSpec>;
  for (let i = 0; i < CHAPTER2_SUBSCENE_24_CORAL_SHRINK_IDS.length; i++) {
    const id = CHAPTER2_SUBSCENE_24_CORAL_SHRINK_IDS[i];
    const rand = seededRandom(0x240c0a01 + i * 509);
    specs[id] = {
      scaleEnd: 0.68 + rand() * 0.2,
      dropPx: 28 + rand() * 72,
      delaySec: rand() * 0.48,
      spanSec: 0.72 + rand() * 0.88,
    };
  }
  return specs;
}

const CHAPTER2_CORAL24_SHRINK_SPECS = buildChapter2Coral24ShrinkSpecs();

function isChapter2Subscene24CoralShrinkId(propId: Chapter2PropId) {
  return (CHAPTER2_SUBSCENE_24_CORAL_SHRINK_IDS as readonly string[]).includes(propId);
}

/** coral2–5 — shrink + drop during the same 2-4 beat as the characters (seeded stagger). */
export function getChapter2CoralSubscene24Shrink(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
): Chapter2Subscene24CharacterShrink | null {
  if (phase !== "2-4-playing" || !isChapter2Subscene24CoralShrinkId(propId)) return null;

  const spec = CHAPTER2_CORAL24_SHRINK_SPECS[propId];
  if (elapsedSince24Sec <= spec.delaySec) return null;

  const t = easeInOutSine(
    clamp01((elapsedSince24Sec - spec.delaySec) / Math.max(0.12, spec.spanSec)),
  );
  if (t <= 0) return null;

  return {
    scaleMul: 1 + (spec.scaleEnd - 1) * t,
    yOffsetPx: t * spec.dropPx,
  };
}

const CHAPTER2_SUBSCENE_24_STEIN_DROP_IDS = [
  "stein1",
  "stein2",
  "stein3",
] as const satisfies readonly Chapter2PropId[];

type Chapter2Stein24DropSpec = {
  delaySec: number;
  spanSec: number;
  dropPx: number;
};

function buildChapter2Stein24DropSpecs(): Record<Chapter2PropId, Chapter2Stein24DropSpec> {
  const specs = {} as Record<Chapter2PropId, Chapter2Stein24DropSpec>;
  for (let i = 0; i < CHAPTER2_SUBSCENE_24_STEIN_DROP_IDS.length; i++) {
    const id = CHAPTER2_SUBSCENE_24_STEIN_DROP_IDS[i];
    const rand = seededRandom(0x24057e10 + i * 521);
    specs[id] = {
      delaySec: rand() * 0.95,
      spanSec: 1.05 + rand() * 1.45,
      dropPx: 12 + rand() * 34,
    };
  }
  return specs;
}

const CHAPTER2_STEIN24_DROP_SPECS = buildChapter2Stein24DropSpecs();

function isChapter2Subscene24SteinDropId(propId: Chapter2PropId) {
  return (CHAPTER2_SUBSCENE_24_STEIN_DROP_IDS as readonly string[]).includes(propId);
}

/** stein1–3 — slight drop while volcano rises (seeded stagger). */
export function getChapter2SteinSubscene24Drop(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
): Chapter2Subscene24CharacterShrink | null {
  if (phase !== "2-4-playing" || !isChapter2Subscene24SteinDropId(propId)) return null;

  const motionElapsed = elapsedSince24Sec - CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC;
  if (motionElapsed <= 0) return null;

  const spec = CHAPTER2_STEIN24_DROP_SPECS[propId];
  if (motionElapsed <= spec.delaySec) return null;

  const t = easeInOutSine(
    clamp01((motionElapsed - spec.delaySec) / Math.max(0.12, spec.spanSec)),
  );
  if (t <= 0) return null;

  return {
    scaleMul: 1,
    yOffsetPx: t * spec.dropPx,
  };
}

type Chapter2Berg24Id = "berg2" | "berg3" | "berg4";

type Chapter2Berg24MotionSpec = {
  delaySec: number;
  spanSec: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** Staggered per-berg timing (stable across reloads). */
function buildChapter2Berg24MotionSpecs(): Record<Chapter2Berg24Id, Chapter2Berg24MotionSpec> {
  const rand = seededRandom(0x2_04_0_24);
  const mk = () => ({
    delaySec: 0.55 + rand() * 0.95,
    spanSec: 1.45 + rand() * 1.35,
  });
  return {
    berg4: {
      delaySec: CHAPTER2_BERG4_SUBSCENE_24_SYNC_DELAY_SEC,
      spanSec: CHAPTER2_BERG4_SUBSCENE_24_SYNC_SPAN_SEC,
    },
    berg3: mk(),
    berg2: mk(),
  };
}

export const CHAPTER2_BERG24_MOTION_SPECS = buildChapter2Berg24MotionSpecs();

function getChapter2Berg24MotionElapsedSec(
  bergId: Chapter2Berg24Id,
  elapsedSince24Sec: number,
) {
  return bergId === "berg4"
    ? elapsedSince24Sec - CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC
    : elapsedSince24Sec - CHAPTER2_SUBSCENE_24_BERG_MOTION_START_SEC;
}

export function getChapter2Berg24MotionProgress(
  bergId: Chapter2Berg24Id,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
) {
  if (phase !== "2-4-playing") return 0;
  const motionElapsed = getChapter2Berg24MotionElapsedSec(bergId, elapsedSince24Sec);
  if (motionElapsed <= 0) return 0;
  const { delaySec, spanSec } = CHAPTER2_BERG24_MOTION_SPECS[bergId];
  if (motionElapsed <= delaySec) return 0;
  return easeInOutSine((motionElapsed - delaySec) / Math.max(0.12, spanSec));
}

export function getChapter2BergSubscene24YOffset(
  bergId: Chapter2Berg24Id,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  viewportHeight: number,
) {
  const progress = getChapter2Berg24MotionProgress(bergId, phase, elapsedSince24Sec);
  if (progress <= 0) return 0;

  if (bergId === "berg4") {
    return progress * CHAPTER2_BERG4_SUBSCENE_24_Y;
  }
  if (bergId === "berg3") {
    return progress * CHAPTER2_BERG3_SUBSCENE_24_Y;
  }
  return Math.max(
    0,
    progress *
      (CHAPTER2_BERG2_SUBSCENE_24_Y - CHAPTER2_SUBSCENE_24_BERG2_GRUN_DESCENT_LIFT_PX),
  );
}

/** Rise distance (px) — bottom of viewport → rest anchor. */
export function getChapter2RVulkanSubscene24RisePx(viewportHeight: number) {
  return viewportHeight * 0.48;
}

/** Duration of volcano rise — locked to berg4 sync beat. Shake stops when this elapses. */
export function getChapter2RVulkanSubscene24MotionSpanSec() {
  return (
    CHAPTER2_BERG4_SUBSCENE_24_SYNC_DELAY_SEC + CHAPTER2_BERG4_SUBSCENE_24_SYNC_SPAN_SEC
  );
}

export type Chapter2RVulkanSubscene24Reveal = {
  opacity: number;
  riseYOffsetPx: number;
  scaleMul: number;
};

/** Progress 0–1 for volcano emergence — same curve as berg4 drop. */
export function getChapter2RVulkanSubscene24RevealProgress(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
) {
  return getChapter2Berg24MotionProgress("berg4", phase, elapsedSince24Sec);
}

export function getChapter2RVulkanSubscene24Reveal(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  viewportHeight: number,
): Chapter2RVulkanSubscene24Reveal | null {
  if (propId !== "r_vulkan") return null;

  const risePx = getChapter2RVulkanSubscene24RisePx(viewportHeight);
  if (phase !== "2-4-playing") {
    return { opacity: 0, riseYOffsetPx: risePx, scaleMul: 0.86 };
  }

  const surge = getChapter2RVulkanSubscene24RevealProgress(phase, elapsedSince24Sec);
  if (surge <= 0) {
    return { opacity: 0, riseYOffsetPx: risePx, scaleMul: 0.86 };
  }

  return {
    opacity: 1,
    riseYOffsetPx: (1 - surge) * risePx,
    scaleMul: 0.86 + 0.14 * surge,
  };
}

/** When volcano rise motion finishes (berg4 sync). */
export function getChapter2RVulkanSubscene24CompleteSec() {
  return (
    CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC + getChapter2RVulkanSubscene24MotionSpanSec()
  );
}

/** r_blume1 — start blooming shortly after volcano is up. */
export const CHAPTER2_R_BLUME1_AFTER_VULKAN_DELAY_SEC = 0.22;
export const CHAPTER2_R_BLUME1_BLOOM_SPAN_SEC = 1.4;
export const CHAPTER2_R_BLUME2_AFTER_VULKAN_DELAY_SEC = 0.58;
export const CHAPTER2_R_BLUME2_BLOOM_SPAN_SEC = 1.45;
export const CHAPTER2_R_BLUME3_AFTER_VULKAN_DELAY_SEC = 0.94;
export const CHAPTER2_R_BLUME3_BLOOM_SPAN_SEC = 1.45;

type RBlumeBloomSpec = {
  delayAfterVulkanSec: number;
  spanSec: number;
};

const CHAPTER2_R_BLUME_SUBSCENE_24_BLOOM: Partial<Record<Chapter2PropId, RBlumeBloomSpec>> = {
  r_blume1: {
    delayAfterVulkanSec: CHAPTER2_R_BLUME1_AFTER_VULKAN_DELAY_SEC,
    spanSec: CHAPTER2_R_BLUME1_BLOOM_SPAN_SEC,
  },
  r_blume2: {
    delayAfterVulkanSec: CHAPTER2_R_BLUME2_AFTER_VULKAN_DELAY_SEC,
    spanSec: CHAPTER2_R_BLUME2_BLOOM_SPAN_SEC,
  },
  r_blume3: {
    delayAfterVulkanSec: CHAPTER2_R_BLUME3_AFTER_VULKAN_DELAY_SEC,
    spanSec: CHAPTER2_R_BLUME3_BLOOM_SPAN_SEC,
  },
};

export type Chapter2RBlumeSubscene24Bloom = {
  opacity: number;
  scaleMul: number;
  riseYOffsetPx: number;
};

/** r_blume* — in-place bloom on coral (stem anchor via prop layer origin). */
export function getChapter2RBlumeSubscene24Bloom(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
): Chapter2RBlumeSubscene24Bloom | null {
  const spec = CHAPTER2_R_BLUME_SUBSCENE_24_BLOOM[propId];
  if (!spec) return null;

  const hidden = { opacity: 0, scaleMul: 0.06, riseYOffsetPx: 28 };

  if (phase !== "2-4-playing") {
    return hidden;
  }

  const beatStartSec =
    getChapter2RVulkanSubscene24CompleteSec() + spec.delayAfterVulkanSec;
  const bloomElapsed = elapsedSince24Sec - beatStartSec;
  if (bloomElapsed <= 0) {
    return hidden;
  }

  const t = easeOutCubic(clamp01(bloomElapsed / Math.max(0.15, spec.spanSec)));
  if (t <= 0) {
    return hidden;
  }

  const surge = 1 - (1 - t) ** 2.2;
  const scaleMul = 0.06 + 0.94 * surge;
  return {
    opacity: Math.min(1, t * 1.08),
    scaleMul,
    riseYOffsetPx: (1 - surge) * 28,
  };
}

/** First blume bloom beat (shared timing for r_obst1). */
export function getChapter2RBlumeSubscene24BeatStartSec() {
  return (
    getChapter2RVulkanSubscene24CompleteSec() + CHAPTER2_R_BLUME1_AFTER_VULKAN_DELAY_SEC
  );
}

export const CHAPTER2_R_OBST1_DURING_BLUME_START_OFFSET_SEC = 0.1;
export const CHAPTER2_R_OBST1_GROW_SPAN_SEC = 2.35;
export const CHAPTER2_R_OBST2_DURING_BLUME_START_OFFSET_SEC = 0.38;
export const CHAPTER2_R_OBST2_GROW_SPAN_SEC = 2.35;
export const CHAPTER2_R_OBST3_DURING_BLUME_START_OFFSET_SEC = 0.66;
export const CHAPTER2_R_OBST3_GROW_SPAN_SEC = 2.35;
export const CHAPTER2_R_OBST4_DURING_BLUME_START_OFFSET_SEC =
  CHAPTER2_R_OBST1_DURING_BLUME_START_OFFSET_SEC;
export const CHAPTER2_R_OBST4_GROW_SPAN_SEC = CHAPTER2_R_OBST1_GROW_SPAN_SEC;
export const CHAPTER2_R_OBST5_DURING_BLUME_START_OFFSET_SEC =
  CHAPTER2_R_OBST1_DURING_BLUME_START_OFFSET_SEC;
export const CHAPTER2_R_OBST5_GROW_SPAN_SEC = CHAPTER2_R_OBST1_GROW_SPAN_SEC;

type RObstGrowSpec = {
  startOffsetSec: number;
  spanSec: number;
};

const CHAPTER2_R_OBST_SUBSCENE_24_GROW: Partial<Record<Chapter2PropId, RObstGrowSpec>> = {
  r_obst1: {
    startOffsetSec: CHAPTER2_R_OBST1_DURING_BLUME_START_OFFSET_SEC,
    spanSec: CHAPTER2_R_OBST1_GROW_SPAN_SEC,
  },
  r_obst2: {
    startOffsetSec: CHAPTER2_R_OBST2_DURING_BLUME_START_OFFSET_SEC,
    spanSec: CHAPTER2_R_OBST2_GROW_SPAN_SEC,
  },
  r_obst3: {
    startOffsetSec: CHAPTER2_R_OBST3_DURING_BLUME_START_OFFSET_SEC,
    spanSec: CHAPTER2_R_OBST3_GROW_SPAN_SEC,
  },
  r_obst4: {
    startOffsetSec: CHAPTER2_R_OBST4_DURING_BLUME_START_OFFSET_SEC,
    spanSec: CHAPTER2_R_OBST4_GROW_SPAN_SEC,
  },
  r_obst5: {
    startOffsetSec: CHAPTER2_R_OBST5_DURING_BLUME_START_OFFSET_SEC,
    spanSec: CHAPTER2_R_OBST5_GROW_SPAN_SEC,
  },
};

export type Chapter2RObstSubscene24Grow = {
  opacity: number;
  scaleMul: number;
  scaleYMul: number;
  dropYOffsetPx: number;
};

/** r_obst* — grass grows downward from above while blumes are blooming. */
export function getChapter2RObstSubscene24GrowDuringBlume(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  viewportHeight: number,
): Chapter2RObstSubscene24Grow | null {
  const spec = CHAPTER2_R_OBST_SUBSCENE_24_GROW[propId];
  if (!spec) return null;

  const tuckAbovePx = viewportHeight * 0.14;
  const hidden = {
    opacity: 0,
    scaleMul: 0.78,
    scaleYMul: 0.025,
    dropYOffsetPx: -tuckAbovePx,
  };

  if (phase !== "2-4-playing") {
    return hidden;
  }

  const beatStartSec =
    getChapter2RBlumeSubscene24BeatStartSec() + spec.startOffsetSec;
  const growElapsed = elapsedSince24Sec - beatStartSec;
  if (growElapsed <= 0) {
    return hidden;
  }

  const t = easeOutCubic(clamp01(growElapsed / Math.max(0.2, spec.spanSec)));
  if (t <= 0) {
    return hidden;
  }

  const surge = 1 - (1 - t) ** 2.4;
  return {
    opacity: Math.min(1, t * 1.06),
    scaleMul: 0.78 + 0.22 * surge,
    scaleYMul: 0.025 + 0.975 * surge,
    dropYOffsetPx: -(1 - surge) * tuckAbovePx,
  };
}

/** Gap after volcano rise before celem1 enters. */
export const CHAPTER2_R_CELEMEN1_AFTER_VULKAN_DELAY_SEC = 0.28;
export const CHAPTER2_R_CELEMEN1_ENTER_SPAN_SEC = 1.5;

/** When celem1 slide-in beat starts (celem2 overlaps this window). */
export function getChapter2RCelemen1Subscene24BeatStartSec() {
  return (
    CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC +
    getChapter2RVulkanSubscene24MotionSpanSec() +
    CHAPTER2_R_CELEMEN1_AFTER_VULKAN_DELAY_SEC
  );
}

/** Stagger within celem1 enter — celem2 starts rising while celem1 is on screen. */
export const CHAPTER2_R_CELEMEN2_ENTER_OFFSET_IN_CCELEM1_BEAT_SEC = 1.05;
export const CHAPTER2_R_CELEMEN2_ENTER_SPAN_SEC = 2.05;
/** Off-screen start — bottom-right corner (vw/vh + px padding). */
export const CHAPTER2_R_CELEMEN2_SLIDE_FROM_RIGHT_VW = 0.42;
export const CHAPTER2_R_CELEMEN2_SLIDE_FROM_RIGHT_PX = 240;
export const CHAPTER2_R_CELEMEN2_SLIDE_FROM_BOTTOM_VH = 0.52;
export const CHAPTER2_R_CELEMEN2_SLIDE_FROM_BOTTOM_PX = 180;

export type Chapter2RCelemenSubscene24Enter = {
  opacity: number;
  slideXOffsetPx: number;
  slideYOffsetPx: number;
};

/** r_celemen1 — slide in from outside bottom-left after volcano appears. */
export function getChapter2RCelemenSubscene24Enter(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  viewportWidth: number,
  viewportHeight: number,
): Chapter2RCelemenSubscene24Enter | null {
  if (propId !== "r_celemen1") return null;

  const slideFromLeftPx = viewportWidth * 0.28 + 140;
  const slideFromBottomPx = viewportHeight * 0.22 + 90;

  if (phase !== "2-4-playing") {
    return {
      opacity: 0,
      slideXOffsetPx: -slideFromLeftPx,
      slideYOffsetPx: slideFromBottomPx,
    };
  }

  const beatStartSec = getChapter2RCelemen1Subscene24BeatStartSec();
  const enterElapsed = elapsedSince24Sec - beatStartSec;
  if (enterElapsed <= 0) {
    return {
      opacity: 0,
      slideXOffsetPx: -slideFromLeftPx,
      slideYOffsetPx: slideFromBottomPx,
    };
  }

  const t = easeInOutSine(
    clamp01(enterElapsed / Math.max(0.15, CHAPTER2_R_CELEMEN1_ENTER_SPAN_SEC)),
  );
  if (t <= 0) {
    return {
      opacity: 0,
      slideXOffsetPx: -slideFromLeftPx,
      slideYOffsetPx: slideFromBottomPx,
    };
  }

  const surge = 1 - (1 - t) ** 3;
  return {
    opacity: 1,
    slideXOffsetPx: -(1 - surge) * slideFromLeftPx,
    slideYOffsetPx: (1 - surge) * slideFromBottomPx,
  };
}

export type Chapter2RCelemen2Subscene24Enter = {
  opacity: number;
  slideXOffsetPx: number;
  slideYOffsetPx: number;
  scaleMul: number;
};

/** r_celemen2 — slide in from outside bottom-right while celem1 is entering. */
export function getChapter2RCelemen2Subscene24Enter(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  viewportWidth: number,
  viewportHeight: number,
): Chapter2RCelemen2Subscene24Enter | null {
  if (propId !== "r_celemen2") return null;

  const slideFromRightPx =
    viewportWidth * CHAPTER2_R_CELEMEN2_SLIDE_FROM_RIGHT_VW +
    CHAPTER2_R_CELEMEN2_SLIDE_FROM_RIGHT_PX;
  const slideFromBottomPx =
    viewportHeight * CHAPTER2_R_CELEMEN2_SLIDE_FROM_BOTTOM_VH +
    CHAPTER2_R_CELEMEN2_SLIDE_FROM_BOTTOM_PX;

  const offScreen = {
    opacity: 0 as number,
    slideXOffsetPx: slideFromRightPx,
    slideYOffsetPx: slideFromBottomPx,
    scaleMul: 0.88,
  };

  if (phase !== "2-4-playing") {
    return offScreen;
  }

  const beatStartSec =
    getChapter2RCelemen1Subscene24BeatStartSec() +
    CHAPTER2_R_CELEMEN2_ENTER_OFFSET_IN_CCELEM1_BEAT_SEC;
  const enterElapsed = elapsedSince24Sec - beatStartSec;
  if (enterElapsed <= 0) {
    return offScreen;
  }

  const t = easeInOutSine(
    clamp01(enterElapsed / Math.max(0.15, CHAPTER2_R_CELEMEN2_ENTER_SPAN_SEC)),
  );
  if (t <= 0) {
    return offScreen;
  }

  const surge = 1 - (1 - t) ** 3;
  return {
    opacity: 1,
    slideXOffsetPx: (1 - surge) * slideFromRightPx,
    slideYOffsetPx: (1 - surge) * slideFromBottomPx,
    scaleMul: 0.88 + 0.12 * surge,
  };
}

export type Chapter2Subscene24EarthquakeShake = {
  x: number;
  y: number;
};

/** Screen rumble only while the volcano rise motion is active (stops when motion ends). */
export function getChapter2Subscene24EarthquakeShake(
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  timeMs: number,
): Chapter2Subscene24EarthquakeShake {
  if (phase !== "2-4-playing") return { x: 0, y: 0 };

  const motionElapsed =
    elapsedSince24Sec - CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC;
  const spanSec = getChapter2RVulkanSubscene24MotionSpanSec();
  if (motionElapsed <= 0 || motionElapsed >= spanSec) return { x: 0, y: 0 };

  const u = clamp01(motionElapsed / spanSec);
  if (u <= 0.02) return { x: 0, y: 0 };

  const attack = Math.min(1, u / 0.12);
  const envelope = attack * (0.45 + 0.55 * u);

  const t = timeMs * 0.001;
  const amp = 0.85 + envelope * 2.15;
  const x =
    (Math.sin(t * 86.5) * 0.56 +
      Math.sin(t * 148.2) * 0.3 +
      Math.sin(t * 203.4) * 0.14) *
    amp;
  const y =
    (Math.sin(t * 79.4 + 0.65) * 0.54 +
      Math.sin(t * 156.8 + 1.15) * 0.32 +
      Math.sin(t * 211.6) * 0.14) *
    amp;

  return { x, y };
}

/** When the last berg finishes its 2-4 drop (spore exit starts after this). */
export function getChapter2Subscene24BergDropCompleteSec() {
  let maxEnd = CHAPTER2_SUBSCENE_24_BERG_MOTION_START_SEC;
  for (const bergId of ["berg2", "berg3", "berg4"] as const) {
    const spec = CHAPTER2_BERG24_MOTION_SPECS[bergId];
    const start =
      bergId === "berg4"
        ? CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC
        : CHAPTER2_SUBSCENE_24_BERG_MOTION_START_SEC;
    maxEnd = Math.max(maxEnd, start + spec.delaySec + spec.spanSec);
  }
  return maxEnd;
}

const CHAPTER2_SUBSCENE_24_SPORE_IDS = [
  "spore1",
  "spore1_1",
  "spore2_0",
  "spore2_1",
  "spore3",
  "spore4",
] as const satisfies readonly Chapter2PropId[];

type Chapter2Spore24ExitSpec = {
  delaySec: number;
  spanSec: number;
  dropPx: number;
  scaleEnd: number;
};

function easeOutCubic(t: number) {
  const u = clamp01(t);
  return 1 - (1 - u) ** 3;
}

function buildChapter2Spore24ExitSpecs(): Record<Chapter2PropId, Chapter2Spore24ExitSpec> {
  const specs = {} as Record<Chapter2PropId, Chapter2Spore24ExitSpec>;
  for (let i = 0; i < CHAPTER2_SUBSCENE_24_SPORE_IDS.length; i++) {
    const id = CHAPTER2_SUBSCENE_24_SPORE_IDS[i];
    const rand = seededRandom(0x240504e0 + i * 503);
    specs[id] = {
      delaySec: rand() * 0.72,
      spanSec: 0.62 + rand() * 0.88,
      dropPx: 48 + rand() * 82,
      scaleEnd: 0.06 + rand() * 0.14,
    };
  }
  return specs;
}

const CHAPTER2_SPORE24_EXIT_SPECS = buildChapter2Spore24ExitSpecs();

export type Chapter2SporeSubscene24Exit = {
  opacity: number;
  yOffsetPx: number;
  scaleMul: number;
};

function isChapter2Subscene24SporeId(propId: Chapter2PropId) {
  return (CHAPTER2_SUBSCENE_24_SPORE_IDS as readonly string[]).includes(propId);
}

/** During volcano rise — spores shrink + drop (seeded random stagger). */
export function getChapter2SporeSubscene24Exit(
  propId: Chapter2PropId,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
): Chapter2SporeSubscene24Exit | null {
  if (phase !== "2-4-playing" || !isChapter2Subscene24SporeId(propId)) return null;

  const motionElapsed = elapsedSince24Sec - CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC;
  if (motionElapsed <= 0) return null;

  const spec = CHAPTER2_SPORE24_EXIT_SPECS[propId];
  if (motionElapsed <= spec.delaySec) return null;

  const t = easeInOutSine(
    clamp01((motionElapsed - spec.delaySec) / Math.max(0.12, spec.spanSec)),
  );
  if (t <= 0) return null;

  const shrink = easeOutCubic(t);
  return {
    scaleMul: 1 - shrink * (1 - spec.scaleEnd),
    opacity: 1,
    yOffsetPx: shrink * spec.dropPx,
  };
}

type Chapter2Bubble24ExitSpec = {
  delaySec: number;
  spanSec: number;
  dirX: number;
  dirY: number;
  travelNorm: number;
};

function buildChapter2Bubble24ExitSpecs(): Chapter2Bubble24ExitSpec[] {
  const specs: Chapter2Bubble24ExitSpec[] = [];
  for (let i = 0; i < CHAPTER2_BUBBLE_COUNT; i++) {
    const inst = CHAPTER2_BUBBLE_INSTANCES[i];
    const rand = seededRandom(0x240babb0 + i * 677);
    const cx = inst.xNorm - 0.5;
    const cy = inst.yNorm - 0.5;
    const len = Math.hypot(cx, cy) || 1;
    specs.push({
      delaySec: rand() * 1.15,
      spanSec: 2.6 + rand() * 2.4,
      dirX: cx / len,
      dirY: cy / len,
      travelNorm: 0.52 + rand() * 0.38,
    });
  }
  return specs;
}

const CHAPTER2_BUBBLE24_EXIT_SPECS = buildChapter2Bubble24ExitSpecs();

export type Chapter2BubbleSubscene24Exit = {
  opacityMul: number;
  offsetX: number;
  offsetY: number;
};

/** During volcano beat — bubbles drift off-screen (seeded stagger). */
export function getChapter2BubbleSubscene24Exit(
  bubbleIndex: number,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  viewportWidth: number,
  viewportHeight: number,
): Chapter2BubbleSubscene24Exit {
  if (phase !== "2-4-playing") {
    return { opacityMul: 1, offsetX: 0, offsetY: 0 };
  }

  const motionElapsed = elapsedSince24Sec - CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC;
  if (motionElapsed <= 0) {
    return { opacityMul: 1, offsetX: 0, offsetY: 0 };
  }

  const spec = CHAPTER2_BUBBLE24_EXIT_SPECS[bubbleIndex];
  if (!spec || motionElapsed <= spec.delaySec) {
    return { opacityMul: 1, offsetX: 0, offsetY: 0 };
  }

  const t = easeInOutSine(
    clamp01((motionElapsed - spec.delaySec) / Math.max(0.2, spec.spanSec)),
  );
  const fade = easeOutCubic(t);
  const travelX = spec.dirX * viewportWidth * spec.travelNorm;
  const travelY = spec.dirY * viewportHeight * spec.travelNorm;

  return {
    opacityMul: 1 - fade,
    offsetX: t * travelX,
    offsetY: t * travelY,
  };
}

type Chapter2Nabi24ExitSpec = {
  delaySec: number;
  spanSec: number;
  dirX: number;
  dirY: number;
  travelNorm: number;
};

function buildChapter2Nabi24ExitSpecs(): Record<string, Chapter2Nabi24ExitSpec> {
  const specs: Record<string, Chapter2Nabi24ExitSpec> = {};
  for (const inst of CHAPTER2_NABI_INSTANCES) {
    if (!inst.exitAtSubscene24) continue;
    const seed = inst.id === "nabi2" ? 0x24002002 : 0x24003003;
    const rand = seededRandom(seed);
    const cx = inst.patrol.x - 0.5;
    const cy = inst.patrol.y - 0.5;
    const len = Math.hypot(cx, cy) || 1;
    specs[inst.id] = {
      delaySec: 0.08 + rand() * 1.12,
      spanSec: 2.7 + rand() * 2.5,
      dirX: cx / len,
      dirY: cy / len,
      travelNorm: 0.5 + rand() * 0.4,
    };
  }
  return specs;
}

const CHAPTER2_NABI24_EXIT_SPECS = buildChapter2Nabi24ExitSpecs();

/** nabi2 / nabi3 — drift off with the 2-4 bubble beat (seeded stagger). */
export function getChapter2NabiSubscene24Exit(
  spec: Chapter2NabiInstance,
  phase: Chapter2SubscenePlaybackPhase,
  elapsedSince24Sec: number,
  viewportWidth: number,
  viewportHeight: number,
): Chapter2BubbleSubscene24Exit {
  if (!spec.exitAtSubscene24 || phase !== "2-4-playing") {
    return { opacityMul: 1, offsetX: 0, offsetY: 0 };
  }

  const motionElapsed = elapsedSince24Sec - CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC;
  if (motionElapsed <= 0) {
    return { opacityMul: 1, offsetX: 0, offsetY: 0 };
  }

  const exitSpec = CHAPTER2_NABI24_EXIT_SPECS[spec.id];
  if (!exitSpec || motionElapsed <= exitSpec.delaySec) {
    return { opacityMul: 1, offsetX: 0, offsetY: 0 };
  }

  const t = easeInOutSine(
    clamp01((motionElapsed - exitSpec.delaySec) / Math.max(0.2, exitSpec.spanSec)),
  );
  const fade = easeOutCubic(t);
  const travelX = exitSpec.dirX * viewportWidth * exitSpec.travelNorm;
  const travelY = exitSpec.dirY * viewportHeight * exitSpec.travelNorm;

  return {
    opacityMul: 1 - fade,
    offsetX: t * travelX,
    offsetY: t * travelY,
  };
}

function chapter2Subscene24VolcanoBeatEndSec(
  startSec: number,
  delaySec: number,
  spanSec: number,
) {
  return startSec + delaySec + spanSec;
}

export function getChapter2Subscene24MotionCompleteSec() {
  let maxEnd = getChapter2Subscene24BergDropCompleteSec();
  for (const spec of Object.values(CHAPTER2_SPORE24_EXIT_SPECS)) {
    maxEnd = Math.max(
      maxEnd,
      chapter2Subscene24VolcanoBeatEndSec(
        CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC,
        spec.delaySec,
        spec.spanSec,
      ),
    );
  }
  for (const spec of Object.values(CHAPTER2_STEIN24_DROP_SPECS)) {
    maxEnd = Math.max(
      maxEnd,
      chapter2Subscene24VolcanoBeatEndSec(
        CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC,
        spec.delaySec,
        spec.spanSec,
      ),
    );
  }
  for (const spec of CHAPTER2_BUBBLE24_EXIT_SPECS) {
    maxEnd = Math.max(
      maxEnd,
      chapter2Subscene24VolcanoBeatEndSec(
        CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC,
        spec.delaySec,
        spec.spanSec,
      ),
    );
  }
  for (const spec of Object.values(CHAPTER2_NABI24_EXIT_SPECS)) {
    maxEnd = Math.max(
      maxEnd,
      chapter2Subscene24VolcanoBeatEndSec(
        CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC,
        spec.delaySec,
        spec.spanSec,
      ),
    );
  }
  return maxEnd + 0.08;
}

export function isChapter2Subscene24MotionComplete(elapsedSince24Sec: number) {
  return elapsedSince24Sec >= getChapter2Subscene24MotionCompleteSec();
}
