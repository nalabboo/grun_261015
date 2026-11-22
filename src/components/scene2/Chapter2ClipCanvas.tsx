"use client";

import { useEffect, useRef } from "react";
import { chapter2ClipFrameUrls } from "@/constants/chapter2Config";
import {
  CHAPTER2_CLIP_COLOR,
  type Chapter2ClipPart,
  type Chapter2PropClip,
} from "@/constants/chapter2PropClips";

/** Which frame of `part` shows `t` ms into it. */
function frameAt(part: Chapter2ClipPart, ms: number) {
  // A frame's timestamp can be a little before the clip's start time: treat that as frame 0.
  const t = Math.max(0, ms);
  if (part.holdMs) {
    let end = 0;
    for (let index = 0; index < part.holdMs.length; index++) {
      end += part.holdMs[index];
      if (t < end) return index;
    }
    return part.holdMs.length - 1;
  }
  return Math.min(part.frames - 1, Math.floor((t / part.durationMs) * part.frames));
}

/** A shrink that starts this long after the last one is a new shrink (plays `once` again). */
const SHRINK_GAP_MS = 300;

/**
 * Plays a chapter 2 clip on a canvas: `intro` (if any) once from mount (= when the thing
 * appears), then `loop` forever. With `clip.once`, every time `scale` starts to get smaller
 * (the prop shrinks), `once` plays one time and then the loop goes on; with `loopOnce`, `once`
 * keeps looping instead (from its start, or on from where it is). Frames not loaded yet are
 * skipped (the last drawn one stays).
 *
 * Fills its parent, which must be positioned and sized like the still the clip replaces
 * (`boxWidth` x `boxHeight` px); the canvas is placed at the clip's own box inside it.
 */
export default function Chapter2ClipCanvas({
  clip,
  boxWidth,
  boxHeight,
  scale,
  loopOnce = false,
}: {
  clip: Chapter2PropClip;
  boxWidth: number;
  boxHeight: number;
  /** The prop's current scroll scale: when it starts to shrink, `clip.once` plays. */
  scale?: number;
  /** Loop `clip.once` instead of `clip.loop` from now on (grun_v after Koki appears). */
  loopOnce?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastScaleRef = useRef<number | undefined>(undefined);
  const lastShrinkAtRef = useRef(-Infinity);
  const onceStartRef = useRef<number | null>(null);
  const loopOnceRef = useRef(loopOnce);

  // Switching to the `once` loop: carry on if it is playing, else start it from its first frame.
  useEffect(() => {
    loopOnceRef.current = loopOnce;
    if (!loopOnce || !clip.once) return;
    const now = performance.now();
    const start = onceStartRef.current;
    if (start === null || now - start >= clip.once.durationMs) onceStartRef.current = now;
  }, [clip, loopOnce]);

  // Start `once` when the scale begins to go down.
  useEffect(() => {
    const last = lastScaleRef.current;
    lastScaleRef.current = scale;
    if (loopOnceRef.current) return;
    if (!clip.once || scale === undefined || last === undefined || scale >= last - 1e-4) return;
    const now = performance.now();
    const isNewShrink = now - lastShrinkAtRef.current > SHRINK_GAP_MS;
    lastShrinkAtRef.current = now;
    const playing =
      onceStartRef.current !== null && now - onceStartRef.current < clip.once.durationMs;
    if (isNewShrink && !playing) onceStartRef.current = now;
  }, [clip, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const load = (part: Chapter2ClipPart) =>
      chapter2ClipFrameUrls(part).map((url) => {
        const img = new Image();
        img.src = url;
        return img;
      });
    const intro = clip.intro ? load(clip.intro) : [];
    const introMs = clip.intro?.durationMs ?? 0;
    const loop = load(clip.loop);
    const once = clip.once ? load(clip.once) : [];
    const startedAt = performance.now();
    let shown: HTMLImageElement | null = null;
    let box: { x: number; y: number; width: number; height: number } | null = null;
    let frameId = 0;

    const place = (next: { x: number; y: number; width: number; height: number }) => {
      if (next === box) return;
      box = next;
      canvas.style.left = `${(next.x / boxWidth) * 100}%`;
      canvas.style.top = `${(next.y / boxHeight) * 100}%`;
      canvas.style.width = `${(next.width / boxWidth) * 100}%`;
      canvas.style.height = `${(next.height / boxHeight) * 100}%`;
    };

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const onceAt = onceStartRef.current === null ? -1 : now - onceStartRef.current;
      let img: HTMLImageElement;
      let nextBox: { x: number; y: number; width: number; height: number } = clip;
      if (clip.once && onceAt >= 0 && (loopOnceRef.current || onceAt < clip.once.durationMs)) {
        img = once[frameAt(clip.once, onceAt % clip.once.durationMs)];
        nextBox = clip.once;
      } else if (clip.intro && elapsed < introMs) {
        img = intro[frameAt(clip.intro, elapsed)];
      } else {
        img = loop[frameAt(clip.loop, (elapsed - introMs) % clip.loop.durationMs)];
      }
      if (img !== shown && img.complete && img.naturalWidth > 0) {
        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        shown = img;
        place(nextBox);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [clip, boxWidth, boxHeight]);

  const color = { ...CHAPTER2_CLIP_COLOR, ...clip.color };
  const filter = [
    color.saturate !== 1 ? `saturate(${color.saturate})` : "",
    color.contrast !== 1 ? `contrast(${color.contrast})` : "",
    color.brightness !== 1 ? `brightness(${color.brightness})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <canvas
      ref={canvasRef}
      width={1}
      height={1}
      style={{
        position: "absolute",
        left: `${(clip.x / boxWidth) * 100}%`,
        top: `${(clip.y / boxHeight) * 100}%`,
        width: `${(clip.width / boxWidth) * 100}%`,
        height: `${(clip.height / boxHeight) * 100}%`,
        filter: filter || undefined,
      }}
    />
  );
}
