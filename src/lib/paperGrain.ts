function hash(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Tileable value noise with `cells` lattice cells across the texture. */
function valueNoise(u: number, v: number, cells: number, seed: number) {
  const x = u * cells;
  const y = v * cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const wrap = (n: number) => ((n % cells) + cells) % cells;

  const a = hash(wrap(x0), wrap(y0), seed);
  const b = hash(wrap(x0 + 1), wrap(y0), seed);
  const c = hash(wrap(x0), wrap(y0 + 1), seed);
  const d = hash(wrap(x0 + 1), wrap(y0 + 1), seed);

  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/** Edge length (px) of one tile of the grain texture at 1:1 scale. */
export const PAPER_GRAIN_TILE_PX = 512;

export type PaperGrainField = {
  size: number;
  /** Grayscale 0–255, row-major, mean ~128. Tileable on both axes. */
  values: Uint8Array;
};

const fields = new Map<number, PaperGrainField>();

/** Raking light direction (towards the light, in the paper plane): from the upper left. */
const LIGHT_X = -0.7;
const LIGHT_Y = -0.7;

/**
 * Tileable paper relief, returned as a light/dark shading map (mean ~0.5).
 *
 * A smooth height field (soft cockle, mid-size bumps, gentle tooth, a few fibres) is lit by a
 * raking light, so the grain reads as real bumps on the surface instead of per-pixel noise
 * that looks like compression artefacts. Callers use `(value / 255 - 0.5)` as the modulation.
 */
export function getPaperGrainField(size = PAPER_GRAIN_TILE_PX): PaperGrainField {
  const cached = fields.get(size);
  if (cached) return cached;

  const height = new Float32Array(size * size);

  // Octave amplitudes are chosen so slope (amp * frequency) is strongest at mid scales.
  const octaves: Array<[cells: number, amp: number, seed: number]> = [
    [7, 1.5, 31],
    [18, 0.55, 32],
    [44, 0.16, 33],
    [100, 0.04, 34],
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      let h = 0;
      for (const [cells, amp, seed] of octaves) {
        h += valueNoise(u, v, cells, seed) * amp;
      }
      height[y * size + x] = h;
    }
  }

  // A few soft fibres standing slightly proud of the surface (wrapped for seamless tiling).
  const fibres = Math.round(size * 0.5);
  for (let i = 0; i < fibres; i += 1) {
    const angle = hash(i, 1, 21) * Math.PI * 2;
    const length = 10 + hash(i, 2, 22) * 22;
    const sign = hash(i, 3, 23) > 0.5 ? 1 : -1;
    let px = hash(i, 4, 24) * size;
    let py = hash(i, 5, 25) * size;

    for (let s = 0; s < length; s += 1) {
      const ix = ((Math.floor(px) % size) + size) % size;
      const iy = ((Math.floor(py) % size) + size) % size;
      height[iy * size + ix] += sign * 0.012;
      px += Math.cos(angle);
      py += Math.sin(angle);
    }
  }

  // Shade = slope of the surface along the light direction (central differences, wrapped).
  const shade = new Float32Array(size * size);
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)];
  let sum = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5;
      const value = -(dx * LIGHT_X + dy * LIGHT_Y);
      shade[y * size + x] = value;
      sum += value;
    }
  }
  const mean = sum / shade.length;

  let variance = 0;
  for (let i = 0; i < shade.length; i += 1) {
    const d = shade[i] - mean;
    variance += d * d;
  }
  const sigma = Math.sqrt(variance / shade.length) || 1;

  // 3 sigma spans the full 0..1 range, so the map stays soft and rarely clips.
  const bytes = new Uint8Array(size * size);
  for (let i = 0; i < shade.length; i += 1) {
    const normalized = 0.5 + ((shade[i] - mean) / (sigma * 3)) * 0.5;
    bytes[i] = Math.round(Math.min(Math.max(normalized, 0), 1) * 255);
  }

  const field = { size, values: bytes };
  fields.set(size, field);
  return field;
}
