import * as THREE from "three";
import type { Chapter3Alien3FaceParams } from "@/constants/chapter3Alien3Config";
import { CHAPTER3_ALIEN_PX_SCALE, pxToLocal } from "@/components/scene3/chapter3AlienGeometry";
import type { AlienFaceRig } from "@/components/scene3/chapter3AlienFace";
import { setAlienEyeOpen } from "@/components/scene3/chapter3AlienFace";

export { setAlienEyeOpen };

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

function smilePoints(params: Chapter3Alien3FaceParams, count = 9) {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    const px = params.mouthCenterX + (u - 0.5) * params.mouthWidth;
    const py = params.mouthCenterY - params.mouthSmile * Math.sin(u * Math.PI);
    pts.push([px, py]);
  }
  return pts;
}

/** Elliptical eyes + curved glass stick smile. */
export function buildAlien3FaceRig(
  geometry: THREE.BufferGeometry,
  eyeMaterial: THREE.Material,
  mouthMaterial: THREE.Material,
  params: Chapter3Alien3FaceParams,
): AlienFaceRig {
  const { probe, disposeProbe } = createProbe(geometry);
  const raycaster = new THREE.Raycaster();
  const outward = new THREE.Vector3(0, 0, 1);
  const group = new THREE.Group();
  const eyeBeadRadius = params.eyeRadius * CHAPTER3_ALIEN_PX_SCALE;
  const stretch = { x: params.eyeScaleX, y: params.eyeScaleY };
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
    bead.scale.set(eyeBeadRadius * stretch.x, eyeBeadRadius * stretch.y, eyeBeadRadius);
    bead.renderOrder = 3;
    group.add(bead);
    eyeMeshes.push(bead);
  }

  const stickR = params.mouthStick * CHAPTER3_ALIEN_PX_SCALE;
  const curvePts = smilePoints(params).map(([px, py]) => {
    const { point, normal } = surfaceHit(probe, raycaster, px, py);
    return point.clone().addScaledVector(normal, stickR * 0.95);
  });
  const curve = new THREE.CatmullRomCurve3(curvePts);
  const mouthMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, stickR, 10, false), mouthMaterial);
  mouthMesh.renderOrder = 3;
  group.add(mouthMesh);

  return { group, eyeMeshes, mouthMesh, eyeBeadRadius, eyeStretch: stretch, disposeProbe };
}

export function setAlien3EyeOpen(rig: AlienFaceRig, eyeOpen: number) {
  if (!rig.eyeStretch) return;
  setAlienEyeOpen(rig.eyeMeshes, rig.eyeBeadRadius, eyeOpen, rig.eyeStretch);
}
