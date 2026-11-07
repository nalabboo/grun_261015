import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Chapter3AlienFaceParams } from "@/constants/chapter3AlienFaceConfig";
import { CHAPTER3_ALIEN_PX_SCALE, pxToLocal } from "@/components/scene3/chapter3AlienGeometry";

export type AlienFaceRig = {
  group: THREE.Group;
  eyeMeshes: THREE.Mesh[];
  mouthMesh: THREE.Mesh | null;
  /** Mouth center on the body surface (body geometry space); 외계인1 only. */
  mouthAnchor?: THREE.Vector3;
  eyeBeadRadius: number;
  /** Ellipse radii multipliers (local X/Y on the head); 외계인2 only. */
  eyeStretch?: { x: number; y: number };
  disposeProbe: () => void;
};

function createProbe(geometry: THREE.BufferGeometry) {
  const probeMat = new THREE.MeshBasicMaterial();
  return { probe: new THREE.Mesh(geometry, probeMat), disposeProbe: () => probeMat.dispose() };
}

function surfaceHit(probe: THREE.Mesh, raycaster: THREE.Raycaster, px: number, py: number) {
  const anchor = pxToLocal(px, py);
  raycaster.set(new THREE.Vector3(anchor.x, anchor.y, 3), new THREE.Vector3(0, 0, -1));
  const hit = raycaster.intersectObject(probe)[0];
  const outward = new THREE.Vector3(0, 0, 1);
  const normal = hit?.face?.normal.clone().normalize() ?? outward;
  const point = hit?.point ?? anchor;
  return { point, normal };
}

function smilePoints(params: Chapter3AlienFaceParams, count = 9) {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    const px = params.mouthCenterX + (u - 0.5) * params.mouthWidth;
    const py = params.mouthCenterY - params.mouthSmile * Math.sin(u * Math.PI);
    pts.push([px, py]);
  }
  return pts;
}

function buildMouthTube(
  probe: THREE.Mesh,
  raycaster: THREE.Raycaster,
  material: THREE.Material,
  params: Chapter3AlienFaceParams,
) {
  const stickR = params.mouthStick * CHAPTER3_ALIEN_PX_SCALE;
  const curvePts = smilePoints(params).map(([px, py]) => {
    const { point, normal } = surfaceHit(probe, raycaster, px, py);
    return point.clone().addScaledVector(normal, stickR * 0.95);
  });
  const curve = new THREE.CatmullRomCurve3(curvePts);
  const tube = new THREE.TubeGeometry(curve, 40, stickR, 12, false);
  const capAt = (t: number) => {
    const center = curve.getPoint(t);
    const geo = new THREE.SphereGeometry(stickR, 14, 12);
    geo.translate(center.x, center.y, center.z);
    return geo;
  };
  const capStart = capAt(0);
  const capEnd = capAt(1);
  const merged = mergeGeometries([tube, capStart, capEnd]);
  tube.dispose();
  capStart.dispose();
  capEnd.dispose();
  if (!merged) {
    const fallbackGeo = new THREE.TubeGeometry(curve, 40, stickR, 12, false);
    const fallback = new THREE.Mesh(fallbackGeo, material);
    fallback.renderOrder = 3;
    return fallback;
  }
  merged.computeBoundingBox();
  const center = merged.boundingBox!.getCenter(new THREE.Vector3());
  merged.translate(-center.x, -center.y, -center.z);
  const mesh = new THREE.Mesh(merged, material);
  mesh.position.copy(center);
  mesh.renderOrder = 3;
  return mesh;
}

/** Hide the stick mouth while the body dent (see `addMouthDent`) opens (0 = closed). */
export function setAlienMouthOpen(rig: AlienFaceRig, open: number) {
  const stick = rig.mouthMesh;
  if (!stick) return;
  const s = 1 - Math.min(1, Math.max(0, open));
  stick.visible = s > 0.02;
  stick.scale.setScalar(Math.max(0.001, s));
}

/** Glass bead eyes and a curved glass stick mouth on the head surface. */
export function buildAlienFaceRig(
  geometry: THREE.BufferGeometry,
  eyeMaterial: THREE.Material,
  mouthMaterial: THREE.Material,
  params: Chapter3AlienFaceParams,
): AlienFaceRig {
  const { probe, disposeProbe } = createProbe(geometry);
  const raycaster = new THREE.Raycaster();
  const outward = new THREE.Vector3(0, 0, 1);
  const group = new THREE.Group();
  const eyeBeadRadius = params.eyeRadius * CHAPTER3_ALIEN_PX_SCALE;
  const sphere = new THREE.SphereGeometry(1, 28, 22);
  const eyeMeshes: THREE.Mesh[] = [];

  for (const [px, py] of [
    [params.eyeLeftX, params.eyeLeftY],
    [params.eyeRightX, params.eyeRightY],
  ] as const) {
    const { point, normal } = surfaceHit(probe, raycaster, px, py);
    const bead = new THREE.Mesh(sphere, eyeMaterial);
    bead.position.copy(point).addScaledVector(normal, eyeBeadRadius * 0.88);
    bead.quaternion.setFromUnitVectors(outward, normal);
    bead.scale.setScalar(eyeBeadRadius);
    bead.renderOrder = 3;
    group.add(bead);
    eyeMeshes.push(bead);
  }

  const mouthMesh = buildMouthTube(probe, raycaster, mouthMaterial, params);
  group.add(mouthMesh);
  const mouthAnchor = surfaceHit(probe, raycaster, params.mouthCenterX, params.mouthCenterY).point.clone();

  return { group, eyeMeshes, mouthMesh, mouthAnchor, eyeBeadRadius, disposeProbe };
}

/** Blink: squash bead eyes toward the head (1 = open). */
export function setAlienEyeOpen(
  meshes: THREE.Mesh[],
  beadRadius: number,
  eyeOpen: number,
  stretch = { x: 1, y: 1 },
) {
  const flat = Math.max(0.06, Math.min(1, eyeOpen));
  const bulge = 1 + (1 - flat) * 0.12;
  for (const bead of meshes) {
    bead.scale.set(beadRadius * stretch.x * bulge, beadRadius * stretch.y * bulge, beadRadius * flat);
  }
}
