import { chapter2AssetUrl } from "@/constants/chapter2Config";

export type Chapter2NabiInstance = {
  id: string;
  src: string;
  width: number;
  height: number;
  heightVh: number;
  zIndex: number;
  /** Spore segment progress (0–1) before fly-in starts. */
  entryDelay: number;
  /** Spore segment length used for fly-in (0–1). */
  entrySpan: number;
  /** Viewport-normalized start (can be outside 0–1). */
  entryFrom: { x: number; y: number };
  /** Viewport-normalized patrol center after entry. */
  patrol: { x: number; y: number };
  flutterPhase: number;
  driftRadiusVw: number;
  /** Skip scroll-22 drift-off (stay on screen after Laubl / 2-3). */
  keepAfterLaubl?: boolean;
  /** Drift off when scene 2-3 starts (visible through full 2-2). */
  exitAtSubscene23?: boolean;
};

export const CHAPTER2_NABI_INSTANCES: readonly Chapter2NabiInstance[] = [
  {
    id: "nabi1",
    src: chapter2AssetUrl("gelb objekt/g_nabi1.png"),
    width: 500,
    height: 461,
    heightVh: 0.11,
    zIndex: 7,
    entryDelay: 0.06,
    entrySpan: 0.48,
    entryFrom: { x: -0.14, y: 0.22 },
    patrol: { x: 0.28, y: 0.34 },
    flutterPhase: 0,
    driftRadiusVw: 2.8,
    keepAfterLaubl: true,
  },
  {
    id: "nabi2",
    src: chapter2AssetUrl("gelb objekt/g_nabi2.png"),
    width: 500,
    height: 461,
    heightVh: 0.1,
    zIndex: 7,
    entryDelay: 0.2,
    entrySpan: 0.52,
    entryFrom: { x: 1.12, y: 0.48 },
    patrol: { x: 0.72, y: 0.3 },
    flutterPhase: 1.7,
    driftRadiusVw: 2.4,
    exitAtSubscene23: true,
  },
  {
    id: "nabi3",
    src: chapter2AssetUrl("gelb objekt/g_nabi3.png"),
    width: 600,
    height: 492,
    heightVh: 0.12,
    zIndex: 7,
    entryDelay: 0.34,
    entrySpan: 0.55,
    entryFrom: { x: 0.52, y: -0.16 },
    patrol: { x: 0.56, y: 0.42 },
    flutterPhase: 3.1,
    driftRadiusVw: 3,
    keepAfterLaubl: true,
  },
] as const;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** Fly-in progress 0–1 within spore scroll segment. */
export function getChapter2NabiEntryProgress(
  spec: Chapter2NabiInstance,
  sporeProgress: number,
) {
  if (sporeProgress <= spec.entryDelay) return 0;
  const span = Math.max(0.08, spec.entrySpan);
  return clamp01((sporeProgress - spec.entryDelay) / span);
}

export function getChapter2NabiOpacity(
  spec: Chapter2NabiInstance,
  sporeProgress: number,
) {
  if (sporeProgress <= 0) return 0;
  const entry = getChapter2NabiEntryProgress(spec, sporeProgress);
  if (entry <= 0) return 0;
  const fadeIn = clamp01(entry / 0.62);
  return fadeIn * (0.28 + 0.72 * easeInOutSine(entry));
}

export function getChapter2NabiBasePosition(
  spec: Chapter2NabiInstance,
  sporeProgress: number,
  width: number,
  height: number,
) {
  const entry = getChapter2NabiEntryProgress(spec, sporeProgress);
  const t = easeInOutSine(entry);
  const fromX = spec.entryFrom.x * width;
  const fromY = spec.entryFrom.y * height;
  const toX = spec.patrol.x * width;
  const toY = spec.patrol.y * height;
  return {
    x: fromX + (toX - fromX) * t,
    y: fromY + (toY - fromY) * t,
    entryComplete: entry >= 1,
  };
}
