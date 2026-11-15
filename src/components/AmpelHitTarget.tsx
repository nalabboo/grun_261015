"use client";

import { getAmpelLayout, type SceneMetrics } from "@/constants/sceneConfig";

type AmpelHitTargetProps = {
  worldScroll: number;
  metrics: SceneMetrics;
  active: boolean;
  onClick: () => void;
};

const HIT_PAD_RATIO = 0.12;

export default function AmpelHitTarget({
  worldScroll,
  metrics,
  active,
  onClick,
}: AmpelHitTargetProps) {
  if (!active || metrics.height <= 0) return null;

  const ampel = getAmpelLayout(metrics);
  const ampelScreenX = ampel.worldX - worldScroll;
  const padX = ampel.width * HIT_PAD_RATIO;
  const padY = ampel.height * HIT_PAD_RATIO;

  return (
    <button
      type="button"
      aria-label="ampel"
      className="world-landmark-hit"
      style={{
        width: ampel.width + padX * 2,
        height: ampel.height + padY * 2,
        bottom: ampel.bottom - padY,
        transform: `translate(${ampelScreenX - padX}px, 0)`,
      }}
      onClick={(event) => {
        if (event.detail > 1) return;
        event.stopPropagation();
        onClick();
      }}
    />
  );
}
