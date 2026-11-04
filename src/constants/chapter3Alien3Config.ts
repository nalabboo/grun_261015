/** Wide smile + elliptical eyes (sketch ref). */
export type Chapter3Alien3FaceParams = {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
  eyeRadius: number;
  eyeScaleX: number;
  eyeScaleY: number;
  mouthCenterX: number;
  mouthCenterY: number;
  mouthWidth: number;
  mouthStick: number;
  mouthSmile: number;
};

export type Chapter3Alien3GlassParams = {
  ior: number;
  wobble: number;
  dispersion: number;
};

export const CHAPTER3_ALIEN3_EDITOR = false;
export const CHAPTER3_ALIEN3_FACE_STORAGE_KEY = "chapter3-alien3-face";
export const CHAPTER3_ALIEN3_GLASS_STORAGE_KEY = "chapter3-alien3-glass";

/** Image pixels → same design frame as other chapter-3 aliens (for face sliders). */
export const CHAPTER3_ALIEN3_SKETCH_MAP = {
  designCenterX: 488,
  designCenterY: 308,
  designHeight: 438,
};

export const CHAPTER3_ALIEN3_SKETCH_TRACE = {
  inkLuminanceMax: 150,
  dilateRadius: 3,
  simplifyMinPx: 2.2,
};

/** Rounded glass volume through the sketch silhouette (same px frame as other aliens). */
export const CHAPTER3_ALIEN3_VOLUME = {
  /** Half-depth in design px (Z), similar to metaball `rz`. */
  halfDepthRz: 86,
  /** Edge roundness in px — inflates silhouette into a soft blob. */
  surfaceRound: 22,
};

export const CHAPTER3_ALIEN3_DEFAULT_GLASS: Chapter3Alien3GlassParams = {
  ior: 1.55,
  wobble: 0,
  dispersion: 1.6,
};

export const CHAPTER3_ALIEN3_DEFAULT_FACE: Chapter3Alien3FaceParams = {
  eyeLeftX: 418,
  eyeLeftY: 252,
  eyeRightX: 558,
  eyeRightY: 252,
  eyeRadius: 8.5,
  eyeScaleX: 1.4,
  eyeScaleY: 0.52,
  mouthCenterX: 488,
  mouthCenterY: 302,
  mouthWidth: 78,
  mouthStick: 3,
  mouthSmile: 13,
};

export const CHAPTER3_ALIEN3_GLASS_SPECS: {
  key: keyof Chapter3Alien3GlassParams;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "ior", label: "굴절률 (IOR)", min: 1.0, max: 2.2, step: 0.01 },
  { key: "wobble", label: "일렁임", min: 0, max: 0.12, step: 0.002 },
  { key: "dispersion", label: "무지개 번짐", min: 0, max: 4, step: 0.05 },
];

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
  { key: "mouthCenterX", label: "입 X", min: 400, max: 580, step: 1 },
  { key: "mouthCenterY", label: "입 Y", min: 220, max: 380, step: 1 },
  { key: "mouthWidth", label: "입 너비", min: 20, max: 120, step: 1 },
  { key: "mouthStick", label: "입 작대기 굵기", min: 1, max: 10, step: 0.1 },
  { key: "mouthSmile", label: "입 곡선", min: 0, max: 28, step: 0.5 },
];

export const CHAPTER3_ALIEN3_WIDTH = 1.55;
/** Right of 외계인1 (world X). */
export const CHAPTER3_ALIEN3_POSITION_X = 2.35;
export const CHAPTER3_ALIEN3_DELAY_MS = 820;
export const CHAPTER3_ALIEN3_TURN = -0.12;
export const CHAPTER3_ALIEN3_SWAY = 0.07;

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

export function loadAlien3GlassFromStorage(): Chapter3Alien3GlassParams {
  if (typeof window === "undefined") return { ...CHAPTER3_ALIEN3_DEFAULT_GLASS };
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN3_GLASS_STORAGE_KEY) ?? "null");
    return { ...CHAPTER3_ALIEN3_DEFAULT_GLASS, ...raw };
  } catch {
    return { ...CHAPTER3_ALIEN3_DEFAULT_GLASS };
  }
}

export function saveAlien3GlassToStorage(params: Chapter3Alien3GlassParams) {
  window.localStorage.setItem(CHAPTER3_ALIEN3_GLASS_STORAGE_KEY, JSON.stringify(params));
}

export function formatAlien3GlassForSource(params: Chapter3Alien3GlassParams): string {
  return `export const CHAPTER3_ALIEN3_DEFAULT_GLASS: Chapter3Alien3GlassParams = {\n  ior: ${params.ior},\n  wobble: ${params.wobble},\n  dispersion: ${params.dispersion},\n};`;
}

export function formatAlien3FaceForSource(params: Chapter3Alien3FaceParams): string {
  const body = (Object.keys(CHAPTER3_ALIEN3_DEFAULT_FACE) as (keyof Chapter3Alien3FaceParams)[])
    .map((k) => `  ${k}: ${params[k]},`)
    .join("\n");
  return `export const CHAPTER3_ALIEN3_DEFAULT_FACE: Chapter3Alien3FaceParams = {\n${body}\n};`;
}
