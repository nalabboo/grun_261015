"use client";

import { useEffect, useRef } from "react";
import {
  SCENE2_ITEMS,
  getTableauPageButtonShowMs,
  tableauAssetUrl,
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
        SCENE2_ITEMS.map((item) => waitForImage(tableauAssetUrl(item.file))),
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
          </div>
        ))}
      </div>
    </div>
  );
}
