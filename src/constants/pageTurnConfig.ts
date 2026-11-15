/**
 * Chapter change ("page turn"): when the corner cue shows, scrolling down turns the page.
 * The current scene is peeled over from its bottom-right corner like a book page; a run of blank
 * paper sheets follows it quickly ("촤라라락") and uncovers the next chapter's title page.
 * Drawn by src/components/scene2/PageFlipOverlay.tsx.
 */
export const PAGE_TURN = {
  /** Wheel distance (px, summed) that turns the page. Small so a gentle trackpad scroll works. */
  wheelThreshold: 40,
  /** Touch: swipe up at least this far (px). */
  swipeThresholdPx: 50,
  /** Ignore scrolling this long after the cue appears (stops leftover scroll momentum). */
  armDelayMs: 400,

  /** The scene page itself. */
  leafMs: 780,
  /** How high the page corner rises while it turns (share of the screen height). */
  leafLift: 0.42,
  /** Blank paper sheets under the scene page. */
  sheetCount: 12,
  /** First sheet starts this long after the scene page. */
  sheetStartMs: 200,
  sheetStaggerMs: 55,
  sheetMs: 560,
  /** Corner rise per sheet, varied between these (share of the screen height). */
  sheetLiftMin: 0.25,
  sheetLiftMax: 0.5,
} as const;

/** The scene page has turned away (and sheets cover the screen): the next chapter mounts. */
export const PAGE_TURN_COVERED_MS = Math.max(
  PAGE_TURN.leafMs,
  PAGE_TURN.sheetStartMs + (PAGE_TURN.sheetCount - 1) * PAGE_TURN.sheetStaggerMs,
);

/** When the last sheet has turned away. */
export const PAGE_TURN_TOTAL_MS =
  PAGE_TURN.sheetStartMs + (PAGE_TURN.sheetCount - 1) * PAGE_TURN.sheetStaggerMs + PAGE_TURN.sheetMs;
