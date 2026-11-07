import * as THREE from "three";
import type { Chapter3AlienPart } from "@/constants/chapter3AlienShape";
import type { Chapter3AlienFaceParams } from "@/constants/chapter3AlienFaceConfig";
import {
  buildAlienFaceRig,
  setAlienEyeOpen,
  setAlienMouthOpen,
  type AlienFaceRig,
} from "@/components/scene3/chapter3AlienFace";
import {
  CHAPTER3_ALIEN_BLINK_INTERVAL_MS,
  CHAPTER3_ALIEN_BLINK_MS,
  CHAPTER3_ALIEN_BREATH,
  CHAPTER3_ALIEN_POKE_SQUASH,
  CHAPTER3_ALIEN_POKE_WOBBLE,
  CHAPTER3_ALIEN_DELAY_MS,
  CHAPTER3_ALIEN_DISPERSION,
  CHAPTER3_ALIEN_DROP_HEIGHT,
  CHAPTER3_ALIEN_FALL_MS,
  CHAPTER3_ALIEN_IOR,
  CHAPTER3_ALIEN_SETTLE_DAMP,
  CHAPTER3_ALIEN_SETTLE_HZ,
  CHAPTER3_ALIEN_SQUASH,
  CHAPTER3_ALIEN_SWAY,
  CHAPTER3_ALIEN_THICKNESS,
  CHAPTER3_ALIEN_TURN,
  CHAPTER3_ALIEN_WIDTH,
  CHAPTER3_ALIEN_WOBBLE,
} from "@/constants/chapter3InsideConfig";
import {
  CHAPTER3_ALIEN2_DELAY_MS,
  CHAPTER3_ALIEN2_POSITION_X,
  CHAPTER3_ALIEN2_SWAY,
  CHAPTER3_ALIEN2_TURN,
  CHAPTER3_ALIEN2_WIDTH,
  type Chapter3Alien2FaceParams,
  type Chapter3Alien2GlassParams,
} from "@/constants/chapter3Alien2Config";
import {
  CHAPTER3_ALIEN3_DELAY_MS,
  CHAPTER3_ALIEN3_POSITION_X,
  CHAPTER3_ALIEN3_SWAY,
  CHAPTER3_ALIEN3_TURN,
  CHAPTER3_ALIEN3_WIDTH,
  type Chapter3Alien3FaceParams,
  type Chapter3Alien3GlassParams,
} from "@/constants/chapter3Alien3Config";
import { buildAlien2FaceRig, setAlien2EyeOpen } from "@/components/scene3/chapter3Alien2Face";
import { buildAlien3FaceRig, setAlien3EyeOpen } from "@/components/scene3/chapter3Alien3Face";
import { buildAlienGeometry, CHAPTER3_ALIEN_PX_SCALE } from "@/components/scene3/chapter3AlienGeometry";
import { createChapter3InsideDecor } from "@/components/scene3/chapter3InsideDecor";
import {
  CHAPTER3_DECOR_DEFAULT,
  type Chapter3InsideDecorConfig,
} from "@/constants/chapter3InsideDecorConfig";
import type { Chapter3AlienPlacements } from "@/constants/chapter3AlienPlacementConfig";

export type Chapter3InsideAlien2Bundle = {
  parts: Chapter3AlienPart[];
  face: Chapter3Alien2FaceParams;
  glass: Chapter3Alien2GlassParams;
};

export type Chapter3InsideAlien3Bundle = {
  parts: Chapter3AlienPart[];
  face: Chapter3Alien3FaceParams;
  glass: Chapter3Alien3GlassParams;
};

export type Chapter3InsideExtras = {
  alien2?: Chapter3InsideAlien2Bundle;
  alien3?: Chapter3InsideAlien3Bundle;
};

type AlienMotion = {
  width: number;
  positionX: number;
  positionY: number;
  delayMs: number;
  turn: number;
  sway: number;
};

type AlienFaceKind = "alien1" | "alien2" | "alien3";

type AlienSlot = {
  root: THREE.Group;
  inner: THREE.Group;
  body: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  faceRig: AlienFaceRig;
  faceBeadGeometry?: THREE.SphereGeometry;
  bodyOffset: THREE.Vector3;
  faceKind: AlienFaceKind;
  faceParams: Chapter3AlienFaceParams | Chapter3Alien2FaceParams | Chapter3Alien3FaceParams;
  /** Jelly-free glass so the thin stick mouth keeps its capsule shape. */
  mouthMaterial?: THREE.Material;
  /** `performance.now()` of the last tap; drives the mouth open/close envelope. */
  mouthOpenAt: number | null;
  motion: AlienMotion;
  poke: number;
  nextBlinkAt: number;
  blinkStartAt: number;
  blinkActive: boolean;
  rebuildToken: number;
  shadowBaseW: number;
  shadowBaseD: number;
};

/** Cover-fit a texture onto a plane of the given aspect (like CSS object-fit: cover). */
function coverTexture(texture: THREE.Texture, planeAspect: number) {
  const image = texture.image as HTMLImageElement | undefined;
  if (!image?.naturalWidth) return;
  const imageAspect = image.naturalWidth / image.naturalHeight;
  if (planeAspect > imageAspect) {
    texture.repeat.set(1, imageAspect / planeAspect);
  } else {
    texture.repeat.set(planeAspect / imageAspect, 1);
  }
  texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
}

function createStudioEnvironment() {
  const studio = new THREE.Scene();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    color: number,
    intensity: number,
    side: THREE.Side = THREE.FrontSide,
  ) => {
    const material = new THREE.MeshBasicMaterial({ side });
    material.color.setScalar(color).multiplyScalar(intensity);
    geometries.push(geometry);
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    studio.add(mesh);
    return mesh;
  };

  add(new THREE.SphereGeometry(20, 32, 16), 0.16, 1, THREE.BackSide);
  const floor = add(new THREE.CircleGeometry(19, 48), 0.72, 1);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3;

  const top = add(new THREE.PlaneGeometry(9, 5), 1, 7);
  top.position.set(-1.5, 9, 3);
  top.lookAt(0, 0, 0);
  const left = add(new THREE.PlaneGeometry(2.2, 9), 1, 4);
  left.position.set(-10, 2, 4);
  left.lookAt(0, 0, 0);
  const right = add(new THREE.PlaneGeometry(1.6, 8), 1, 3);
  right.position.set(9, 1.5, 6);
  right.lookAt(0, 0, 0);
  const front = add(new THREE.PlaneGeometry(6, 2.5), 1, 1.6);
  front.position.set(0, 3, 12);
  front.lookAt(0, 0, 0);

  return {
    scene: studio,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

function fitSlotToGeometry(slot: AlienSlot) {
  const { geometry, body, faceRig, inner, motion } = slot;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const bodyScale = motion.width / (box.max.x - box.min.x);
  slot.bodyOffset.set(-(box.max.x + box.min.x) / 2, -box.min.y, -(box.max.z + box.min.z) / 2);
  body.position.copy(slot.bodyOffset);
  faceRig.group.position.copy(slot.bodyOffset);
  inner.scale.setScalar(bodyScale);
  slot.shadowBaseW = motion.width * 1.08;
  slot.shadowBaseD = (box.max.z - box.min.z) * bodyScale * 1.6;
}

function remountFaceRig(slot: AlienSlot, eyeMaterial: THREE.Material) {
  slot.faceRig.disposeProbe();
  slot.faceRig.group.removeFromParent();
  slot.faceRig.mouthMesh?.geometry.dispose();
  slot.faceBeadGeometry?.dispose();

  if (slot.faceKind === "alien3") {
    slot.faceRig = buildAlien3FaceRig(slot.geometry, eyeMaterial, slot.faceParams as Chapter3Alien3FaceParams);
  } else if (slot.faceKind === "alien2") {
    slot.faceRig = buildAlien2FaceRig(
      slot.geometry,
      eyeMaterial,
      slot.faceParams as Chapter3Alien2FaceParams,
    );
  } else {
    slot.faceRig = buildAlienFaceRig(
      slot.geometry,
      eyeMaterial,
      slot.mouthMaterial ?? eyeMaterial,
      slot.faceParams as Chapter3AlienFaceParams,
    );
  }
  slot.faceBeadGeometry = slot.faceRig.eyeMeshes[0]?.geometry as THREE.SphereGeometry;
  slot.inner.add(slot.faceRig.group);
  slot.faceRig.group.position.copy(slot.bodyOffset);
}

function mountSlotGeometry(slot: AlienSlot, geometry: THREE.BufferGeometry, eyeMaterial: THREE.Material) {
  slot.body.geometry.dispose();
  slot.geometry = geometry;
  slot.body.geometry = geometry;
  remountFaceRig(slot, eyeMaterial);
  fitSlotToGeometry(slot);
}

function createAlienSlot(
  parts: Chapter3AlienPart[],
  face: Chapter3AlienFaceParams,
  motion: AlienMotion,
  bodyMaterial: THREE.MeshPhysicalMaterial,
  eyeMaterial: THREE.MeshPhysicalMaterial,
  mouthMaterial: THREE.MeshPhysicalMaterial,
): AlienSlot {
  const geometry = buildAlienGeometry(parts);
  const body = new THREE.Mesh(geometry, bodyMaterial);
  const faceRig = buildAlienFaceRig(geometry, eyeMaterial, mouthMaterial, face);
  const faceBeadGeometry = faceRig.eyeMeshes[0]?.geometry as THREE.SphereGeometry | undefined;
  const inner = new THREE.Group();
  inner.add(body, faceRig.group);
  const root = new THREE.Group();
  root.add(inner);
  root.position.x = motion.positionX;
  root.visible = false;
  const slot: AlienSlot = {
    root,
    inner,
    body,
    geometry,
    faceRig,
    faceBeadGeometry,
    bodyOffset: new THREE.Vector3(),
    faceKind: "alien1",
    faceParams: face,
    mouthMaterial,
    mouthOpenAt: null,
    motion,
    poke: 0,
    nextBlinkAt: 0,
    blinkStartAt: 0,
    blinkActive: false,
    rebuildToken: 0,
    shadowBaseW: motion.width,
    shadowBaseD: 1,
  };
  fitSlotToGeometry(slot);
  return slot;
}

function createAlien2Slot(
  parts: Chapter3AlienPart[],
  face: Chapter3Alien2FaceParams,
  motion: AlienMotion,
  bodyMaterial: THREE.MeshPhysicalMaterial,
  eyeMaterial: THREE.MeshPhysicalMaterial,
): AlienSlot {
  const geometry = buildAlienGeometry(parts);
  const body = new THREE.Mesh(geometry, bodyMaterial);
  const faceRig = buildAlien2FaceRig(geometry, eyeMaterial, face);
  const faceBeadGeometry = faceRig.eyeMeshes[0]?.geometry as THREE.SphereGeometry | undefined;
  const inner = new THREE.Group();
  inner.add(body, faceRig.group);
  const root = new THREE.Group();
  root.add(inner);
  root.position.x = motion.positionX;
  root.visible = false;
  const slot: AlienSlot = {
    root,
    inner,
    body,
    geometry,
    faceRig,
    faceBeadGeometry,
    bodyOffset: new THREE.Vector3(),
    faceKind: "alien2",
    mouthOpenAt: null,
    faceParams: face,
    motion,
    poke: 0,
    nextBlinkAt: 0,
    blinkStartAt: 0,
    blinkActive: false,
    rebuildToken: 0,
    shadowBaseW: motion.width,
    shadowBaseD: 1,
  };
  fitSlotToGeometry(slot);
  return slot;
}

function createAlien3Slot(
  parts: Chapter3AlienPart[],
  face: Chapter3Alien3FaceParams,
  motion: AlienMotion,
  bodyMaterial: THREE.MeshPhysicalMaterial,
  eyeMaterial: THREE.MeshPhysicalMaterial,
): AlienSlot {
  const geometry = buildAlienGeometry(parts);
  const body = new THREE.Mesh(geometry, bodyMaterial);
  const faceRig = buildAlien3FaceRig(geometry, eyeMaterial, face);
  const faceBeadGeometry = faceRig.eyeMeshes[0]?.geometry as THREE.SphereGeometry | undefined;
  const inner = new THREE.Group();
  inner.add(body, faceRig.group);
  const root = new THREE.Group();
  root.add(inner);
  root.position.x = motion.positionX;
  root.visible = false;
  const slot: AlienSlot = {
    root,
    inner,
    body,
    geometry,
    faceRig,
    faceBeadGeometry,
    bodyOffset: new THREE.Vector3(),
    faceKind: "alien3",
    mouthOpenAt: null,
    faceParams: face,
    motion,
    poke: 0,
    nextBlinkAt: 0,
    blinkStartAt: 0,
    blinkActive: false,
    rebuildToken: 0,
    shadowBaseW: motion.width,
    shadowBaseD: 1,
  };
  fitSlotToGeometry(slot);
  return slot;
}

function disposeSlot(slot: AlienSlot) {
  slot.geometry.dispose();
  slot.faceRig.disposeProbe();
  slot.faceRig.mouthMesh?.geometry.dispose();
  slot.faceBeadGeometry?.dispose();
}

/** Open 'ㅇ' mouth cavity size (reference pixels). */
const MOUTH_DENT_RX_PX = 23;
const MOUTH_DENT_RY_PX = 15;
const MOUTH_DENT_DEPTH_PX = 14;

const MOUTH_OPEN_MS = 130;
const MOUTH_HOLD_MS = 520;
const MOUTH_CLOSE_MS = 320;

/** 0..1 open amount: quick open, short hold, eased close. Restarts on every tap. */
function mouthOpenEnvelope(openAt: number | null, now: number) {
  if (openAt === null) return 0;
  const t = now - openAt;
  if (t < 0) return 0;
  if (t < MOUTH_OPEN_MS) return Math.sin((t / MOUTH_OPEN_MS) * (Math.PI / 2));
  if (t < MOUTH_OPEN_MS + MOUTH_HOLD_MS) return 1;
  const c = (t - MOUTH_OPEN_MS - MOUTH_HOLD_MS) / MOUTH_CLOSE_MS;
  if (c >= 1) return 0;
  return 1 - c * c * (3 - 2 * c);
}

function updateAlienMotion(slot: AlienSlot, alienMs: number, t: number, dt: number) {
  const { motion } = slot;
  const localMs = alienMs - motion.delayMs;

  let lift = CHAPTER3_ALIEN_DROP_HEIGHT;
  let squash = 0;
  if (localMs > 0) {
    slot.root.visible = true;
    const fallT = Math.min(1, localMs / CHAPTER3_ALIEN_FALL_MS);
    lift = CHAPTER3_ALIEN_DROP_HEIGHT * (1 - fallT * fallT);
    if (fallT >= 1) {
      const settle = (localMs - CHAPTER3_ALIEN_FALL_MS) / 1000;
      squash =
        CHAPTER3_ALIEN_SQUASH *
        Math.exp(-settle * CHAPTER3_ALIEN_SETTLE_DAMP) *
        Math.cos(settle * CHAPTER3_ALIEN_SETTLE_HZ * Math.PI * 2);
    } else {
      squash = -0.08 * fallT;
    }
  } else {
    slot.root.visible = false;
  }

  if (slot.poke > 0.001) slot.poke *= Math.pow(0.25, dt);

  const breath = Math.sin(t * 1.9 + motion.positionX) * CHAPTER3_ALIEN_BREATH;
  const sy = 1 - squash + breath - slot.poke * CHAPTER3_ALIEN_POKE_SQUASH;
  const sxz = 1 / Math.sqrt(Math.max(0.2, sy));
  slot.root.position.y = lift + motion.positionY;
  slot.root.scale.set(sxz, sy, sxz);
  slot.root.rotation.y = motion.turn + Math.sin(t * 0.55 + motion.positionX) * motion.sway;

  return { localMs, lift, sxz };
}

/** Inside-the-planet stage: white paper and the clear glass hero alien dropping in. */
export function createChapter3InsideScene(
  glCanvas: HTMLCanvasElement,
  paper: HTMLImageElement,
  initialParts: Chapter3AlienPart[],
  initialFace: Chapter3AlienFaceParams,
  extras?: Chapter3InsideExtras,
  placements?: Chapter3AlienPlacements,
  decorConfig: Chapter3InsideDecorConfig = CHAPTER3_DECOR_DEFAULT,
) {
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true });
  renderer.setClearColor(0xffffff, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = createStudioEnvironment();
  const environment = pmrem.fromScene(studio.scene, 0.02).texture;
  studio.dispose();
  pmrem.dispose();
  scene.environment = environment;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  scene.add(camera);

  const paperTexture = new THREE.Texture(paper);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  const paperDistance = 40;
  const paperPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: paperTexture, toneMapped: false }),
  );
  paperPlane.position.z = -paperDistance;
  camera.add(paperPlane);
  const onPaperLoad = () => {
    paperTexture.needsUpdate = true;
    coverTexture(paperTexture, camera.aspect);
  };
  if (paper.complete && paper.naturalWidth) onPaperLoad();
  else paper.addEventListener("load", onPaperLoad, { once: true });

  const shadowMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: 0 } },
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
        float body = 1.0 - smoothstep(0.35, 1.0, r);
        float core = 1.0 - smoothstep(0.0, 0.55, r);
        float a = (body * 0.3 - core * 0.14) * uOpacity;
        gl_FragColor = vec4(vec3(0.2, 0.22, 0.25), max(a, 0.0));
      }
    `,
  });
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  const decor = createChapter3InsideDecor(scene, decorConfig);

  /** Same clear glass for every alien; own uniforms so a poke only jiggles the one touched. */
  type GlassKnobs = Chapter3Alien2GlassParams | Chapter3Alien3GlassParams;

  const createGlass = (glassOpts?: GlassKnobs) => {
    const ior = glassOpts?.ior ?? CHAPTER3_ALIEN_IOR;
    const dispersion = glassOpts?.dispersion ?? CHAPTER3_ALIEN_DISPERSION;
    const baseWobble = glassOpts?.wobble ?? CHAPTER3_ALIEN_WOBBLE;
    const uniforms = {
      uTime: { value: 0 },
      uWobble: { value: baseWobble },
      uPoke: { value: 0 },
      uMouthCenter: { value: new THREE.Vector3() },
      uMouthRadius: { value: new THREE.Vector2(MOUTH_DENT_RX_PX, MOUTH_DENT_RY_PX).multiplyScalar(CHAPTER3_ALIEN_PX_SCALE) },
      uMouthDepth: { value: MOUTH_DENT_DEPTH_PX * CHAPTER3_ALIEN_PX_SCALE },
      uMouthOpen: { value: 0 },
    };
    /** Round 'ㅇ' cavity pressed into the body: vertex dent + per-pixel normal bend + inner shade. */
    const addMouthDent = (shader: THREE.WebGLProgramParametersWithUniforms) => {
      const decl = `uniform vec3 uMouthCenter;
uniform vec2 uMouthRadius;
uniform float uMouthDepth;
uniform float uMouthOpen;
varying vec3 vMouthObj;
varying vec3 vMouthAxisX;
varying vec3 vMouthAxisY;
float mouthFront(float z) {
  return smoothstep(uMouthCenter.z - 0.2, uMouthCenter.z - 0.04, z);
}
`;
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", `${decl}void main() {`)
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vMouthObj = position;
          vMouthAxisX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
          vMouthAxisY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
          {
            vec2 mq = (position.xy - uMouthCenter.xy) / uMouthRadius;
            float mr2 = dot(mq, mq);
            if (uMouthOpen > 0.001 && mr2 < 1.0) {
              float mk = 1.0 - mr2;
              transformed -= normalize(normal) * mk * mk * mouthFront(position.z) * uMouthDepth * uMouthOpen;
            }
          }`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", `${decl}void main() {`)
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          float mouthShade = 0.0;
          {
            vec2 mq = (vMouthObj.xy - uMouthCenter.xy) / uMouthRadius;
            float mr2 = dot(mq, mq);
            if (uMouthOpen > 0.001 && mr2 < 1.0) {
              float front = mouthFront(vMouthObj.z);
              float mk = 1.0 - mr2;
              vec2 g = 4.0 * uMouthDepth * uMouthOpen * front * mk * mq / uMouthRadius;
              normal = normalize(normal - g.x * vMouthAxisX - g.y * vMouthAxisY);
              mouthShade = smoothstep(0.0, 0.7, mk) * front * uMouthOpen;
            }
          }`,
        )
        .replace(
          "#include <opaque_fragment>",
          `outgoingLight *= 1.0 - mouthShade * 0.42;
          #include <opaque_fragment>`,
        );
    };
    const addJelly = (shader: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "void main() {",
          "uniform float uTime;\nuniform float uWobble;\nuniform float uPoke;\nvoid main() {",
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float jelly = sin(uTime * 2.3 + position.x * 3.1 + position.y * 2.0) * 0.5
                      + sin(uTime * 3.7 + position.z * 4.0 + position.x * 1.3) * 0.5;
          transformed += normalize(normal) * jelly * uWobble * (1.0 + uPoke * 2.2);`,
        );
    };
    const rimGlassPatch = (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `{
          float nv = saturate(dot(normal, geometryViewDir));
          float ring = smoothstep(0.1, 0.38, nv) * (1.0 - smoothstep(0.38, 0.78, nv));
          float lip = 1.0 - smoothstep(0.0, 0.24, nv);
          outgoingLight *= 1.0 - ring * 0.26;
          outgoingLight *= 1.0 - 0.1 * saturate(-normal.y);
          outgoingLight = mix(outgoingLight, vec3(0.98), lip * 0.16);
        }
        #include <opaque_fragment>`,
      );
    };
    const body = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.08,
      transmission: 1,
      ior,
      thickness: CHAPTER3_ALIEN_THICKNESS,
      dispersion,
      attenuationColor: new THREE.Color(0.96, 0.98, 0.98),
      attenuationDistance: 6,
      specularIntensity: 1,
      envMapIntensity: 1,
      side: THREE.FrontSide,
    });
    body.onBeforeCompile = (shader) => {
      addJelly(shader);
      rimGlassPatch(shader);
      addMouthDent(shader);
    };
    const eye = body.clone();
    eye.thickness = 0.45;
    eye.roughness = 0.04;
    eye.dispersion = dispersion * 1.15;
    eye.onBeforeCompile = (shader) => {
      addJelly(shader);
    };
    const mouth = body.clone();
    mouth.thickness = 0.45;
    mouth.roughness = 0.04;
    mouth.dispersion = dispersion * 1.15;
    mouth.onBeforeCompile = () => {};
    return { body, eye, mouth, uniforms, baseWobble };
  };

  type Actor = {
    slot: AlienSlot;
    glass: ReturnType<typeof createGlass>;
    shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  };

  const applyActorPlacement = (
    actor: Actor,
    placement: { positionX: number; width: number; positionY: number },
  ) => {
    const { slot, shadow } = actor;
    slot.motion.positionX = placement.positionX;
    slot.motion.width = placement.width;
    slot.motion.positionY = placement.positionY;
    slot.root.position.x = placement.positionX;
    shadow.position.x = placement.positionX;
    fitSlotToGeometry(slot);
  };

  const applyGlassParams = (actor: Actor, params: GlassKnobs) => {
    actor.glass.baseWobble = params.wobble;
    actor.glass.body.ior = params.ior;
    actor.glass.body.dispersion = params.dispersion;
    actor.glass.eye.ior = params.ior;
    actor.glass.eye.dispersion = params.dispersion * 1.15;
  };

  const createActor = (
    parts: Chapter3AlienPart[],
    face: Chapter3AlienFaceParams,
    motion: AlienMotion,
    glassOpts?: GlassKnobs,
  ): Actor => {
    const glass = createGlass(glassOpts);
    const slot = createAlienSlot(parts, face, motion, glass.body, glass.eye, glass.mouth);
    scene.add(slot.root);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(motion.positionX, 0.002, 0);
    scene.add(shadow);
    return { slot, glass, shadow };
  };

  const primaryActor = createActor(initialParts, initialFace, {
    width: placements?.alien1.width ?? CHAPTER3_ALIEN_WIDTH,
    positionX: placements?.alien1.positionX ?? 0,
    positionY: placements?.alien1.positionY ?? 0,
    delayMs: CHAPTER3_ALIEN_DELAY_MS,
    turn: CHAPTER3_ALIEN_TURN,
    sway: CHAPTER3_ALIEN_SWAY,
  });
  const mountExtraActor = (
    slot: AlienSlot,
    glass: ReturnType<typeof createGlass>,
    positionX: number,
  ): Actor => {
    scene.add(slot.root);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(positionX, 0.002, 0);
    scene.add(shadow);
    return { slot, glass, shadow };
  };

  const alien2Actor = extras?.alien2
    ? (() => {
        const motion = {
          width: placements?.alien2.width ?? CHAPTER3_ALIEN2_WIDTH,
          positionX: placements?.alien2.positionX ?? CHAPTER3_ALIEN2_POSITION_X,
          positionY: placements?.alien2.positionY ?? 0,
          delayMs: CHAPTER3_ALIEN2_DELAY_MS,
          turn: CHAPTER3_ALIEN2_TURN,
          sway: CHAPTER3_ALIEN2_SWAY,
        };
        const glass = createGlass(extras.alien2.glass);
        const slot = createAlien2Slot(
          extras.alien2.parts,
          extras.alien2.face,
          motion,
          glass.body,
          glass.eye,
        );
        return mountExtraActor(slot, glass, motion.positionX);
      })()
    : null;

  const alien3Actor = extras?.alien3
    ? (() => {
        const motion = {
          width: placements?.alien3.width ?? CHAPTER3_ALIEN3_WIDTH,
          positionX: placements?.alien3.positionX ?? CHAPTER3_ALIEN3_POSITION_X,
          positionY: placements?.alien3.positionY ?? 0,
          delayMs: CHAPTER3_ALIEN3_DELAY_MS,
          turn: CHAPTER3_ALIEN3_TURN,
          sway: CHAPTER3_ALIEN3_SWAY,
        };
        const glass = createGlass(extras.alien3.glass);
        const slot = createAlien3Slot(
          extras.alien3.parts,
          extras.alien3.face,
          motion,
          glass.body,
          glass.eye,
        );
        return mountExtraActor(slot, glass, motion.positionX);
      })()
    : null;

  const actors = [
    primaryActor,
    ...(alien2Actor ? [alien2Actor] : []),
    ...(alien3Actor ? [alien3Actor] : []),
  ];

  if (placements) {
    applyActorPlacement(primaryActor, placements.alien1);
    if (alien2Actor) applyActorPlacement(alien2Actor, placements.alien2);
    if (alien3Actor) applyActorPlacement(alien3Actor, placements.alien3);
  }

  let startAt: number | null = null;
  let lastFrameMs: number | null = null;
  let viewW = 1;
  let viewH = 1;

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const groundHit = new THREE.Vector3();

  const pickActorAt = (clientX: number, clientY: number): Actor | null => {
    pointerNdc.set((clientX / viewW) * 2 - 1, -(clientY / viewH) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    let nearest: Actor | null = null;
    let nearestDist = Infinity;
    for (const actor of actors) {
      if (!actor.slot.root.visible) continue;
      const hit = raycaster.intersectObject(actor.slot.root, true)[0];
      if (hit && hit.distance < nearestDist) {
        nearestDist = hit.distance;
        nearest = actor;
      }
    }
    return nearest;
  };

  const clientToGroundX = (clientX: number, clientY: number) => {
    pointerNdc.set((clientX / viewW) * 2 - 1, -(clientY / viewH) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    return raycaster.ray.intersectPlane(groundPlane, groundHit) ? groundHit.x : null;
  };

  type DragSession = {
    actor: Actor;
    pointerId: number;
    startRootX: number;
    startGroundX: number;
    moved: boolean;
    startClientX: number;
    startClientY: number;
  };
  let drag: DragSession | null = null;
  const DRAG_PX = 5;

  const rebuildParts = (actor: Actor, parts: Chapter3AlienPart[]) => {
    const { slot } = actor;
    const token = ++slot.rebuildToken;
    const geometry = buildAlienGeometry(parts);
    if (token !== slot.rebuildToken) {
      geometry.dispose();
      return;
    }
    mountSlotGeometry(slot, geometry, actor.glass.eye);
  };

  return {
    isDraggingAlien() {
      return drag?.moved ?? false;
    },
    pointerDown(clientX: number, clientY: number, pointerId: number) {
      const actor = pickActorAt(clientX, clientY);
      if (!actor) return false;
      const gx = clientToGroundX(clientX, clientY);
      if (gx === null) return false;
      drag = {
        actor,
        pointerId,
        startRootX: actor.slot.root.position.x,
        startGroundX: gx,
        moved: false,
        startClientX: clientX,
        startClientY: clientY,
      };
      return true;
    },
    pointerMove(clientX: number, clientY: number, pointerId: number) {
      if (!drag || drag.pointerId !== pointerId) return;
      if (!drag.moved) {
        const d = Math.hypot(clientX - drag.startClientX, clientY - drag.startClientY);
        if (d < DRAG_PX) return;
        drag.moved = true;
      }
      const gx = clientToGroundX(clientX, clientY);
      if (gx === null) return;
      const nextX = drag.startRootX + (gx - drag.startGroundX);
      drag.actor.slot.root.position.x = nextX;
      drag.actor.slot.motion.positionX = nextX;
      drag.actor.shadow.position.x = nextX;
    },
    pointerUp(clientX: number, clientY: number, pointerId: number) {
      if (!drag || drag.pointerId !== pointerId) return;
      if (!drag.moved) {
        drag.actor.slot.poke = 1;
        drag.actor.slot.mouthOpenAt = performance.now();
      }
      drag = null;
    },
    /** @deprecated use pointerDown/Up — tap without drag still pokes. */
    pokeAt(clientX: number, clientY: number) {
      const actor = pickActorAt(clientX, clientY);
      if (!actor) return false;
      actor.slot.poke = 1;
      actor.slot.mouthOpenAt = performance.now();
      return true;
    },
    setFaceParams(params: Chapter3AlienFaceParams) {
      primaryActor.slot.faceParams = params;
      remountFaceRig(primaryActor.slot, primaryActor.glass.eye);
    },
    setAlien2FaceParams(params: Chapter3Alien2FaceParams) {
      if (!alien2Actor) return;
      alien2Actor.slot.faceParams = params;
      remountFaceRig(alien2Actor.slot, alien2Actor.glass.eye);
    },
    setAlien3FaceParams(params: Chapter3Alien3FaceParams) {
      if (!alien3Actor) return;
      alien3Actor.slot.faceParams = params;
      remountFaceRig(alien3Actor.slot, alien3Actor.glass.eye);
    },
    setAlienParts(parts: Chapter3AlienPart[]) {
      rebuildParts(primaryActor, parts);
    },
    setAlien2Parts(parts: Chapter3AlienPart[]) {
      if (!alien2Actor) return;
      rebuildParts(alien2Actor, parts);
    },
    setAlien3Parts(parts: Chapter3AlienPart[]) {
      if (!alien3Actor) return;
      rebuildParts(alien3Actor, parts);
    },
    setAlien2GlassParams(params: Chapter3Alien2GlassParams) {
      if (!alien2Actor) return;
      applyGlassParams(alien2Actor, params);
    },
    setAlien3GlassParams(params: Chapter3Alien3GlassParams) {
      if (!alien3Actor) return;
      applyGlassParams(alien3Actor, params);
    },
    getPlacements(): Chapter3AlienPlacements {
      return {
        alien1: {
          positionX: primaryActor.slot.root.position.x,
          width: primaryActor.slot.motion.width,
          positionY: primaryActor.slot.motion.positionY,
        },
        alien2: alien2Actor
          ? {
              positionX: alien2Actor.slot.root.position.x,
              width: alien2Actor.slot.motion.width,
              positionY: alien2Actor.slot.motion.positionY,
            }
          : placements?.alien2 ?? { positionX: 0, width: 1, positionY: 0 },
        alien3: alien3Actor
          ? {
              positionX: alien3Actor.slot.root.position.x,
              width: alien3Actor.slot.motion.width,
              positionY: alien3Actor.slot.motion.positionY,
            }
          : placements?.alien3 ?? { positionX: 0, width: 1, positionY: 0 },
      };
    },
    setPlacements(next: Chapter3AlienPlacements) {
      applyActorPlacement(primaryActor, next.alien1);
      if (alien2Actor) applyActorPlacement(alien2Actor, next.alien2);
      if (alien3Actor) applyActorPlacement(alien3Actor, next.alien3);
    },
    setDecorConfig(config: Chapter3InsideDecorConfig) {
      decor.setConfig(config);
    },
    setSize(w: number, h: number, dpr: number) {
      viewW = w;
      viewH = h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      glCanvas.style.width = `${w}px`;
      glCanvas.style.height = `${h}px`;

      const aspect = w / h;
      camera.aspect = aspect;
      const distance = 10 * Math.max(1, 1.6 / aspect);
      camera.position.set(0, 1.5, distance);
      camera.lookAt(0, 0.55, 0);
      camera.updateProjectionMatrix();

      const planeH = 2 * paperDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      paperPlane.scale.set(planeH * aspect, planeH, 1);
      coverTexture(paperTexture, aspect);
    },
    render(now: number) {
      if (startAt === null) startAt = now;
      const dt = Math.min(0.05, lastFrameMs === null ? 1 / 60 : (now - lastFrameMs) / 1000);
      lastFrameMs = now;
      const t = (now - startAt) / 1000;
      const alienMs = now - startAt;

      for (const { slot, glass, shadow } of actors) {
        const { localMs, lift, sxz } = updateAlienMotion(slot, alienMs, t, dt);
        glass.uniforms.uTime.value = t;
        glass.uniforms.uPoke.value = slot.poke;
        glass.uniforms.uWobble.value = glass.baseWobble + slot.poke * CHAPTER3_ALIEN_POKE_WOBBLE;
        if (slot.faceKind === "alien1") {
          const mouthOpen = mouthOpenEnvelope(slot.mouthOpenAt, now);
          setAlienMouthOpen(slot.faceRig, mouthOpen);
          glass.uniforms.uMouthOpen.value = mouthOpen;
          if (slot.faceRig.mouthAnchor) glass.uniforms.uMouthCenter.value.copy(slot.faceRig.mouthAnchor);
        }

        const onGround = localMs > CHAPTER3_ALIEN_FALL_MS;
        if (onGround) {
          if (slot.nextBlinkAt === 0) slot.nextBlinkAt = now + CHAPTER3_ALIEN_BLINK_INTERVAL_MS;
          if (!slot.blinkActive && now >= slot.nextBlinkAt) {
            slot.blinkActive = true;
            slot.blinkStartAt = now;
          }
          if (slot.blinkActive) {
            const blinkT = Math.min(1, (now - slot.blinkStartAt) / CHAPTER3_ALIEN_BLINK_MS);
            const shut = Math.sin(blinkT * Math.PI);
            const open = 1 - shut * 0.96;
            if (slot.faceKind === "alien3") {
              setAlien3EyeOpen(slot.faceRig, open);
            } else if (slot.faceKind === "alien2") {
              setAlien2EyeOpen(slot.faceRig, open);
            } else {
              setAlienEyeOpen(slot.faceRig.eyeMeshes, slot.faceRig.eyeBeadRadius, open);
            }
            if (blinkT >= 1) {
              slot.blinkActive = false;
              if (slot.faceKind === "alien3") {
                setAlien3EyeOpen(slot.faceRig, 1);
              } else if (slot.faceKind === "alien2") {
                setAlien2EyeOpen(slot.faceRig, 1);
              } else {
                setAlienEyeOpen(slot.faceRig.eyeMeshes, slot.faceRig.eyeBeadRadius, 1);
              }
              slot.nextBlinkAt = now + CHAPTER3_ALIEN_BLINK_INTERVAL_MS;
            }
          }
        }

        const near = localMs > 0 ? 1 - Math.min(1, lift / CHAPTER3_ALIEN_DROP_HEIGHT) : 0;
        shadow.material.uniforms.uOpacity.value = near * near;
        const spread = sxz * (0.6 + 0.4 * near);
        shadow.position.x = slot.root.position.x;
        shadow.scale.set(slot.shadowBaseW * spread, slot.shadowBaseD * spread, 1);
        shadow.rotation.z = slot.root.rotation.y;
      }

      decor.update(t);
      renderer.render(scene, camera);
    },
    dispose() {
      paper.removeEventListener("load", onPaperLoad);
      paperPlane.geometry.dispose();
      (paperPlane.material as THREE.Material).dispose();
      paperTexture.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      for (const { slot, glass, shadow } of actors) {
        disposeSlot(slot);
        glass.body.dispose();
        glass.eye.dispose();
        glass.mouth.dispose();
        shadow.material.dispose();
      }
      decor.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
