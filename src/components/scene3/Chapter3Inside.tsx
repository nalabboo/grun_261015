"use client";

import Chapter3InsideScreen from "@/components/scene3/Chapter3InsideScreen";
import {
  loadAlien2FaceFromStorage,
  loadAlien2GlassFromStorage,
  loadAlien2PartsFromStorage,
} from "@/constants/chapter3Alien2Config";
import {
  loadAlien3FaceFromStorage,
  loadAlien3GlassFromStorage,
  saveAlien3FaceToStorage,
  saveAlien3GlassToStorage,
} from "@/constants/chapter3Alien3Config";
import { loadAlienFaceFromStorage } from "@/constants/chapter3AlienFaceConfig";
import { CHAPTER3_ALIEN_SHAPE_EDITOR } from "@/constants/chapter3InsideConfig";
import {
  CHAPTER3_ALIEN_DEFAULT_PARTS,
  cloneAlienParts,
  loadAlienPartsFromStorage,
} from "@/constants/chapter3AlienShape";

/** Planet inside — 외계인1 · 외계인2 (left) · 외계인3 sketch (right). Panel: 외계인3 only. */
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
          parts: loadAlien2PartsFromStorage(),
          face: loadAlien2FaceFromStorage(),
          glass: loadAlien2GlassFromStorage(),
          loadParts: loadAlien2PartsFromStorage,
          loadFace: loadAlien2FaceFromStorage,
          loadGlass: loadAlien2GlassFromStorage,
        },
        alien3: {
          face: loadAlien3FaceFromStorage(),
          glass: loadAlien3GlassFromStorage(),
          loadFace: loadAlien3FaceFromStorage,
          loadGlass: loadAlien3GlassFromStorage,
          saveFace: saveAlien3FaceToStorage,
          saveGlass: saveAlien3GlassToStorage,
        },
      }}
    />
  );
}
