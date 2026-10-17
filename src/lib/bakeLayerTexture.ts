import * as THREE from "three";
import { gaussianBlurStraightRGBA } from "./gaussianBlur";
import { getPaperGrainField, type PaperGrainField } from "./paperGrain";

export type BakedLayerTexture = {
  map: THREE.CanvasTexture;
  /** Padding around the content, as a fraction of content width / height. */
  padX: number;
  padY: number;
};

function sampleGrain(field: PaperGrainField, u: number, v: number) {
  const { size, values } = field;
  const x = (((u % 1) + 1) % 1) * size;
  const y = (((v % 1) + 1) % 1) * size;
  const x0 = Math.floor(x) % size;
  const y0 = Math.floor(y) % size;
  const x1 = (x0 + 1) % size;
  const y1 = (y0 + 1) % size;
  const tx = x - Math.floor(x);
  const ty = y - Math.floor(y);
  const i00 = values[y0 * size + x0];
  const i10 = values[y0 * size + x1];
  const i01 = values[y1 * size + x0];
  const i11 = values[y1 * size + x1];
  const a = i00 + (i10 - i00) * tx;
  const b = i01 + (i11 - i01) * tx;
  return (a + (b - a) * ty) / 255;
}

/** Same modulation the berg paper shader used: multiply plus a small add, alpha unchanged. */
function applyPaperGrain(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tilePx: number,
  strength: number,
  field: PaperGrainField,
) {
  const mulK = strength * 2;
  const addK = strength * 0.12 * 255;
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / tilePx;
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const grain = sampleGrain(field, (x + 0.5) / tilePx, v) - 0.5;
      const mul = 1 + grain * mulK;
      const add = grain * addK;
      const i = (row + x) * 4;
      data[i] = data[i] * mul + add;
      data[i + 1] = data[i + 1] * mul + add;
      data[i + 2] = data[i + 2] * mul + add;
    }
  }
}

/** Raking light for the mountain relief, towards the light (canvas y points down). */
const RELIEF_LIGHT_X = -0.55;
const RELIEF_LIGHT_Y = -0.75;
/** Relief is computed on a grid this fraction of the texture size. */
const RELIEF_GRID_SCALE = 0.25;

type ReliefField = { width: number; height: number; shade: Float32Array };

type ReliefShape = {
  /** Grid size as a fraction of the texture size. */
  gridScale: number;
  /** Dome softness as a fraction of the grid height (larger = rounder, puffier). */
  domeSigma: number;
  /** Dome height and painted-tone height, in grid px. */
  domeAmp: number;
  toneAmp: number;
};

const MOUNTAIN_SHAPE: ReliefShape = {
  gridScale: RELIEF_GRID_SCALE,
  domeSigma: 0.05,
  domeAmp: 30,
  toneAmp: 3.5,
};

/**
 * Builds a mountain-like height field from the painting (soft dome from the
 * silhouette plus the painted tones) and returns its lit slope as shade in
 * about -1..1 on a coarse grid.
 */
function buildReliefField(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  shape: ReliefShape = MOUNTAIN_SHAPE,
): ReliefField {
  const gw = Math.max(8, Math.round(width * shape.gridScale));
  const gh = Math.max(8, Math.round(height * shape.gridScale));

  // Box-average the source into the coarse grid: R = coverage, G = coverage * luma.
  const coverage = new Float32Array(gw * gh);
  const tone = new Float32Array(gw * gh);
  const counts = new Float32Array(gw * gh);
  for (let y = 0; y < height; y += 1) {
    const gy = Math.min(gh - 1, Math.floor((y * gh) / height));
    for (let x = 0; x < width; x += 1) {
      const gx = Math.min(gw - 1, Math.floor((x * gw) / width));
      const i = (y * width + x) * 4;
      const a = source[i + 3] / 255;
      const luma = (source[i] * 0.3 + source[i + 1] * 0.59 + source[i + 2] * 0.11) / 255;
      const g = gy * gw + gx;
      coverage[g] += a;
      tone[g] += a * luma;
      counts[g] += 1;
    }
  }

  const domeBuffer = new Uint8ClampedArray(gw * gh * 4);
  const toneBuffer = new Uint8ClampedArray(gw * gh * 4);
  for (let g = 0; g < gw * gh; g += 1) {
    const n = counts[g] || 1;
    const o = g * 4;
    domeBuffer[o] = (coverage[g] / n) * 255;
    domeBuffer[o + 3] = 255;
    toneBuffer[o] = (tone[g] / n) * 255;
    toneBuffer[o + 3] = 255;
  }

  gaussianBlurStraightRGBA(domeBuffer, gw, gh, gh * shape.domeSigma);
  gaussianBlurStraightRGBA(toneBuffer, gw, gh, 2);

  const heights = new Float32Array(gw * gh);
  for (let g = 0; g < gw * gh; g += 1) {
    heights[g] =
      (domeBuffer[g * 4] / 255) * shape.domeAmp + (toneBuffer[g * 4] / 255) * shape.toneAmp;
  }

  const shade = new Float32Array(gw * gh);
  const at = (x: number, y: number) =>
    heights[Math.min(gh - 1, Math.max(0, y)) * gw + Math.min(gw - 1, Math.max(0, x))];
  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5;
      const value = -(dx * RELIEF_LIGHT_X + dy * RELIEF_LIGHT_Y);
      shade[y * gw + x] = Math.min(1, Math.max(-1, value));
    }
  }

  return { width: gw, height: gh, shade };
}

function applyRelief(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  field: ReliefField,
  strength: number,
) {
  const { width: gw, height: gh, shade } = field;
  for (let y = 0; y < height; y += 1) {
    const fy = Math.min(gh - 1, Math.max(0, (y + 0.5) * (gh / height) - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(gh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x += 1) {
      const fx = Math.min(gw - 1, Math.max(0, (x + 0.5) * (gw / width) - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(gw - 1, x0 + 1);
      const tx = fx - x0;
      const a = shade[y0 * gw + x0] + (shade[y0 * gw + x1] - shade[y0 * gw + x0]) * tx;
      const b = shade[y1 * gw + x0] + (shade[y1 * gw + x1] - shade[y1 * gw + x0]) * tx;
      const s = a + (b - a) * ty;
      const mul = 1 + s * strength;
      const i = (y * width + x) * 4;
      data[i] = data[i] * mul;
      data[i + 1] = data[i + 1] * mul;
      data[i + 2] = data[i + 2] * mul;
    }
  }
}

const bakedTextureCache = new Map<string, BakedLayerTexture>();

/**
 * Draws a berg layer into a canvas with depth blur and paper grain baked in.
 *
 * Safari ignores `CanvasRenderingContext2D.filter` (the blur never happens) and
 * does not show the previous grain shader, so Chromium and Safari diverged.
 * Baking both into the pixels makes every browser render the same texture.
 */
export function createBakedLayerTexture(
  image: HTMLImageElement,
  blurCanvasPx: number,
  stretchX: number,
  maxTextureSize: number,
  paperStrength: number,
  tilesAcross: number,
  reliefStrength = 0,
): BakedLayerTexture {
  const cacheKey = [
    image.src,
    blurCanvasPx,
    stretchX,
    maxTextureSize,
    paperStrength,
    tilesAcross,
    reliefStrength,
  ].join("|");
  const cached = bakedTextureCache.get(cacheKey);
  if (cached) return cached;

  const contentW = image.naturalWidth * stretchX;
  const contentH = image.naturalHeight;
  const pad = Math.ceil(Math.max(blurCanvasPx, 0) * 3);
  const k = Math.min(1, maxTextureSize / (contentW + pad * 2));

  const cw = Math.max(1, Math.round(contentW * k));
  const ch = Math.max(1, Math.round(contentH * k));
  const p = Math.round(pad * k);
  const width = cw + p * 2;
  const height = ch + p * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not bake a berg layer texture");
  }

  ctx.drawImage(image, p, p, cw, ch);

  const radius = blurCanvasPx * k;
  const needsBlur = radius >= 0.5;
  const needsPaper = paperStrength > 0;
  const needsRelief = reliefStrength > 0;
  if (needsBlur || needsPaper || needsRelief) {
    const pixels = ctx.getImageData(0, 0, width, height);
    // Relief reads the sharp painting, then shades the (possibly blurred) result.
    const reliefField = needsRelief ? buildReliefField(pixels.data, width, height) : null;
    if (needsBlur) gaussianBlurStraightRGBA(pixels.data, width, height, radius);
    if (reliefField) applyRelief(pixels.data, width, height, reliefField, reliefStrength);
    if (needsPaper) {
      const tilePx = Math.max(cw / Math.max(tilesAcross, 1), 1);
      applyPaperGrain(pixels.data, width, height, tilePx, paperStrength, getPaperGrainField());
    }
    ctx.putImageData(pixels, 0, 0);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.NoColorSpace;
  map.anisotropy = 8;
  map.needsUpdate = true;

  const baked = { map, padX: p / cw, padY: p / ch };
  bakedTextureCache.set(cacheKey, baked);
  return baked;
}
