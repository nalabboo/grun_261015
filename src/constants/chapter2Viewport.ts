import { useEffect, useState } from "react";

/**
 * Chapter 2 design frame (browser viewport the layout was authored in).
 * Every chapter-2 position, size and motion is computed in this px space; the whole
 * frame is then scaled uniformly to the live window, so resizing never shifts props.
 */
export const CHAPTER2_STAGE_WIDTH = 1512;
export const CHAPTER2_STAGE_HEIGHT = 857;

export type Chapter2StageFit = {
  /** Uniform scale: design frame → screen px. */
  scale: number;
  /** Screen px of the frame's top-left corner. */
  left: number;
  top: number;
};

/** Contain-fit, centered horizontally and pinned to the window bottom (ground stays on screen). */
export function getChapter2StageFit(
  viewportWidth: number,
  viewportHeight: number,
): Chapter2StageFit {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { scale: 1, left: 0, top: 0 };
  }
  const scale = Math.min(
    viewportWidth / CHAPTER2_STAGE_WIDTH,
    viewportHeight / CHAPTER2_STAGE_HEIGHT,
  );
  return {
    scale,
    left: (viewportWidth - CHAPTER2_STAGE_WIDTH * scale) / 2,
    top: viewportHeight - CHAPTER2_STAGE_HEIGHT * scale,
  };
}

function readWindowFit() {
  return getChapter2StageFit(window.innerWidth, window.innerHeight);
}

export function useChapter2StageFit(): Chapter2StageFit {
  const [fit, setFit] = useState<Chapter2StageFit>({ scale: 1, left: 0, top: 0 });

  useEffect(() => {
    const sync = () => setFit(readWindowFit());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return fit;
}

/** CSS length for a fraction of the design-frame height (replaces `vh` inside the stage). */
export function chapter2StageVh(ratio: number) {
  return `${ratio * CHAPTER2_STAGE_HEIGHT}px`;
}
