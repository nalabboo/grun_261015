/** Mutable input shared between the DOM (scroll/pointer) and the render loop. */
export type DepthInput = {
  /** 0 → 1 across the whole scroll range. */
  progress: number;
  /** −1 (left) → 1 (right). */
  pointerX: number;
  /** −1 (bottom) → 1 (top). */
  pointerY: number;
};

export function createDepthInput(): DepthInput {
  return { progress: 0, pointerX: 0, pointerY: 0 };
}

/** Shared editor pointer flags — kept off the React tree so gizmos can lock the camera. */
export const depthEditorFlags = {
  gizmoDragging: false,
};
