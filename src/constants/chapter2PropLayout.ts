import type { EditorMode } from "@/components/canvas/worldView";
import { CHAPTER2_BERG_LAYOUT_STORAGE_KEY } from "@/constants/chapter2Layout";
import {
  CHAPTER2_PROP_IDS,
  CHAPTER2_PROPS_LAYOUT_LOCKED,
  CHAPTER2_SPORE4_LAYOUT_LOCKED,
  CHAPTER2_TUNABLE_PROP_IDS,
  getChapter2PropDefaultEdit,
  isChapter2PropTunable,
  sanitizeChapter2PropEdit,
  type Chapter2PropEdit,
  type Chapter2PropId,
  type Chapter2TunablePropId,
} from "@/constants/chapter2ObjectsConfig";

export type { Chapter2PropId, Chapter2TunablePropId };

export const CHAPTER2_PROP_LAYOUT_STORAGE_KEY = "grun-chapter2-prop-layout-v1";

const LOCKED_PROP_IDS = CHAPTER2_PROP_IDS.filter((id) => !isChapter2PropTunable(id));

export function defaultChapter2PropEdits(): Record<Chapter2PropId, Chapter2PropEdit> {
  const edits = {} as Record<Chapter2PropId, Chapter2PropEdit>;
  for (const id of CHAPTER2_PROP_IDS) {
    edits[id] = getChapter2PropDefaultEdit(id);
  }
  return edits;
}

function layoutsFromFixedConfig(): Record<Chapter2PropId, Chapter2PropEdit> {
  const edits = {} as Record<Chapter2PropId, Chapter2PropEdit>;
  for (const id of CHAPTER2_PROP_IDS) {
    edits[id] = sanitizeChapter2PropEdit(undefined, getChapter2PropDefaultEdit(id));
  }
  return edits;
}

function readStoredPropLayouts(): Partial<Record<Chapter2PropId, Partial<Chapter2PropEdit>>> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CHAPTER2_PROP_LAYOUT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Partial<Record<Chapter2PropId, Partial<Chapter2PropEdit>>>;
    }
  } catch {
    /* fall through */
  }

  try {
    const bergRaw = window.localStorage.getItem(CHAPTER2_BERG_LAYOUT_STORAGE_KEY);
    if (!bergRaw) return null;
    const parsed = JSON.parse(bergRaw) as Partial<Record<Chapter2PropId, Partial<Chapter2PropEdit>>>;
    const hasProp = CHAPTER2_PROP_IDS.some((id) => parsed[id] != null);
    return hasProp ? parsed : null;
  } catch {
    return null;
  }
}

const PROP_LAYOUT_BAD_Y_THRESHOLD = -280;

function storedLockedLayoutLooksInvalid(
  stored: Partial<Record<Chapter2PropId, Partial<Chapter2PropEdit>>>,
) {
  return LOCKED_PROP_IDS.every((id) => {
    const y = stored[id]?.y;
    return typeof y === "number" && y < PROP_LAYOUT_BAD_Y_THRESHOLD;
  });
}

function pruneStoredSpore4Layout() {
  if (typeof window === "undefined" || !CHAPTER2_SPORE4_LAYOUT_LOCKED) return;
  try {
    const raw = window.localStorage.getItem(CHAPTER2_PROP_LAYOUT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!("spore4" in parsed)) return;
    delete parsed.spore4;
    window.localStorage.setItem(CHAPTER2_PROP_LAYOUT_STORAGE_KEY, JSON.stringify(parsed, null, 2));
  } catch {
    /* ignore */
  }
}

export function loadChapter2PropEdits(): Record<Chapter2PropId, Chapter2PropEdit> {
  pruneStoredSpore4Layout();
  const base = layoutsFromFixedConfig();
  const stored = readStoredPropLayouts();

  if (stored && !storedLockedLayoutLooksInvalid(stored) && !CHAPTER2_PROPS_LAYOUT_LOCKED) {
    for (const id of LOCKED_PROP_IDS) {
      const seed = base[id];
      const patch = stored[id];
      const y =
        typeof patch?.y === "number" && patch.y < PROP_LAYOUT_BAD_Y_THRESHOLD ? seed.y : patch?.y;
      base[id] = sanitizeChapter2PropEdit({ ...patch, y }, seed);
    }
  }

  for (const id of CHAPTER2_TUNABLE_PROP_IDS as readonly Chapter2PropId[]) {
    base[id] = sanitizeChapter2PropEdit(stored?.[id], base[id]);
  }

  if (CHAPTER2_SPORE4_LAYOUT_LOCKED) {
    base.spore4 = sanitizeChapter2PropEdit(undefined, getChapter2PropDefaultEdit("spore4"));
  }

  return base;
}

export function saveChapter2PropEdits(edits: Record<Chapter2PropId, Chapter2PropEdit>) {
  if (typeof window === "undefined") return;

  const payload = {} as Partial<Record<Chapter2PropId, Chapter2PropEdit>>;
  for (const id of CHAPTER2_TUNABLE_PROP_IDS as readonly Chapter2PropId[]) {
    payload[id] = sanitizeChapter2PropEdit(edits[id], getChapter2PropDefaultEdit(id));
  }

  if (!CHAPTER2_PROPS_LAYOUT_LOCKED) {
    for (const id of LOCKED_PROP_IDS) {
      payload[id] = sanitizeChapter2PropEdit(edits[id], getChapter2PropDefaultEdit(id));
    }
  }

  window.localStorage.setItem(CHAPTER2_PROP_LAYOUT_STORAGE_KEY, JSON.stringify(payload, null, 2));
}

export function formatChapter2PropLayout(
  edits: Partial<Record<Chapter2PropId, Chapter2PropEdit>>,
) {
  const tunableOnly: Partial<Record<Chapter2PropId, Chapter2PropEdit>> = {};
  for (const id of CHAPTER2_TUNABLE_PROP_IDS) {
    tunableOnly[id] = edits[id] ?? getChapter2PropDefaultEdit(id);
  }
  return JSON.stringify(tunableOnly, null, 2);
}

export const DEV_CHAPTER2_PROP_EDITOR =
  CHAPTER2_TUNABLE_PROP_IDS.length > 0 &&
  !CHAPTER2_SPORE4_LAYOUT_LOCKED &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_CHAPTER2_EDIT !== "0";

export type Chapter2PropEditorState = {
  enabled: boolean;
  selectedId: Chapter2PropId;
  mode: EditorMode;
};
