"use client";

import { getChapter2BergViewportBlurPx } from "@/constants/chapter2Config";
import {
  chapter2PropAssetUrl,
  type Chapter2PropConfig,
} from "@/constants/chapter2ObjectsConfig";
import {
  resolveChapter2PropBlurRatio,
  type Chapter2PropEdit,
} from "@/constants/chapter2ObjectsConfig";
import type { EditorMode } from "@/components/canvas/worldView";
import { CHAPTER2_GREEN_SPOTLIGHT_CHARACTER_PROP_ID } from "@/constants/chapter2Subscene24ClickMarimo";
type Props = {
  prop: Chapter2PropConfig;
  viewportHeight: number;
  shiftX: number;
  shiftY: number;
  /** Multiplier when prop is fixed to a berg layer depth scale. */
  bergScale?: number;
  /** Scroll-driven scale (grun / spore segments). */
  scrollScaleMul?: number;
  /** Optional Y-only scale multiplier (defaults to scrollScaleMul). */
  scrollScaleYMul?: number;
  /** Scroll-driven opacity (nari reveal). */
  scrollOpacity?: number;
  /** Scene 2-3 extra Y (px, downward). */
  layoutYOffset?: number;
  /** Scene 2-3 extra X (px, rightward). */
  layoutXOffset?: number;
  layout: Chapter2PropEdit;
  editorActive?: boolean;
  isSelected?: boolean;
  editMode?: EditorMode;
  onSelect?: () => void;
  onDragStart?: (clientX: number, clientY: number) => void;
  /** Dim overlay hole on grun_v (초록이). */
  greenSpotlightCharacterTarget?: boolean;
};

export default function Chapter2PropLayer({
  prop,
  viewportHeight,
  shiftX,
  shiftY,
  bergScale = 1,
  scrollScaleMul = 1,
  scrollScaleYMul,
  scrollOpacity = 1,
  layoutYOffset = 0,
  layoutXOffset = 0,
  layout,
  editorActive = false,
  isSelected = true,
  editMode = "translate",
  onSelect,
  onDragStart,
  greenSpotlightCharacterTarget = false,
}: Props) {
  const src = chapter2PropAssetUrl(prop.file);
  const aspect = prop.width / prop.height;

  const className = [
    "chapter2-prop",
    greenSpotlightCharacterTarget ? "chapter2-green-spotlight-target" : "",
    greenSpotlightCharacterTarget && prop.id === CHAPTER2_GREEN_SPOTLIGHT_CHARACTER_PROP_ID
      ? "chapter2-green-spotlight-target-hero"
      : "",
    editorActive ? "chapter2-prop--editable" : "",
    isSelected && editorActive ? "chapter2-prop--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const blurPx = getChapter2BergViewportBlurPx(
    viewportHeight,
    resolveChapter2PropBlurRatio(prop, layout),
  );
  const filterParts = [`brightness(${prop.brightness})`];
  if (blurPx >= 0.4) {
    filterParts.push(`blur(${blurPx.toFixed(2)}px)`);
  }
  if (scrollOpacity <= 0.001) {
    return null;
  }

  const layoutAnchorY = prop.layoutAnchor === "top" ? "0%" : "-100%";
  const transformOrigin = prop.transformOrigin ?? "50% 100%";
  const scaleYMul = scrollScaleYMul ?? scrollScaleMul;
  const scaleX = layout.scale * bergScale * scrollScaleMul;
  const scaleY = layout.scaleY * bergScale * scaleYMul;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      decoding="async"
      style={{
        zIndex: isSelected && editorActive ? 45 : prop.zIndex,
        height: `${prop.heightVh * 100}vh`,
        width: "auto",
        aspectRatio: String(aspect),
        opacity: scrollOpacity,
        pointerEvents: editorActive ? "auto" : "none",
        cursor: editorActive
          ? editMode === "translate"
            ? "grab"
            : "ns-resize"
          : undefined,
        filter: filterParts.join(" "),
        transformOrigin,
        transform: `translate(calc(-50% + ${shiftX + layout.x + layoutXOffset}px), calc(${layoutAnchorY} + ${shiftY + layout.y + layoutYOffset}px)) scale(${scaleX}, ${scaleY}) rotate(${layout.rotate}deg)`,
      }}
      onPointerDown={(event) => {
        if (!editorActive) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect?.();
        onDragStart?.(event.clientX, event.clientY);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
    />
  );
}
