"use client";

import { useEffect, useState } from "react";
import { SCENE_REFERENCE_HEIGHT } from "@/constants/sceneConfig";
import {
  CHAPTER2_SKIP_BERG_BAKE,
  chapter2AssetUrl,
  chapter2LayerAssetUrl,
  getChapter2BergViewportBlurPx,
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

/** Stagger bakes so the main thread can paint raw PNGs first (berg4 → berg3 → berg2). */
const BAKE_STAGGER_MS: Record<string, number> = {
  berg4: 80,
  berg3: 520,
  berg2: 960,
};

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

function scheduleIdleWork(work: () => void, delayMs: number) {
  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(work, { timeout: 4000 });
    } else {
      window.requestAnimationFrame(work);
    }
  }, delayMs);
}

function useBakedBergSrc(layer: Chapter2BergLayerConfig, file: string) {
  const layerAssetUrl = chapter2AssetUrl(file);
  const [src, setSrc] = useState(layerAssetUrl);
  const cacheKey = `${layer.id}|${file}`;

  useEffect(() => {
    if (CHAPTER2_SKIP_BERG_BAKE) {
      setSrc(layerAssetUrl);
      return;
    }

    const cached = bakedSrcCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    let objectUrlToRevoke: string | null = null;
    const image = new Image();
    image.decoding = "async";

    const runBake = () => {
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

    image.onload = () => {
      if (cancelled) return;
      scheduleIdleWork(runBake, BAKE_STAGGER_MS[layer.id] ?? 200);
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
  }, [cacheKey, file, layer, layerAssetUrl]);

  return { src, layerAssetUrl };
}

type Props = {
  layer: Chapter2BergLayerConfig;
  viewportHeight: number;
  shiftX: number;
  shiftY: number;
  /** Scroll-driven Y offset (px), added to layout shift. */
  scrollYOffset?: number;
  /** 0 = scene 2-1 texture, 1 = scrollAltFile (scene 2-2). */
  scrollBlend?: number;
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
  viewportHeight,
  shiftX,
  shiftY,
  scrollYOffset = 0,
  scrollBlend = 0,
  scale,
  edit = DEFAULT_CHAPTER2_BERG_EDIT,
  editorActive = false,
  isSelected = false,
  editMode = "translate",
  onSelect,
  onDragStart,
}: Props) {
  const base = useBakedBergSrc(layer, layer.file);
  const alt = useBakedBergSrc(layer, layer.scrollAltFile ?? layer.file);

  const aspect = layer.width / layer.height;
  const scaleY = layer.scaleY ?? 1;

  const anchor = layer.anchor ?? "center";
  const anchoredTop = anchor === "bottom" ? "100%" : "50%";
  const translateY = shiftY + edit.y + scrollYOffset;
  const anchoredTranslateY =
    anchor === "bottom"
      ? `calc(-100% + ${translateY}px)`
      : `calc(-50% + ${translateY}px)`;

  const className = [
    "chapter2-berg",
    anchor === "bottom" ? "chapter2-berg--floor" : "",
    editorActive ? "chapter2-berg--editable" : "",
    isSelected ? "chapter2-berg--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const blend = layer.scrollAltFile
    ? Math.min(1, Math.max(0, scrollBlend))
    : 0;
  const baseOpacity = 1 - blend;
  const altOpacity = blend;

  const renderImage = (
    key: string,
    src: string,
    fallbackUrl: string,
    opacity: number,
    capturePointer: boolean,
  ) => {
    const textureIsBaked = src.startsWith("blob:");
    const cssBlurPx =
      CHAPTER2_SKIP_BERG_BAKE || !textureIsBaked
        ? getChapter2BergViewportBlurPx(viewportHeight, layer.blurRatio)
        : 0;
    const filterParts = [`brightness(${layer.brightness})`];
    if (cssBlurPx >= 0.4) {
      filterParts.push(`blur(${cssBlurPx.toFixed(2)}px)`);
    }

    if (opacity <= 0.001) return null;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={key}
        src={src}
        alt=""
        draggable={false}
        className={className}
        decoding="async"
        style={{
          top: anchoredTop,
          zIndex: isSelected ? 40 : layer.depth,
          pointerEvents: editorActive && capturePointer ? "auto" : "none",
          ...(editorActive && isSelected && capturePointer
            ? {
                cursor: editMode === "translate" ? "grab" : "ns-resize",
              }
            : editorActive && capturePointer
              ? { cursor: "pointer" }
              : null),
          ["--berg-aspect" as string]: String(aspect),
          objectPosition: layer.objectPosition ?? "center center",
          filter: filterParts.join(" "),
          transformOrigin: layer.transformOrigin ?? "center center",
          transform: `translate(calc(-50% + ${shiftX + edit.x}px), ${anchoredTranslateY}) scale(${scale * edit.scale}, ${scale * scaleY * edit.scaleY}) rotate(${edit.rotate}deg)`,
          opacity,
        }}
        onError={() => {
          if (src !== fallbackUrl) {
            /* raw fallback handled by hook on next load */
          }
        }}
        onPointerDown={(event) => {
          if (!editorActive || !capturePointer) return;
          event.preventDefault();
          event.stopPropagation();
          onSelect?.();
          onDragStart?.(event.clientX, event.clientY);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
      />
    );
  };

  const pointerOnAlt = blend >= 0.5;

  return (
    <>
      {renderImage("base", base.src, base.layerAssetUrl, baseOpacity, !pointerOnAlt)}
      {layer.scrollAltFile &&
        renderImage("alt", alt.src, alt.layerAssetUrl, altOpacity, pointerOnAlt)}
    </>
  );
}
