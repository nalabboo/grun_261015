"use client";

import { useEffect } from "react";
import type { EditorMode } from "@/components/canvas/worldView";
import {
  CHAPTER2_TUNABLE_PROP_IDS,
  withChapter2PropUniformScale,
  type Chapter2PropEdit,
  type Chapter2TunablePropId,
} from "@/constants/chapter2ObjectsConfig";
import {
  formatChapter2PropLayout,
  type Chapter2PropEditorState,
} from "@/constants/chapter2PropLayout";

type Props = {
  editor: Chapter2PropEditorState;
  edits: Record<Chapter2TunablePropId, Chapter2PropEdit>;
  onToggle: () => void;
  onSelect: (id: Chapter2TunablePropId) => void;
  onModeChange: (mode: EditorMode) => void;
  onPatch: (id: Chapter2TunablePropId, patch: Partial<Chapter2PropEdit>) => void;
  onResetSelected: () => void;
  onResetAll: () => void;
};

const MODES: { mode: EditorMode; label: string; key: string }[] = [
  { mode: "translate", label: "Move", key: "W" },
  { mode: "scale", label: "Scale", key: "R" },
];

const NUDGE = 8;

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 12,
  left: 12,
  zIndex: 55,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  maxWidth: 280,
  padding: 10,
  borderRadius: 8,
  background: "rgba(0, 0, 0, 0.78)",
  color: "#fff",
  fontSize: 12,
  fontFamily: "var(--font-geist-mono), monospace",
  pointerEvents: "auto",
};

function buttonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 8px",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    borderRadius: 4,
    background: active ? "#fff" : "transparent",
    color: active ? "#000" : "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
  };
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "3px 6px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: 11,
  fontFamily: "inherit",
};

export default function Chapter2PropEditorPanel({
  editor,
  edits,
  onToggle,
  onSelect,
  onModeChange,
  onPatch,
  onResetSelected,
  onResetAll,
}: Props) {
  const { selectedId } = editor;
  const selected = edits[selectedId];

  useEffect(() => {
    if (!editor.enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const match = MODES.find(({ key }) => key === event.key.toUpperCase());
      if (match) onModeChange(match.mode);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor.enabled, onModeChange]);

  const patch = (partial: Partial<Chapter2PropEdit>) => {
    onPatch(selectedId, { ...withChapter2PropUniformScale(partial, selected), ...partial });
  };

  const copyLayout = async () => {
    const text = formatChapter2PropLayout(edits);
    try {
      await navigator.clipboard.writeText(text);
      console.log("[Chapter2 prop layout]", text);
    } catch {
      console.log("[Chapter2 prop layout]\n", text);
    }
  };

  const blurValue = Number.isFinite(selected.blurRatio) ? selected.blurRatio! : 0;

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
      <button type="button" style={buttonStyle(editor.enabled)} onClick={onToggle}>
        Ch2 prop edit: {editor.enabled ? "ON" : "OFF"}
      </button>

      {editor.enabled && (
        <>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {MODES.map(({ mode, label, key }) => (
              <button
                key={mode}
                type="button"
                style={buttonStyle(editor.mode === mode)}
                onClick={() => onModeChange(mode)}
                title={key}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CHAPTER2_TUNABLE_PROP_IDS.map((id) => (
              <button
                key={id}
                type="button"
                style={buttonStyle(selectedId === id)}
                onClick={() => onSelect(id)}
              >
                {id}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            <span />
            <button type="button" style={buttonStyle(false)} onClick={() => patch({ y: selected.y - NUDGE })}>
              ↑ 위
            </button>
            <span />
            <button type="button" style={buttonStyle(false)} onClick={() => patch({ x: selected.x - NUDGE })}>
              ← 좌
            </button>
            <button type="button" style={buttonStyle(false)} onClick={() => patch({ y: selected.y + NUDGE })}>
              ↓ 아래
            </button>
            <button type="button" style={buttonStyle(false)} onClick={() => patch({ x: selected.x + NUDGE })}>
              → 우
            </button>
          </div>

          {(
            [
              ["x (좌·우)", "x"],
              ["y (위·아래)", "y"],
              ["scale (비율 고정)", "scale"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 96, fontSize: 10, opacity: 0.85 }}>{label}</span>
              <input
                type="number"
                step={0.01}
                style={fieldStyle}
                value={Number.isFinite(selected[key]) ? selected[key] : 0}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  patch({ [key]: Number.isFinite(next) ? next : 0 });
                }}
              />
            </label>
          ))}

          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 96, fontSize: 10, opacity: 0.85 }}>blurRatio</span>
            <input
              type="number"
              step={0.0001}
              min={0}
              style={fieldStyle}
              value={blurValue}
              onChange={(e) => {
                const next = Number(e.target.value);
                patch({ blurRatio: Number.isFinite(next) ? Math.max(0, next) : 0 });
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle(false)} onClick={copyLayout}>
              Copy JSON
            </button>
            <button type="button" style={buttonStyle(false)} onClick={onResetSelected}>
              Reset {selectedId}
            </button>
            <button type="button" style={buttonStyle(false)} onClick={onResetAll}>
              Reset all
            </button>
          </div>

          <div style={{ opacity: 0.72, lineHeight: 1.45 }}>
            spore2 ×2 + spore3: Move / Scale on canvas, blurRatio in panel. Copy JSON →
            CHAPTER2_PROP_FIXED_LAYOUTS + CHAPTER2_PROP_FIXED_BLUR.
          </div>
        </>
      )}
    </div>
  );
}
