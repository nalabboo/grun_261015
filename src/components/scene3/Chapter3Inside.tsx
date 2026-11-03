"use client";

import Chapter3InsideScreen from "@/components/scene3/Chapter3InsideScreen";
import {
  CHAPTER3_ALIEN2_PARTS,
  loadAlien2FaceFromStorage,
  loadAlien2GlassFromStorage,
  loadAlien2PartsFromStorage,
  saveAlien2FaceToStorage,
  saveAlien2GlassToStorage,
  saveAlien2PartsToStorage,
} from "@/constants/chapter3Alien2Config";
import { loadAlienFaceFromStorage } from "@/constants/chapter3AlienFaceConfig";
import { CHAPTER3_ALIEN_SHAPE_EDITOR } from "@/constants/chapter3InsideConfig";
import {
  CHAPTER3_ALIEN_DEFAULT_PARTS,
  cloneAlienParts,
  loadAlienPartsFromStorage,
} from "@/constants/chapter3AlienShape";

/** Planet inside — 외계인1 + 외계인2 (left); only 외계인2 has the tuning panel. */
export default function Chapter3Inside() {
  const initialParts = CHAPTER3_ALIEN_SHAPE_EDITOR
    ? cloneAlienParts(loadAlienPartsFromStorage())
    : cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS);

  return (
    <Chapter3InsideScreen
      config={{
        ariaLabel: "행성 안",
        initialParts,
        initialFace: loadAlienFaceFromStorage(),
        loadParts: () =>
          CHAPTER3_ALIEN_SHAPE_EDITOR
            ? cloneAlienParts(loadAlienPartsFromStorage())
            : cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS),
        alien2: {
          parts: cloneAlienParts(CHAPTER3_ALIEN2_PARTS),
          face: loadAlien2FaceFromStorage(),
          glass: loadAlien2GlassFromStorage(),
          loadParts: loadAlien2PartsFromStorage,
          loadFace: loadAlien2FaceFromStorage,
          loadGlass: loadAlien2GlassFromStorage,
          saveParts: saveAlien2PartsToStorage,
          saveFace: saveAlien2FaceToStorage,
          saveGlass: saveAlien2GlassToStorage,
        },
      }}
    />
  );
}
