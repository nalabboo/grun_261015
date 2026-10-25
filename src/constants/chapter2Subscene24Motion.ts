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
      spanSec: 0.78 + rand() * 0.62,
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

  return {
    scaleMul: startScale + (spec.scaleEnd - startScale) * t,
    yOffsetPx: t * spec.dropPx,
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
  return progress * CHAPTER2_BERG2_SUBSCENE_24_Y;
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

export function getChapter2Subscene24MotionCompleteSec() {
  let maxEnd = getChapter2Subscene24BergDropCompleteSec();
  for (const spec of Object.values(CHAPTER2_SPORE24_EXIT_SPECS)) {
    maxEnd = Math.max(
      maxEnd,
      CHAPTER2_BERG4_SUBSCENE_24_SYNC_START_SEC + spec.delaySec + spec.spanSec,
    );
  }
  return maxEnd + 0.08;
}

export function isChapter2Subscene24MotionComplete(elapsedSince24Sec: number) {
  return elapsedSince24Sec >= getChapter2Subscene24MotionCompleteSec();
}
