"use client";

import { useState } from "react";
import Chapter3AlienShapeEditor from "@/components/scene3/Chapter3AlienShapeEditor";
import {
  CHAPTER3_ALIEN3_DEFAULT_FACE,
  CHAPTER3_ALIEN3_FACE_PARAM_SPECS,
  CHAPTER3_ALIEN3_PARTS,
  formatAlien3FaceForSource,
  formatAlien3PartsForSource,
  type Chapter3Alien3FaceParams,
} from "@/constants/chapter3Alien3Config";
import type { Chapter3AlienPart } from "@/constants/chapter3AlienShape";

type Props = {
  face: Chapter3Alien3FaceParams;
  parts: Chapter3AlienPart[];
  onFaceChange: (next: Chapter3Alien3FaceParams) => void;
  onPartsChange: (next: Chapter3AlienPart[]) => void;
  rebuilding?: boolean;
};

/** 외계인3 — left stack: eyes + metaball shape. */
export default function Chapter3Alien3Editor({ face, parts, onFaceChange, onPartsChange, rebuilding }: Props) {
  const [faceOpen, setFaceOpen] = useState(true);

  return (
    <div className="chapter3-alien3-stack">
      <div className="chapter3-shape chapter3-shape--embedded">
        <button
          type="button"
          className="chapter3-shape__toggle"
          onClick={() => setFaceOpen((v) => !v)}
          aria-expanded={faceOpen}
        >
          외계인3 · 눈 {faceOpen ? "▾" : "▸"}
        </button>
        {faceOpen && (
          <div className="chapter3-shape__panel">
            <p className="chapter3-shape__hint">캔버스에서 외계인을 드래그해 위치를 옮길 수 있습니다.</p>
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
                눈 기본값
              </button>
              <button type="button" onClick={() => void navigator.clipboard.writeText(formatAlien3FaceForSource(face))}>
                눈 코드 복사
              </button>
            </div>
          </div>
        )}
      </div>
      <Chapter3AlienShapeEditor
        embedded
        title="외계인3 · 쉐입"
        parts={parts}
        onChange={onPartsChange}
        rebuilding={rebuilding}
        defaultParts={CHAPTER3_ALIEN3_PARTS}
        formatForSource={formatAlien3PartsForSource}
        cyMin={-220}
        includeRotation
      />
    </div>
  );
}
