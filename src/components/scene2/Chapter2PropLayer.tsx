"use client";

import { getChapter2BergViewportBlurPx } from "@/constants/chapter2Config";
import {
  chapter2PropAssetUrl,
  type Chapter2PropConfig,
} from "@/constants/chapter2ObjectsConfig";
import type { Chapter2BergEditTransform } from "@/constants/chapter2Layout";
import type { EditorMode } from "@/components/canvas/worldView";
type Props = {
  prop: Chapter2PropConfig;
  viewportHeight: number;
  shiftX: number;
  shiftY: number;
  layout: Chapter2BergEditTransform;
  editorActive?: boolean;
  isSelected?: boolean;
  editMode?: EditorMode;
  onSelect?: () => void;
  onDragStart?: (clientX: number, clientY: number) => void;
};

export default function Chapter2PropLayer({
  prop,
  viewportHeight,
  shiftX,
  shiftY,
  layout,
  editorActive = false,
  isSelected = true,
  editMode = "translate",
  onSelect,
  onDragStart,
}: Props) {
  const src = chapter2PropAssetUrl(prop.file);
  const aspect = prop.width / prop.height;

  const className = [
    "chapter2-prop",
    editorActive ? "chapter2-prop--editable" : "",
    isSelected && editorActive ? "chapter2-prop--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const blurPx = getChapter2BergViewportBlurPx(viewportHeight, prop.blurRatio);
  const filterParts = [`brightness(${prop.brightness})`];
  if (blurPx >= 0.4) {
    filterParts.push(`blur(${blurPx.toFixed(2)}px)`);
  }

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
        pointerEvents: editorActive ? "auto" : "none",
        cursor: editorActive
          ? editMode === "translate"
            ? "grab"
            : "ns-resize"
          : undefined,
        filter: filterParts.join(" "),
        transformOrigin: "50% 100%",
        transform: `translate(calc(-50% + ${shiftX + layout.x}px), calc(-100% + ${shiftY + layout.y}px)) scale(${layout.scale}, ${layout.scaleY}) rotate(${layout.rotate}deg)`,
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
