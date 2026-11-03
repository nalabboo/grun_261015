import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import type { Chapter3AlienPart } from "@/constants/chapter3AlienShape";
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
  buildAlienGeometry,
  CHAPTER3_ALIEN_FACE_CENTER_PX,
  CHAPTER3_ALIEN_FACE_SIZE_PX,
  CHAPTER3_ALIEN_PX_SCALE,
  drawEtchedFaceCanvas,
  pxToLocal,
} from "@/components/scene3/chapter3AlienGeometry";

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

/** Inside-the-planet stage: white paper and the clear glass hero alien dropping in. */
export function createChapter3InsideScene(
  glCanvas: HTMLCanvasElement,
  paper: HTMLImageElement,
  initialParts: Chapter3AlienPart[],
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
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  scene.add(shadow);

  const wobbleUniforms = {
    uTime: { value: 0 },
    uWobble: { value: CHAPTER3_ALIEN_WOBBLE },
    uPoke: { value: 0 },
  };
  const alienMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.03,
    transmission: 1,
    ior: CHAPTER3_ALIEN_IOR,
    thickness: CHAPTER3_ALIEN_THICKNESS,
    dispersion: CHAPTER3_ALIEN_DISPERSION,
    attenuationColor: new THREE.Color(0.96, 0.98, 0.98),
    attenuationDistance: 6,
    specularIntensity: 1,
    envMapIntensity: 1,
    side: THREE.FrontSide,
  });
  const addJelly = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, wobbleUniforms);
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
  alienMaterial.onBeforeCompile = (shader) => {
    addJelly(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `{
        float nv = saturate(dot(normal, geometryViewDir));
        float ring = smoothstep(0.04, 0.28, nv) * (1.0 - smoothstep(0.28, 0.62, nv));
        float lip = 1.0 - smoothstep(0.0, 0.1, nv);
        outgoingLight *= 1.0 - ring * 0.58;
        outgoingLight *= 1.0 - 0.22 * saturate(-normal.y);
        outgoingLight = mix(outgoingLight, vec3(0.97), lip * 0.45);
      }
      #include <opaque_fragment>`,
    );
  };

  let alienGeometry = buildAlienGeometry(initialParts);
  const alienBody = new THREE.Mesh(alienGeometry, alienMaterial);

  let bodyScale = 1;
  const bodyOffset = new THREE.Vector3();
  let shadowBaseW = CHAPTER3_ALIEN_WIDTH;
  let shadowBaseD = 1;

  const faceTexture = new THREE.CanvasTexture(drawEtchedFaceCanvas(1));
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  let lastFaceEyeOpen = 1;
  const updateFaceEyes = (eyeOpen: number) => {
    if (Math.abs(eyeOpen - lastFaceEyeOpen) < 0.025) return;
    lastFaceEyeOpen = eyeOpen;
    faceTexture.image = drawEtchedFaceCanvas(eyeOpen);
    faceTexture.needsUpdate = true;
  };
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    toneMapped: false,
  });
  faceMaterial.onBeforeCompile = addJelly;

  let probe = new THREE.Mesh(alienGeometry, new THREE.MeshBasicMaterial());
  let faceGeometry = new DecalGeometry(
    probe,
    pxToLocal(CHAPTER3_ALIEN_FACE_CENTER_PX[0], CHAPTER3_ALIEN_FACE_CENTER_PX[1], 140),
    new THREE.Euler(),
    new THREE.Vector3(
      CHAPTER3_ALIEN_FACE_SIZE_PX[0] * CHAPTER3_ALIEN_PX_SCALE,
      CHAPTER3_ALIEN_FACE_SIZE_PX[1] * CHAPTER3_ALIEN_PX_SCALE,
      0.25,
    ),
  );
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.renderOrder = 2;

  const alienInner = new THREE.Group();
  alienInner.add(alienBody, face);
  const alien = new THREE.Group();
  alien.add(alienInner);
  alien.visible = false;
  scene.add(alien);

  const fitAlienToGeometry = (geometry: THREE.BufferGeometry) => {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    bodyScale = CHAPTER3_ALIEN_WIDTH / (box.max.x - box.min.x);
    bodyOffset.set(-(box.max.x + box.min.x) / 2, -box.min.y, -(box.max.z + box.min.z) / 2);
    alienBody.position.copy(bodyOffset);
    face.position.copy(bodyOffset);
    alienInner.scale.setScalar(bodyScale);
    shadowBaseW = CHAPTER3_ALIEN_WIDTH * 1.08;
    shadowBaseD = (box.max.z - box.min.z) * bodyScale * 1.6;
  };

  fitAlienToGeometry(alienGeometry);

  let startAt: number | null = null;
  let lastFrameMs: number | null = null;
  let rebuildToken = 0;
  let nextBlinkAt = 0;
  let blinkStartAt = 0;
  let blinkActive = false;
  let poke = 0;
  let viewW = 1;
  let viewH = 1;

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  const mountAlienGeometry = (geometry: THREE.BufferGeometry) => {
    alienBody.geometry.dispose();
    (probe.material as THREE.Material).dispose();
    probe.geometry.dispose();
    faceGeometry.dispose();

    alienGeometry = geometry;
    alienBody.geometry = geometry;
    probe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    faceGeometry = new DecalGeometry(
      probe,
      pxToLocal(CHAPTER3_ALIEN_FACE_CENTER_PX[0], CHAPTER3_ALIEN_FACE_CENTER_PX[1], 140),
      new THREE.Euler(),
      new THREE.Vector3(
        CHAPTER3_ALIEN_FACE_SIZE_PX[0] * CHAPTER3_ALIEN_PX_SCALE,
        CHAPTER3_ALIEN_FACE_SIZE_PX[1] * CHAPTER3_ALIEN_PX_SCALE,
        0.25,
      ),
    );
    face.geometry = faceGeometry;
    fitAlienToGeometry(geometry);
  };

  return {
    /** Screen click on the alien — water-dog-style gulp (returns whether we hit). */
    pokeAt(clientX: number, clientY: number) {
      if (!alien.visible) return false;
      pointerNdc.set((clientX / viewW) * 2 - 1, -(clientY / viewH) * 2 + 1);
      raycaster.setFromCamera(pointerNdc, camera);
      const hit = raycaster.intersectObject(alien, true);
      if (!hit.length) return false;
      poke = 1;
      return true;
    },
    setAlienParts(parts: Chapter3AlienPart[]) {
      const token = ++rebuildToken;
      const geometry = buildAlienGeometry(parts);
      if (token !== rebuildToken) {
        geometry.dispose();
        return;
      }
      mountAlienGeometry(geometry);
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
      const alienMs = now - startAt - CHAPTER3_ALIEN_DELAY_MS;

      let lift = CHAPTER3_ALIEN_DROP_HEIGHT;
      let squash = 0;
      if (alienMs > 0) {
        alien.visible = true;
        const fallT = Math.min(1, alienMs / CHAPTER3_ALIEN_FALL_MS);
        lift = CHAPTER3_ALIEN_DROP_HEIGHT * (1 - fallT * fallT);
        if (fallT >= 1) {
          const settle = (alienMs - CHAPTER3_ALIEN_FALL_MS) / 1000;
          squash =
            CHAPTER3_ALIEN_SQUASH *
            Math.exp(-settle * CHAPTER3_ALIEN_SETTLE_DAMP) *
            Math.cos(settle * CHAPTER3_ALIEN_SETTLE_HZ * Math.PI * 2);
        } else {
          squash = -0.08 * fallT;
        }
      }

      if (poke > 0.001) poke *= Math.pow(0.25, dt);

      const breath = Math.sin(t * 1.9) * CHAPTER3_ALIEN_BREATH;
      const sy = 1 - squash + breath - poke * CHAPTER3_ALIEN_POKE_SQUASH;
      const sxz = 1 / Math.sqrt(Math.max(0.2, sy));
      alien.position.y = lift;
      alien.scale.set(sxz, sy, sxz);
      alien.rotation.y = CHAPTER3_ALIEN_TURN + Math.sin(t * 0.55) * CHAPTER3_ALIEN_SWAY;
      wobbleUniforms.uTime.value = t;
      wobbleUniforms.uPoke.value = poke;
      wobbleUniforms.uWobble.value = CHAPTER3_ALIEN_WOBBLE + poke * CHAPTER3_ALIEN_POKE_WOBBLE;

      const alienOnGround = alienMs > CHAPTER3_ALIEN_FALL_MS;
      if (alienOnGround) {
        if (nextBlinkAt === 0) nextBlinkAt = now + CHAPTER3_ALIEN_BLINK_INTERVAL_MS;
        if (!blinkActive && now >= nextBlinkAt) {
          blinkActive = true;
          blinkStartAt = now;
        }
        if (blinkActive) {
          const blinkT = Math.min(1, (now - blinkStartAt) / CHAPTER3_ALIEN_BLINK_MS);
          const shut = Math.sin(blinkT * Math.PI);
          updateFaceEyes(1 - shut * 0.96);
          if (blinkT >= 1) {
            blinkActive = false;
            updateFaceEyes(1);
            nextBlinkAt = now + CHAPTER3_ALIEN_BLINK_INTERVAL_MS;
          }
        }
      }

      const near = alienMs > 0 ? 1 - Math.min(1, lift / CHAPTER3_ALIEN_DROP_HEIGHT) : 0;
      shadowMaterial.uniforms.uOpacity.value = near * near;
      const spread = sxz * (0.6 + 0.4 * near);
      shadow.scale.set(shadowBaseW * spread, shadowBaseD * spread, 1);
      shadow.rotation.z = alien.rotation.y;

      renderer.render(scene, camera);
    },
    dispose() {
      paper.removeEventListener("load", onPaperLoad);
      paperPlane.geometry.dispose();
      (paperPlane.material as THREE.Material).dispose();
      paperTexture.dispose();
      shadow.geometry.dispose();
      shadowMaterial.dispose();
      alienGeometry.dispose();
      alienMaterial.dispose();
      faceGeometry.dispose();
      faceTexture.dispose();
      faceMaterial.dispose();
      (probe.material as THREE.Material).dispose();
      probe.geometry.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
