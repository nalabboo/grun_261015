/** One metaball ellipsoid in reference-photo pixels (y down). */
export type Chapter3AlienPart = {
  name: string;
  cx: number;
  cy: number;
  cz: number;
  rx: number;
  ry: number;
  rz: number;
  blend: number;
};

export const CHAPTER3_ALIEN_SHAPE_STORAGE_KEY = "chapter3-alien-shape";

/** Reference frame for the side-view silhouette (matches the figurine photo). */
export const CHAPTER3_ALIEN_REF_WIDTH = 950;
export const CHAPTER3_ALIEN_REF_HEIGHT = 500;

export const CHAPTER3_ALIEN_DEFAULT_PARTS: Chapter3AlienPart[] = [
  { name: "꼬리", cx: 221, cy: 217, cz: 0, rx: 109, ry: 95, rz: 128, blend: 90 },
  { name: "몸통", cx: 540, cy: 282, cz: -7, rx: 288, ry: 167, rz: 76, blend: 90 },
  { name: "머리", cx: 721, cy: 190, cz: 0, rx: 150, ry: 138, rz: 130, blend: 90 },
  { name: "귀 왼", cx: 636, cy: 88, cz: 0, rx: 42, ry: 38, rz: 40, blend: 30 },
  { name: "귀 오", cx: 792, cy: 92, cz: 0, rx: 42, ry: 38, rz: 40, blend: 30 },
  { name: "다리 앞왼", cx: 311, cy: 392, cz: 62, rx: 126, ry: 70, rz: 64, blend: 73 },
  { name: "다리 앞오", cx: 613, cy: 389, cz: 62, rx: 113, ry: 85, rz: 77, blend: 73 },
  { name: "다리 뒤왼", cx: 380, cy: 388, cz: -62, rx: 113, ry: 66, rz: 51, blend: 73 },
  { name: "다리 뒤오", cx: 711, cy: 392, cz: -62, rx: 104, ry: 82, rz: 60, blend: 69 },
];

export function cloneAlienParts(parts: Chapter3AlienPart[]): Chapter3AlienPart[] {
  return parts.map((p) => ({ ...p }));
}

export function loadAlienPartsFromStorage(): Chapter3AlienPart[] {
  if (typeof window === "undefined") return cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS);
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN_SHAPE_STORAGE_KEY) ?? "null");
    if (!Array.isArray(raw) || raw.length === 0) return cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS);
    return raw.map((p: Chapter3AlienPart, i: number) => {
      const fallback = CHAPTER3_ALIEN_DEFAULT_PARTS[i] ?? CHAPTER3_ALIEN_DEFAULT_PARTS[0];
      return {
        ...fallback,
        ...p,
        name: String(p.name ?? fallback.name ?? `파트 ${i + 1}`),
      };
    });
  } catch {
    return cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS);
  }
}

export function saveAlienPartsToStorage(parts: Chapter3AlienPart[]) {
  window.localStorage.setItem(CHAPTER3_ALIEN_SHAPE_STORAGE_KEY, JSON.stringify(parts));
}

/** Paste into `chapter3AlienShape.ts` after tuning. */
export function formatAlienPartsForSource(parts: Chapter3AlienPart[]): string {
  const lines = parts.map(
    (p) =>
      `  { name: ${JSON.stringify(p.name)}, cx: ${p.cx}, cy: ${p.cy}, cz: ${p.cz}, rx: ${p.rx}, ry: ${p.ry}, rz: ${p.rz}, blend: ${p.blend} },`,
  );
  return `export const CHAPTER3_ALIEN_DEFAULT_PARTS: Chapter3AlienPart[] = [\n${lines.join("\n")}\n];`;
}
