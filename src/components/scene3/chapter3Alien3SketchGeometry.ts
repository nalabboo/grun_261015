import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import {
  CHAPTER3_ALIEN3_SKETCH_MAP,
  CHAPTER3_ALIEN3_SKETCH_TRACE,
  CHAPTER3_ALIEN3_VOLUME,
} from "@/constants/chapter3Alien3Config";
import {
  CHAPTER3_ALIEN_PX_CENTER_X,
  CHAPTER3_ALIEN_PX_CENTER_Y,
  CHAPTER3_ALIEN_PX_SCALE,
  pxToLocal,
} from "@/components/scene3/chapter3AlienGeometry";

const FIELD_RES = 96;

type DesignPoint = { px: number; py: number };

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sketch: ${url}`));
    img.src = url;
  });
}

function dilate(mask: Uint8Array, w: number, h: number, radius: number) {
  const out = new Uint8Array(mask);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (dx * dx + dy * dy <= radius * radius) out[ny * w + nx] = 1;
        }
      }
    }
  }
  return out;
}

function fillSilhouette(ink: Uint8Array, w: number, h: number) {
  const outside = new Uint8Array(w * h);
  const stack: [number, number][] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (outside[i] || ink[i]) return;
    outside[i] = 1;
    stack.push([x, y]);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const [x, y] = stack.pop()!;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  const filled = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) filled[i] = ink[i] || !outside[i] ? 1 : 0;
  return filled;
}

function traceOuterContour(filled: Uint8Array, w: number, h: number) {
  let startX = -1;
  let startY = -1;
  outer: for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!filled[i]) continue;
      if (!filled[i - 1] || !filled[i + 1] || !filled[i - w] || !filled[i + w]) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX < 0) return [] as [number, number][];

  const dirs: [number, number][] = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && filled[y * w + x];

  const contour: [number, number][] = [];
  let x = startX;
  let y = startY;
  let dir = 0;
  const maxSteps = w * h * 4;
  for (let step = 0; step < maxSteps; step++) {
    contour.push([x, y]);
    let turn = 0;
    let moved = false;
    while (turn < 8) {
      const nd = (dir + 6 + turn) % 8;
      const nx = x + dirs[nd][0];
      const ny = y + dirs[nd][1];
      if (at(nx, ny)) {
        x = nx;
        y = ny;
        dir = nd;
        moved = true;
        break;
      }
      turn++;
    }
    if (!moved) break;
    if (x === startX && y === startY && contour.length > 8) break;
  }
  return contour;
}

function simplify(points: [number, number][], minDist: number) {
  if (points.length < 3) return points;
  const out: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [lx, ly] = out[out.length - 1];
    const [px, py] = points[i];
    if (Math.hypot(px - lx, py - ly) >= minDist) out.push([px, py]);
  }
  const [fx, fy] = out[0];
  const [lx, ly] = out[out.length - 1];
  if (Math.hypot(fx - lx, fy - ly) >= minDist) out.push([fx, fy]);
  return out;
}

function imagePxToDesignPx(imgX: number, imgY: number, bbox: { cx: number; cy: number; h: number }) {
  const scale = CHAPTER3_ALIEN3_SKETCH_MAP.designHeight / bbox.h;
  return {
    px: (imgX - bbox.cx) * scale + CHAPTER3_ALIEN3_SKETCH_MAP.designCenterX,
    py: (imgY - bbox.cy) * scale + CHAPTER3_ALIEN3_SKETCH_MAP.designCenterY,
  };
}

function bboxOfFilled(filled: Uint8Array, w: number, h: number) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!filled[y * w + x]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    h: Math.max(1, maxY - minY),
  };
}

function pointInPolygon(px: number, py: number, poly: DesignPoint[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].px;
    const yi = poly[i].py;
    const xj = poly[j].px;
    const yj = poly[j].py;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby + 1e-9)));
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  return Math.hypot(px - qx, py - qy);
}

/** Signed distance to polygon outline (negative = inside). */
function sdPolygon2d(px: number, py: number, poly: DesignPoint[]) {
  let minDist = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    minDist = Math.min(minDist, distToSegment(px, py, a.px, a.py, b.px, b.py));
  }
  return pointInPolygon(px, py, poly) ? -minDist : minDist;
}

/** Rounded extrusion of 2D silhouette — soft glass volume like metaball aliens. */
function sdSketchVolume(px: number, py: number, pz: number, poly: DesignPoint[]) {
  const { halfDepthRz, surfaceRound } = CHAPTER3_ALIEN3_VOLUME;
  const d2 = sdPolygon2d(px, py, poly);
  const qx = Math.max(d2, 0);
  const qy = Math.max(Math.abs(pz) - halfDepthRz, 0);
  const outside = Math.hypot(qx, qy);
  const inside = Math.min(Math.max(d2, Math.abs(pz) - halfDepthRz), 0);
  return outside + inside - surfaceRound;
}

function buildVolumeMeshFromPolygon(poly: DesignPoint[]) {
  let minPx = Infinity;
  let maxPx = -Infinity;
  let minPy = Infinity;
  let maxPy = -Infinity;
  for (const p of poly) {
    minPx = Math.min(minPx, p.px);
    maxPx = Math.max(maxPx, p.px);
    minPy = Math.min(minPy, p.py);
    maxPy = Math.max(maxPy, p.py);
  }
  const pad = CHAPTER3_ALIEN3_VOLUME.surfaceRound + CHAPTER3_ALIEN3_VOLUME.halfDepthRz * 0.35;
  const bounds = new THREE.Box3();
  bounds.expandByPoint(
    pxToLocal(minPx - pad, maxPy + pad, -CHAPTER3_ALIEN3_VOLUME.halfDepthRz - pad),
  );
  bounds.expandByPoint(
    pxToLocal(maxPx + pad, minPy - pad, CHAPTER3_ALIEN3_VOLUME.halfDepthRz + pad),
  );
  bounds.expandByScalar(0.06);

  const size = FIELD_RES;
  const half = size / 2;
  const mc = new MarchingCubes(size, new THREE.MeshBasicMaterial(), false, false, 300000);
  mc.isolation = 0;
  mc.reset();
  mc.field.fill(-1);

  const toCell = (v: number) => Math.round(v * half + half);
  const clampCell = (v: number) => Math.min(size - 2, Math.max(1, v));
  const x0 = clampCell(toCell(bounds.min.x));
  const x1 = clampCell(toCell(bounds.max.x));
  const y0 = clampCell(toCell(bounds.min.y));
  const y1 = clampCell(toCell(bounds.max.y));
  const z0 = clampCell(toCell(bounds.min.z));
  const z1 = clampCell(toCell(bounds.max.z));

  for (let z = z0; z <= z1; z++) {
    const pz = ((z - half) / half) / CHAPTER3_ALIEN_PX_SCALE;
    for (let y = y0; y <= y1; y++) {
      const py = CHAPTER3_ALIEN_PX_CENTER_Y - ((y - half) / half) / CHAPTER3_ALIEN_PX_SCALE;
      for (let x = x0; x <= x1; x++) {
        const px = ((x - half) / half) / CHAPTER3_ALIEN_PX_SCALE + CHAPTER3_ALIEN_PX_CENTER_X;
        mc.field[x + y * size + z * size * size] = -sdSketchVolume(px, py, pz, poly);
      }
    }
  }
  mc.update();

  const count = mc.geometry.drawRange.count;
  const position = mc.geometry.getAttribute("position").array.slice(0, count * 3);
  const normal = mc.geometry.getAttribute("normal").array.slice(0, count * 3);
  mc.geometry.dispose();
  (mc.material as THREE.Material).dispose();

  for (let i = 0; i < normal.length; i += 3) {
    const len = Math.hypot(normal[i], normal[i + 1], normal[i + 2]) || 1;
    normal[i] /= len;
    normal[i + 1] /= len;
    normal[i + 2] /= len;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geometry.computeBoundingBox();
  return geometry;
}

async function traceSketchDesignPolygon(sketchUrl: string): Promise<DesignPoint[]> {
  const img = await loadImage(sketchUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const lum = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    ink[i] = lum < CHAPTER3_ALIEN3_SKETCH_TRACE.inkLuminanceMax ? 1 : 0;
  }

  const dilated = dilate(ink, w, h, CHAPTER3_ALIEN3_SKETCH_TRACE.dilateRadius);
  const filled = fillSilhouette(dilated, w, h);
  const raw = traceOuterContour(filled, w, h);
  if (raw.length < 12) throw new Error("Sketch silhouette trace failed — outline not closed?");

  const bbox = bboxOfFilled(filled, w, h);
  const simplified = simplify(raw, CHAPTER3_ALIEN3_SKETCH_TRACE.simplifyMinPx);
  return simplified.map(([ix, iy]) => imagePxToDesignPx(ix, iy, bbox));
}

/** Sketch outline → rounded 3D glass volume (marching cubes, same pipeline as other aliens). */
export async function buildAlien3SketchGeometry(sketchUrl: string): Promise<THREE.BufferGeometry> {
  const polygon = await traceSketchDesignPolygon(sketchUrl);
  return buildVolumeMeshFromPolygon(polygon);
}
