"use client";

import { useEffect } from "react";
import type { GrunFrameSourceRef } from "@/components/canvas/worldView";
import { IMAGE_SIZES, assetUrl } from "@/constants/sceneConfig";
import { loadGifMovie } from "@/lib/gifMovie";

type GrunCharacterProps = {
  sourceRef: GrunFrameSourceRef;
  isWalking: boolean;
  walkPlayStartMs: number;
};

const GIF_SRC = assetUrl(IMAGE_SIZES.grun_t.file);

/**
 * Loads the walk GIF and tells the WebGL quad which frame to show.
 * Frames are decoded in `gifMovie` because Safari does not advance a GIF
 * that is copied into a canvas.
 */
export default function GrunCharacter({
  sourceRef,
  isWalking,
  walkPlayStartMs,
}: GrunCharacterProps) {
  useEffect(() => {
    let cancelled = false;
    loadGifMovie(GIF_SRC).then(
      (movie) => {
        if (cancelled) return;
        sourceRef.current.movie = movie;
        sourceRef.current.dirty = true;
      },
      (error: unknown) => {
        console.error(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [sourceRef]);

  useEffect(() => {
    const source = sourceRef.current;
    source.playStartMs = walkPlayStartMs;
    source.animating = isWalking && walkPlayStartMs > 0;
    source.dirty = true;
  }, [isWalking, sourceRef, walkPlayStartMs]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- first frame shows before the GIF is decoded.
    <img
      ref={(node) => {
        sourceRef.current.img = node;
      }}
      src={GIF_SRC}
      alt=""
      aria-hidden
      draggable={false}
      onLoad={() => {
        sourceRef.current.dirty = true;
      }}
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
