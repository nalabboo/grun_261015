"use client";

import { useEffect } from "react";
import type { GrunFrameSourceRef } from "@/components/canvas/worldView";
import { loadWalkMovie } from "@/lib/walkMovie";

type GrunCharacterProps = {
  sourceRef: GrunFrameSourceRef;
  isWalking: boolean;
  walkPlayStartMs: number;
};

/** Loads the walk frames and tells the WebGL quad which frame to show. */
export default function GrunCharacter({
  sourceRef,
  isWalking,
  walkPlayStartMs,
}: GrunCharacterProps) {
  useEffect(() => {
    let cancelled = false;
    loadWalkMovie().then(
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

  return null;
}
