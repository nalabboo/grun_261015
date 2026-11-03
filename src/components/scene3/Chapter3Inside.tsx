"use client";

import { useEffect, useRef, useState } from "react";
import Chapter3AlienShapeEditor from "@/components/scene3/Chapter3AlienShapeEditor";
import { createChapter3InsideScene } from "@/components/scene3/chapter3InsideScene";
import { CHAPTER3_ALIEN_SHAPE_EDITOR } from "@/constants/chapter3InsideConfig";
import {
  CHAPTER3_ALIEN_DEFAULT_PARTS,
  cloneAlienParts,
  loadAlienPartsFromStorage,
  saveAlienPartsToStorage,
  type Chapter3AlienPart,
} from "@/constants/chapter3AlienShape";
import { CHAPTER3_INSIDE_PAPIER_URL } from "@/constants/scene3Config";

const REBUILD_MS = 420;

/** Screen inside the glass planet — white paper and the clear glass hero alien. */
export default function Chapter3Inside() {
  const paperRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<ReturnType<typeof createChapter3InsideScene> | null>(null);
  const rebuildTimerRef = useRef<number | null>(null);
  const latestPartsRef = useRef<Chapter3AlienPart[] | null>(null);

  const [parts, setParts] = useState<Chapter3AlienPart[]>(() =>
    CHAPTER3_ALIEN_SHAPE_EDITOR
      ? cloneAlienParts(loadAlienPartsFromStorage())
      : cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS),
  );
  const [rebuilding, setRebuilding] = useState(false);

  const scheduleRebuild = (next: Chapter3AlienPart[]) => {
    latestPartsRef.current = next;
    setParts(cloneAlienParts(next));
    saveAlienPartsToStorage(next);
    if (rebuildTimerRef.current !== null) window.clearTimeout(rebuildTimerRef.current);
    setRebuilding(true);
    rebuildTimerRef.current = window.setTimeout(() => {
      const snapshot = latestPartsRef.current;
      if (snapshot) stageRef.current?.setAlienParts(snapshot);
      setRebuilding(false);
      rebuildTimerRef.current = null;
    }, REBUILD_MS);
  };

  useEffect(() => {
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    if (!paper || !canvas) return;

    const initial = CHAPTER3_ALIEN_SHAPE_EDITOR
      ? cloneAlienParts(loadAlienPartsFromStorage())
      : cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS);
    latestPartsRef.current = initial;
    const stage = createChapter3InsideScene(canvas, paper, initial);
    stageRef.current = stage;
    const resize = () => {
      stage.setSize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
    };
    resize();
    window.addEventListener("resize", resize);

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      stage.pokeAt(e.clientX, e.clientY);
    };
    canvas.addEventListener("pointerdown", onPointerDown);

    let raf = 0;
    const tick = (now: number) => {
      stage.render(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      if (rebuildTimerRef.current !== null) window.clearTimeout(rebuildTimerRef.current);
      stageRef.current = null;
      stage.dispose();
    };
  }, []);

  return (
    <div className="chapter3-inside" aria-label="행성 안">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={paperRef}
        src={CHAPTER3_INSIDE_PAPIER_URL}
        alt=""
        className="chapter3-papier"
        draggable={false}
      />
      <canvas ref={canvasRef} className="chapter3-stars" />
      {CHAPTER3_ALIEN_SHAPE_EDITOR && (
        <Chapter3AlienShapeEditor parts={parts} onChange={scheduleRebuild} rebuilding={rebuilding} />
      )}
    </div>
  );
}
