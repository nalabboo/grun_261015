import {
  CHAPTER3_ALIEN2_POSITION_X,
  CHAPTER3_ALIEN2_WIDTH,
} from "@/constants/chapter3Alien2Config";
import {
  CHAPTER3_ALIEN3_POSITION_X,
  CHAPTER3_ALIEN3_WIDTH,
} from "@/constants/chapter3Alien3Config";
import { CHAPTER3_ALIEN_WIDTH } from "@/constants/chapter3InsideConfig";

export type Chapter3AlienPlacement = {
  positionX: number;
  /** Body width in world units. */
  width: number;
  /** Ground height offset after landing (world Y). */
  positionY: number;
};

export type Chapter3AlienPlacements = {
  alien1: Chapter3AlienPlacement;
  alien2: Chapter3AlienPlacement;
  alien3: Chapter3AlienPlacement;
};

export const CHAPTER3_ALIEN_PLACEMENT_STORAGE_KEY = "chapter3-alien-placements";

export const CHAPTER3_ALIEN_DEFAULT_PLACEMENTS: Chapter3AlienPlacements = {
  alien1: { positionX: 0, width: CHAPTER3_ALIEN_WIDTH, positionY: 0 },
  alien2: { positionX: CHAPTER3_ALIEN2_POSITION_X, width: CHAPTER3_ALIEN2_WIDTH, positionY: 0 },
  alien3: { positionX: CHAPTER3_ALIEN3_POSITION_X, width: CHAPTER3_ALIEN3_WIDTH, positionY: 0 },
};

export const CHAPTER3_ALIEN_PLACEMENT_EDITOR = false;

export const CHAPTER3_ALIEN_PLACEMENT_SPECS: {
  key: keyof Chapter3AlienPlacement;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "positionX", label: "X 위치", min: -4.5, max: 4.5, step: 0.05 },
  { key: "width", label: "크기", min: 0.65, max: 4.8, step: 0.05 },
  { key: "positionY", label: "Y 위치", min: -0.5, max: 1.4, step: 0.02 },
];

export function loadAlienPlacementsFromStorage(): Chapter3AlienPlacements {
  if (typeof window === "undefined") return clonePlacements(CHAPTER3_ALIEN_DEFAULT_PLACEMENTS);
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHAPTER3_ALIEN_PLACEMENT_STORAGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return clonePlacements(CHAPTER3_ALIEN_DEFAULT_PLACEMENTS);
    return {
      alien1: { ...CHAPTER3_ALIEN_DEFAULT_PLACEMENTS.alien1, ...raw.alien1 },
      alien2: { ...CHAPTER3_ALIEN_DEFAULT_PLACEMENTS.alien2, ...raw.alien2 },
      alien3: { ...CHAPTER3_ALIEN_DEFAULT_PLACEMENTS.alien3, ...raw.alien3 },
    };
  } catch {
    return clonePlacements(CHAPTER3_ALIEN_DEFAULT_PLACEMENTS);
  }
}

export function saveAlienPlacementsToStorage(placements: Chapter3AlienPlacements) {
  window.localStorage.setItem(CHAPTER3_ALIEN_PLACEMENT_STORAGE_KEY, JSON.stringify(placements));
}

function clonePlacements(p: Chapter3AlienPlacements): Chapter3AlienPlacements {
  return {
    alien1: { ...p.alien1 },
    alien2: { ...p.alien2 },
    alien3: { ...p.alien3 },
  };
}

function formatOne(id: keyof Chapter3AlienPlacements, p: Chapter3AlienPlacement): string {
  const name = id;
  return `  ${name}: { positionX: ${p.positionX}, width: ${p.width}, positionY: ${p.positionY} },`;
}

export function formatAlienPlacementsForSource(placements: Chapter3AlienPlacements): string {
  return `export const CHAPTER3_ALIEN_DEFAULT_PLACEMENTS: Chapter3AlienPlacements = {\n${[
    formatOne("alien1", placements.alien1),
    formatOne("alien2", placements.alien2),
    formatOne("alien3", placements.alien3),
  ].join("\n")}\n};`;
}
