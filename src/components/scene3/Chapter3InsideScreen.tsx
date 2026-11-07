"use client";

import { useEffect, useRef, useState } from "react";
import Chapter3InsideDecorEditor from "@/components/scene3/Chapter3InsideDecorEditor";
import { createChapter3InsideScene } from "@/components/scene3/chapter3InsideScene";
import type { Chapter3AlienFaceParams } from "@/constants/chapter3AlienFaceConfig";
import type { Chapter3Alien3FaceParams, Chapter3Alien3GlassParams } from "@/constants/chapter3Alien3Config";
import type {
  Chapter3Alien2FaceParams,
  Chapter3Alien2GlassParams,
} from "@/constants/chapter3Alien2Config";
import type { Chapter3AlienPart } from "@/constants/chapter3AlienShape";
import {
  CHAPTER3_DECOR_DEFAULT,
  CHAPTER3_DECOR_EDITOR,
  type Chapter3InsideDecorConfig,
} from "@/constants/chapter3InsideDecorConfig";
import { CHAPTER3_INSIDE_PAPIER_URL } from "@/constants/scene3Config";

export type Chapter3InsideScreenConfig = {
  ariaLabel: string;
  initialParts: Chapter3AlienPart[];
  initialFace: Chapter3AlienFaceParams;
  loadParts: () => Chapter3AlienPart[];
  loadDecor: () => Chapter3InsideDecorConfig;
  saveDecor: (decor: Chapter3InsideDecorConfig) => void;
  alien2?: {
    parts: Chapter3AlienPart[];
    face: Chapter3Alien2FaceParams;
    glass: Chapter3Alien2GlassParams;
    loadParts: () => Chapter3AlienPart[];
    loadFace: () => Chapter3Alien2FaceParams;
    loadGlass: () => Chapter3Alien2GlassParams;
  };
  alien3?: {
    parts: Chapter3AlienPart[];
    face: Chapter3Alien3FaceParams;
    glass: Chapter3Alien3GlassParams;
    loadParts: () => Chapter3AlienPart[];
    loadFace: () => Chapter3Alien3FaceParams;
  };
};

type Props = {
  config: Chapter3InsideScreenConfig;
};

export default function Chapter3InsideScreen({ config }: Props) {
  const paperRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<ReturnType<typeof createChapter3InsideScene> | null>(null);
  const [draggingAlien, setDraggingAlien] = useState(false);
  const [decorConfig, setDecorConfig] = useState<Chapter3InsideDecorConfig>(CHAPTER3_DECOR_DEFAULT);

  useEffect(() => {
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    if (!paper || !canvas) return;

    const initial = config.loadParts();
    const initialFace = config.initialFace;
    const a2 = config.alien2;
    const a3 = config.alien3;
    const a2Parts = a2?.loadParts() ?? a2?.parts;
    const a2Face = a2?.loadFace() ?? a2?.face;
    const a2Glass = a2?.loadGlass() ?? a2?.glass;
    const a3Parts = a3?.loadParts() ?? a3?.parts;
    const a3Face = a3?.loadFace() ?? a3?.face;
    const a3Glass = a3?.glass;

    const extras: Parameters<typeof createChapter3InsideScene>[4] = {};
    if (a2 && a2Parts && a2Face && a2Glass) {
      extras.alien2 = { parts: a2Parts, face: a2Face, glass: a2Glass };
    }
    if (a3 && a3Parts && a3Face && a3Glass) {
      extras.alien3 = { parts: a3Parts, face: a3Face, glass: a3Glass };
    }

    const stage = createChapter3InsideScene(
      canvas,
      paper,
      initial,
      initialFace,
      extras.alien2 || extras.alien3 ? extras : undefined,
      undefined,
      CHAPTER3_DECOR_DEFAULT,
    );
    stageRef.current = stage;
    const stored = config.loadDecor();
    setDecorConfig(stored);
    stage.setDecorConfig(stored);
    const resize = () => {
      stage.setSize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
    };
    resize();
    window.addEventListener("resize", resize);

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (stage.pointerDown(e.clientX, e.clientY, e.pointerId)) {
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      stage.pointerMove(e.clientX, e.clientY, e.pointerId);
      setDraggingAlien(stage.isDraggingAlien());
    };
    const endPointer = (e: PointerEvent) => {
      stage.pointerUp(e.clientX, e.clientY, e.pointerId);
      setDraggingAlien(false);
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);

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
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
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
      <canvas
        ref={canvasRef}
        className={`chapter3-stars${draggingAlien ? " chapter3-stars--dragging" : ""}`}
      />
      {CHAPTER3_DECOR_EDITOR && (
        <div className="chapter3-placement-stack">
          <Chapter3InsideDecorEditor
            config={decorConfig}
            onChange={(next) => {
              setDecorConfig(next);
              config.saveDecor(next);
              stageRef.current?.setDecorConfig(next);
            }}
          />
        </div>
      )}
    </div>
  );
}
