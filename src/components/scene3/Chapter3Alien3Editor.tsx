"use client";

import { useState } from "react";
import {
  CHAPTER3_ALIEN3_DEFAULT_FACE,
  CHAPTER3_ALIEN3_DEFAULT_GLASS,
  CHAPTER3_ALIEN3_FACE_PARAM_SPECS,
  CHAPTER3_ALIEN3_GLASS_SPECS,
  formatAlien3FaceForSource,
  formatAlien3GlassForSource,
  type Chapter3Alien3FaceParams,
  type Chapter3Alien3GlassParams,
} from "@/constants/chapter3Alien3Config";

type Props = {
  glass: Chapter3Alien3GlassParams;
  face: Chapter3Alien3FaceParams;
  onGlassChange: (next: Chapter3Alien3GlassParams) => void;
  onFaceChange: (next: Chapter3Alien3FaceParams) => void;
};

/** 외계인3 — sketch silhouette body; tune glass + face only. */
export default function Chapter3Alien3Editor({ glass, face, onGlassChange, onFaceChange }: Props) {
  const [glassOpen, setGlassOpen] = useState(true);
  const [faceOpen, setFaceOpen] = useState(true);

  const patchGlass = (key: keyof Chapter3Alien3GlassParams, value: number) => {
    onGlassChange({ ...glass, [key]: value });
  };

  return (
    <div className="chapter3-alien3-stack">
      <div className="chapter3-shape chapter3-shape--embedded">
        <button
          type="button"
          className="chapter3-shape__toggle"
          onClick={() => setGlassOpen((v) => !v)}
          aria-expanded={glassOpen}
        >
          외계인3 · 유리 {glassOpen ? "▾" : "▸"}
        </button>
        {glassOpen && (
          <div className="chapter3-shape__panel">
            <p className="chapter3-shape__hint">몸은 스케치 실루엣 + 둥근 입체 유리(다른 외계인과 동일 MC). 유리만 조절.</p>
            {CHAPTER3_ALIEN3_GLASS_SPECS.map((spec) => (
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
              <button type="button" onClick={() => onGlassChange({ ...CHAPTER3_ALIEN3_DEFAULT_GLASS })}>
                유리 기본값
              </button>
              <button type="button" onClick={() => void navigator.clipboard.writeText(formatAlien3GlassForSource(glass))}>
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
          외계인3 · 얼굴 {faceOpen ? "▾" : "▸"}
        </button>
        {faceOpen && (
          <div className="chapter3-shape__panel">
            <p className="chapter3-shape__hint">타원 눈 + 웃는 입 (3D 유리알). 변경 즉시 반영.</p>
            {CHAPTER3_ALIEN3_FACE_PARAM_SPECS.map((spec) => (
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
              <button type="button" onClick={() => onFaceChange({ ...CHAPTER3_ALIEN3_DEFAULT_FACE })}>
                얼굴 기본값
              </button>
              <button type="button" onClick={() => void navigator.clipboard.writeText(formatAlien3FaceForSource(face))}>
                얼굴 코드 복사
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
