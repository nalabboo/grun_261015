import type { EditorMode } from "@/components/canvas/worldView";
import type { Chapter2BergEditTransform } from "@/constants/chapter2Layout";
import { CHAPTER2_BERG_LAYOUT_STORAGE_KEY } from "@/constants/chapter2Layout";
import {
  CHAPTER2_PROP_FIXED_LAYOUTS,
  CHAPTER2_PROP_IDS,
  CHAPTER2_PROPS_LAYOUT_LOCKED,
  getChapter2PropDefaultLayout,
  sanitizeChapter2PropLayout,
  type Chapter2PropId,
} from "@/constants/chapter2ObjectsConfig";

export type { Chapter2PropId };

export const CHAPTER2_PROP_LAYOUT_STORAGE_KEY = "grun-chapter2-prop-layout-v1";

export function defaultChapter2PropEdits(): Record<Chapter2PropId, Chapter2BergEditTransform> {
  const edits = {} as Record<Chapter2PropId, Chapter2BergEditTransform>;
  for (const id of CHAPTER2_PROP_IDS) {
    edits[id] = getChapter2PropDefaultLayout(id);
  }
  return edits;
}

function layoutsFromFixedConfig(): Record<Chapter2PropId, Chapter2BergEditTransform> {
  const edits = {} as Record<Chapter2PropId, Chapter2BergEditTransform>;
  for (const id of CHAPTER2_PROP_IDS) {
    edits[id] = sanitizeChapter2PropLayout(undefined, CHAPTER2_PROP_FIXED_LAYOUTS[id]);
  }
  return edits;
}

function readStoredPropLayouts(): Partial<
  Record<Chapter2PropId, Partial<Chapter2BergEditTransform>>
> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CHAPTER2_PROP_LAYOUT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Partial<
        Record<Chapter2PropId, Partial<Chapter2BergEditTransform>>
      >;
    }
  } catch {
    /* fall through to berg layout snapshot */
  }

  try {
    const bergRaw = window.localStorage.getItem(CHAPTER2_BERG_LAYOUT_STORAGE_KEY);
    if (!bergRaw) return null;
    const parsed = JSON.parse(bergRaw) as Partial<
      Record<Chapter2PropId, Partial<Chapter2BergEditTransform>>
    >;
    const hasProp = CHAPTER2_PROP_IDS.some((id) => parsed[id] != null);
    return hasProp ? parsed : null;
  } catch {
    return null;
  }
}

const PROP_LAYOUT_BAD_Y_THRESHOLD = -280;

function storedPropLayoutLooksInvalid(
  stored: Partial<Record<Chapter2PropId, Partial<Chapter2BergEditTransform>>>,
) {
  return CHAPTER2_PROP_IDS.every((id) => {
    const y = stored[id]?.y;
    return typeof y === "number" && y < PROP_LAYOUT_BAD_Y_THRESHOLD;
  });
}

/** Fixed config + optional browser snapshot (refresh-safe while tuning). */
export function loadChapter2PropEdits(): Record<Chapter2PropId, Chapter2BergEditTransform> {
  const base = layoutsFromFixedConfig();
  const stored = readStoredPropLayouts();
  if (!stored || storedPropLayoutLooksInvalid(stored)) return base;

  for (const id of CHAPTER2_PROP_IDS) {
    const seed = base[id];
    const patch = stored[id];
    const y =
      typeof patch?.y === "number" && patch.y < PROP_LAYOUT_BAD_Y_THRESHOLD ? seed.y : patch?.y;
    base[id] = sanitizeChapter2PropLayout({ ...patch, y }, seed);
  }
  return base;
}

export function saveChapter2PropEdits(edits: Record<Chapter2PropId, Chapter2BergEditTransform>) {
  if (typeof window === "undefined" || CHAPTER2_PROPS_LAYOUT_LOCKED) return;

  const clean = layoutsFromFixedConfig();
  for (const id of CHAPTER2_PROP_IDS) {
    clean[id] = sanitizeChapter2PropLayout(edits[id], clean[id]);
  }
  window.localStorage.setItem(CHAPTER2_PROP_LAYOUT_STORAGE_KEY, JSON.stringify(clean, null, 2));
}

export function formatChapter2PropLayout(edits: Record<Chapter2PropId, Chapter2BergEditTransform>) {
  return JSON.stringify(edits, null, 2);
}

export const DEV_CHAPTER2_PROP_EDITOR =
  !CHAPTER2_PROPS_LAYOUT_LOCKED &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_CHAPTER2_EDIT !== "0";

export type Chapter2PropEditorState = {
  enabled: boolean;
  selectedId: Chapter2PropId;
  mode: EditorMode;
};
