/** Glass pebbles, grass tufts, and corals around the inside-planet aliens. */

export const CHAPTER3_DECOR_STORAGE_KEY = "chapter3-inside-decor";

export const CHAPTER3_DECOR_EDITOR = true;

export type Chapter3DecorRock = {
  x: number;
  z: number;
  /** World size of the longest axis. */
  size: number;
  /** Flattening: 1 = round, lower = pancake. */
  flatten: number;
  rotY: number;
  seed: number;
};

export type Chapter3DecorTuft = {
  x: number;
  z: number;
  blades: number;
  height: number;
  spread: number;
  seed: number;
};

export type Chapter3DecorCoral = {
  x: number;
  z: number;
  height: number;
  rotY: number;
  seed: number;
};

export const CHAPTER3_DECOR_ROCKS: Chapter3DecorRock[] = [
  { x: -3.6, z: 1.55, size: 0.58, flatten: 0.69, rotY: -0.14, seed: 11 },
  { x: 1.7, z: 1.55, size: 0.34, flatten: 0.57, rotY: -2.64, seed: 23 },
  { x: -3.2, z: 0.55, size: 0.32, flatten: 0.7, rotY: -2.04, seed: 37 },
  { x: 3.1, z: 0.72, size: 0.48, flatten: 0.5, rotY: 1.16, seed: 41 },
  { x: 0.72, z: -0.82, size: 0.26, flatten: 0.53, rotY: 2.1, seed: 53 },
  { x: -0.2, z: 1.25, size: 0.08, flatten: 0.95, rotY: 0.11, seed: 67 },
  { x: 2.15, z: -0.58, size: 0.31, flatten: 0.64, rotY: 0.85, seed: 71 },
  { x: -2.85, z: -0.48, size: 0.24, flatten: 0.6, rotY: 1.7, seed: 83 },
  { x: 3.95, z: -0.22, size: 0.18, flatten: 0.75, rotY: -0.3, seed: 97 },
  { x: -3.9, z: -0.15, size: 0.22, flatten: 0.52, rotY: 0.5, seed: 101 },
  { x: 0.18, z: 1.42, size: 0.16, flatten: 0.8, rotY: 2.4, seed: 113 },
  { x: -1.15, z: -0.7, size: 0.3, flatten: 0.48, rotY: -1.9, seed: 127 },
];

export const CHAPTER3_DECOR_TUFTS: Chapter3DecorTuft[] = [
  { x: -2.1, z: 1.55, blades: 9, height: 0.55, spread: 0.22, seed: 3 },
  { x: -2.75, z: 1.05, blades: 7, height: 0.55, spread: 0.09, seed: 9 },
  { x: -0.9, z: 1.05, blades: 7, height: 0.39, spread: 0.1, seed: 15 },
  { x: 1.05, z: 1.22, blades: 9, height: 0.55, spread: 0.12, seed: 21 },
  { x: 2.55, z: 1.08, blades: 7, height: 0.3, spread: 0.1, seed: 27 },
  { x: 3.85, z: 0.95, blades: 6, height: 0.24, spread: 0.08, seed: 33 },
  { x: -2.95, z: -0.78, blades: 5, height: 0.22, spread: 0.08, seed: 39 },
  { x: 0.42, z: -0.95, blades: 6, height: 0.2, spread: 0.07, seed: 45 },
  { x: 2.75, z: -0.72, blades: 8, height: 0.29, spread: 0.1, seed: 51 },
  { x: -1.55, z: -0.88, blades: 5, height: 0.18, spread: 0.07, seed: 57 },
];

export const CHAPTER3_DECOR_CORALS: Chapter3DecorCoral[] = [
  { x: -1.7, z: -1.5, height: 2.6, rotY: 2.81, seed: 8 },
  { x: 1.95, z: -1.5, height: 1.65, rotY: 1.21, seed: 19 },
  { x: -1.6, z: 0.8, height: 0.95, rotY: 0.66, seed: 31 },
  { x: 3.75, z: -0.65, height: 2.6, rotY: -3.14, seed: 47 },
  { x: -4, z: 0, height: 2.15, rotY: 2.96, seed: 61 },
];

export type Chapter3InsideDecorConfig = {
  rocks: Chapter3DecorRock[];
  tufts: Chapter3DecorTuft[];
  corals: Chapter3DecorCoral[];
};

export const CHAPTER3_DECOR_DEFAULT: Chapter3InsideDecorConfig = {
  rocks: CHAPTER3_DECOR_ROCKS.map((r) => ({ ...r })),
  tufts: CHAPTER3_DECOR_TUFTS.map((t) => ({ ...t })),
  corals: CHAPTER3_DECOR_CORALS.map((c) => ({ ...c })),
};

function cloneDecor(c: Chapter3InsideDecorConfig): Chapter3InsideDecorConfig {
  return {
    rocks: c.rocks.map((r) => ({ ...r })),
    tufts: c.tufts.map((t) => ({ ...t })),
    corals: c.corals.map((co) => ({ ...co })),
  };
}

export function loadInsideDecorFromStorage(): Chapter3InsideDecorConfig {
  if (typeof window === "undefined") return cloneDecor(CHAPTER3_DECOR_DEFAULT);
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_DECOR_STORAGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return cloneDecor(CHAPTER3_DECOR_DEFAULT);

    const rocksStored = Array.isArray(raw.rocks) ? (raw.rocks as Chapter3DecorRock[]) : null;
    const tuftsStored = Array.isArray(raw.tufts) ? (raw.tufts as Chapter3DecorTuft[]) : null;
    const coralsStored = Array.isArray(raw.corals) ? (raw.corals as Chapter3DecorCoral[]) : null;

    const rocks = CHAPTER3_DECOR_DEFAULT.rocks.map((fallback, i) => {
      const r = rocksStored?.[i];
      if (!r) return { ...fallback };
      return { ...fallback, ...r, seed: fallback.seed };
    });
    const tufts = CHAPTER3_DECOR_DEFAULT.tufts.map((fallback, i) => {
      const t = tuftsStored?.[i];
      if (!t) return { ...fallback };
      return {
        ...fallback,
        ...t,
        seed: fallback.seed,
        blades: Math.round(t.blades ?? fallback.blades),
      };
    });
    const corals = CHAPTER3_DECOR_DEFAULT.corals.map((fallback, i) => {
      const c = coralsStored?.[i];
      if (!c) return { ...fallback };
      return { ...fallback, ...c, seed: fallback.seed };
    });

    const result = { rocks, tufts, corals };
    const stale =
      (rocksStored?.length ?? 0) < rocks.length ||
      (tuftsStored?.length ?? 0) < tufts.length ||
      (coralsStored?.length ?? 0) < corals.length;
    if (stale) saveInsideDecorToStorage(result);
    return result;
  } catch {
    return cloneDecor(CHAPTER3_DECOR_DEFAULT);
  }
}

export function saveInsideDecorToStorage(config: Chapter3InsideDecorConfig) {
  window.localStorage.setItem(CHAPTER3_DECOR_STORAGE_KEY, JSON.stringify(config));
}

function rockLine(r: Chapter3DecorRock) {
  return `  { x: ${r.x}, z: ${r.z}, size: ${r.size}, flatten: ${r.flatten}, rotY: ${r.rotY}, seed: ${r.seed} },`;
}
function tuftLine(t: Chapter3DecorTuft) {
  return `  { x: ${t.x}, z: ${t.z}, blades: ${t.blades}, height: ${t.height}, spread: ${t.spread}, seed: ${t.seed} },`;
}
function coralLine(c: Chapter3DecorCoral) {
  return `  { x: ${c.x}, z: ${c.z}, height: ${c.height}, rotY: ${c.rotY}, seed: ${c.seed} },`;
}

export function formatInsideDecorForSource(config: Chapter3InsideDecorConfig): string {
  return [
    `export const CHAPTER3_DECOR_ROCKS: Chapter3DecorRock[] = [\n${config.rocks.map(rockLine).join("\n")}\n];`,
    "",
    `export const CHAPTER3_DECOR_TUFTS: Chapter3DecorTuft[] = [\n${config.tufts.map(tuftLine).join("\n")}\n];`,
    "",
    `export const CHAPTER3_DECOR_CORALS: Chapter3DecorCoral[] = [\n${config.corals.map(coralLine).join("\n")}\n];`,
  ].join("\n");
}
