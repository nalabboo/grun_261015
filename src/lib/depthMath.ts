export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

/** Frame-rate independent exponential smoothing. */
export function damp(current: number, target: number, rate: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}
