"use client";

import {
  getMossOnSteinLayouts,
  getSteinLayout,
  type MossInstanceId,
  type MossPhases,
  type SceneMetrics,
} from "@/constants/sceneConfig";

type MossHitTargetsProps = {
  worldScroll: number;
  metrics: SceneMetrics;
  active: boolean;
  mossPhases: MossPhases;
  onMossClick: (id: MossInstanceId) => void;
};

const HIT_PAD_RATIO = 0.12;

export default function MossHitTargets({
  worldScroll,
  metrics,
  active,
  mossPhases,
  onMossClick,
}: MossHitTargetsProps) {
  if (!active || metrics.height <= 0) return null;

  const stein = getSteinLayout(metrics);
  const steinScreenX = stein.worldX - worldScroll;
  const mossLayers = getMossOnSteinLayouts(metrics);

  return (
    <>
      {mossLayers.map((moss) => {
        if (mossPhases[moss.id] !== "b") return null;

        const padX = moss.width * HIT_PAD_RATIO;
        const padY = moss.height * HIT_PAD_RATIO;

        return (
          <button
            key={moss.id}
            type="button"
            aria-label={moss.id}
            className="world-landmark-hit"
            style={{
              width: moss.width + padX * 2,
              height: moss.height + padY * 2,
              bottom: moss.bottom - padY,
              transform: `translate(${steinScreenX + moss.left - padX}px, 0)`,
            }}
            onClick={(event) => {
              if (event.detail > 1) return;
              event.stopPropagation();
              onMossClick(moss.id);
            }}
          />
        );
      })}
    </>
  );
}
