"use client";

import { useState } from "react";
import Chapter3AlienShapeEditor from "@/components/scene3/Chapter3AlienShapeEditor";
import {
  CHAPTER3_ALIEN2_DEFAULT_FACE,
  CHAPTER3_ALIEN2_DEFAULT_GLASS,
  CHAPTER3_ALIEN2_FACE_PARAM_SPECS,
  CHAPTER3_ALIEN2_GLASS_SPECS,
  CHAPTER3_ALIEN2_PARTS,
  formatAlien2FaceForSource,
  formatAlien2GlassForSource,
  formatAlien2PartsForSource,
  type Chapter3Alien2FaceParams,
  type Chapter3Alien2GlassParams,
} from "@/constants/chapter3Alien2Config";
import type { Chapter3AlienPart } from "@/constants/chapter3AlienShape";

type Props = {
  glass: Chapter3Alien2GlassParams;
  face: Chapter3Alien2FaceParams;
  parts: Chapter3AlienPart[];
  onGlassChange: (next: Chapter3Alien2GlassParams) => void;
  onFaceChange: (next: Chapter3Alien2FaceParams) => void;
  onPartsChange: (next: Chapter3AlienPart[]) => void;
  rebuilding?: boolean;
};

/** 외계인2 only — glass IOR / wobble / dispersion + metaball shape. */
export default function Chapter3Alien2Editor({
  glass,
  face,
  parts,
  onGlassChange,
  onFaceChange,
  onPartsChange,
  rebuilding,
}: Props) {
  const [glassOpen, setGlassOpen] = useState(true);
  const [faceOpen, setFaceOpen] = useState(true);

  const patchGlass = (key: keyof Chapter3Alien2GlassParams, value: number) => {
    onGlassChange({ ...glass, [key]: value });
  };

  return (
    <div className="chapter3-alien2-stack">
      <div className="chapter3-shape chapter3-shape--embedded">
        <button
          type="button"
          className="chapter3-shape__toggle"
          onClick={() => setGlassOpen((v) => !v)}
          aria-expanded={glassOpen}
        >
          외계인2 · 유리 {glassOpen ? "▾" : "▸"}
        </button>
        {glassOpen && (
          <div className="chapter3-shape__panel">
            <p className="chapter3-shape__hint">외계인2 재질만 조절합니다. 외계인1은 고정입니다.</p>
            {CHAPTER3_ALIEN2_GLASS_SPECS.map((spec) => (
              <label key={spec.key} className="chapter3-shape__row">
                <span>
                  {spec.label}
                  <output>{glass[spec.key].toFixed(spec.step < 0.01 ? 3 : spec.step < 1 ? 2 : 0)}</output>
                </span>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={glass[spec.key]}
                  onChange={(e) => patchGlass(spec.key, Number(e.target.value))}
                />
              </label>
            ))}
            <div className="chapter3-shape__actions">
              <button type="button" onClick={() => onGlassChange({ ...CHAPTER3_ALIEN2_DEFAULT_GLASS })}>
                유리 기본값
              </button>
              <button type="button" onClick={() => void navigator.clipboard.writeText(formatAlien2GlassForSource(glass))}>
                유리 코드 복사
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="chapter3-shape chapter3-shape--embedded">
        <button
          type="button"
          className="chapter3-shape__toggle"
          onClick={() => setFaceOpen((v) => !v)}
          aria-expanded={faceOpen}
        >
          외계인2 · 눈 {faceOpen ? "▾" : "▸"}
        </button>
        {faceOpen && (
          <div className="chapter3-shape__panel">
            <p className="chapter3-shape__hint">타원형 유리알 눈 (입 없음). 변경 즉시 3D에 반영.</p>
            {CHAPTER3_ALIEN2_FACE_PARAM_SPECS.map((spec) => (
              <label key={spec.key} className="chapter3-shape__row">
                <span>
                  {spec.label}
                  <output>{face[spec.key].toFixed(spec.step < 1 ? 2 : 0)}</output>
                </span>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={face[spec.key]}
                  onChange={(e) => onFaceChange({ ...face, [spec.key]: Number(e.target.value) })}
                />
              </label>
            ))}
            <div className="chapter3-shape__actions">
              <button type="button" onClick={() => onFaceChange({ ...CHAPTER3_ALIEN2_DEFAULT_FACE })}>
                눈 기본값
              </button>
              <button type="button" onClick={() => void navigator.clipboard.writeText(formatAlien2FaceForSource(face))}>
                눈 코드 복사
              </button>
            </div>
          </div>
        )}
      </div>
      <Chapter3AlienShapeEditor
        embedded
        title="외계인2 · 쉐입"
        parts={parts}
        onChange={onPartsChange}
        rebuilding={rebuilding}
        defaultParts={CHAPTER3_ALIEN2_PARTS}
        formatForSource={formatAlien2PartsForSource}
        cyMin={-220}
        includeRotation
      />
    </div>
  );
}
