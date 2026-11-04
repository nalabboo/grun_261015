import { cloneAlienParts, type Chapter3AlienPart } from "@/constants/chapter3AlienShape";

/** Eyes only — elliptical beads, no mouth. */
export type Chapter3Alien2FaceParams = {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
  eyeRadius: number;
  eyeScaleX: number;
  eyeScaleY: number;
};

/** Tunable clear-glass knobs for 외계인2 only. */
export type Chapter3Alien2GlassParams = {
  ior: number;
  wobble: number;
  dispersion: number;
};

export const CHAPTER3_ALIEN2_EDITOR = false;
export const CHAPTER3_ALIEN2_GLASS_STORAGE_KEY = "chapter3-alien2-glass";
export const CHAPTER3_ALIEN2_SHAPE_STORAGE_KEY = "chapter3-alien2-shape";

export const CHAPTER3_ALIEN2_DEFAULT_GLASS: Chapter3Alien2GlassParams = {
  ior: 1.83,
  wobble: 0,
  dispersion: 3.65,
};

export const CHAPTER3_ALIEN2_GLASS_SPECS: {
  key: keyof Chapter3Alien2GlassParams;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "ior", label: "굴절률 (IOR)", min: 1.0, max: 2.2, step: 0.01 },
  { key: "wobble", label: "일렁임", min: 0, max: 0.12, step: 0.002 },
  { key: "dispersion", label: "무지개 번짐", min: 0, max: 4, step: 0.05 },
];

/**
 * 외계인2 — front-view pear body, two legs, asymmetric antlers. Same pixel frame as 외계인1.
 */
export const CHAPTER3_ALIEN2_PARTS: Chapter3AlienPart[] = [
  { name: "머리", cx: 496, cy: 25, cz: 0, rx: 166, ry: 114, rz: 142, blend: 90 },
  { name: "윗몸", cx: 498, cy: 196, cz: 0, rx: 172, ry: 142, rz: 103, blend: 100 },
  { name: "아랫몸", cx: 509, cy: 341, cz: 79, rx: 221, ry: 204.5, rz: 160, blend: 100 },
  { name: "팔 왼", cx: 319, cy: 348, cz: 105, rx: 89, ry: 72, rz: 48, blend: 25, rotX: -18, rotY: -25, rotZ: -16 },
  { name: "팔 오", cx: 706, cy: 342, cz: 12, rx: 97, ry: 62, rz: 77, blend: 44, rotX: 8, rotY: 18, rotZ: 32 },
  { name: "다리 왼", cx: 380, cy: 500, cz: 0, rx: 103, ry: 134, rz: 160, blend: 90 },
  { name: "다리 오", cx: 636, cy: 493, cz: 0, rx: 94, ry: 144, rz: 160, blend: 89 },
  { name: "뿔 왼", cx: 404, cy: -150, cz: 0, rx: 32, ry: 100, rz: 72, blend: 30 },
  { name: "뿔 왼 가지", cx: 358, cy: -168, cz: 21, rx: 32, ry: 38, rz: 48, blend: 32 },
  { name: "뿔 오 아래", cx: 566, cy: -118, cz: 0, rx: 32, ry: 62, rz: 52, blend: 30 },
  { name: "뿔 오 위", cx: 598, cy: -198, cz: 0, rx: 30, ry: 54, rz: 58, blend: 30 },
  { name: "뿔 오 가지", cx: 646, cy: -150, cz: 0, rx: 52, ry: 28, rz: 60, blend: 44 },
  { name: "파트 13", cx: 377, cy: 465, cz: -118, rx: 145, ry: 50, rz: 120, blend: 90, rotX: 1, rotY: 0, rotZ: 0 },
];

export const CHAPTER3_ALIEN2_DEFAULT_FACE: Chapter3Alien2FaceParams = {
  eyeLeftX: 449,
  eyeLeftY: 21,
  eyeRightX: 562,
  eyeRightY: 17,
  eyeRadius: 16.5,
  eyeScaleX: 1.14,
  eyeScaleY: 0.63,
};

export const CHAPTER3_ALIEN2_FACE_PARAM_SPECS: {
  key: keyof Chapter3Alien2FaceParams;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "eyeLeftX", label: "눈 왼 X", min: 340, max: 500, step: 1 },
  { key: "eyeLeftY", label: "눈 왼 Y", min: -60, max: 140, step: 1 },
  { key: "eyeRightX", label: "눈 오 X", min: 490, max: 650, step: 1 },
  { key: "eyeRightY", label: "눈 오 Y", min: -60, max: 140, step: 1 },
  { key: "eyeRadius", label: "눈 크기", min: 4, max: 30, step: 0.5 },
  { key: "eyeScaleX", label: "눈 가로", min: 0.6, max: 2.2, step: 0.02 },
  { key: "eyeScaleY", label: "눈 세로", min: 0.35, max: 1.4, step: 0.02 },
];

export const CHAPTER3_ALIEN2_FACE_STORAGE_KEY = "chapter3-alien2-face";

/** Body width in world units (외계인1 is `CHAPTER3_ALIEN_WIDTH`). */
export const CHAPTER3_ALIEN2_WIDTH = 1.45;
/** World X of 외계인2 (negative = left of 외계인1 at 0). */
export const CHAPTER3_ALIEN2_POSITION_X = -2.6;
/** Lands a beat after 외계인1. */
export const CHAPTER3_ALIEN2_DELAY_MS = 950;
export const CHAPTER3_ALIEN2_TURN = 0.18;
export const CHAPTER3_ALIEN2_SWAY = 0.06;

export function loadAlien2FaceFromStorage(): Chapter3Alien2FaceParams {
  if (typeof window === "undefined") return { ...CHAPTER3_ALIEN2_DEFAULT_FACE };
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN2_FACE_STORAGE_KEY) ?? "null");
    return { ...CHAPTER3_ALIEN2_DEFAULT_FACE, ...raw };
  } catch {
    return { ...CHAPTER3_ALIEN2_DEFAULT_FACE };
  }
}

export function saveAlien2FaceToStorage(params: Chapter3Alien2FaceParams) {
  window.localStorage.setItem(CHAPTER3_ALIEN2_FACE_STORAGE_KEY, JSON.stringify(params));
}

export function loadAlien2PartsFromStorage(): Chapter3AlienPart[] {
  if (typeof window === "undefined") return cloneAlienParts(CHAPTER3_ALIEN2_PARTS);
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN2_SHAPE_STORAGE_KEY) ?? "null");
    if (!Array.isArray(raw) || raw.length === 0) return cloneAlienParts(CHAPTER3_ALIEN2_PARTS);
    return raw.map((p: Chapter3AlienPart, i: number) => {
      const fallback = CHAPTER3_ALIEN2_PARTS[i] ?? CHAPTER3_ALIEN2_PARTS[0];
      return {
        ...fallback,
        ...p,
        name: String(p.name ?? fallback.name ?? `파트 ${i + 1}`),
        rotX: p.rotX ?? fallback.rotX ?? 0,
        rotY: p.rotY ?? fallback.rotY ?? 0,
        rotZ: p.rotZ ?? fallback.rotZ ?? 0,
      };
    });
  } catch {
    return cloneAlienParts(CHAPTER3_ALIEN2_PARTS);
  }
}

export function saveAlien2PartsToStorage(parts: Chapter3AlienPart[]) {
  window.localStorage.setItem(CHAPTER3_ALIEN2_SHAPE_STORAGE_KEY, JSON.stringify(parts));
}

export function loadAlien2GlassFromStorage(): Chapter3Alien2GlassParams {
  if (typeof window === "undefined") return { ...CHAPTER3_ALIEN2_DEFAULT_GLASS };
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN2_GLASS_STORAGE_KEY) ?? "null");
    return { ...CHAPTER3_ALIEN2_DEFAULT_GLASS, ...raw };
  } catch {
    return { ...CHAPTER3_ALIEN2_DEFAULT_GLASS };
  }
}

export function saveAlien2GlassToStorage(params: Chapter3Alien2GlassParams) {
  window.localStorage.setItem(CHAPTER3_ALIEN2_GLASS_STORAGE_KEY, JSON.stringify(params));
}

function formatPartLine(p: Chapter3AlienPart): string {
  const rotX = p.rotX ?? 0;
  const rotY = p.rotY ?? 0;
  const rotZ = p.rotZ ?? 0;
  const rot =
    rotX !== 0 || rotY !== 0 || rotZ !== 0
      ? `, rotX: ${rotX}, rotY: ${rotY}, rotZ: ${rotZ}`
      : "";
  return `  { name: ${JSON.stringify(p.name)}, cx: ${p.cx}, cy: ${p.cy}, cz: ${p.cz}, rx: ${p.rx}, ry: ${p.ry}, rz: ${p.rz}, blend: ${p.blend}${rot} },`;
}

export function formatAlien2PartsForSource(parts: Chapter3AlienPart[]): string {
  return `export const CHAPTER3_ALIEN2_PARTS: Chapter3AlienPart[] = [\n${parts.map(formatPartLine).join("\n")}\n];`;
}

export function formatAlien2GlassForSource(params: Chapter3Alien2GlassParams): string {
  return `export const CHAPTER3_ALIEN2_DEFAULT_GLASS: Chapter3Alien2GlassParams = {\n  ior: ${params.ior},\n  wobble: ${params.wobble},\n  dispersion: ${params.dispersion},\n};`;
}

/** Paste into `CHAPTER3_ALIEN2_DEFAULT_FACE` after tuning. */
export function formatAlien2FaceForSource(params: Chapter3Alien2FaceParams): string {
  const body = (Object.keys(CHAPTER3_ALIEN2_DEFAULT_FACE) as (keyof Chapter3Alien2FaceParams)[])
    .map((k) => `  ${k}: ${params[k]},`)
    .join("\n");
  return `export const CHAPTER3_ALIEN2_DEFAULT_FACE: Chapter3Alien2FaceParams = {\n${body}\n};`;
}
