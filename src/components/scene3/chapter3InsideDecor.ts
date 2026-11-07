import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CHAPTER3_ALIEN_DISPERSION,
  CHAPTER3_ALIEN_IOR,
} from "@/constants/chapter3InsideConfig";
import {
  type Chapter3DecorCoral,
  type Chapter3DecorRock,
  type Chapter3DecorTuft,
  type Chapter3InsideDecorConfig,
} from "@/constants/chapter3InsideDecorConfig";

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function lumpyRockGeometry(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 3);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const bump =
      0.2 * Math.sin(n.x * 3.2 + seed) +
      0.16 * Math.sin(n.y * 4.6 + seed * 1.7) +
      0.14 * Math.sin(n.z * 5.1 + seed * 2.2) +
      0.08 * Math.sin(n.x * 8.4 + n.y * 6.1 + seed * 0.6);
    v.multiplyScalar(1 + bump);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

/** Tube along `curve` whose radius shrinks from `r0` to `r1` (0 = needle tip). */
function taperedPathGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  r0: number,
  r1: number,
  tubular = 10,
  radial = 7,
  flatten = 1,
) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();

  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPoint(t, p);
    n.copy(frames.normals[i]);
    b.copy(frames.binormals[i]);
    const radius = THREE.MathUtils.lerp(r0, r1, t * t);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const ox = Math.cos(a) * radius * flatten;
      const oy = Math.sin(a) * radius;
      positions.push(p.x + n.x * ox + b.x * oy, p.y + n.y * ox + b.y * oy, p.z + n.z * ox + b.z * oy);
      uvs.push(j / radial, t);
    }
  }

  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const c = i * radial + ((j + 1) % radial);
      const d = (i + 1) * radial + j;
      const e = (i + 1) * radial + ((j + 1) % radial);
      indices.push(a, d, c, c, d, e);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function bladeGeometry(lean: number, height: number, radius: number) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.45, height * 0.52, 0),
    new THREE.Vector3(lean, height, 0),
  );
  return taperedPathGeometry(curve, radius, 0, 10, 6, 0.38);
}

function coralGeometry(spec: Chapter3DecorCoral) {
  const geos: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  let nextSeed = spec.seed;

  const branch = (
    start: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    radius: number,
    depth: number,
  ) => {
    const s = ++nextSeed;
    const end = start.clone().addScaledVector(dir, length);
    const side = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);
    const mid = start
      .clone()
      .lerp(end, 0.48)
      .addScaledVector(side, (rand(s) - 0.5) * length * 0.32)
      .addScaledVector(up, length * 0.06);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tipR = depth === 0 ? radius * 0.55 : radius * 0.72;
    geos.push(taperedPathGeometry(curve, radius, tipR, 12, 10, 1));
    if (depth === 0) {
      const tip = new THREE.SphereGeometry(tipR * 1.05, 10, 8);
      tip.translate(end.x, end.y, end.z);
      geos.push(tip);
    }

    if (depth <= 0) return;
    const splits = 2;
    for (let i = 0; i < splits; i++) {
      const t = 0.52 + rand(s + i * 13) * 0.28;
      const p = curve.getPoint(t);
      const yaw = (i === 0 ? -1 : 1) * (0.55 + rand(s + i * 7) * 0.5);
      const tilt = 0.4 + rand(s + i * 11) * 0.35;
      const child = dir
        .clone()
        .applyAxisAngle(up, yaw)
        .applyAxisAngle(side, tilt)
        .normalize();
      child.y = Math.max(0.28, child.y);
      child.normalize();
      branch(p, child, length * (0.5 + rand(s + i * 3) * 0.18), radius * 0.62, depth - 1);
    }
  };

  const stalks = 4;
  for (let i = 0; i < stalks; i++) {
    const yaw = (i / stalks) * Math.PI * 2 + rand(spec.seed + i * 5) * 0.35;
    const lean = 0.18 + rand(spec.seed + i * 9) * 0.2;
    const dir = new THREE.Vector3(Math.sin(yaw) * lean, 1, Math.cos(yaw) * lean).normalize();
    const len = spec.height * (0.55 + rand(spec.seed + i * 2) * 0.22);
    branch(new THREE.Vector3(0, 0, 0), dir, len, spec.height * 0.085, 1);
  }
  const merged = mergeGeometries(geos);
  if (merged) geos.forEach((g) => g.dispose());
  const geometry = merged ?? geos[0];
  geometry.computeBoundingBox();
  return geometry;
}

function createDecorGlass(opts: { thickness: number; roughness: number; sway?: number }) {
  const uniforms = { uTime: { value: 0 } };
  const sway = opts.sway ?? 0;
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: opts.roughness,
    transmission: 1,
    ior: CHAPTER3_ALIEN_IOR,
    thickness: opts.thickness,
    dispersion: CHAPTER3_ALIEN_DISPERSION,
    attenuationColor: new THREE.Color(0.96, 0.98, 0.98),
    attenuationDistance: 6,
    specularIntensity: 1,
    envMapIntensity: 1,
    side: THREE.FrontSide,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (sway > 0) {
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "uniform float uTime;\nvoid main() {")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          {
            vec4 wp = modelMatrix * vec4(transformed, 1.0);
            float h = max(position.y, 0.0);
            transformed.x += sin(uTime * 1.8 + wp.x * 2.5) * h * ${sway.toFixed(3)};
            transformed.z += cos(uTime * 1.45 + wp.z * 2.1) * h * ${(sway * 0.62).toFixed(3)};
          }`,
        );
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `{
        float nv = saturate(dot(normal, geometryViewDir));
        float ring = smoothstep(0.1, 0.38, nv) * (1.0 - smoothstep(0.38, 0.78, nv));
        float lip = 1.0 - smoothstep(0.0, 0.24, nv);
        outgoingLight *= 1.0 - ring * 0.22;
        outgoingLight = mix(outgoingLight, vec3(0.98), lip * 0.14);
      }
      #include <opaque_fragment>`,
    );
  };
  return { material, uniforms };
}

function createRockShadowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: 0.55 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.2, 1.0, r)) * 0.22 * uOpacity;
        gl_FragColor = vec4(vec3(0.2, 0.22, 0.25), max(a, 0.0));
      }
    `,
  });
}

type RockSpinner = {
  group: THREE.Group;
  shadow: THREE.Mesh;
  baseRotY: number;
  /** Radians per second around vertical Y (in-place side spin). */
  spinY: number;
};

function placeRock(
  spec: Chapter3DecorRock,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  shadowGeo: THREE.BufferGeometry,
  shadowMat: THREE.Material,
): RockSpinner {
  const mesh = new THREE.Mesh(geometry, material);
  const squash = 0.72 + rand(spec.seed + 4) * 0.2;
  mesh.scale.set(spec.size, spec.size * spec.flatten, spec.size * squash);
  const tiltX = rand(spec.seed + 1) * 0.35 - 0.12;
  const tiltZ = rand(spec.seed + 2) * 0.28 - 0.1;
  mesh.rotation.set(tiltX, 0, tiltZ);
  mesh.position.set(0, 0, 0);
  mesh.updateMatrix();
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!.clone().applyMatrix4(mesh.matrix);
  mesh.position.y = -box.min.y;

  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  group.rotation.y = spec.rotY;
  group.add(mesh);

  const sign = rand(spec.seed + 6) > 0.5 ? 1 : -1;
  const spinY = sign * (0.35 + rand(spec.seed + 7) * 0.55);

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(spec.x, 0.0015, spec.z);
  shadow.scale.set(spec.size * 1.7, spec.size * 1.35, 1);
  return { group, shadow, baseRotY: spec.rotY, spinY };
}

function placeTuft(spec: Chapter3DecorTuft, material: THREE.Material) {
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  const geometries: THREE.BufferGeometry[] = [];
  for (let i = 0; i < spec.blades; i++) {
    const u = rand(spec.seed + i * 17);
    const v = rand(spec.seed + i * 29 + 3);
    const height = spec.height * (0.62 + u * 0.5);
    const radius = 0.014 + v * 0.016;
    const lean = (u - 0.5) * spec.height * 0.7;
    const geometry = bladeGeometry(lean, height, radius);
    geometries.push(geometry);
    const blade = new THREE.Mesh(geometry, material);
    const yaw = (i / spec.blades) * Math.PI * 2 + v * 0.5;
    blade.rotation.y = yaw;
    blade.position.set(Math.cos(yaw) * spec.spread * u, 0, Math.sin(yaw) * spec.spread * v);
    group.add(blade);
  }
  return { group, geometries };
}

function placeCoral(
  spec: Chapter3DecorCoral,
  material: THREE.Material,
  shadowGeo: THREE.BufferGeometry,
  shadowMat: THREE.Material,
) {
  const geometry = coralGeometry(spec);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.y = spec.rotY;
  mesh.position.set(spec.x, 0, spec.z);
  mesh.updateMatrix();
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!.clone().applyMatrix4(mesh.matrix);
  mesh.position.y -= box.min.y;

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(spec.x, 0.0016, spec.z);
  shadow.scale.set(spec.height * 0.85, spec.height * 0.7, 1);
  return { mesh, shadow, geometry };
}

/** Scatter glass pebbles, pointed grass, and branching corals around the aliens. */
export function createChapter3InsideDecor(scene: THREE.Scene, initial: Chapter3InsideDecorConfig) {
  const rockGlass = createDecorGlass({ thickness: 0.9, roughness: 0.12 });
  const grassGlass = createDecorGlass({ thickness: 0.28, roughness: 0.05, sway: 0.16 });
  const coralGlass = createDecorGlass({ thickness: 1.15, roughness: 0.07, sway: 0.045 });
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadowMat = createRockShadowMaterial();
  const sharedGeometries: THREE.BufferGeometry[] = [shadowGeo];
  const materials: THREE.Material[] = [rockGlass.material, grassGlass.material, coralGlass.material, shadowMat];
  const placed: THREE.Object3D[] = [];
  const placedGeometries: THREE.BufferGeometry[] = [];
  const rockSpinners: RockSpinner[] = [];

  const clearPlaced = () => {
    for (const obj of placed) obj.removeFromParent();
    placed.length = 0;
    rockSpinners.length = 0;
    placedGeometries.forEach((g) => g.dispose());
    placedGeometries.length = 0;
  };

  const populate = (config: Chapter3InsideDecorConfig) => {
    for (const spec of config.rocks) {
      const geometry = lumpyRockGeometry(spec.seed);
      placedGeometries.push(geometry);
      const rock = placeRock(spec, geometry, rockGlass.material, shadowGeo, shadowMat);
      rockSpinners.push(rock);
      scene.add(rock.group, rock.shadow);
      placed.push(rock.group, rock.shadow);
    }
    for (const spec of config.tufts) {
      const { group, geometries: blades } = placeTuft(spec, grassGlass.material);
      placedGeometries.push(...blades);
      scene.add(group);
      placed.push(group);
    }
    for (const spec of config.corals) {
      const { mesh, shadow, geometry } = placeCoral(spec, coralGlass.material, shadowGeo, shadowMat);
      placedGeometries.push(geometry);
      scene.add(mesh, shadow);
      placed.push(mesh, shadow);
    }
  };

  populate(initial);

  return {
    setConfig(config: Chapter3InsideDecorConfig) {
      clearPlaced();
      populate(config);
    },
    update(t: number) {
      grassGlass.uniforms.uTime.value = t;
      coralGlass.uniforms.uTime.value = t;
      for (const rock of rockSpinners) {
        rock.group.rotation.y = rock.baseRotY + rock.spinY * t;
      }
    },
    dispose() {
      clearPlaced();
      sharedGeometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
