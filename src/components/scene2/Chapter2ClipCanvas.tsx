"use client";

import { useEffect, useRef } from "react";
import { chapter2AssetUrl } from "@/constants/chapter2Config";
import {
  CHAPTER2_CLIP_COLOR,
  chapter2ClipFrameFiles,
  type Chapter2PropClip,
} from "@/constants/chapter2PropClips";

/**
 * Plays a chapter 2 clip on a canvas: `intro` (if any) once from mount (= when the thing
 * appears), then `loop` forever. Frames not loaded yet are skipped (the last drawn one stays).
 *
 * Fills its parent, which must be positioned and sized like the still the clip replaces
 * (`boxWidth` x `boxHeight` px); the canvas is placed at the clip's own box inside it.
 */
export default function Chapter2ClipCanvas({
  clip,
  boxWidth,
  boxHeight,
}: {
  clip: Chapter2PropClip;
  boxWidth: number;
  boxHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const load = (files: string[]) =>
      files.map((file) => {
        const img = new Image();
        img.src = chapter2AssetUrl(file);
        return img;
      });
    const intro = clip.intro ? load(chapter2ClipFrameFiles(clip.intro)) : [];
    const introMs = clip.intro?.durationMs ?? 0;
    const loop = load(chapter2ClipFrameFiles(clip.loop));
    const startedAt = performance.now();
    let shown: HTMLImageElement | null = null;
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      let img: HTMLImageElement;
      if (elapsed < introMs) {
        img = intro[Math.min(intro.length - 1, Math.floor((elapsed / introMs) * intro.length))];
      } else {
        const t = (elapsed - introMs) % clip.loop.durationMs;
        img = loop[Math.min(loop.length - 1, Math.floor((t / clip.loop.durationMs) * loop.length))];
      }
      if (img !== shown && img.complete && img.naturalWidth > 0) {
        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        shown = img;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [clip]);

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
