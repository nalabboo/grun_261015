import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import type { Chapter3AlienPart } from "@/constants/chapter3AlienShape";

/** Reference pixels → marching-cubes space (-1..1). */
export const CHAPTER3_ALIEN_PX_SCALE = 1.7 / 950;
export const CHAPTER3_ALIEN_PX_CENTER_X = 515;
export const CHAPTER3_ALIEN_PX_CENTER_Y = 250;

export const CHAPTER3_ALIEN_FACE_CENTER_PX = [725, 165] as const;
export const CHAPTER3_ALIEN_FACE_SIZE_PX = [140, 80] as const;

const FIELD_RES = 96;

export function pxToLocal(px: number, py: number, pz = 0) {
  return new THREE.Vector3(
    (px - CHAPTER3_ALIEN_PX_CENTER_X) * CHAPTER3_ALIEN_PX_SCALE,
    (CHAPTER3_ALIEN_PX_CENTER_Y - py) * CHAPTER3_ALIEN_PX_SCALE,
    pz * CHAPTER3_ALIEN_PX_SCALE,
  );
}

function ellipsoidSdf(px: number, py: number, pz: number, rx: number, ry: number, rz: number) {
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return (k0 * (k0 - 1)) / k1;
}

function smoothMin(a: number, b: number, k: number) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function alienSdf(parts: Chapter3AlienPart[], x: number, y: number, z: number) {
  let d = Infinity;
  for (const { cx, cy, cz, rx, ry, rz, blend } of parts) {
    d = smoothMin(d, ellipsoidSdf(x - cx, y - cy, z - cz, rx, ry, rz), blend);
  }
  return d;
}

export function buildAlienGeometry(parts: Chapter3AlienPart[]) {
  const size = FIELD_RES;
  const half = size / 2;
  const mc = new MarchingCubes(size, new THREE.MeshBasicMaterial(), false, false, 300000);
  mc.isolation = 0;
  mc.reset();
  mc.field.fill(-1);

  const bounds = new THREE.Box3();
  for (const { cx, cy, cz, rx, ry, rz } of parts) {
    bounds.expandByPoint(pxToLocal(cx - rx, cy + ry, cz - rz));
    bounds.expandByPoint(pxToLocal(cx + rx, cy - ry, cz + rz));
  }
  bounds.expandByScalar(0.08);
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
        mc.field[x + y * size + z * size * size] = -alienSdf(parts, px, py, pz);
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

type EtchStroke = { points: [number, number][]; closed: boolean; width: number };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `eyeOpen` 1 = open, 0 = closed (squashed etched rings). */
export function drawEtchedFaceCanvas(eyeOpen = 1) {
  const FACE_SIZE_PX = CHAPTER3_ALIEN_FACE_SIZE_PX;
  const FACE_CENTER_PX = CHAPTER3_ALIEN_FACE_CENTER_PX;
  const W = 1024;
  const s = W / FACE_SIZE_PX[0];
  const H = Math.round(FACE_SIZE_PX[1] * s);
  const ox = FACE_CENTER_PX[0] - FACE_SIZE_PX[0] / 2;
  const oy = FACE_CENTER_PX[1] - FACE_SIZE_PX[1] / 2;
  const toCanvas = (px: number, py: number): [number, number] => [(px - ox) * s, (py - oy) * s];
  const eyeY = 150;
  const open = Math.max(0.04, Math.min(1, eyeOpen));
  const rand = mulberry32(0x8a3c11);

  const strokes: EtchStroke[] = [688, 762].map((ex) => ({
    points: Array.from({ length: 160 }, (_, i) => {
      const a = (i / 160) * Math.PI * 2;
      return toCanvas(ex + Math.cos(a) * 10.5, eyeY + Math.sin(a) * 7 * open);
    }),
    closed: true,
    width: 4.2 * s,
  }));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const normalAt = (st: EtchStroke, i: number) => {
    const n = st.points.length;
    const prev = st.points[st.closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = st.points[st.closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    return [-dy / len, dx / len] as const;
  };
  const tracePath = (st: EtchStroke, offset: number) => {
    ctx.beginPath();
    st.points.forEach((p, i) => {
      const [nx, ny] = normalAt(st, i);
      const x = p[0] + nx * offset;
      const y = p[1] + ny * offset;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (st.closed) ctx.closePath();
  };

  ctx.strokeStyle = "rgba(220, 225, 228, 0.92)";
  for (const st of strokes) {
    ctx.lineWidth = st.width;
    tracePath(st, 0);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-atop";
  for (const st of strokes) {
    ctx.lineWidth = 0.32 * s;
    for (let i = 0; i < st.points.length; i += 2) {
      const [x, y] = st.points[i];
      const [nx, ny] = normalAt(st, i);
      const half = st.width * (0.5 + rand() * 0.1);
      const jitter = (rand() - 0.5) * 0.25;
      ctx.strokeStyle = `rgba(150, 156, 161, ${0.18 + rand() * 0.25})`;
      ctx.beginPath();
      ctx.moveTo(x - (nx + jitter * ny) * half, y - (ny - jitter * nx) * half);
      ctx.lineTo(x + (nx - jitter * ny) * half, y + (ny + jitter * nx) * half);
      ctx.stroke();
    }
  }
  for (let k = 0; k < 9000; k++) {
    const light = rand() < 0.6;
    ctx.fillStyle = light
      ? `rgba(255, 255, 255, ${0.6 + rand() * 0.4})`
      : `rgba(120, 126, 131, ${0.3 + rand() * 0.3})`;
    const r = (0.25 + rand() * 0.6) * s;
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, r / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(84, 90, 95, 0.75)";
  ctx.lineWidth = 0.9 * s;
  for (const st of strokes) {
    for (const side of [-1, 1]) {
      tracePath(st, (side * st.width) / 2);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}
