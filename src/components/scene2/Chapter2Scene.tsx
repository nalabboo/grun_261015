"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorMode } from "@/components/canvas/worldView";
import { SCENE_PERSPECTIVE_RATIO, SCENE_REFERENCE_HEIGHT } from "@/constants/sceneConfig";
import {
  CHAPTER2_BERG_DISPLAY_SCALE,
  CHAPTER2_BERG_LAYERS,
  CHAPTER2_BERG4_FIXED_LAYOUT,
  CHAPTER2_DEPTH_SIZE_STRENGTH,
} from "@/constants/chapter2Config";
import Chapter2BergLayer from "@/components/scene2/Chapter2BergLayer";
import Chapter2BergEditorPanel from "@/components/scene2/Chapter2BergEditorPanel";
import {
  CHAPTER2_BERG4_LAYOUT_DEFAULT,
  DEFAULT_CHAPTER2_BERG_EDIT,
  DEV_CHAPTER2_BERG_EDITOR,
  defaultChapter2BergTunableEdits,
  sanitizeChapter2BergEditTransform,
  formatChapter2BergEditsForConfig,
  loadChapter2BergTunableEdits,
  saveChapter2BergTunableEdits,
  type Chapter2BergEditTransform,
  type Chapter2BergEditorState,
  type Chapter2BergTunableId,
} from "@/constants/chapter2Layout";

type Point = { x: number; y: number };

const SMOOTH = 0.07;

function getChapter2DepthFactor(viewportHeight: number, depthRatio: number) {
  const perspective = viewportHeight * SCENE_PERSPECTIVE_RATIO;
  const depth = depthRatio * viewportHeight;
  const full = perspective / Math.max(perspective - depth, 1);
  return 1 + (full - 1) * CHAPTER2_DEPTH_SIZE_STRENGTH;
}

type DragState = {
  id: Chapter2BergTunableId;
  mode: EditorMode;
  startClientX: number;
  startClientY: number;
  base: Chapter2BergEditTransform;
};

/** Chapter 2 — stacked berg layers with mouse-driven synesthesia parallax. */
export default function Chapter2Scene() {
  const targetRef = useRef<Point>({ x: 0, y: 0 });
  const smoothRef = useRef<Point>({ x: 0, y: 0 });
  const velocityRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const [frame, setFrame] = useState(0);

  const [editor, setEditor] = useState<Chapter2BergEditorState>({
    enabled: false,
    selectedId: null,
    mode: "translate",
  });
  /** SSR-safe defaults; localStorage merges after mount (avoids hydration mismatch). */
  const [tunableEdits, setTunableEdits] = useState(defaultChapter2BergTunableEdits);
  const [viewportHeight, setViewportHeight] = useState(SCENE_REFERENCE_HEIGHT);
  const [devEditsReady, setDevEditsReady] = useState(false);

  useEffect(() => {
    setTunableEdits(loadChapter2BergTunableEdits());
    setViewportHeight(window.innerHeight);
    setDevEditsReady(true);
  }, []);

  const commitEdits = useCallback(
    (next: Record<Chapter2BergTunableId, Chapter2BergEditTransform>) => {
      saveChapter2BergTunableEdits(next);
      console.log("[Chapter2 berg layout]", formatChapter2BergEditsForConfig({ ...next }));
    },
    [],
  );

  const patchEdit = useCallback(
    (id: Chapter2BergTunableId, patch: Partial<Chapter2BergEditTransform>) => {
      setTunableEdits((prev) => {
        const seed =
          id === "berg4" ? CHAPTER2_BERG4_LAYOUT_DEFAULT : DEFAULT_CHAPTER2_BERG_EDIT;
        const merged = sanitizeChapter2BergEditTransform(
          { ...prev[id], ...patch },
          seed,
        );
        const next = { ...prev, [id]: merged };
        saveChapter2BergTunableEdits(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (editor.enabled) return;
      targetRef.current = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      };
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [editor.enabled]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const target = targetRef.current;
      const smooth = smoothRef.current;
      const prevX = smooth.x;
      const prevY = smooth.y;

      smooth.x += (target.x - smooth.x) * SMOOTH;
      smooth.y += (target.y - smooth.y) * SMOOTH;
      velocityRef.current = Math.hypot(smooth.x - prevX, smooth.y - prevY);

      setFrame((f) => f + 1);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!editor.enabled) return;

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      const base = drag.base;

      if (drag.mode === "translate") {
        patchEdit(drag.id, { x: base.x + dx, y: base.y + dy });
        return;
      }

      if (drag.mode === "rotate") {
        patchEdit(drag.id, { rotate: base.rotate + dx * 0.35 });
        return;
      }

      const factor = Math.max(0.2, 1 - dy * 0.004);
      patchEdit(drag.id, {
        scale: base.scale * factor,
        scaleY: base.scaleY * factor,
      });
    };

    const onPointerUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setTunableEdits((current) => {
        commitEdits(current);
        return current;
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [commitEdits, editor.enabled, patchEdit]);

  const handleDragStart = useCallback(
    (id: Chapter2BergTunableId, clientX: number, clientY: number) => {
      if (!editor.enabled) return;
      dragRef.current = {
        id,
        mode: editor.mode,
        startClientX: clientX,
        startClientY: clientY,
        base: { ...tunableEdits[id] },
      };
    },
    [editor.enabled, editor.mode, tunableEdits],
  );

  const smooth = smoothRef.current;
  const velocity = velocityRef.current;
  void frame;

  const hue = smooth.x * 14 + smooth.y * 10 + velocity * 120;
  const saturate = 1 + Math.min(0.35, velocity * 8 + Math.hypot(smooth.x, smooth.y) * 0.12);
  const breathe = 1 + Math.hypot(smooth.x, smooth.y) * 0.012;
  const motion = Math.hypot(smooth.x, smooth.y);
  const parallaxBreathe = breathe + motion * 0.004;

  const foregroundLayers = CHAPTER2_BERG_LAYERS.filter((layer) => layer.id !== "berg4");
  const foregroundScales = foregroundLayers.map((layer) => {
    const depthFactor = getChapter2DepthFactor(viewportHeight, layer.depthRatio);
    const layerBreathe = parallaxBreathe + (layer.depth - 2) * 0.0012 * motion;
    return depthFactor * layer.layerScale * layerBreathe;
  });
  const maxForegroundScale = Math.max(...foregroundScales, 1);

  const berg4Layer = CHAPTER2_BERG_LAYERS.find((layer) => layer.id === "berg4");

  return (
    <div
      className={`chapter2-scene chapter2-scene--visible${editor.enabled ? " chapter2-scene--editing" : ""}`}
      style={{
        filter: `hue-rotate(${hue}deg) saturate(${saturate})`,
        ["--berg-scale" as string]: String(CHAPTER2_BERG_DISPLAY_SCALE),
      }}
    >
      {berg4Layer && (() => {
        const berg4Edit = devEditsReady
          ? tunableEdits.berg4
          : CHAPTER2_BERG4_FIXED_LAYOUT;
        const berg4ShiftX = smooth.x * berg4Layer.parallax;
        const berg4ShiftY = smooth.y * berg4Layer.parallax * 0.65;
        const berg4Selected = editor.enabled && editor.selectedId === "berg4";

        return (
          <Chapter2BergLayer
            key={berg4Layer.id}
            layer={berg4Layer}
            shiftX={berg4ShiftX}
            shiftY={berg4ShiftY}
            scale={1}
            edit={berg4Edit}
            editorActive={editor.enabled}
            isSelected={berg4Selected}
            editMode={editor.mode}
            onSelect={() => setEditor((prev) => ({ ...prev, selectedId: "berg4" }))}
            onDragStart={(x, y) => handleDragStart("berg4", x, y)}
          />
        );
      })()}

      {foregroundLayers.map((layer, index) => {
        const shiftX = smooth.x * layer.parallax;
        const shiftY = smooth.y * layer.parallax * 0.65;
        const scale = foregroundScales[index] / maxForegroundScale;
        const tunableId = layer.id as Chapter2BergTunableId;
        const edit = devEditsReady
          ? tunableEdits[tunableId]
          : DEFAULT_CHAPTER2_BERG_EDIT;
        const layerSelected =
          editor.enabled && editor.selectedId === tunableId;

        return (
          <Chapter2BergLayer
            key={layer.id}
            layer={layer}
            shiftX={shiftX}
            shiftY={shiftY}
            scale={scale}
            edit={edit}
            editorActive={editor.enabled}
            isSelected={layerSelected}
            editMode={editor.mode}
            onSelect={() => setEditor((prev) => ({ ...prev, selectedId: tunableId }))}
            onDragStart={(x, y) => handleDragStart(tunableId, x, y)}
          />
        );
      })}
      <div
        className="chapter2-synesthesia-veil"
        style={{
          opacity: 0.08 + Math.min(0.22, velocity * 6),
          background: `radial-gradient(circle at ${50 + smooth.x * 22}% ${50 + smooth.y * 18}%, rgba(120,220,160,0.45), transparent 62%)`,
          pointerEvents: "none",
        }}
      />
      {DEV_CHAPTER2_BERG_EDITOR && (
        <Chapter2BergEditorPanel
          editor={editor}
          edits={tunableEdits}
          onToggle={() => setEditor((prev) => ({ ...prev, enabled: !prev.enabled }))}
          onSelect={(selectedId) => setEditor((prev) => ({ ...prev, selectedId }))}
          onModeChange={(mode) => setEditor((prev) => ({ ...prev, mode }))}
          onPatch={patchEdit}
          onResetLayer={(id) => {
            setTunableEdits((prev) => {
              const reset =
                id === "berg4"
                  ? { ...CHAPTER2_BERG4_LAYOUT_DEFAULT }
                  : { ...DEFAULT_CHAPTER2_BERG_EDIT };
              const next = { ...prev, [id]: reset };
              commitEdits(next);
              return next;
            });
          }}
          onResetAll={() => {
            const next = defaultChapter2BergTunableEdits();
            setTunableEdits(next);
            saveChapter2BergTunableEdits(next);
          }}
        />
      )}
    </div>
  );
}
