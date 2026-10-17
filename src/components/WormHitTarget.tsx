"use client";

import { getWormLayout, type SceneMetrics } from "@/constants/sceneConfig";

type WormHitTargetProps = {
  worldScroll: number;
  metrics: SceneMetrics;
  active: boolean;
  onClick: () => void;
};

const HIT_PAD_RATIO = 0.15;

export default function WormHitTarget({
  worldScroll,
  metrics,
  active,
  onClick,
}: WormHitTargetProps) {
  if (!active || metrics.height <= 0) return null;

  const worm = getWormLayout(metrics);
  const wormScreenX = worm.worldX - worldScroll;
  const padX = worm.width * HIT_PAD_RATIO;
  const padY = worm.height * HIT_PAD_RATIO;

  const handleActivate = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1) return;
    event.stopPropagation();
    onClick();
  };

  return (
    <button
      type="button"
      aria-label="worm"
      className="world-landmark-hit"
      style={{
        width: worm.width + padX * 2,
        height: worm.height + padY * 2,
        bottom: worm.bottom - padY,
        transform: `translate(${wormScreenX - padX}px, 0)`,
      }}
      onClick={handleActivate}
    />
  );
}
