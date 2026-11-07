"use client";

import Chapter3InsideScreen from "@/components/scene3/Chapter3InsideScreen";
import {
  loadAlien2FaceFromStorage,
  loadAlien2GlassFromStorage,
  loadAlien2PartsFromStorage,
} from "@/constants/chapter3Alien2Config";
import {
  CHAPTER3_ALIEN3_DEFAULT_FACE,
  CHAPTER3_ALIEN3_DEFAULT_GLASS,
  CHAPTER3_ALIEN3_PARTS,
} from "@/constants/chapter3Alien3Config";
import { CHAPTER3_ALIEN_DEFAULT_FACE } from "@/constants/chapter3AlienFaceConfig";
import {
  loadInsideDecorFromStorage,
  saveInsideDecorToStorage,
} from "@/constants/chapter3InsideDecorConfig";
import { CHAPTER3_ALIEN_SHAPE_EDITOR } from "@/constants/chapter3InsideConfig";
import {
  CHAPTER3_ALIEN_DEFAULT_PARTS,
  cloneAlienParts,
  loadAlienPartsFromStorage,
} from "@/constants/chapter3AlienShape";

/** Planet inside — 외계인1 · 외계인2 (left) · 외계인3 metaball (right). */
export default function Chapter3Inside() {
  const initialParts = CHAPTER3_ALIEN_SHAPE_EDITOR
    ? cloneAlienParts(loadAlienPartsFromStorage())
    : cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS);

  return (
    <Chapter3InsideScreen
      config={{
        ariaLabel: "행성 안",
        initialParts,
        initialFace: { ...CHAPTER3_ALIEN_DEFAULT_FACE },
        loadParts: () =>
          CHAPTER3_ALIEN_SHAPE_EDITOR
            ? cloneAlienParts(loadAlienPartsFromStorage())
            : cloneAlienParts(CHAPTER3_ALIEN_DEFAULT_PARTS),
        loadDecor: loadInsideDecorFromStorage,
        saveDecor: saveInsideDecorToStorage,
        alien2: {
          parts: loadAlien2PartsFromStorage(),
          face: loadAlien2FaceFromStorage(),
          glass: loadAlien2GlassFromStorage(),
          loadParts: loadAlien2PartsFromStorage,
          loadFace: loadAlien2FaceFromStorage,
          loadGlass: loadAlien2GlassFromStorage,
        },
        alien3: {
          parts: cloneAlienParts(CHAPTER3_ALIEN3_PARTS),
          face: { ...CHAPTER3_ALIEN3_DEFAULT_FACE },
          glass: CHAPTER3_ALIEN3_DEFAULT_GLASS,
          loadParts: () => cloneAlienParts(CHAPTER3_ALIEN3_PARTS),
          loadFace: () => ({ ...CHAPTER3_ALIEN3_DEFAULT_FACE }),
        },
      }}
    />
  );
}
