"use client";

import { useState } from "react";
import {
  CHAPTER3_DECOR_DEFAULT,
  formatInsideDecorForSource,
  type Chapter3DecorCoral,
  type Chapter3DecorRock,
  type Chapter3DecorTuft,
  type Chapter3InsideDecorConfig,
} from "@/constants/chapter3InsideDecorConfig";

type Tab = "rocks" | "tufts" | "corals";

type Props = {
  config: Chapter3InsideDecorConfig;
  onChange: (next: Chapter3InsideDecorConfig) => void;
};

const TAB_LABEL: Record<Tab, string> = {
  rocks: "돌",
  tufts: "풀",
  corals: "산호",
};

export default function Chapter3InsideDecorEditor({ config, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("rocks");
  const [index, setIndex] = useState(0);

  const list = config[tab];
  const safeIndex = Math.min(index, Math.max(0, list.length - 1));
  const item = list[safeIndex];

  const patchRock = (key: keyof Chapter3DecorRock, value: number) => {
    if (!item || tab !== "rocks") return;
    const rocks = config.rocks.map((r, i) => (i === safeIndex ? { ...r, [key]: value } : r));
    onChange({ ...config, rocks });
  };
  const patchTuft = (key: keyof Chapter3DecorTuft, value: number) => {
    if (!item || tab !== "tufts") return;
    const v = key === "blades" ? Math.round(value) : value;
    const tufts = config.tufts.map((t, i) => (i === safeIndex ? { ...t, [key]: v } : t));
    onChange({ ...config, tufts });
  };
  const patchCoral = (key: keyof Chapter3DecorCoral, value: number) => {
    if (!item || tab !== "corals") return;
    const corals = config.corals.map((c, i) => (i === safeIndex ? { ...c, [key]: value } : c));
    onChange({ ...config, corals });
  };

  type Row = { label: string; min: number; max: number; step: number; value: number; patch: (v: number) => void };

  const rows: Row[] =
    tab === "rocks" && item
      ? [
          { label: "X", min: -5, max: 5, step: 0.05, value: (item as Chapter3DecorRock).x, patch: (v) => patchRock("x", v) },
          { label: "Z", min: -1.5, max: 1.55, step: 0.05, value: (item as Chapter3DecorRock).z, patch: (v) => patchRock("z", v) },
          { label: "크기", min: 0.08, max: 0.75, step: 0.02, value: (item as Chapter3DecorRock).size, patch: (v) => patchRock("size", v) },
          { label: "납작", min: 0.35, max: 0.95, step: 0.02, value: (item as Chapter3DecorRock).flatten, patch: (v) => patchRock("flatten", v) },
          { label: "회전 Y", min: -3.14, max: 3.14, step: 0.05, value: (item as Chapter3DecorRock).rotY, patch: (v) => patchRock("rotY", v) },
        ]
      : tab === "tufts" && item
        ? [
            { label: "X", min: -5, max: 5, step: 0.05, value: (item as Chapter3DecorTuft).x, patch: (v) => patchTuft("x", v) },
            { label: "Z", min: -1.5, max: 1.55, step: 0.05, value: (item as Chapter3DecorTuft).z, patch: (v) => patchTuft("z", v) },
            { label: "키", min: 0.1, max: 0.55, step: 0.01, value: (item as Chapter3DecorTuft).height, patch: (v) => patchTuft("height", v) },
            { label: "폭", min: 0.04, max: 0.22, step: 0.01, value: (item as Chapter3DecorTuft).spread, patch: (v) => patchTuft("spread", v) },
            { label: "잎 수", min: 3, max: 12, step: 1, value: (item as Chapter3DecorTuft).blades, patch: (v) => patchTuft("blades", v) },
          ]
        : tab === "corals" && item
          ? [
              { label: "X", min: -5, max: 5, step: 0.05, value: (item as Chapter3DecorCoral).x, patch: (v) => patchCoral("x", v) },
              { label: "Z", min: -1.5, max: 1.55, step: 0.05, value: (item as Chapter3DecorCoral).z, patch: (v) => patchCoral("z", v) },
              { label: "키", min: 0.7, max: 2.6, step: 0.05, value: (item as Chapter3DecorCoral).height, patch: (v) => patchCoral("height", v) },
              { label: "회전 Y", min: -3.14, max: 3.14, step: 0.05, value: (item as Chapter3DecorCoral).rotY, patch: (v) => patchCoral("rotY", v) },
            ]
          : [];

  return (
    <div className="chapter3-shape">
      <button type="button" className="chapter3-shape__toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        장식 · 돌/풀/산호 {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="chapter3-shape__panel">
          <p className="chapter3-shape__hint">항목별 X·Z·크기 조절. 변경 즉시 3D에 반영·저장.</p>
          <div className="chapter3-shape__actions" style={{ marginBottom: 8 }}>
            {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setIndex(0);
                }}
                style={{ fontWeight: tab === t ? 600 : 400 }}
              >
                {TAB_LABEL[t]} ({config[t].length})
              </button>
            ))}
          </div>
          <label className="chapter3-shape__row">
            <span>선택</span>
            <select
              value={safeIndex}
              onChange={(e) => setIndex(Number(e.target.value))}
              style={{ flex: 1, font: "inherit" }}
            >
              {list.map((_, i) => (
                <option key={i} value={i}>
                  {TAB_LABEL[tab]} {i + 1}
                </option>
              ))}
            </select>
          </label>
          {rows.map((row) => (
            <label key={row.label} className="chapter3-shape__row">
              <span>
                {row.label}
                <output>{row.value.toFixed(row.step < 0.1 ? 2 : 0)}</output>
              </span>
              <input
                type="range"
                min={row.min}
                max={row.max}
                step={row.step}
                value={row.value}
                onChange={(e) => row.patch(Number(e.target.value))}
              />
            </label>
          ))}
          <div className="chapter3-shape__actions">
            <button type="button" onClick={() => onChange({ ...CHAPTER3_DECOR_DEFAULT })}>
              기본값
            </button>
            <button type="button" onClick={() => void navigator.clipboard.writeText(formatInsideDecorForSource(config))}>
              코드 복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
