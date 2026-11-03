"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAPTER3_ALIEN_DEFAULT_PARTS,
  CHAPTER3_ALIEN_REF_HEIGHT,
  CHAPTER3_ALIEN_REF_WIDTH,
  cloneAlienParts,
  formatAlienPartsForSource,
  type Chapter3AlienPart,
} from "@/constants/chapter3AlienShape";

type Props = {
  parts: Chapter3AlienPart[];
  onChange: (parts: Chapter3AlienPart[]) => void;
  rebuilding?: boolean;
  title?: string;
  defaultParts?: Chapter3AlienPart[];
  formatForSource?: (parts: Chapter3AlienPart[]) => string;
  cyMin?: number;
  embedded?: boolean;
  includeRotation?: boolean;
};

type DragMode = "move" | "scaleX" | "scaleY" | null;

const SLIDER_SPECS_BASE: { key: keyof Chapter3AlienPart; label: string; min: number; max: number; step: number }[] = [
  { key: "cx", label: "X", min: 0, max: CHAPTER3_ALIEN_REF_WIDTH, step: 1 },
  { key: "cy", label: "Y", min: 0, max: CHAPTER3_ALIEN_REF_HEIGHT, step: 1 },
  { key: "cz", label: "Z (깊이)", min: -120, max: 120, step: 1 },
  { key: "rx", label: "폭 rx", min: 8, max: 360, step: 1 },
  { key: "ry", label: "높이 ry", min: 8, max: 200, step: 1 },
  { key: "rz", label: "두께 rz", min: 8, max: 160, step: 1 },
  { key: "blend", label: "블렌드", min: 0, max: 90, step: 1 },
];

function hitPartIndex(parts: Chapter3AlienPart[], px: number, py: number) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    const n = (px - p.cx) ** 2 / p.rx ** 2 + (py - p.cy) ** 2 / p.ry ** 2;
    if (n <= 1) return i;
  }
  return -1;
}

function dragModeAt(parts: Chapter3AlienPart[], index: number, px: number, py: number): DragMode {
  const p = parts[index];
  const nx = (px - p.cx) / p.rx;
  const ny = (py - p.cy) / p.ry;
  const r = nx * nx + ny * ny;
  if (r > 1) return null;
  if (Math.abs(nx) > 0.72) return "scaleX";
  if (Math.abs(ny) > 0.72) return "scaleY";
  return "move";
}

/** Metaball editor: drag blobs on the canvas, fine-tune with sliders. */
export default function Chapter3AlienShapeEditor({
  parts,
  onChange,
  rebuilding,
  title = "쉐입 편집",
  defaultParts = CHAPTER3_ALIEN_DEFAULT_PARTS,
  formatForSource = formatAlienPartsForSource,
  cyMin,
  embedded = false,
  includeRotation = false,
}: Props) {
  const sliderSpecs = [
    ...SLIDER_SPECS_BASE.map((s) => (s.key === "cy" && cyMin !== undefined ? { ...s, min: cyMin } : s)),
    ...(includeRotation
      ? ([
          { key: "rotX" as const, label: "회전 X", min: -90, max: 90, step: 1 },
          { key: "rotY" as const, label: "회전 Y", min: -90, max: 90, step: 1 },
          { key: "rotZ" as const, label: "회전 Z", min: -90, max: 90, step: 1 },
        ] as const)
      : []),
  ];
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ index: number; mode: DragMode; startPx: number; startPy: number; snapshot: Chapter3AlienPart } | null>(
    null,
  );

  const selectedIndex = Math.min(selected, Math.max(0, parts.length - 1));
  const current = parts[selectedIndex];

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const sx = w / CHAPTER3_ALIEN_REF_WIDTH;
    const sy = h / CHAPTER3_ALIEN_REF_HEIGHT;

    ctx.fillStyle = "#eceae4";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CHAPTER3_ALIEN_REF_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x * sx, 0);
      ctx.lineTo(x * sx, h);
      ctx.stroke();
    }
    for (let y = 0; y <= CHAPTER3_ALIEN_REF_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y * sy);
      ctx.lineTo(w, y * sy);
      ctx.stroke();
    }

    parts.forEach((p, i) => {
      const active = i === selectedIndex;
      ctx.save();
      ctx.translate(p.cx * sx, p.cy * sy);
      ctx.scale(p.rx * sx, p.ry * sy);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fillStyle = active ? "rgba(90, 120, 160, 0.35)" : "rgba(120, 130, 140, 0.22)";
      ctx.fill();
      ctx.strokeStyle = active ? "rgba(40, 70, 110, 0.85)" : "rgba(80, 88, 96, 0.55)";
      ctx.lineWidth = (active ? 2 : 1) / Math.min(p.rx * sx, p.ry * sy);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = active ? "#2a4a6a" : "#5a6268";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(p.name, p.cx * sx + 4, p.cy * sy - 4);
    });
  }, [parts, selectedIndex]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  const patchPart = (index: number, patch: Partial<Chapter3AlienPart>) => {
    onChange(parts.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const canvasToRef = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * CHAPTER3_ALIEN_REF_WIDTH;
    const py = ((clientY - rect.top) / rect.height) * CHAPTER3_ALIEN_REF_HEIGHT;
    return { px, py };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { px, py } = canvasToRef(e.clientX, e.clientY);
    const index = hitPartIndex(parts, px, py);
    if (index < 0) return;
    setSelected(index);
    const mode = dragModeAt(parts, index, px, py);
    if (!mode) return;
    dragRef.current = { index, mode, startPx: px, startPy: py, snapshot: { ...parts[index] } };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { px, py } = canvasToRef(e.clientX, e.clientY);
    const dx = px - drag.startPx;
    const dy = py - drag.startPy;
    const s = drag.snapshot;
    if (drag.mode === "move") {
      patchPart(drag.index, { cx: s.cx + dx, cy: s.cy + dy });
    } else if (drag.mode === "scaleX") {
      patchPart(drag.index, { rx: Math.max(8, s.rx + dx * 0.9) });
    } else if (drag.mode === "scaleY") {
      patchPart(drag.index, { ry: Math.max(8, s.ry + dy * 0.9) });
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* synthetic */
    }
  };

  const copySource = async () => {
    await navigator.clipboard.writeText(formatForSource(parts));
  };

  return (
    <div className={embedded ? "chapter3-shape chapter3-shape--embedded" : "chapter3-shape"}>
      <button type="button" className="chapter3-shape__toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {title} {open ? "▾" : "▸"}
        {rebuilding ? " · 갱신 중…" : ""}
      </button>
      {open && (
        <div className="chapter3-shape__panel">
          <p className="chapter3-shape__hint">옆면 미리보기: 가운데 드래그=이동, 가장자리=크기. 3D는 슬라이더 변경 후 잠시 뒤 반영.</p>
          <canvas
            ref={canvasRef}
            className="chapter3-shape__canvas"
            width={380}
            height={200}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          <div className="chapter3-shape__parts">
            {parts.map((p, i) => (
              <button
                key={i}
                type="button"
                className={`chapter3-shape__part${i === selectedIndex ? " chapter3-shape__part--active" : ""}`}
                onClick={() => setSelected(i)}
              >
                {p.name}
              </button>
            ))}
          </div>
          {current && (
            <>
              <label className="chapter3-shape__name">
                이름
                <input
                  value={current.name}
                  onChange={(e) => patchPart(selectedIndex, { name: e.target.value })}
                />
              </label>
              {sliderSpecs.map((spec) => (
                <label key={spec.key} className="chapter3-shape__row">
                  <span>
                    {spec.label}
                    <output>{Number(current[spec.key] ?? 0).toFixed(spec.step < 1 ? 2 : 0)}</output>
                  </span>
                  <input
                    type="range"
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    value={Number(current[spec.key] ?? 0)}
                    onChange={(e) => patchPart(selectedIndex, { [spec.key]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </>
          )}
          <div className="chapter3-shape__actions">
            <button
              type="button"
              onClick={() =>
                onChange([
                  ...parts,
                  {
                    name: `파트 ${parts.length + 1}`,
                    cx: 480,
                    cy: 260,
                    cz: 0,
                    rx: 60,
                    ry: 50,
                    rz: 50,
                    blend: 40,
                    rotX: 0,
                    rotY: 0,
                    rotZ: 0,
                  },
                ])
              }
            >
              + 파트
            </button>
            <button
              type="button"
              disabled={parts.length <= 1}
              onClick={() => {
                const next = parts.filter((_, i) => i !== selectedIndex);
                onChange(next);
                setSelected(Math.max(0, selectedIndex - 1));
              }}
            >
              삭제
            </button>
            <button type="button" onClick={() => onChange(cloneAlienParts(defaultParts))}>
              기본값
            </button>
            <button type="button" onClick={() => void copySource()}>
              코드 복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
