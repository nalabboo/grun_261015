"use client";

import { useEffect, useRef, useState } from "react";
import Chapter3Alien2Editor from "@/components/scene3/Chapter3Alien2Editor";
import { createChapter3InsideScene } from "@/components/scene3/chapter3InsideScene";
import type { Chapter3AlienFaceParams } from "@/constants/chapter3AlienFaceConfig";
import {
  CHAPTER3_ALIEN2_EDITOR,
  type Chapter3Alien2FaceParams,
  type Chapter3Alien2GlassParams,
} from "@/constants/chapter3Alien2Config";
import { cloneAlienParts, type Chapter3AlienPart } from "@/constants/chapter3AlienShape";
import { CHAPTER3_INSIDE_PAPIER_URL } from "@/constants/scene3Config";

const REBUILD_MS = 420;

export type Chapter3InsideScreenConfig = {
  ariaLabel: string;
  initialParts: Chapter3AlienPart[];
  initialFace: Chapter3AlienFaceParams;
  loadParts: () => Chapter3AlienPart[];
  alien2?: {
    parts: Chapter3AlienPart[];
    face: Chapter3Alien2FaceParams;
    glass: Chapter3Alien2GlassParams;
    loadParts: () => Chapter3AlienPart[];
    loadFace: () => Chapter3Alien2FaceParams;
    loadGlass: () => Chapter3Alien2GlassParams;
    saveParts: (parts: Chapter3AlienPart[]) => void;
    saveFace: (face: Chapter3Alien2FaceParams) => void;
    saveGlass: (glass: Chapter3Alien2GlassParams) => void;
  };
};

type Props = {
  config: Chapter3InsideScreenConfig;
};

export default function Chapter3InsideScreen({ config }: Props) {
  const paperRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<ReturnType<typeof createChapter3InsideScene> | null>(null);
  const rebuildTimerRef = useRef<number | null>(null);
  const latestAlien2PartsRef = useRef<Chapter3AlienPart[] | null>(null);

  const [alien2Parts, setAlien2PartsState] = useState(() =>
    cloneAlienParts(config.alien2?.loadParts() ?? config.alien2?.parts ?? []),
  );
  const [alien2Face, setAlien2FaceState] = useState(() => config.alien2?.loadFace() ?? config.alien2?.face);
  const [alien2Glass, setAlien2GlassState] = useState(() => config.alien2?.loadGlass() ?? config.alien2?.glass);
  const [rebuilding, setRebuilding] = useState(false);

  const scheduleAlien2Rebuild = (next: Chapter3AlienPart[]) => {
    if (!config.alien2) return;
    latestAlien2PartsRef.current = next;
    setAlien2PartsState(cloneAlienParts(next));
    config.alien2.saveParts(next);
    if (rebuildTimerRef.current !== null) window.clearTimeout(rebuildTimerRef.current);
    setRebuilding(true);
    rebuildTimerRef.current = window.setTimeout(() => {
      const snapshot = latestAlien2PartsRef.current;
      if (snapshot) stageRef.current?.setAlien2Parts(snapshot);
      setRebuilding(false);
      rebuildTimerRef.current = null;
    }, REBUILD_MS);
  };

  useEffect(() => {
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    if (!paper || !canvas) return;

    const initial = config.loadParts();
    const initialFace = config.initialFace;
    const a2 = config.alien2;
    const a2Parts = a2?.loadParts() ?? a2?.parts;
    const a2Face = a2?.loadFace() ?? a2?.face;
    const a2Glass = a2?.loadGlass() ?? a2?.glass;
    if (a2Parts) setAlien2PartsState(cloneAlienParts(a2Parts));
    if (a2Face) setAlien2FaceState(a2Face);
    if (a2Glass) setAlien2GlassState(a2Glass);

    const stage = createChapter3InsideScene(
      canvas,
      paper,
      initial,
      initialFace,
      a2 && a2Parts && a2Face && a2Glass
        ? { parts: a2Parts, face: a2Face, glass: a2Glass }
        : undefined,
    );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one stage per mount
  }, []);

  return (
    <div className="chapter3-inside" aria-label={config.ariaLabel}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={paperRef}
        src={CHAPTER3_INSIDE_PAPIER_URL}
        alt=""
        className="chapter3-papier"
        draggable={false}
      />
      <canvas ref={canvasRef} className="chapter3-stars" />
      {CHAPTER3_ALIEN2_EDITOR && config.alien2 && alien2Glass && alien2Face && (
        <Chapter3Alien2Editor
          glass={alien2Glass}
          face={alien2Face}
          parts={alien2Parts}
          rebuilding={rebuilding}
          onGlassChange={(next) => {
            setAlien2GlassState(next);
            config.alien2!.saveGlass(next);
            stageRef.current?.setAlien2GlassParams(next);
          }}
          onFaceChange={(next) => {
            setAlien2FaceState(next);
            config.alien2!.saveFace(next);
            stageRef.current?.setAlien2FaceParams(next);
          }}
          onPartsChange={scheduleAlien2Rebuild}
        />
      )}
    </div>
  );
}
