"use client";

import { useState } from "react";
import { CHAPTER3_ALIEN_FACE_PARAM_SPECS, type Chapter3AlienFaceParams } from "@/constants/chapter3AlienFaceConfig";

type Props = {
  params: Chapter3AlienFaceParams;
  onChange: (params: Chapter3AlienFaceParams) => void;
  title?: string;
  defaultFace: Chapter3AlienFaceParams;
  formatForSource: (params: Chapter3AlienFaceParams) => string;
  specs?: typeof CHAPTER3_ALIEN_FACE_PARAM_SPECS;
};

/** Sliders for glass bead eyes and stick mouth (reference pixels). */
export default function Chapter3AlienFaceEditor({
  params,
  onChange,
  title = "얼굴 파라미터",
  defaultFace,
  formatForSource,
  specs = CHAPTER3_ALIEN_FACE_PARAM_SPECS,
}: Props) {
  const [open, setOpen] = useState(true);

  const patch = (key: keyof Chapter3AlienFaceParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="chapter3-shape">
      <button
        type="button"
        className="chapter3-shape__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {title} {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="chapter3-shape__panel">
          <p className="chapter3-shape__hint">유리알 눈·작대기 입 위치·크기 (픽셀 기준). 변경 즉시 3D에 반영.</p>
          {specs.map((spec) => (
            <label key={spec.key} className="chapter3-shape__row">
              <span>
                {spec.label}
                <output>{params[spec.key].toFixed(spec.step < 1 ? 1 : 0)}</output>
              </span>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={params[spec.key]}
                onChange={(e) => patch(spec.key, Number(e.target.value))}
              />
            </label>
          ))}
          <div className="chapter3-shape__actions">
            <button type="button" onClick={() => onChange({ ...defaultFace })}>
              기본값
            </button>
            <button type="button" onClick={() => void navigator.clipboard.writeText(formatForSource(params))}>
              코드 복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
