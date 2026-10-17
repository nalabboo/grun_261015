"use client";

import { useEffect, useState } from "react";
import { SCENE_REFERENCE_HEIGHT } from "@/constants/sceneConfig";
import {
  chapter2LayerAssetUrl,
  type Chapter2BergLayerConfig,
} from "@/constants/chapter2Config";
import {
  DEFAULT_CHAPTER2_BERG_EDIT,
  type Chapter2BergEditTransform,
} from "@/constants/chapter2Layout";
import type { EditorMode } from "@/components/canvas/worldView";
import { createBakedLayerTexture } from "@/lib/bakeLayerTexture";
import { PAPER_GRAIN_TILE_PX } from "@/lib/paperGrain";

const PAPER_TILE_DISPLAY_PX = PAPER_GRAIN_TILE_PX * 0.75;
const MAX_BAKE_TEXTURE_PX = 4096;

const bakedSrcCache = new Map<string, string>();

function revokeBakedSrc(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("canvas.toBlob returned null"));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      "image/png",
      0.92,
    );
  });
}

type Props = {
  layer: Chapter2BergLayerConfig;
  shiftX: number;
  shiftY: number;
  scale: number;
  edit?: Chapter2BergEditTransform;
  editorActive?: boolean;
  isSelected?: boolean;
  editMode?: EditorMode;
  onSelect?: () => void;
  onDragStart?: (clientX: number, clientY: number) => void;
};

/** One chapter-2 berg plane: CPU-baked blur/grain/relief like scene 1 WebGL bergs. */
export default function Chapter2BergLayer({
  layer,
  shiftX,
  shiftY,
  scale,
  edit = DEFAULT_CHAPTER2_BERG_EDIT,
  editorActive = false,
  isSelected = false,
  editMode = "translate",
  onSelect,
  onDragStart,
}: Props) {
  const layerAssetUrl = chapter2LayerAssetUrl(layer);
  const [src, setSrc] = useState(layerAssetUrl);
  const cacheKey = `${layer.id}|${layerAssetUrl}`;

  useEffect(() => {
    const cached = bakedSrcCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    let objectUrlToRevoke: string | null = null;
    const image = new Image();
    image.decoding = "async";

    image.onload = () => {
      if (cancelled) return;

      const blurCanvasPx =
        layer.blurRatio > 0
          ? (layer.blurRatio * image.naturalHeight) / layer.heightRatio
          : 0;
      const widthRatio = layer.width / layer.height;
      const tilesAcross = (SCENE_REFERENCE_HEIGHT * widthRatio) / PAPER_TILE_DISPLAY_PX;

      void (async () => {
        try {
          const baked = createBakedLayerTexture(
            image,
            blurCanvasPx,
            layer.stretchX ?? 1,
            MAX_BAKE_TEXTURE_PX,
            layer.paper,
            tilesAcross,
            layer.relief,
          );
          const canvas = baked.map.image as HTMLCanvasElement;
          const objectUrl = await canvasToObjectUrl(canvas);
          bakedSrcCache.set(cacheKey, objectUrl);
          if (cancelled) {
            revokeBakedSrc(objectUrl);
            return;
          }
          objectUrlToRevoke = objectUrl;
          setSrc(objectUrl);
        } catch {
          if (!cancelled) setSrc(layerAssetUrl);
        }
      })();
    };

    image.onerror = () => {
      if (!cancelled) setSrc(layerAssetUrl);
    };

    image.src = layerAssetUrl;
    return () => {
      cancelled = true;
      if (objectUrlToRevoke && !bakedSrcCache.has(cacheKey)) {
        revokeBakedSrc(objectUrlToRevoke);
      }
    };
  }, [cacheKey, layer, layerAssetUrl]);

  const aspect = layer.width / layer.height;
  const scaleY = layer.scaleY ?? 1;

  const anchor = layer.anchor ?? "center";
  const anchoredTop = anchor === "bottom" ? "100%" : "50%";
  const anchoredTranslateY =
    anchor === "bottom"
      ? `calc(-100% + ${shiftY + edit.y}px)`
      : `calc(-50% + ${shiftY + edit.y}px)`;

  const className = [
    "chapter2-berg",
    anchor === "bottom" ? "chapter2-berg--floor" : "",
    editorActive ? "chapter2-berg--editable" : "",
    isSelected ? "chapter2-berg--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      style={{
        top: anchoredTop,
        zIndex: isSelected ? 40 : layer.depth,
        pointerEvents: editorActive ? "auto" : "none",
        ...(editorActive && isSelected
          ? {
              cursor: editMode === "translate" ? "grab" : "ns-resize",
            }
          : editorActive
            ? { cursor: "pointer" }
            : null),
        ["--berg-aspect" as string]: String(aspect),
        objectPosition: layer.objectPosition ?? "center center",
        filter: `brightness(${layer.brightness})`,
        transformOrigin: layer.transformOrigin ?? "center center",
        transform: `translate(calc(-50% + ${shiftX + edit.x}px), ${anchoredTranslateY}) scale(${scale * edit.scale}, ${scale * scaleY * edit.scaleY}) rotate(${edit.rotate}deg)`,
      }}
      onError={() => {
        if (src !== layerAssetUrl) setSrc(layerAssetUrl);
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
