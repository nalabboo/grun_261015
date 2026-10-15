"use client";

import { getKindLayout, type SceneMetrics } from "@/constants/sceneConfig";

type KindHitTargetProps = {
  worldScroll: number;
  metrics: SceneMetrics;
  active: boolean;
  onClick: () => void;
};

const HIT_PAD_RATIO = 0.12;

export default function KindHitTarget({
  worldScroll,
  metrics,
  active,
  onClick,
}: KindHitTargetProps) {
  if (!active || metrics.height <= 0) return null;

  const kind = getKindLayout(metrics);
  const kindScreenX = kind.worldX - worldScroll;
  const padX = kind.width * HIT_PAD_RATIO;
  const padY = kind.height * HIT_PAD_RATIO;

  return (
    <button
      type="button"
      aria-label="kind"
      className="world-landmark-hit"
      style={{
        width: kind.width + padX * 2,
        height: kind.height + padY * 2,
        bottom: kind.bottom - padY,
        transform: `translate(${kindScreenX - padX}px, 0)`,
      }}
      onClick={(event) => {
        if (event.detail > 1) return;
        event.stopPropagation();
        onClick();
      }}
    />
  );
}
