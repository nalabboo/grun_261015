"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { TransformControls } from "@react-three/drei";
import type * as THREE from "three";
import { depthEditorFlags } from "./depthInput";

export type TransformMode = "translate" | "rotate" | "scale";

export const EDITOR_GROUPS = [
  { label: "산", ids: ["berg4", "berg3", "berg2", "berg1", "stein"] },
  { label: "캐릭터", ids: ["grun", "kind", "frosch"] },
  { label: "마리모", ids: ["moss1", "moss2-left", "moss2-right", "moss-far-left", "moss-mid-right", "moss-near-left"] },
] as const;

const MODE_KEYS: Record<string, TransformMode> = {
  w: "translate",
  e: "rotate",
  r: "scale",
};

type EditorState = {
  selectedId: string | null;
  mode: TransformMode;
};

let editorState: EditorState = { selectedId: null, mode: "translate" };
const listeners = new Set<() => void>();
const objects = new Map<string, THREE.Object3D>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return editorState;
}

function setEditorState(partial: Partial<EditorState>) {
  editorState = { ...editorState, ...partial };
  emit();
}

export function selectLayer(id: string | null) {
  setEditorState({ selectedId: id });
}

export function setTransformMode(mode: TransformMode) {
  setEditorState({ mode });
}

export function registerLayer(id: string, object: THREE.Object3D) {
  objects.set(id, object);
  return () => {
    objects.delete(id);
  };
}

export function getLayerObject(id: string) {
  return objects.get(id);
}

export function useDepthEditor() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function formatAxis(value: number) {
  return Number(value.toFixed(3));
}

function logLayerTransform(id: string, object: THREE.Object3D) {
  const { position, rotation, scale } = object;
  const payload = {
    position: { x: formatAxis(position.x), y: formatAxis(position.y), z: formatAxis(position.z) },
    rotation: { x: formatAxis(rotation.x), y: formatAxis(rotation.y), z: formatAxis(rotation.z) },
    scale: { x: formatAxis(scale.x), y: formatAxis(scale.y), z: formatAxis(scale.z) },
  };

  console.log(
    `[${id}] position: [${payload.position.x}, ${payload.position.y}, ${payload.position.z}]`,
  );
  console.log(
    `[${id}] rotation: [${payload.rotation.x}, ${payload.rotation.y}, ${payload.rotation.z}]`,
  );
  console.log(
    `[${id}] scale:    [${payload.scale.x}, ${payload.scale.y}, ${payload.scale.z}]`,
  );
  console.log(`[${id}]`, payload);
}

export function DepthTransformControls() {
  const { selectedId, mode } = useDepthEditor();
  const object = selectedId ? getLayerObject(selectedId) : undefined;

  if (!selectedId || !object) return null;

  return (
    <TransformControls
      key={selectedId}
      object={object}
      mode={mode}
      space="world"
      size={0.85}
      onMouseDown={() => {
        depthEditorFlags.gizmoDragging = true;
      }}
      onMouseUp={() => {
        depthEditorFlags.gizmoDragging = false;
        logLayerTransform(selectedId, object);
      }}
    />
  );
}

export function DepthEditorHud() {
  const { selectedId, mode } = useDepthEditor();

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    const nextMode = MODE_KEYS[event.key.toLowerCase()];
    if (nextMode) {
      event.preventDefault();
      setTransformMode(nextMode);
    }
    if (event.key === "Escape") {
      selectLayer(null);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-20 w-56 rounded-lg bg-[#f3efe6]/90 p-3 text-[11px] leading-relaxed text-[#3d4a44] shadow-sm ring-1 ring-[#3d4a44]/10 backdrop-blur-sm">
      <div className="mb-2 flex gap-1">
        {(["translate", "rotate", "scale"] as TransformMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTransformMode(item)}
            className={`flex-1 rounded px-1.5 py-1 tracking-wide ${mode === item ? "bg-[#3d4a44] text-[#f3efe6]" : "bg-[#3d4a44]/10"}`}
          >
            {item === "translate" ? "W 위치" : item === "rotate" ? "E 회전" : "R 크기"}
          </button>
        ))}
      </div>

      {EDITOR_GROUPS.map((group) => (
        <div key={group.label} className="mb-2 last:mb-0">
          <div className="mb-1 text-[10px] tracking-[0.18em] text-[#3d4a44]/55">{group.label}</div>
          <div className="flex flex-wrap gap-1">
            {group.ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => selectLayer(id)}
                className={`rounded px-1.5 py-0.5 ${selectedId === id ? "bg-[#3d4a44] text-[#f3efe6]" : "bg-[#3d4a44]/8 hover:bg-[#3d4a44]/15"}`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      ))}

      <p className="mt-2 text-[10px] text-[#3d4a44]/55">
        {selectedId ? `${selectedId} · 드래그 후 콘솔에 x, y, z` : "카드 또는 이름을 눌러 선택"}
      </p>
    </div>
  );
}
