import * as THREE from "three";

/** Deterministic integer hash → [0, 1). */
function hash(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Tileable value noise: `cells` lattice cells across the whole texture. */
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

type PaperNormalOptions = {
  size?: number;
  /** Bigger = deeper bumps. Keep modest — the shader adds its own thin shading. */
  strength?: number;
};

/**
 * Procedural tileable normal map that mimics paper tooth with crayon grain
 * (tangent space, +Z up, OpenGL green-up convention).
 */
export function createPaperNormalMap({ size = 512, strength = 2.2 }: PaperNormalOptions = {}) {
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      // Fine paper tooth + coarser crayon deposits + very soft cloudiness.
      const tooth = hash(x, y, 1);
      const grain = valueNoise(u, v, size / 4, 2);
      const crayon = valueNoise(u, v, 48, 3);
      const cloud = valueNoise(u, v, 10, 4);

      height[y * size + x] = tooth * 0.5 + grain * 0.7 + crayon * 0.6 + cloud * 0.25;
    }
  }

  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;

      data[i] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  return texture;
}
