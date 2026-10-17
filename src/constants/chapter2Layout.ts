export const CHAPTER2_BERG_TUNABLE_IDS = ["berg4", "berg3", "berg2"] as const;
export type Chapter2BergTunableId = (typeof CHAPTER2_BERG_TUNABLE_IDS)[number];

export const CHAPTER2_TUNABLE_IDS = [...CHAPTER2_BERG_TUNABLE_IDS] as const;
export type Chapter2TunableId = (typeof CHAPTER2_TUNABLE_IDS)[number];

/** @deprecated use CHAPTER2_TUNABLE_IDS */
export const CHAPTER2_BERG_EDIT_IDS = [...CHAPTER2_TUNABLE_IDS] as const;
export type Chapter2BergEditId = Chapter2TunableId;

export type Chapter2BergEditTransform = {
  x: number;
  y: number;
  scale: number;
  scaleY: number;
  rotate: number;
};

export const DEFAULT_CHAPTER2_BERG_EDIT: Chapter2BergEditTransform = {
  x: 0,
  y: 0,
  scale: 1,
  scaleY: 1,
  rotate: 0,
};

/** Default / reset target for berg4 (also baked as prod `CHAPTER2_BERG4_FIXED_LAYOUT`). */
export const CHAPTER2_BERG4_LAYOUT_DEFAULT: Chapter2BergEditTransform = {
  x: 0,
  y: 86,
  scale: 1.62,
  scaleY: 1.62,
  rotate: 0,
};

export const CHAPTER2_BERG3_LAYOUT_DEFAULT: Chapter2BergEditTransform = {
  x: -410,
  y: 0,
  scale: 1,
  scaleY: 1,
  rotate: 0,
};

function finiteOr(fallback: number, value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Ensures no null/NaN fields (React number inputs require finite values). */
export function sanitizeChapter2BergEditTransform(
  source: Partial<Chapter2BergEditTransform> | null | undefined,
  seed: Chapter2BergEditTransform,
): Chapter2BergEditTransform {
  const s = source ?? {};
  return {
    x: finiteOr(seed.x, s.x),
    y: finiteOr(seed.y, s.y),
    scale: finiteOr(seed.scale, s.scale),
    scaleY: finiteOr(seed.scaleY, s.scaleY),
    rotate: finiteOr(seed.rotate, s.rotate),
  };
}

export function getChapter2TunableSeed(id: Chapter2TunableId): Chapter2BergEditTransform {
  if (id === "berg4") return { ...CHAPTER2_BERG4_LAYOUT_DEFAULT };
  if (id === "berg3") return { ...CHAPTER2_BERG3_LAYOUT_DEFAULT };
  return { ...DEFAULT_CHAPTER2_BERG_EDIT };
}

export const CHAPTER2_BERG_LAYOUT_STORAGE_KEY = "grun-chapter2-berg-layout-v1";
const STORAGE_KEY = CHAPTER2_BERG_LAYOUT_STORAGE_KEY;
const BERG3_NUDGE_LEFT_KEY = "grun-chapter2-berg3-nudge-left-v1";
const BERG3_NUDGE_LEFT_V2_KEY = "grun-chapter2-berg3-nudge-left-v2";
const BERG3_NUDGE_LEFT_PX = 105;
const BERG3_NUDGE_LEFT_V2_PX = 105;
const BERG3_NUDGE_LEFT_V3_KEY = "grun-chapter2-berg3-nudge-left-v3";
const BERG3_NUDGE_LEFT_V3_PX = 300;
const BERG3_NUDGE_LEFT_V4_KEY = "grun-chapter2-berg3-nudge-left-v4";
const BERG3_NUDGE_LEFT_V4_PX = 100;
const BERG3_NUDGE_RIGHT_V5_KEY = "grun-chapter2-berg3-nudge-right-v5";
const BERG3_NUDGE_RIGHT_V5_PX = 200;

export function defaultChapter2TunableEdits(): Record<
  Chapter2TunableId,
  Chapter2BergEditTransform
> {
  const edits = {} as Record<Chapter2TunableId, Chapter2BergEditTransform>;
  for (const id of CHAPTER2_TUNABLE_IDS) {
    edits[id] = getChapter2TunableSeed(id);
  }
  return edits;
}

/** @deprecated */
export const defaultChapter2BergTunableEdits = defaultChapter2TunableEdits;

export function loadChapter2TunableEdits(): Record<
  Chapter2TunableId,
  Chapter2BergEditTransform
> {
  if (typeof window === "undefined") return defaultChapter2TunableEdits();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultChapter2TunableEdits();
    const parsed = JSON.parse(raw) as Partial<
      Record<Chapter2TunableId | "spore2" | "spore2_0" | "spore2_1" | "spore2_2", Partial<Chapter2BergEditTransform>>
    >;
    const base = defaultChapter2TunableEdits();
    for (const id of CHAPTER2_TUNABLE_IDS) {
      base[id] = sanitizeChapter2BergEditTransform(parsed[id], getChapter2TunableSeed(id));
    }
    if (!window.localStorage.getItem(BERG3_NUDGE_LEFT_KEY)) {
      base.berg3 = sanitizeChapter2BergEditTransform(
        { ...base.berg3, x: base.berg3.x - BERG3_NUDGE_LEFT_PX },
        getChapter2TunableSeed("berg3"),
      );
      window.localStorage.setItem(BERG3_NUDGE_LEFT_KEY, "1");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(base, null, 2));
    }
    if (!window.localStorage.getItem(BERG3_NUDGE_LEFT_V2_KEY)) {
      base.berg3 = sanitizeChapter2BergEditTransform(
        { ...base.berg3, x: base.berg3.x - BERG3_NUDGE_LEFT_V2_PX },
        getChapter2TunableSeed("berg3"),
      );
      window.localStorage.setItem(BERG3_NUDGE_LEFT_V2_KEY, "1");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(base, null, 2));
    }
    if (!window.localStorage.getItem(BERG3_NUDGE_LEFT_V3_KEY)) {
      base.berg3 = sanitizeChapter2BergEditTransform(
        { ...base.berg3, x: base.berg3.x - BERG3_NUDGE_LEFT_V3_PX },
        getChapter2TunableSeed("berg3"),
      );
      window.localStorage.setItem(BERG3_NUDGE_LEFT_V3_KEY, "1");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(base, null, 2));
    }
    if (!window.localStorage.getItem(BERG3_NUDGE_LEFT_V4_KEY)) {
      base.berg3 = sanitizeChapter2BergEditTransform(
        { ...base.berg3, x: base.berg3.x - BERG3_NUDGE_LEFT_V4_PX },
        getChapter2TunableSeed("berg3"),
      );
      window.localStorage.setItem(BERG3_NUDGE_LEFT_V4_KEY, "1");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(base, null, 2));
    }
    if (!window.localStorage.getItem(BERG3_NUDGE_RIGHT_V5_KEY)) {
      base.berg3 = sanitizeChapter2BergEditTransform(
        { ...base.berg3, x: base.berg3.x + BERG3_NUDGE_RIGHT_V5_PX },
        getChapter2TunableSeed("berg3"),
      );
      window.localStorage.setItem(BERG3_NUDGE_RIGHT_V5_KEY, "1");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(base, null, 2));
    }
    return base;
  } catch {
    return defaultChapter2TunableEdits();
  }
}

/** @deprecated */
export const loadChapter2BergTunableEdits = loadChapter2TunableEdits;

export function saveChapter2TunableEdits(
  edits: Record<Chapter2TunableId, Chapter2BergEditTransform>,
) {
  if (typeof window === "undefined") return;
  const clean = defaultChapter2TunableEdits();
  for (const id of CHAPTER2_TUNABLE_IDS) {
    clean[id] = sanitizeChapter2BergEditTransform(edits[id], getChapter2TunableSeed(id));
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean, null, 2));
}

/** @deprecated */
export const saveChapter2BergTunableEdits = saveChapter2TunableEdits;

export function formatChapter2SceneLayout(
  edits: Record<Chapter2TunableId, Chapter2BergEditTransform>,
) {
  return JSON.stringify(edits, null, 2);
}

/** @deprecated */
export function formatChapter2BergEditsForConfig(
  edits: Record<Chapter2BergEditId, Chapter2BergEditTransform>,
) {
  return formatChapter2SceneLayout(edits);
}
