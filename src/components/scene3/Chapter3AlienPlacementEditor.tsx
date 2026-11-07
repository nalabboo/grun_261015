"use client";

import { useState } from "react";
import {
  CHAPTER3_ALIEN_DEFAULT_PLACEMENTS,
  CHAPTER3_ALIEN_PLACEMENT_SPECS,
  type Chapter3AlienPlacements,
  type Chapter3AlienPlacement,
} from "@/constants/chapter3AlienPlacementConfig";

type AlienId = keyof Chapter3AlienPlacements;

const ALIEN_LABELS: Record<AlienId, string> = {
  alien1: "외계인1",
  alien2: "외계인2",
  alien3: "외계인3",
};

type Props = {
  placements: Chapter3AlienPlacements;
  onChange: (next: Chapter3AlienPlacements) => void;
  formatForSource: (placements: Chapter3AlienPlacements) => string;
};

function AlienPlacementBlock({
  id,
  placement,
  open,
  onToggle,
  onPatch,
}: {
  id: AlienId;
  placement: Chapter3AlienPlacement;
  open: boolean;
  onToggle: () => void;
  onPatch: (key: keyof Chapter3AlienPlacement, value: number) => void;
}) {
  return (
    <div className="chapter3-shape chapter3-shape--embedded">
      <button type="button" className="chapter3-shape__toggle" onClick={onToggle} aria-expanded={open}>
        {ALIEN_LABELS[id]} · 위치/크기 {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="chapter3-shape__panel">
          {CHAPTER3_ALIEN_PLACEMENT_SPECS.map((spec) => (
            <label key={spec.key} className="chapter3-shape__row">
              <span>
                {spec.label}
                <output>{placement[spec.key].toFixed(spec.step < 0.1 ? 2 : 2)}</output>
              </span>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={placement[spec.key]}
                onChange={(e) => onPatch(spec.key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sliders for each alien's world X/Y position and body width. */
export default function Chapter3AlienPlacementEditor({ placements, onChange, formatForSource }: Props) {
  const [openRoot, setOpenRoot] = useState(true);
  const [openAlien, setOpenAlien] = useState<Record<AlienId, boolean>>({
    alien1: true,
    alien2: false,
    alien3: false,
  });

  const patchAlien = (id: AlienId, key: keyof Chapter3AlienPlacement, value: number) => {
    onChange({
      ...placements,
      [id]: { ...placements[id], [key]: value },
    });
  };

  return (
    <div className="chapter3-shape">
      <button
        type="button"
        className="chapter3-shape__toggle"
        onClick={() => setOpenRoot((v) => !v)}
        aria-expanded={openRoot}
      >
        외계인 배치 {openRoot ? "▾" : "▸"}
      </button>
      {openRoot && (
        <div className="chapter3-shape__panel">
          <p className="chapter3-shape__hint">씬에서 드래그로 X 이동 가능. 슬라이더는 즉시 반영·저장됩니다.</p>
          {(Object.keys(ALIEN_LABELS) as AlienId[]).map((id) => (
            <AlienPlacementBlock
              key={id}
              id={id}
              placement={placements[id]}
              open={openAlien[id]}
              onToggle={() => setOpenAlien((s) => ({ ...s, [id]: !s[id] }))}
              onPatch={(key, value) => patchAlien(id, key, value)}
            />
          ))}
          <div className="chapter3-shape__actions">
            <button type="button" onClick={() => onChange({ ...CHAPTER3_ALIEN_DEFAULT_PLACEMENTS })}>
              기본값
            </button>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(formatForSource(placements))}
            >
              코드 복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
