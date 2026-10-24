import { chapter2AssetUrl } from "@/constants/chapter2Config";

export const CHAPTER2_BUBBLE_COUNT = 36;

const BUBBLE_ASSET = {
  file: "blau objekt/b_bubble 2.png",
  width: 597,
  height: 602,
} as const;

export type Chapter2BubbleInstance = {
  id: string;
  src: string;
  width: number;
  height: number;
  heightVh: number;
  xNorm: number;
  yNorm: number;
  vx: number;
  vy: number;
  spinDegPerSec: number;
  opacity: number;
  zIndex: number;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function buildBubbleInstances(): Chapter2BubbleInstance[] {
  return Array.from({ length: CHAPTER2_BUBBLE_COUNT }, (_, index) => {
    const seed = 88_000 + index * 791;
    const rand = seededRandom(seed);
    const heightVh = 0.028 + rand() * 0.095;
    const xNorm = 0.08 + rand() * 0.84;
    const yNorm = 0.12 + rand() * 0.76;
    const speed = 10 + rand() * 22;
    const angle = rand() * Math.PI * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const spinDegPerSec = (rand() > 0.5 ? 1 : -1) * (2 + rand() * 7);
    const opacity = 0.32 + rand() * 0.48;

    return {
      id: `bubble_${index}`,
      src: chapter2AssetUrl(BUBBLE_ASSET.file),
      width: BUBBLE_ASSET.width,
      height: BUBBLE_ASSET.height,
      heightVh,
      xNorm,
      yNorm,
      vx,
      vy,
      spinDegPerSec,
      opacity,
      zIndex: 4 + (index % 4),
    };
  });
}

export const CHAPTER2_BUBBLE_INSTANCES = buildBubbleInstances();
