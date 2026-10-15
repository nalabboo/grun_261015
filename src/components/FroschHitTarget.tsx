"use client";

import { getFroschLayout, type SceneMetrics } from "@/constants/sceneConfig";

type FroschHitTargetProps = {
  worldScroll: number;
  metrics: SceneMetrics;
  active: boolean;
  onClick: () => void;
};

const HIT_PAD_RATIO = 0.15;

export default function FroschHitTarget({
  worldScroll,
  metrics,
  active,
  onClick,
}: FroschHitTargetProps) {
  if (!active || metrics.height <= 0) return null;

  const frosch = getFroschLayout(metrics);
  const froschScreenX = frosch.worldX - worldScroll;
  const padX = frosch.width * HIT_PAD_RATIO;
  const padY = frosch.height * HIT_PAD_RATIO;

  const handleActivate = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1) return;
    event.stopPropagation();
    onClick();
  };

  return (
    <button
      type="button"
      aria-label="frosch"
      className="world-landmark-hit"
      style={{
        width: frosch.width + padX * 2,
        height: frosch.height + padY * 2,
        bottom: frosch.bottom - padY,
        transform: `translate(${froschScreenX - padX}px, 0)`,
      }}
      onClick={handleActivate}
    />
  );
}
