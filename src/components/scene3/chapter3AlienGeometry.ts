import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import type { Chapter3AlienPart } from "@/constants/chapter3AlienShape";

/** Reference pixels → marching-cubes space (-1..1). */
export const CHAPTER3_ALIEN_PX_SCALE = 1.7 / 950;
export const CHAPTER3_ALIEN_PX_CENTER_X = 515;
export const CHAPTER3_ALIEN_PX_CENTER_Y = 250;

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

/** Rotate local offset into the part's oriented frame (degrees, Z → Y → X). */
function partLocalOffset(dx: number, dy: number, dz: number, rotX: number, rotY: number, rotZ: number) {
  const toRad = THREE.MathUtils.degToRad;
  let x = dx;
  let y = dy;
  let z = dz;
  const rz = toRad(-rotZ);
  let c = Math.cos(rz);
  let s = Math.sin(rz);
  let x1 = x * c - y * s;
  let y1 = x * s + y * c;
  x = x1;
  y = y1;
  const ry = toRad(-rotY);
  c = Math.cos(ry);
  s = Math.sin(ry);
  x1 = x * c + z * s;
  let z1 = -x * s + z * c;
  x = x1;
  z = z1;
  const rx = toRad(-rotX);
  c = Math.cos(rx);
  s = Math.sin(rx);
  y1 = y * c - z * s;
  z1 = y * s + z * c;
  return { x, y: y1, z: z1 };
}

function smoothMin(a: number, b: number, k: number) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Metaball field (negative inside), same as 외계인1·2. */
export function evaluateAlienPartsSdf(parts: Chapter3AlienPart[], x: number, y: number, z: number) {
  let d = Infinity;
  for (const part of parts) {
    const { cx, cy, cz, rx, ry, rz, blend } = part;
    const local = partLocalOffset(x - cx, y - cy, z - cz, part.rotX ?? 0, part.rotY ?? 0, part.rotZ ?? 0);
    d = smoothMin(d, ellipsoidSdf(local.x, local.y, local.z, rx, ry, rz), blend);
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
  for (const part of parts) {
    const { cx, cy, cz, rx, ry, rz } = part;
    const pad = Math.max(rx, ry, rz) * 0.35;
    bounds.expandByPoint(pxToLocal(cx - rx - pad, cy + ry + pad, cz - rz - pad));
    bounds.expandByPoint(pxToLocal(cx + rx + pad, cy - ry - pad, cz + rz + pad));
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
        mc.field[x + y * size + z * size * size] = -evaluateAlienPartsSdf(parts, px, py, pz);
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
