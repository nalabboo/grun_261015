/** Glass bead eyes + horizontal elliptical mouth (reference photo pixels, y down). */
export type Chapter3AlienFaceParams = {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
  eyeRadius: number;
  mouthCenterX: number;
  mouthCenterY: number;
  mouthRadius: number;
  mouthScaleX: number;
  mouthScaleY: number;
};

export const CHAPTER3_ALIEN_FACE_STORAGE_KEY = "chapter3-alien-face";

export const CHAPTER3_ALIEN_DEFAULT_FACE: Chapter3AlienFaceParams = {
  eyeLeftX: 701,
  eyeLeftY: 134,
  eyeRightX: 779,
  eyeRightY: 134,
  eyeRadius: 10.5,
  mouthCenterX: 744,
  mouthCenterY: 171,
  mouthRadius: 3.8,
  mouthScaleX: 2.85,
  mouthScaleY: 0.58,
};

/** Face tuning panel on the inside screen. */
export const CHAPTER3_ALIEN_FACE_EDITOR = true;

export const CHAPTER3_ALIEN_FACE_PARAM_SPECS: {
  key: keyof Chapter3AlienFaceParams;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "eyeLeftX", label: "눈 왼 X", min: 600, max: 820, step: 1 },
  { key: "eyeLeftY", label: "눈 왼 Y", min: 60, max: 280, step: 1 },
  { key: "eyeRightX", label: "눈 오 X", min: 600, max: 820, step: 1 },
  { key: "eyeRightY", label: "눈 오 Y", min: 60, max: 280, step: 1 },
  { key: "eyeRadius", label: "눈 알 크기", min: 4, max: 22, step: 0.5 },
  { key: "mouthCenterX", label: "입 X", min: 640, max: 820, step: 1 },
  { key: "mouthCenterY", label: "입 Y", min: 120, max: 280, step: 1 },
  { key: "mouthRadius", label: "입 크기", min: 1.5, max: 12, step: 0.1 },
  { key: "mouthScaleX", label: "입 가로", min: 1, max: 5, step: 0.05 },
  { key: "mouthScaleY", label: "입 세로", min: 0.2, max: 1.2, step: 0.05 },
];

export function loadAlienFaceFromStorage(): Chapter3AlienFaceParams {
  if (typeof window === "undefined") return { ...CHAPTER3_ALIEN_DEFAULT_FACE };
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN_FACE_STORAGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return { ...CHAPTER3_ALIEN_DEFAULT_FACE };
    const merged = { ...CHAPTER3_ALIEN_DEFAULT_FACE, ...raw };
    return merged;
  } catch {
    return { ...CHAPTER3_ALIEN_DEFAULT_FACE };
  }
}

export function saveAlienFaceToStorage(params: Chapter3AlienFaceParams) {
  window.localStorage.setItem(CHAPTER3_ALIEN_FACE_STORAGE_KEY, JSON.stringify(params));
}

export function formatAlienFaceForSource(params: Chapter3AlienFaceParams): string {
  const e = (k: keyof Chapter3AlienFaceParams) => `${k}: ${params[k]}`;
  return `export const CHAPTER3_ALIEN_DEFAULT_FACE: Chapter3AlienFaceParams = {\n  ${[
    e("eyeLeftX"),
    e("eyeLeftY"),
    e("eyeRightX"),
    e("eyeRightY"),
    e("eyeRadius"),
    e("mouthCenterX"),
    e("mouthCenterY"),
    e("mouthRadius"),
    e("mouthScaleX"),
    e("mouthScaleY"),
  ].join(",\n  ")},\n};`;
}
