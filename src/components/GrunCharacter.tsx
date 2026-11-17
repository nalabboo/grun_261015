"use client";

import { useEffect } from "react";
import type { GrunFrameSourceRef } from "@/components/canvas/worldView";
import { loadWalkMovie } from "@/lib/walkMovie";

type GrunCharacterProps = {
  sourceRef: GrunFrameSourceRef;
};

/**
 * Loads the walk frames for the WebGL quad. Which frame shows (`timeMs`) is driven by
 * SceneStage's walk loop.
 */
export default function GrunCharacter({ sourceRef }: GrunCharacterProps) {
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

  return null;
}
