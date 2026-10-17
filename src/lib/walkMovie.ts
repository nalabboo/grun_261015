import { GRUN_WALK, grunWalkFrameUrl } from "@/constants/sceneConfig";

export type WalkMovie = {
  totalMs: number;
  frameCount: number;
  /**
   * Draws the frame at `timeMs` (wrapped over the loop) into `ctx` at the walk's logical size.
   * Returns true when the canvas changed.
   */
  drawAt(timeMs: number, ctx: CanvasRenderingContext2D): boolean;
};

function loadFrame(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

let moviePromise: Promise<WalkMovie> | null = null;

/** Loads the walk-cycle PNG frames once. */
export function loadWalkMovie(): Promise<WalkMovie> {
  moviePromise ??= Promise.all(
    Array.from({ length: GRUN_WALK.frames }, (_, index) => loadFrame(grunWalkFrameUrl(index))),
  ).then((frames) => {
    let lastIndex = -1;
    return {
      totalMs: GRUN_WALK.loopMs,
      frameCount: frames.length,
      drawAt(timeMs, ctx) {
        const wrapped = ((timeMs % GRUN_WALK.loopMs) + GRUN_WALK.loopMs) % GRUN_WALK.loopMs;
        const index = Math.min(
          frames.length - 1,
          Math.floor((wrapped / GRUN_WALK.loopMs) * frames.length),
        );
        if (index === lastIndex) return false;
        ctx.clearRect(0, 0, GRUN_WALK.width, GRUN_WALK.height);
        ctx.drawImage(frames[index], GRUN_WALK.cropX, GRUN_WALK.cropY);
        lastIndex = index;
        return true;
      },
    };
  });
  return moviePromise;
}
