"use client";

import { useEffect, useRef } from "react";
import {
  SCENE2_ITEMS,
  getTableauPageButtonShowMs,
  tableauAssetUrl,
  tableauClipFrameFiles,
  tableauItemFiles,
  type TableauClip,
} from "@/constants/scene2Config";

type NextSceneProps = {
  onRevealComplete?: () => void;
};

function waitForImage(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = url;
    if (img.complete) done();
  });
}

/**
 * Plays a looping hand-drawn clip on a canvas (same size / CSS as the still `<img>` it replaces,
 * so the entrance animation still applies). Each drawing stays for its `holdMs`.
 */
function TableauClipCanvas({
  clip,
  className,
  style,
}: {
  clip: TableauClip;
  className: string;
  style: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const frames = tableauClipFrameFiles(clip).map((file) => {
      const img = new Image();
      img.src = tableauAssetUrl(file);
      return img;
    });
    const loopMs = clip.holdMs.reduce((sum, ms) => sum + ms, 0);
    const startedAt = performance.now();
    let shown = -1;
    let frameId = 0;

    const tick = (now: number) => {
      let t = (now - startedAt) % loopMs;
      let index = 0;
      while (index < clip.holdMs.length - 1 && t >= clip.holdMs[index]) {
        t -= clip.holdMs[index];
        index += 1;
      }
      const img = frames[index];
      if (index !== shown && img.complete && img.naturalWidth > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        shown = index;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [clip]);

  return (
    <canvas
      ref={canvasRef}
      width={clip.width}
      height={clip.height}
      className={className}
      style={style}
    />
  );
}

/** Chapter 1 closing illustration (reference composite). */
export default function NextScene({ onRevealComplete }: NextSceneProps) {
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;

  useEffect(() => {
    let cancelled = false;
    const startedAt = performance.now();

    let timerId = 0;

    void (async () => {
      await Promise.all(
        SCENE2_ITEMS.flatMap(tableauItemFiles).map((file) => waitForImage(tableauAssetUrl(file))),
      );
      if (cancelled) return;

      const elapsed = performance.now() - startedAt;
      const waitMs = Math.max(0, getTableauPageButtonShowMs() - elapsed);
      timerId = window.setTimeout(() => {
        if (!cancelled) onRevealCompleteRef.current?.();
      }, waitMs);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <div className="scene2">
      <div className="scene2-frame">
        {SCENE2_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`scene2-slot${item.width !== undefined ? " scene2-slot--sized" : ""}`}
            style={{
              left: `${item.left}%`,
              bottom: `${item.bottom}%`,
              width: item.width !== undefined ? `${item.width}%` : undefined,
              height: `${item.height}%`,
              zIndex: item.z,
            }}
          >
            {item.clip ? (
              <TableauClipCanvas
                clip={item.clip}
                className={`scene2-item scene2-item--${item.animation}`}
                style={{ animationDelay: `${item.delayMs}ms` }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tableauAssetUrl(item.file)}
                alt=""
                draggable={false}
                className={`scene2-item scene2-item--${item.animation}`}
                style={{
                  animationDelay: `${item.delayMs}ms`,
                  objectFit: item.fit,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
