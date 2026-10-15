"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { DEPTH_BACKGROUND } from "@/constants/depthConfig";
import { clamp01 } from "@/lib/depthMath";
import { DepthEditorHud } from "./DepthEditor";
import { createDepthInput, depthEditorFlags, type DepthInput } from "./depthInput";

const DepthCanvas = dynamic(() => import("./DepthCanvas"), { ssr: false });

/** Scroll distance (in viewport heights) the camera needs to reach the end. */
const SCROLL_LENGTH_VH = 600;

export default function DepthExperience() {
  const input = useRef<DepthInput>(createDepthInput());
  const barRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const setProgress = useCallback((progress: number) => {
    const next = clamp01(progress);
    input.current.progress = next;
    if (barRef.current) barRef.current.style.transform = `scaleY(${next})`;
    if (hintRef.current) hintRef.current.style.opacity = next > 0.02 ? "0" : "1";
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (depthEditorFlags.gizmoDragging) return;
      const span = window.innerHeight * (SCROLL_LENGTH_VH / 100);
      setProgress(input.current.progress + event.deltaY / span);
    },
    [setProgress],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (depthEditorFlags.gizmoDragging) return;
    input.current.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    input.current.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
  }, []);

  useEffect(() => {
    const reset = () => {
      input.current.pointerX = 0;
      input.current.pointerY = 0;
    };
    document.documentElement.addEventListener("mouseleave", reset);
    return () => document.documentElement.removeEventListener("mouseleave", reset);
  }, []);

  return (
    <div
      className="fixed inset-0"
      style={{ backgroundColor: DEPTH_BACKGROUND }}
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
    >
      <div className="absolute inset-0">
        <DepthCanvas input={input} />
      </div>

      <DepthEditorHud />

      <div
        ref={hintRef}
        className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-xs tracking-[0.3em] text-[#3d4a44] transition-opacity duration-700"
      >
        <span>SCROLL</span>
        <span className="h-8 w-px animate-pulse bg-[#3d4a44]/60" />
      </div>

      <div className="pointer-events-none absolute right-5 top-1/2 h-24 w-px -translate-y-1/2 bg-[#3d4a44]/20">
        <div
          ref={barRef}
          className="h-full w-full origin-top bg-[#3d4a44]/70"
          style={{ transform: "scaleY(0)" }}
        />
      </div>
    </div>
  );
}
