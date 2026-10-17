"use client";

import { useEffect } from "react";
import type { EditorMode } from "@/components/canvas/worldView";
import {
  CHAPTER2_BERG_TUNABLE_IDS,
  formatChapter2BergEditsForConfig,
  type Chapter2BergEditTransform,
  type Chapter2BergEditorState,
  type Chapter2BergTunableId,
} from "@/constants/chapter2Layout";

type Props = {
  editor: Chapter2BergEditorState;
  edits: Record<Chapter2BergTunableId, Chapter2BergEditTransform>;
  onToggle: () => void;
  onSelect: (id: Chapter2BergTunableId) => void;
  onModeChange: (mode: EditorMode) => void;
  onPatch: (id: Chapter2BergTunableId, patch: Partial<Chapter2BergEditTransform>) => void;
  onResetLayer: (id: Chapter2BergTunableId) => void;
  onResetAll: () => void;
};

const MODES: { mode: EditorMode; label: string; key: string }[] = [
  { mode: "translate", label: "Move", key: "W" },
  { mode: "rotate", label: "Rotate", key: "E" },
  { mode: "scale", label: "Scale", key: "R" },
];

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 12,
  left: 12,
  zIndex: 55,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  maxWidth: 260,
  padding: 10,
  borderRadius: 8,
  background: "rgba(0, 0, 0, 0.78)",
  color: "#fff",
  fontSize: 12,
  fontFamily: "var(--font-geist-mono), monospace",
  cursor: "default",
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

export default function Chapter2BergEditorPanel({
  editor,
  edits,
  onToggle,
  onSelect,
  onModeChange,
  onPatch,
  onResetLayer,
  onResetAll,
}: Props) {
  const { enabled, selectedId } = editor;
  const selected = selectedId ? edits[selectedId] : null;

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const match = MODES.find(({ key }) => key === event.key.toUpperCase());
      if (match) onModeChange(match.mode);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onModeChange]);

  const copyLayout = async () => {
    const text = formatChapter2BergEditsForConfig({ ...edits });
    try {
      await navigator.clipboard.writeText(text);
      console.log("[Chapter2 berg layout]", text);
    } catch {
      console.log("[Chapter2 berg layout — copy failed, logged below]\n", text);
    }
  };

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
      <button type="button" style={buttonStyle(enabled)} onClick={onToggle}>
        Ch2 berg edit: {enabled ? "ON" : "OFF"}
      </button>

      {enabled && (
        <>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {MODES.map(({ mode, label, key }) => (
              <button
                key={mode}
                type="button"
                style={buttonStyle(editor.mode === mode)}
                onClick={() => onModeChange(mode)}
                title={`${label} (${key})`}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {CHAPTER2_BERG_TUNABLE_IDS.map((id) => (
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

          {selectedId && selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(
                [
                  ["x", "x"],
                  ["y", "y"],
                  ["scale", "scale"],
                  ["scaleY", "scaleY"],
                  ["rotate", "rotate"],
                ] as const
              ).map(([label, key]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 48, opacity: 0.85 }}>{label}</span>
                  <input
                    type="number"
                    step={key === "rotate" ? 1 : 0.01}
                    style={fieldStyle}
                    value={Number.isFinite(selected[key]) ? selected[key] : 0}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      onPatch(selectedId, {
                        [key]: Number.isFinite(next) ? next : 0,
                      });
                    }}
                  />
                </label>
              ))}
              <button type="button" style={buttonStyle(false)} onClick={() => onResetLayer(selectedId)}>
                Reset {selectedId}
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle(false)} onClick={copyLayout}>
              Copy JSON
            </button>
            <button type="button" style={buttonStyle(false)} onClick={onResetAll}>
              Reset all
            </button>
          </div>

          <div style={{ opacity: 0.72, lineHeight: 1.45 }}>
            berg4/3/2: drag on canvas (Move / Rotate / Scale). Values persist in localStorage.
            Paste berg4 from Copy JSON into <code>CHAPTER2_BERG4_LAYOUT_DEFAULT</code> for prod.
          </div>
        </>
      )}
    </div>
  );
}
