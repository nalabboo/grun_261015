import type { MutableRefObject } from "react";
import type { WalkMovie } from "@/lib/walkMovie";

export type RevealPhase = "b" | "revealing" | "g";

/** Mutable per-frame view state shared between SceneStage (DOM/state) and WebGL. */
export type WorldView = {
  worldScroll: number;
  grunWorldX: number;
};

export type WorldViewRef = MutableRefObject<WorldView>;

/** Bridge between the grun walk cycle and the WebGL grun texture. */
export type GrunFrameSource = {
  /** Walk-cycle frames. Null until they have loaded. */
  movie: WalkMovie | null;
  /** performance/Date origin of the current walk, matching SceneStage. */
  playStartMs: number;
  /** True while grun is walking, so the texture follows the walk frames. */
  animating: boolean;
  /** Force a single re-draw (standing pose, or the movie just became ready). */
  dirty: boolean;
};

export type GrunFrameSourceRef = MutableRefObject<GrunFrameSource>;

export function createGrunFrameSource(): GrunFrameSource {
  return { movie: null, playStartMs: 0, animating: false, dirty: true };
}

/** Scene cards that can be edited with TransformControls. */
export const CARD_IDS = [
  "berg4",
  "berg3",
  "kind",
  "grun",
  "stein",
  "berg2",
  "berg1",
  "moss1_b",
  "moss2_b-left",
  "moss2_b-right",
  "worm",
  "ampel",
  "spore_0","spore_1","spore_2","spore_3","spore_4","spore_5",
  "spore_6","spore_7","spore_8","spore_9","spore_10","spore_11",
  "spore_12","spore_13","spore_14",
] as const;

export type CardId = (typeof CARD_IDS)[number];

export type EditorMode = "translate" | "rotate" | "scale";

export type EditorState = {
  enabled: boolean;
  selectedId: CardId | null;
  mode: EditorMode;
};
