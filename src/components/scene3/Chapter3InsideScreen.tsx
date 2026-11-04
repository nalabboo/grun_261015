"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import Chapter3Alien3Editor from "@/components/scene3/Chapter3Alien3Editor";
import { buildAlien3SketchGeometry } from "@/components/scene3/chapter3Alien3SketchGeometry";
import { createChapter3InsideScene } from "@/components/scene3/chapter3InsideScene";
import type { Chapter3AlienFaceParams } from "@/constants/chapter3AlienFaceConfig";
import {
  CHAPTER3_ALIEN3_EDITOR,
  type Chapter3Alien3FaceParams,
  type Chapter3Alien3GlassParams,
} from "@/constants/chapter3Alien3Config";
import type {
  Chapter3Alien2FaceParams,
  Chapter3Alien2GlassParams,
} from "@/constants/chapter3Alien2Config";
import { cloneAlienParts, type Chapter3AlienPart } from "@/constants/chapter3AlienShape";
import { CHAPTER3_ALIEN3_SKETCH_URL, CHAPTER3_INSIDE_PAPIER_URL } from "@/constants/scene3Config";

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
  };
  alien3?: {
    face: Chapter3Alien3FaceParams;
    glass: Chapter3Alien3GlassParams;
    loadFace: () => Chapter3Alien3FaceParams;
    loadGlass: () => Chapter3Alien3GlassParams;
    saveFace: (face: Chapter3Alien3FaceParams) => void;
    saveGlass: (glass: Chapter3Alien3GlassParams) => void;
  };
};

type Props = {
  config: Chapter3InsideScreenConfig;
};

export default function Chapter3InsideScreen({ config }: Props) {
  const paperRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<ReturnType<typeof createChapter3InsideScene> | null>(null);

  const [alien3Face, setAlien3FaceState] = useState(() => config.alien3?.loadFace() ?? config.alien3?.face);
  const [alien3Glass, setAlien3GlassState] = useState(() => config.alien3?.loadGlass() ?? config.alien3?.glass);
  const [stageError, setStageError] = useState<string | null>(null);

  useEffect(() => {
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    if (!paper || !canvas) return;

    let cancelled = false;
    let alien3Body: THREE.BufferGeometry | null = null;

    const boot = async () => {
      setStageError(null);
      const initial = config.loadParts();
      const initialFace = config.initialFace;
      const a2 = config.alien2;
      const a3 = config.alien3;
      const a2Parts = a2?.loadParts() ?? a2?.parts;
      const a2Face = a2?.loadFace() ?? a2?.face;
      const a2Glass = a2?.loadGlass() ?? a2?.glass;
      const a3Face = a3?.loadFace() ?? a3?.face;
      const a3Glass = a3?.loadGlass() ?? a3?.glass;
      if (a3Face) setAlien3FaceState(a3Face);
      if (a3Glass) setAlien3GlassState(a3Glass);

      try {
        if (a3) {
          alien3Body = await buildAlien3SketchGeometry(CHAPTER3_ALIEN3_SKETCH_URL);
        }
      } catch (e) {
        if (!cancelled) setStageError(e instanceof Error ? e.message : "외계인3 스케치 로드 실패");
        return;
      }

      if (cancelled) {
        alien3Body?.dispose();
        return;
      }

      const extras: Parameters<typeof createChapter3InsideScene>[4] = {};
      if (a2 && a2Parts && a2Face && a2Glass) {
        extras.alien2 = { parts: a2Parts, face: a2Face, glass: a2Glass };
      }
      if (a3 && a3Face && a3Glass && alien3Body) {
        extras.alien3 = { bodyGeometry: alien3Body, face: a3Face, glass: a3Glass };
      }

      const stage = createChapter3InsideScene(
        canvas,
        paper,
        initial,
        initialFace,
        extras.alien2 || extras.alien3 ? extras : undefined,
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
        stageRef.current = null;
        stage.dispose();
      };
    };

    let teardown: (() => void) | void;
    void boot().then((t) => {
      teardown = t;
    });

    return () => {
      cancelled = true;
      teardown?.();
      if (!stageRef.current) alien3Body?.dispose();
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
      {stageError && (
        <p className="chapter3-shape__hint" style={{ position: "absolute", left: 16, bottom: 16, zIndex: 4 }}>
          {stageError}
        </p>
      )}
      {CHAPTER3_ALIEN3_EDITOR && config.alien3 && alien3Glass && alien3Face && (
        <Chapter3Alien3Editor
          glass={alien3Glass}
          face={alien3Face}
          onGlassChange={(next) => {
            setAlien3GlassState(next);
            config.alien3!.saveGlass(next);
            stageRef.current?.setAlien3GlassParams(next);
          }}
          onFaceChange={(next) => {
            setAlien3FaceState(next);
            config.alien3!.saveFace(next);
            stageRef.current?.setAlien3FaceParams(next);
          }}
        />
      )}
    </div>
  );
}
