"use client";

import { useEffect } from "react";
import {
  CARD_IDS,
  type CardId,
  type EditorMode,
  type EditorState,
} from "@/components/canvas/worldView";

type LayerEditorPanelProps = {
  editor: EditorState;
  onToggle: () => void;
  onSelect: (id: CardId) => void;
  onModeChange: (mode: EditorMode) => void;
};

const MODES: { mode: EditorMode; label: string; key: string }[] = [
  { mode: "translate", label: "Position", key: "W" },
  { mode: "rotate", label: "Rotation", key: "E" },
  { mode: "scale", label: "Scale", key: "R" },
];

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  maxWidth: 220,
  padding: 10,
  borderRadius: 8,
  background: "rgba(0, 0, 0, 0.72)",
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

/** DOM toolbar: toggle edit mode, pick a layer card, pick the TransformControls mode. */
export default function LayerEditorPanel({
  editor,
  onToggle,
  onSelect,
  onModeChange,
}: LayerEditorPanelProps) {
  const { enabled } = editor;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const match = MODES.find(({ key }) => key === event.key.toUpperCase());
      if (match) onModeChange(match.mode);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onModeChange]);

  return (
    <div
      style={panelStyle}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <button type="button" style={buttonStyle(enabled)} onClick={onToggle}>
        Layer edit: {enabled ? "ON" : "OFF"}
      </button>

      {enabled && (
        <>
          <div style={{ display: "flex", gap: 4 }}>
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
            {CARD_IDS.map((id) => (
              <button
                key={id}
                type="button"
                style={buttonStyle(editor.selectedId === id)}
                onClick={() => onSelect(id)}
              >
                {id}
              </button>
            ))}
          </div>

          <div style={{ opacity: 0.7, lineHeight: 1.4 }}>
            Pick a card, drag the gizmo. Final x / y / z is logged to the console on release.
          </div>
        </>
      )}
    </div>
  );
}
