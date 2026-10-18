"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { EditorMode } from "@/components/canvas/worldView";
import { SCENE_PERSPECTIVE_RATIO, SCENE_REFERENCE_HEIGHT } from "@/constants/sceneConfig";
import {
  CHAPTER2_BERG_DISPLAY_SCALE,
  CHAPTER2_BERG_LAYERS,
  CHAPTER2_BERG4_FIXED_LAYOUT,
  CHAPTER2_DEPTH_SIZE_STRENGTH,
} from "@/constants/chapter2Config";
import Chapter2BergLayer from "@/components/scene2/Chapter2BergLayer";
import Chapter2PropLayer from "@/components/scene2/Chapter2PropLayer";
import Chapter2PropEditorPanel from "@/components/scene2/Chapter2PropEditorPanel";
import {
  CHAPTER2_PROPS,
  CHAPTER2_TUNABLE_PROP_IDS,
  getChapter2PropDefaultEdit,
  isChapter2PropTunable,
  sanitizeChapter2PropEdit,
  withChapter2PropUniformScale,
  type Chapter2PropConfig,
  type Chapter2PropEdit,
} from "@/constants/chapter2ObjectsConfig";
import {
  DEFAULT_CHAPTER2_BERG_EDIT,
  defaultChapter2TunableEdits,
  loadChapter2TunableEdits,
  sanitizeChapter2BergEditTransform,
  type Chapter2BergEditTransform,
  type Chapter2TunableId,
} from "@/constants/chapter2Layout";
import {
  defaultChapter2PropEdits,
  DEV_CHAPTER2_PROP_EDITOR,
  loadChapter2PropEdits,
  saveChapter2PropEdits,
  type Chapter2PropEditorState,
  type Chapter2TunablePropId,
} from "@/constants/chapter2PropLayout";

type Point = { x: number; y: number };

const SMOOTH = 0.07;

type PropDragState = {
  id: Chapter2TunablePropId;
  mode: EditorMode;
  startClientX: number;
  startClientY: number;
  base: Chapter2PropEdit;
};

function getChapter2DepthFactor(viewportHeight: number, depthRatio: number) {
  const perspective = viewportHeight * SCENE_PERSPECTIVE_RATIO;
  const depth = depthRatio * viewportHeight;
  const full = perspective / Math.max(perspective - depth, 1);
  return 1 + (full - 1) * CHAPTER2_DEPTH_SIZE_STRENGTH;
}

/** Chapter 2 — stacked berg layers with mouse-driven synesthesia parallax. */
export default function Chapter2Scene() {
  const targetRef = useRef<Point>({ x: 0, y: 0 });
  const smoothRef = useRef<Point>({ x: 0, y: 0 });
  const velocityRef = useRef(0);
  const propDragRef = useRef<PropDragState | null>(null);
  const [frame, setFrame] = useState(0);

  const [editor, setEditor] = useState<Chapter2PropEditorState>({
    enabled: false,
    selectedId: "spore2_0",
    mode: "translate",
  });
  const [propEdits, setPropEdits] = useState(defaultChapter2PropEdits);
  const [propEditsReady, setPropEditsReady] = useState(false);

  const [tunableEdits, setTunableEdits] = useState(defaultChapter2TunableEdits);
  const [viewportHeight, setViewportHeight] = useState(SCENE_REFERENCE_HEIGHT);
  const [devEditsReady, setDevEditsReady] = useState(false);

  useEffect(() => {
    setTunableEdits(loadChapter2TunableEdits());
    setPropEdits(loadChapter2PropEdits());
    setViewportHeight(window.innerHeight);
    setDevEditsReady(true);
    setPropEditsReady(true);
  }, []);

  const patchProp = useCallback(
    (id: Chapter2TunablePropId, patch: Partial<Chapter2PropEdit>) => {
      setPropEdits((prev) => {
        const merged = sanitizeChapter2PropEdit(
          {
            ...prev[id],
            ...withChapter2PropUniformScale(patch, prev[id]),
            ...(patch.blurRatio !== undefined ? { blurRatio: patch.blurRatio } : {}),
          },
          getChapter2PropDefaultEdit(id),
        );
        const next = { ...prev, [id]: merged };
        saveChapter2PropEdits(next);
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
      const drag = propDragRef.current;
      if (!drag) return;

      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      const base = drag.base;

      if (drag.mode === "translate") {
        patchProp(drag.id, { x: base.x + dx, y: base.y + dy });
        return;
      }

      const factor = Math.max(0.2, 1 - dy * 0.004);
      patchProp(drag.id, { scale: base.scale * factor });
    };

    const onPointerUp = () => {
      propDragRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [editor.enabled, patchProp]);

  const handlePropDragStart = useCallback(
    (id: Chapter2TunablePropId, clientX: number, clientY: number) => {
      if (!editor.enabled) return;
      setEditor((prev) => ({ ...prev, selectedId: id }));
      propDragRef.current = {
        id,
        mode: editor.mode,
        startClientX: clientX,
        startClientY: clientY,
        base: { ...propEdits[id] },
      };
    },
    [editor.enabled, editor.mode, propEdits],
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
  const aboveBerg4Props = CHAPTER2_PROPS.filter((prop) => prop.stack === "aboveBerg4").sort(
    (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
  );
  const aboveBerg3Props = CHAPTER2_PROPS.filter((prop) => prop.stack === "aboveBerg3").sort(
    (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
  );
  const behindBerg2Props = CHAPTER2_PROPS.filter((prop) => prop.stack === "behindBerg2");

  const renderPropLayer = (prop: Chapter2PropConfig) => {
    const shiftX = smooth.x * prop.parallax;
    const shiftY = smooth.y * prop.parallax * 0.65;
    const layout = propEditsReady ? propEdits[prop.id] : getChapter2PropDefaultEdit(prop.id);
    const tunable = isChapter2PropTunable(prop.id);
    const isSelected = tunable && editor.selectedId === prop.id;
    return (
      <Chapter2PropLayer
        key={prop.id}
        prop={prop}
        viewportHeight={viewportHeight}
        shiftX={shiftX}
        shiftY={shiftY}
        layout={layout}
        editorActive={editor.enabled && tunable}
        isSelected={isSelected}
        editMode={editor.mode}
        onSelect={() => {
          if (!tunable) return;
          setEditor((prev) => ({ ...prev, selectedId: prop.id as Chapter2TunablePropId }));
        }}
        onDragStart={(x, y) => {
          if (!tunable) return;
          handlePropDragStart(prop.id as Chapter2TunablePropId, x, y);
        }}
      />
    );
  };

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
        return (
          <Chapter2BergLayer
            key={berg4Layer.id}
            layer={berg4Layer}
            viewportHeight={viewportHeight}
            shiftX={berg4ShiftX}
            shiftY={berg4ShiftY}
            scale={1}
            edit={berg4Edit}
          />
        );
      })()}

      {aboveBerg4Props.map((prop) => renderPropLayer(prop))}

      {foregroundLayers.map((layer, index) => {
        const shiftX = smooth.x * layer.parallax;
        const shiftY = smooth.y * layer.parallax * 0.65;
        const scale = foregroundScales[index] / maxForegroundScale;
        const tunableId = layer.id as Chapter2TunableId;
        const edit = devEditsReady
          ? tunableEdits[tunableId]
          : DEFAULT_CHAPTER2_BERG_EDIT;
        return (
          <Fragment key={layer.id}>
            {layer.id === "berg2" && behindBerg2Props.map((prop) => renderPropLayer(prop))}
            <Chapter2BergLayer
              layer={layer}
              viewportHeight={viewportHeight}
              shiftX={shiftX}
              shiftY={shiftY}
              scale={scale}
              edit={edit}
            />
            {layer.id === "berg3" && aboveBerg3Props.map((prop) => renderPropLayer(prop))}
          </Fragment>
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
      {DEV_CHAPTER2_PROP_EDITOR && (
        <Chapter2PropEditorPanel
          editor={editor}
          edits={propEdits as Record<Chapter2TunablePropId, Chapter2PropEdit>}
          onToggle={() => setEditor((prev) => ({ ...prev, enabled: !prev.enabled }))}
          onSelect={(selectedId) => setEditor((prev) => ({ ...prev, selectedId }))}
          onModeChange={(mode) => setEditor((prev) => ({ ...prev, mode }))}
          onPatch={patchProp}
          onResetSelected={() => {
            setPropEdits((prev) => {
              const id = editor.selectedId;
              if (!isChapter2PropTunable(id)) return prev;
              const next = { ...prev, [id]: getChapter2PropDefaultEdit(id) };
              saveChapter2PropEdits(next);
              return next;
            });
          }}
          onResetAll={() => {
            setPropEdits((prev) => {
              const next = { ...prev };
              for (const id of CHAPTER2_TUNABLE_PROP_IDS) {
                next[id] = getChapter2PropDefaultEdit(id);
              }
              saveChapter2PropEdits(next);
              return next;
            });
          }}
        />
      )}
    </div>
  );
}
