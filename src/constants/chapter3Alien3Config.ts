import { cloneAlienParts, type Chapter3AlienPart } from "@/constants/chapter3AlienShape";

/** Elliptical eyes only (no mouth). */
export type Chapter3Alien3FaceParams = {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
  eyeRadius: number;
  eyeScaleX: number;
  eyeScaleY: number;
};

export type Chapter3Alien3GlassParams = {
  ior: number;
  wobble: number;
  dispersion: number;
};

export const CHAPTER3_ALIEN3_EDITOR = false;
export const CHAPTER3_ALIEN3_FACE_STORAGE_KEY = "chapter3-alien3-face";
export const CHAPTER3_ALIEN3_SHAPE_STORAGE_KEY = "chapter3-alien3-shape";

/** Metaball body (same pipeline as 외계인1·2). */
export const CHAPTER3_ALIEN3_PARTS: Chapter3AlienPart[] = [
  { name: "몸통", cx: 488, cy: 318, cz: 0, rx: 198, ry: 168, rz: 88, blend: 100 },
  { name: "배", cx: 486, cy: 353, cz: 0, rx: 260, ry: 195, rz: 92, blend: 96 },
  { name: "윗가슴", cx: 487.99999999999994, cy: 222.73684210526312, cz: 0, rx: 158, ry: 118, rz: 82, blend: 92 },
  { name: "팔 왼", cx: 269.0526315789474, cy: 258.52631578947364, cz: 8, rx: 58, ry: 98, rz: 52, blend: 68, rotX: -28, rotY: -12, rotZ: -42 },
  { name: "손 왼", cx: 252.21052631578945, cy: 186.94736842105266, cz: 4, rx: 48, ry: 52, rz: 48, blend: 58, rotX: -18, rotY: 0, rotZ: -24 },
  { name: "팔 오", cx: 712.2105263157893, cy: 279.57894736842104, cz: 8, rx: 58, ry: 98, rz: 52, blend: 71, rotX: -16, rotY: 12, rotZ: 42 },
  { name: "손 오", cx: 739.5789473684209, cy: 186.9473684210526, cz: 4, rx: 48, ry: 52, rz: 48, blend: 58, rotX: -18, rotY: 0, rotZ: 24 },
  { name: "파트 8", cx: 697, cy: 500, cz: 55, rx: 48, ry: 50, rz: 87, blend: 82 },
  { name: "파트 9", cx: 272.10526315789474, cy: 470.52631578947376, cz: 36, rx: 89, ry: 80, rz: 97, blend: 40 },
];

/** Fixed glass — no tuning UI. */
export const CHAPTER3_ALIEN3_DEFAULT_GLASS: Chapter3Alien3GlassParams = {
  ior: 2.2,
  wobble: 0.014,
  dispersion: 2.1,
};

export const CHAPTER3_ALIEN3_DEFAULT_FACE: Chapter3Alien3FaceParams = {
  eyeLeftX: 408,
  eyeLeftY: 192,
  eyeRightX: 541,
  eyeRightY: 192,
  eyeRadius: 20.5,
  eyeScaleX: 1.04,
  eyeScaleY: 0.71,
};

export const CHAPTER3_ALIEN3_FACE_PARAM_SPECS: {
  key: keyof Chapter3Alien3FaceParams;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "eyeLeftX", label: "눈 왼 X", min: 340, max: 520, step: 1 },
  { key: "eyeLeftY", label: "눈 왼 Y", min: 120, max: 340, step: 1 },
  { key: "eyeRightX", label: "눈 오 X", min: 460, max: 640, step: 1 },
  { key: "eyeRightY", label: "눈 오 Y", min: 120, max: 340, step: 1 },
  { key: "eyeRadius", label: "눈 크기", min: 4, max: 22, step: 0.5 },
  { key: "eyeScaleX", label: "눈 가로", min: 0.6, max: 2.2, step: 0.02 },
  { key: "eyeScaleY", label: "눈 세로", min: 0.35, max: 1.4, step: 0.02 },
];

export const CHAPTER3_ALIEN3_WIDTH = 1.55;
export const CHAPTER3_ALIEN3_POSITION_X = 2.35;
export const CHAPTER3_ALIEN3_DELAY_MS = 820;
export const CHAPTER3_ALIEN3_TURN = -0.12;
export const CHAPTER3_ALIEN3_SWAY = 0.07;

export function loadAlien3PartsFromStorage(): Chapter3AlienPart[] {
  if (typeof window === "undefined") return cloneAlienParts(CHAPTER3_ALIEN3_PARTS);
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN3_SHAPE_STORAGE_KEY) ?? "null");
    if (!Array.isArray(raw) || raw.length === 0) return cloneAlienParts(CHAPTER3_ALIEN3_PARTS);
    return raw.map((p: Chapter3AlienPart, i: number) => {
      const fallback = CHAPTER3_ALIEN3_PARTS[i] ?? CHAPTER3_ALIEN3_PARTS[0];
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
    return cloneAlienParts(CHAPTER3_ALIEN3_PARTS);
  }
}

export function saveAlien3PartsToStorage(parts: Chapter3AlienPart[]) {
  window.localStorage.setItem(CHAPTER3_ALIEN3_SHAPE_STORAGE_KEY, JSON.stringify(parts));
}

export function loadAlien3FaceFromStorage(): Chapter3Alien3FaceParams {
  if (typeof window === "undefined") return { ...CHAPTER3_ALIEN3_DEFAULT_FACE };
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN3_FACE_STORAGE_KEY) ?? "null");
    return { ...CHAPTER3_ALIEN3_DEFAULT_FACE, ...raw };
  } catch {
    return { ...CHAPTER3_ALIEN3_DEFAULT_FACE };
  }
}

export function saveAlien3FaceToStorage(params: Chapter3Alien3FaceParams) {
  window.localStorage.setItem(CHAPTER3_ALIEN3_FACE_STORAGE_KEY, JSON.stringify(params));
}

export function formatAlien3FaceForSource(params: Chapter3Alien3FaceParams): string {
  const body = (Object.keys(CHAPTER3_ALIEN3_DEFAULT_FACE) as (keyof Chapter3Alien3FaceParams)[])
    .map((k) => `  ${k}: ${params[k]},`)
    .join("\n");
  return `export const CHAPTER3_ALIEN3_DEFAULT_FACE: Chapter3Alien3FaceParams = {\n${body}\n};`;
}

function formatPartLine(p: Chapter3AlienPart): string {
  const rotX = p.rotX ?? 0;
  const rotY = p.rotY ?? 0;
  const rotZ = p.rotZ ?? 0;
  const rot =
    rotX !== 0 || rotY !== 0 || rotZ !== 0 ? `, rotX: ${rotX}, rotY: ${rotY}, rotZ: ${rotZ}` : "";
  return `  { name: ${JSON.stringify(p.name)}, cx: ${p.cx}, cy: ${p.cy}, cz: ${p.cz}, rx: ${p.rx}, ry: ${p.ry}, rz: ${p.rz}, blend: ${p.blend}${rot} },`;
}

export function formatAlien3PartsForSource(parts: Chapter3AlienPart[]): string {
  return `export const CHAPTER3_ALIEN3_PARTS: Chapter3AlienPart[] = [\n${parts.map(formatPartLine).join("\n")}\n];`;
}
