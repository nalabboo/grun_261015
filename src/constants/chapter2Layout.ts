import type { EditorMode } from "@/components/canvas/worldView";

/** Dev-tunable berg layers (prod berg4 uses `CHAPTER2_BERG4_FIXED_LAYOUT` in config). */
export const CHAPTER2_BERG_TUNABLE_IDS = ["berg4", "berg3", "berg2"] as const;
export type Chapter2BergTunableId = (typeof CHAPTER2_BERG_TUNABLE_IDS)[number];

/** @deprecated use CHAPTER2_BERG_TUNABLE_IDS — berg4 layout lives in config. */
export const CHAPTER2_BERG_EDIT_IDS = ["berg4", "berg3", "berg2"] as const;
export type Chapter2BergEditId = (typeof CHAPTER2_BERG_EDIT_IDS)[number];

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

export const CHAPTER2_BERG_LAYOUT_STORAGE_KEY = "grun-chapter2-berg-layout-v1";
const STORAGE_KEY = CHAPTER2_BERG_LAYOUT_STORAGE_KEY;

export function readSavedBerg4Layout(
  fallback: Chapter2BergEditTransform,
): Chapter2BergEditTransform {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const berg4 = (JSON.parse(raw) as { berg4?: Partial<Chapter2BergEditTransform> }).berg4;
    if (!berg4) return fallback;
    return { ...DEFAULT_CHAPTER2_BERG_EDIT, ...berg4 };
  } catch {
    return fallback;
  }
}

export function defaultChapter2BergTunableEdits(): Record<
  Chapter2BergTunableId,
  Chapter2BergEditTransform
> {
  return {
    berg4: { ...CHAPTER2_BERG4_LAYOUT_DEFAULT },
    berg3: { ...DEFAULT_CHAPTER2_BERG_EDIT },
    berg2: { ...DEFAULT_CHAPTER2_BERG_EDIT },
  };
}

export function loadChapter2BergTunableEdits(): Record<
  Chapter2BergTunableId,
  Chapter2BergEditTransform
> {
  if (typeof window === "undefined") return defaultChapter2BergTunableEdits();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultChapter2BergTunableEdits();
    const parsed = JSON.parse(raw) as Partial<
      Record<Chapter2BergEditId, Partial<Chapter2BergEditTransform>>
    >;
    const base = defaultChapter2BergTunableEdits();
    for (const id of CHAPTER2_BERG_TUNABLE_IDS) {
      const patch = parsed[id];
      const seed = id === "berg4" ? CHAPTER2_BERG4_LAYOUT_DEFAULT : DEFAULT_CHAPTER2_BERG_EDIT;
      base[id] = sanitizeChapter2BergEditTransform(patch, seed);
    }
    return base;
  } catch {
    return defaultChapter2BergTunableEdits();
  }
}

export function saveChapter2BergTunableEdits(
  edits: Record<Chapter2BergTunableId, Chapter2BergEditTransform>,
) {
  if (typeof window === "undefined") return;
  const clean = defaultChapter2BergTunableEdits();
  for (const id of CHAPTER2_BERG_TUNABLE_IDS) {
    const seed = id === "berg4" ? CHAPTER2_BERG4_LAYOUT_DEFAULT : DEFAULT_CHAPTER2_BERG_EDIT;
    clean[id] = sanitizeChapter2BergEditTransform(edits[id], seed);
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean, null, 2));
}

/** @deprecated */
export function defaultChapter2BergEdits(): Record<Chapter2BergEditId, Chapter2BergEditTransform> {
  return { ...defaultChapter2BergTunableEdits() };
}

/** @deprecated */
export function loadChapter2BergEdits(): Record<Chapter2BergEditId, Chapter2BergEditTransform> {
  return { ...loadChapter2BergTunableEdits() };
}

/** @deprecated */
export function saveChapter2BergEdits(edits: Record<Chapter2BergEditId, Chapter2BergEditTransform>) {
  saveChapter2BergTunableEdits({
    berg4: edits.berg4,
    berg3: edits.berg3,
    berg2: edits.berg2,
  });
}

export function formatChapter2BergEditsForConfig(
  edits: Record<Chapter2BergEditId, Chapter2BergEditTransform>,
) {
  return JSON.stringify(edits, null, 2);
}

export type Chapter2BergEditorState = {
  enabled: boolean;
  selectedId: Chapter2BergTunableId | null;
  mode: EditorMode;
};

export const DEV_CHAPTER2_BERG_EDITOR =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_CHAPTER2_EDIT !== "0";
