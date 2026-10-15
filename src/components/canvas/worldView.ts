import type { MutableRefObject } from "react";
import type { GifMovie } from "@/lib/gifMovie";

export type RevealPhase = "b" | "revealing" | "g";

/** Mutable per-frame view state shared between SceneStage (DOM/state) and WebGL. */
export type WorldView = {
  worldScroll: number;
  grunWorldX: number;
};

export type WorldViewRef = MutableRefObject<WorldView>;

/** Bridge between the walk-cycle GIF and the WebGL grun texture. */
export type GrunFrameSource = {
  img: HTMLImageElement | null;
  /** Decoded walk cycle. Null until the GIF has been parsed. */
  movie: GifMovie | null;
  /** performance/Date origin of the current walk, matching SceneStage. */
  playStartMs: number;
  /** True while grun is walking, so the texture follows the GIF frames. */
  animating: boolean;
  /** Force a single re-draw (standing pose, or the movie just became ready). */
  dirty: boolean;
};

export type GrunFrameSourceRef = MutableRefObject<GrunFrameSource>;

export function createGrunFrameSource(): GrunFrameSource {
  return { img: null, movie: null, playStartMs: 0, animating: false, dirty: true };
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
  "frosch",
] as const;

export type CardId = (typeof CARD_IDS)[number];

export type EditorMode = "translate" | "rotate" | "scale";

export type EditorState = {
  enabled: boolean;
  selectedId: CardId | null;
  mode: EditorMode;
};
