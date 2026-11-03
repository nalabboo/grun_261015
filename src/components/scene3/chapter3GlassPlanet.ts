import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CHAPTER3_PLANET_REFRACT,
  CHAPTER3_PLANET_RIPPLE,
  CHAPTER3_PLANET_RIPPLE_SCALE,
  CHAPTER3_RING_CLUMPING,
  CHAPTER3_RING_FRAGMENTS,
  CHAPTER3_RING_INNER,
  CHAPTER3_RING_OUTER,
  CHAPTER3_RING_SPIN,
  CHAPTER3_RING_STRAY_SHARE,
  CHAPTER3_RING_STRAY_SPREAD,
  CHAPTER3_RING_STRAY_THICKNESS,
  CHAPTER3_RING_THICKNESS,
  CHAPTER3_RING_TILT_X,
  CHAPTER3_RING_TILT_Z,
} from "@/constants/chapter3PlanetConfig";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vObjPos;
  void main() {
    #ifdef USE_INSTANCING
      mat4 localMatrix = instanceMatrix;
    #else
      mat4 localMatrix = mat4(1.0);
    #endif
    vNormal = normalize(normalMatrix * mat3(localMatrix) * normal);
    vObjPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * localMatrix * vec4(position, 1.0);
  }
`;

/** Clear glass: screen-space refraction of the star canvas, fresnel rim, specular glints. */
const fragmentShader = /* glsl */ `
  uniform sampler2D uBackdrop;
  uniform vec2 uResolution;
  uniform float uOpacity;
  uniform float uRefract;
  uniform float uGlint;
  uniform float uBaseAlpha;
  uniform float uRipple;
  uniform float uRippleScale;
  /** Object → view rotation, so ripples stay fixed to the turning planet. */
  uniform mat3 uObjToView;
  varying vec3 vNormal;
  varying vec3 vObjPos;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float valueNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float ripple(vec3 p) {
    return valueNoise(p) + 0.5 * valueNoise(p * 2.1 + 7.3);
  }

  void main() {
    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;

    if (uRipple > 0.0) {
      vec3 p = vObjPos * uRippleScale;
      float e = 0.03;
      vec3 grad = vec3(
        ripple(p + vec3(e, 0, 0)) - ripple(p - vec3(e, 0, 0)),
        ripple(p + vec3(0, e, 0)) - ripple(p - vec3(0, e, 0)),
        ripple(p + vec3(0, 0, e)) - ripple(p - vec3(0, 0, e))
      ) / (2.0 * e);
      N = normalize(N - uObjToView * grad * uRipple);
    }
    vec3 V = vec3(0.0, 0.0, 1.0);
    float facing = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 2.4);

    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 offset = N.xy * uRefract * (0.6 + 1.2 * fresnel);
    vec3 refracted = vec3(
      texture2D(uBackdrop, uv - offset * 1.00).r,
      texture2D(uBackdrop, uv - offset * 1.04).g,
      texture2D(uBackdrop, uv - offset * 1.08).b
    );

    vec3 L1 = normalize(vec3(-0.45, 0.7, 0.65));
    vec3 L2 = normalize(vec3(0.6, -0.35, 0.5));
    float spec1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 140.0) * 1.2;
    float spec2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 50.0) * 0.25;

    vec3 color = refracted * 1.12 + 0.035 + fresnel * 0.6 + (spec1 + spec2) * uGlint;
    float alpha = uOpacity * (uBaseAlpha + (1.0 - uBaseAlpha) * fresnel);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createGlassMaterial(
  backdrop: THREE.Texture,
  resolution: THREE.Vector2,
  options: {
    refract: number;
    glint: number;
    baseAlpha: number;
    ripple?: number;
    doubleSided?: boolean;
  },
) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    uniforms: {
      uBackdrop: { value: backdrop },
      uResolution: { value: resolution },
      uOpacity: { value: 0 },
      uRefract: { value: options.refract },
      uGlint: { value: options.glint },
      uBaseAlpha: { value: options.baseAlpha },
      uRipple: { value: options.ripple ?? 0 },
      uRippleScale: { value: CHAPTER3_PLANET_RIPPLE_SCALE },
      uObjToView: { value: new THREE.Matrix3() },
    },
  });
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ring density by radius: fine banding plus a Cassini-like gap. */
function ringDensity(r: number) {
  const span = CHAPTER3_RING_OUTER - CHAPTER3_RING_INNER;
  const u = (r - CHAPTER3_RING_INNER) / span;
  if (u > 0.58 && u < 0.64) return 0.04;
  const bands = 0.55 + 0.45 * Math.sin(u * 46) * Math.sin(u * 13 + 1);
  const edges = Math.min(1, u / 0.08, (1 - u) / 0.12);
  return Math.max(0, bands) * edges;
}

/** Glass shards scattered through a thin annulus, in planet-radius units. */
function buildRingShards(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  count: number,
  seed: number,
) {
  const rand = mulberry32(seed);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();

  const clumpPhaseA = rand() * Math.PI * 2;
  const clumpPhaseB = rand() * Math.PI * 2;
  const clump = (a: number) =>
    1 - CHAPTER3_RING_CLUMPING * (0.5 + 0.5 * Math.sin(a * 3 + clumpPhaseA) * Math.sin(a * 7 + clumpPhaseB));

  for (let i = 0; i < count; i += 1) {
    const stray = rand() < CHAPTER3_RING_STRAY_SHARE;
    let r = CHAPTER3_RING_INNER;
    if (stray) {
      const reach = CHAPTER3_RING_STRAY_SPREAD * Math.pow(rand(), 1.6);
      r = rand() < 0.65 ? CHAPTER3_RING_OUTER + reach : CHAPTER3_RING_INNER - reach * 0.45;
    } else {
      for (let tries = 0; tries < 12; tries += 1) {
        r = CHAPTER3_RING_INNER + rand() * (CHAPTER3_RING_OUTER - CHAPTER3_RING_INNER);
        if (rand() < ringDensity(r)) break;
      }
      r += (rand() - 0.5) * 0.05;
    }

    let angle = rand() * Math.PI * 2;
    for (let tries = 0; tries < 6 && rand() > clump(angle); tries += 1) {
      angle = rand() * Math.PI * 2;
    }
    const gauss = (rand() + rand() + rand() - 1.5) / 1.5;
    const thickness = CHAPTER3_RING_THICKNESS * (stray ? CHAPTER3_RING_STRAY_THICKNESS : 1);
    pos.set(Math.cos(angle) * r, gauss * thickness, Math.sin(angle) * r);

    const size = (0.004 + 0.026 * Math.pow(rand(), 3)) * (stray ? 0.75 : 1);
    scale.set(size * (0.6 + rand() * 0.9), size * (0.5 + rand() * 0.7), size * (0.6 + rand() * 0.9));
    q.setFromEuler(e.set(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2));
    m.compose(pos, q, scale);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export type Chapter3PlanetFrame = {
  /** Planet center on screen, CSS px. */
  x: number;
  y: number;
  radiusPx: number;
  opacity: number;
  /** Camera look angles (radians); the system tilts slightly with them. */
  yaw: number;
  pitch: number;
  timeSec: number;
};

/** Smooth clear-glass planet with a shard ring, drawn on its own transparent WebGL canvas. */
export function createChapter3GlassPlanet(glCanvas: HTMLCanvasElement, backdrop: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);

  const backdropTexture = new THREE.CanvasTexture(backdrop);
  backdropTexture.colorSpace = THREE.NoColorSpace;
  backdropTexture.minFilter = THREE.LinearFilter;
  backdropTexture.generateMipmaps = false;
  const resolution = new THREE.Vector2(1, 1);

  const sphereBase = new THREE.IcosahedronGeometry(1, 40);
  sphereBase.deleteAttribute("normal");
  sphereBase.deleteAttribute("uv");
  const sphereGeometry = mergeVertices(sphereBase);
  sphereBase.dispose();
  sphereGeometry.computeVertexNormals();

  const planetMaterial = createGlassMaterial(backdropTexture, resolution, {
    refract: CHAPTER3_PLANET_REFRACT,
    glint: 1,
    baseAlpha: 0.38,
    ripple: CHAPTER3_PLANET_RIPPLE,
  });
  const shardMaterial = createGlassMaterial(backdropTexture, resolution, {
    refract: 0.02,
    glint: 1.6,
    baseAlpha: 0.7,
    doubleSided: true,
  });

  const planetMesh = new THREE.Mesh(sphereGeometry, planetMaterial);
  planetMesh.renderOrder = 1;

  const shardGeometries = [new THREE.IcosahedronGeometry(1, 0), new THREE.TetrahedronGeometry(1, 0)];
  const half = Math.round(CHAPTER3_RING_FRAGMENTS / 2);
  const ring = new THREE.Group();
  ring.add(buildRingShards(shardGeometries[0], shardMaterial, half, 0x91a5));
  ring.add(buildRingShards(shardGeometries[1], shardMaterial, CHAPTER3_RING_FRAGMENTS - half, 0x2c7e));

  const ringTilt = new THREE.Group();
  ringTilt.rotation.set(CHAPTER3_RING_TILT_X, 0, CHAPTER3_RING_TILT_Z);
  ringTilt.add(ring);

  const system = new THREE.Group();
  system.add(planetMesh, ringTilt);
  scene.add(system);

  let width = 1;
  let height = 1;
  let shown = true;
  /** Rotation the user applied by dragging, kept in screen-space terms. */
  const userQuat = new THREE.Quaternion();
  const lookQuat = new THREE.Quaternion();
  const lookEuler = new THREE.Euler();
  const dragQuat = new THREE.Quaternion();
  const axisX = new THREE.Vector3(1, 0, 0);
  const axisY = new THREE.Vector3(0, 1, 0);
  const objToView = new THREE.Matrix4();

  return {
    /** Turn the system by screen-space angles (radians): +x spins right, +y tips toward the viewer. */
    rotateBy(angleX: number, angleY: number) {
      if (angleX === 0 && angleY === 0) return;
      dragQuat.setFromAxisAngle(axisY, angleX);
      userQuat.premultiply(dragQuat);
      dragQuat.setFromAxisAngle(axisX, angleY);
      userQuat.premultiply(dragQuat).normalize();
    },
    setSize(viewW: number, viewH: number, dpr: number) {
      width = viewW;
      height = viewH;
      renderer.setPixelRatio(dpr);
      renderer.setSize(viewW, viewH, false);
      glCanvas.style.width = `${viewW}px`;
      glCanvas.style.height = `${viewH}px`;
      camera.left = -viewW / 2;
      camera.right = viewW / 2;
      camera.top = viewH / 2;
      camera.bottom = -viewH / 2;
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(resolution);
    },
    render(frame: Chapter3PlanetFrame | null) {
      if (!frame || frame.opacity <= 0.001) {
        if (shown) {
          renderer.clear();
          shown = false;
        }
        return;
      }
      shown = true;
      backdropTexture.needsUpdate = true;
      planetMaterial.uniforms.uOpacity.value = frame.opacity;
      shardMaterial.uniforms.uOpacity.value = frame.opacity;

      system.position.set(frame.x - width / 2, height / 2 - frame.y, 0);
      system.scale.setScalar(frame.radiusPx);
      lookQuat.setFromEuler(lookEuler.set(frame.pitch * 0.8, frame.yaw * 0.8, 0));
      system.quaternion.copy(lookQuat).multiply(userQuat);
      planetMaterial.uniforms.uObjToView.value.setFromMatrix4(
        objToView.makeRotationFromQuaternion(system.quaternion),
      );
      ring.rotation.y = frame.timeSec * CHAPTER3_RING_SPIN;
      renderer.render(scene, camera);
    },
    dispose() {
      sphereGeometry.dispose();
      shardGeometries.forEach((g) => g.dispose());
      planetMaterial.dispose();
      shardMaterial.dispose();
      backdropTexture.dispose();
      renderer.dispose();
    },
  };
}
