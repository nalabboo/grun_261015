"use client";

/* eslint-disable react-hooks/immutability, react-hooks/refs -- R3F scene objects (textures, meshes, uniforms) are mutated imperatively in useFrame by design. */

import { gaussianBlurStraightRGBA } from "@/lib/gaussianBlur";
import { TransformControls, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import {
  GRUN_IDLE_BREATH,
  GRUN_OFFSET_Y_RATIO,
  GRUN_SCALE,
  GRUN_WALK,
  IMAGE_SIZES,
  MOSS_INSTANCE_IDS,
  AMPEL_FLOAT,
  AMPEL_SWITCH,
  getAmpelLayout,
  getSporeLayouts,
  SPORE_CLIP_FRAMES,
  SPORE_CLIP_LOOP_MS,
  SPORE_TREES,
  KIND_BOX,
  KIND_CLIPS,
  clipFrameFiles,
  WORM_BOX,
  WORM_CLIPS,
  sporeFrameUrls,
  SCENE_LAYERS,
  SCENE_PERSPECTIVE_RATIO,
  SCENE_REFERENCE_HEIGHT,
  SHOW_LANDMARKS,
  assetUrl,
  getWormLayout,
  getGrunDisplayWidth,
  getKindLayout,
  getMossOnSteinLayouts,
  getSteinLayout,
  type TransformClipId,
  type TransformClipSet,
  type MossInstanceId,
  type MossPhases,
  type SceneMetrics,
} from "@/constants/sceneConfig";
import {
  B_FADE_MS,
  REVEAL_COMPLETE_DELAY_MS,
  REVEAL_MASK_FINAL,
  easeOut,
  getRevealValues,
} from "./revealMath";
import { createBakedLayerTexture } from "@/lib/bakeLayerTexture";
import { PAPER_GRAIN_TILE_PX } from "@/lib/paperGrain";
import { revealFragmentShader, revealVertexShader } from "./revealShader";
import { sporeFragmentShader, sporeVertexShader } from "./sporeShader";
import type {
  CardId,
  EditorState,
  GrunFrameSourceRef,
  RevealPhase,
  WorldViewRef,
} from "./worldView";

type BergKey = "berg1" | "berg2" | "berg3" | "berg4";

type BergLayerConfig = {
  widthRatio: number;
  heightRatio: number;
  scale: number;
  blurRatio: number;
  brightness: number;
  parallax: number;
  depthRatio: number;
  offsetXRatio?: number;
  offsetXPx?: number;
  offsetYRatio?: number;
  offsetYPx?: number;
  /** Strength of the analog paper grain laid over the layer (0 = off). */
  paper?: number;
  /** Strength of the baked mountain shading (lit slopes and shadowed sides, 0 = flat). */
  relief?: number;
};

/** Display size (css px, before depth scale) of one paper-grain tile. */
const PAPER_TILE_DISPLAY_PX = PAPER_GRAIN_TILE_PX * 0.75;

/** Loads a texture treated as raw (sRGB-encoded) pixel data, matching CSS compositing. */
function useSceneTexture(file: string) {
  const texture = useTexture(assetUrl(file));

  useMemo(() => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return texture;
}

/** Same as `useSceneTexture` for a list of files (e.g. the frames of a loop). */
function useSceneTextures(files: readonly string[]) {
  const textures = useTexture(files.map((file) => assetUrl(file)));

  useMemo(() => {
    for (const texture of textures) {
      texture.colorSpace = THREE.NoColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
  }, [textures]);

  return textures;
}

const frameTextureLoader = new THREE.TextureLoader();

/** Loads clip frames without Suspense (mitte / g only — keeps first paint fast). */
function useLazyClipTextures(files: readonly string[], enabled: boolean) {
  const [textures, setTextures] = useState<THREE.Texture[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const urls = files.map((file) => assetUrl(file));
    void Promise.all(
      urls.map(
        (url) =>
          new Promise<THREE.Texture>((resolve, reject) => {
            frameTextureLoader.load(url, resolve, undefined, reject);
          }),
      ),
    ).then((loaded) => {
      if (cancelled) return;
      for (const texture of loaded) {
        texture.colorSpace = THREE.NoColorSpace;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
      }
      setTextures(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, files]);

  return textures;
}

/** Index of the frame to show for a looping clip at `nowMs`. */
function loopFrameIndex(nowMs: number, frameCount: number, loopMs: number) {
  const t = ((nowMs % loopMs) + loopMs) % loopMs;
  return Math.min(frameCount - 1, Math.floor((t / loopMs) * frameCount));
}

/* -------------------------------------------------------------------------- */
/* Editable cards (drei TransformControls)                                    */
/* -------------------------------------------------------------------------- */

const EditorContext = createContext<EditorState>({
  enabled: false,
  selectedId: null,
  mode: "translate",
});

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Hierarchy: outer group (follows the scene layout, set every frame)
 *            └ user group (TransformControls target: position / rotation / scale offsets)
 *               └ card mesh (sized to the card's pixel rect)
 * Rotation and scale therefore pivot around the card's center.
 */
function EditableCard({
  id,
  outerRef,
  userRef,
  children,
}: {
  id: CardId;
  outerRef: RefObject<THREE.Group | null>;
  userRef: RefObject<THREE.Group | null>;
  children: ReactNode;
}) {
  const editor = useContext(EditorContext);
  const selected = editor.enabled && editor.selectedId === id;

  const logFinalTransform = useCallback(() => {
    const user = userRef.current;
    if (!user) return;

    const world = user.getWorldPosition(new THREE.Vector3());
    const toDeg = THREE.MathUtils.radToDeg;

    console.log(`[TransformControls] ${id}`, {
      // Final card-center position in stage px (origin: bottom-left, y up).
      position: { x: round2(world.x), y: round2(world.y), z: round2(world.z) },
      // Rotation in degrees.
      rotation: {
        x: round2(toDeg(user.rotation.x)),
        y: round2(toDeg(user.rotation.y)),
        z: round2(toDeg(user.rotation.z)),
      },
      scale: { x: round2(user.scale.x), y: round2(user.scale.y), z: round2(user.scale.z) },
      // Delta from the card's default layout position (px).
      positionOffset: {
        x: round2(user.position.x),
        y: round2(user.position.y),
        z: round2(user.position.z),
      },
    });
  }, [id, userRef]);

  return (
    <>
      <group ref={outerRef}>
        <group ref={userRef}>{children}</group>
      </group>
      {/* Must live outside `outer`: the gizmo positions itself in world space. */}
      {selected && (
        <TransformControls
          object={userRef as RefObject<THREE.Object3D>}
          mode={editor.mode}
          onMouseUp={logFinalTransform}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The camera sits far away on +z. TransformControls derives its drag planes from the
 * camera-to-object vector, so a distant camera keeps that vector parallel to the view
 * axis (otherwise axis handles on an orthographic camera degenerate).
 */
const CAMERA_Z = 10000;

/** 1 world unit == 1 CSS pixel, origin at the stage's bottom-left, y up. */
function PixelCamera() {
  const camera = useThree((state) => state.camera) as THREE.OrthographicCamera;
  const size = useThree((state) => state.size);

  useFrame(() => {
    if (
      camera.left !== 0 ||
      camera.bottom !== 0 ||
      camera.right !== size.width ||
      camera.top !== size.height
    ) {
      camera.left = 0;
      camera.bottom = 0;
      camera.right = size.width;
      camera.top = size.height;
      camera.near = CAMERA_Z - 1000;
      camera.far = CAMERA_Z + 1000;
      camera.position.set(0, 0, CAMERA_Z);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Berg (parallax background) layers                                          */
/* -------------------------------------------------------------------------- */

type LayerTexture = {
  map: THREE.Texture;
  /** Padding around the content, as a fraction of content width / height. */
  padX: number;
  padY: number;
  owned: boolean;
};

type BergLayerProps = {
  layerKey: BergKey;
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  renderOrder: number;
};

function BergLayer({ layerKey, metrics, viewRef, renderOrder }: BergLayerProps) {
  const layer: BergLayerConfig = SCENE_LAYERS[layerKey];
  const asset = IMAGE_SIZES[layerKey];
  const baseTexture = useSceneTexture(asset.file);
  const maxTextureSize = useThree((state) => state.gl.capabilities.maxTextureSize);
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Group>(null);
  const userRef = useRef<THREE.Group>(null);

  const layerTexture = useMemo<LayerTexture>(() => {
    const image = baseTexture.image as HTMLImageElement;
    const blurCanvasPx =
      layer.blurRatio > 0 ? (layer.blurRatio * image.naturalHeight) / layer.heightRatio : 0;
    const paperStrength = layer.paper ?? 0;
    const reliefStrength = layer.relief ?? 0;
    if (blurCanvasPx <= 0 && paperStrength <= 0 && reliefStrength <= 0) {
      return { map: baseTexture, padX: 0, padY: 0, owned: false };
    }

    const stretchX =
      layer.widthRatio / layer.heightRatio / (image.naturalWidth / image.naturalHeight);
    const tilesAcross = (SCENE_REFERENCE_HEIGHT * layer.widthRatio) / PAPER_TILE_DISPLAY_PX;
    const baked = createBakedLayerTexture(
      image,
      blurCanvasPx,
      stretchX,
      maxTextureSize,
      paperStrength,
      tilesAcross,
      reliefStrength,
    );

    // Cached for the page lifetime so a remount does not rebake or dispose it.
    return { ...baked, owned: false };
  }, [baseTexture, layer, maxTextureSize]);

  useEffect(() => {
    if (!layerTexture.owned) return;
    return () => layerTexture.map.dispose();
  }, [layerTexture]);

  const material = useMemo(() => {
    const result = new THREE.MeshBasicMaterial({
      map: layerTexture.map,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const b = layer.brightness;
    result.color.setRGB(b, b, b, THREE.LinearSRGBColorSpace);
    return result;
  }, [layerTexture, layer.brightness]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const mesh = meshRef.current;
    const outer = outerRef.current;
    if (!mesh || !outer) return;

    const height = metrics.height;
    const perspective = height * SCENE_PERSPECTIVE_RATIO;
    // The editor's z offset acts as extra depth (px) for the CSS-like perspective.
    const depth = layer.depthRatio * height + (userRef.current?.position.z ?? 0);
    const depthFactor = perspective / Math.max(perspective - depth, 1);

    const baseOffsetX =
      (layer.offsetXRatio ?? 0) * metrics.panoramaWidth + (layer.offsetXPx ?? 0);
    const offsetX = baseOffsetX - viewRef.current.worldScroll * layer.parallax;
    const offsetY = (layer.offsetYRatio ?? 0) * height + (layer.offsetYPx ?? 0);

    const factor = depthFactor * layer.scale;
    const layerW = height * layer.widthRatio * factor;
    const layerH = height * layer.heightRatio * factor;
    const left = depthFactor * offsetX;
    const bottom = -depthFactor * offsetY;

    const totalW = layerW * (1 + layerTexture.padX * 2);
    const totalH = layerH * (1 + layerTexture.padY * 2);

    outer.position.set(
      left - layerW * layerTexture.padX + totalW / 2,
      bottom - layerH * layerTexture.padY + totalH / 2,
      0,
    );
    mesh.scale.set(totalW, totalH, 1);
  });

  return (
    <EditableCard id={layerKey} outerRef={outerRef} userRef={userRef}>
      <mesh ref={meshRef} renderOrder={renderOrder} frustumCulled={false} material={material}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </EditableCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Static sprite (stein)                                                      */
/* -------------------------------------------------------------------------- */

type WorldSpriteProps = {
  id: CardId;
  file: string;
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  renderOrder: number;
  /** Gaussian blur radius in source-image px (baked on the CPU). */
  blurSrcPx?: number;
  getRect: (metrics: SceneMetrics) => {
    worldX: number;
    bottom: number;
    width: number;
    height: number;
  };
};

function WorldSprite({
  id,
  file,
  metrics,
  viewRef,
  renderOrder,
  getRect,
  blurSrcPx = 0,
}: WorldSpriteProps) {
  const baseMap = useSceneTexture(file);
  const { map, pad } = useMemo(() => {
    if (blurSrcPx < 0.5) return { map: baseMap, pad: 0 };
    const image = baseMap.image as HTMLImageElement;
    const p = Math.ceil(blurSrcPx * 3);
    const w = image.naturalWidth + p * 2;
    const h = image.naturalHeight + p * 2;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { map: baseMap, pad: 0 };
    ctx.drawImage(image, p, p);
    const data = ctx.getImageData(0, 0, w, h);
    gaussianBlurStraightRGBA(data.data, w, h, blurSrcPx);
    ctx.putImageData(data, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
    return { map: texture, pad: p };
  }, [baseMap, blurSrcPx]);
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Group>(null);
  const userRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    const outer = outerRef.current;
    if (!mesh || !outer) return;
    const rect = getRect(metrics);
    outer.position.set(
      rect.worldX - viewRef.current.worldScroll + rect.width / 2,
      rect.bottom + rect.height / 2,
      0,
    );
    const image = baseMap.image as HTMLImageElement;
    const grow = pad > 0 ? (2 * pad) / image.naturalWidth : 0;
    const growY = pad > 0 ? (2 * pad) / image.naturalHeight : 0;
    mesh.scale.set(rect.width * (1 + grow), rect.height * (1 + growY), 1);
  });

  return (
    <EditableCard id={id} outerRef={outerRef} userRef={userRef}>
      <mesh ref={meshRef} renderOrder={renderOrder} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={map}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </EditableCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Spore (swaying frame loop from pore.mp4, blurred on the GPU by depth)      */
/* -------------------------------------------------------------------------- */

type SporeSpriteProps = {
  tree: (typeof SPORE_TREES)[number];
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  renderOrder: number;
};

function SporeSprite({ tree, metrics, viewRef, renderOrder }: SporeSpriteProps) {
  // drei caches textures by URL, so every spore of the same kind shares one set of frames.
  const frames = useTexture(sporeFrameUrls(tree.asset));
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Group>(null);
  const userRef = useRef<THREE.Group>(null);

  useMemo(() => {
    for (const frame of frames) {
      frame.colorSpace = THREE.NoColorSpace;
      frame.anisotropy = 8;
      frame.needsUpdate = true;
    }
  }, [frames]);

  const uniforms = useMemo(
    () => ({
      map: { value: frames[0] },
      blurUv: { value: new THREE.Vector2(0, 0) },
      grow: { value: new THREE.Vector2(0, 0) },
    }),
    [frames],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    const outer = outerRef.current;
    if (!mesh || !outer) return;

    const layout = getSporeLayouts(metrics).find((l) => l.id === tree.id);
    if (!layout) return;

    const t = (((Date.now() + layout.phaseMs) % SPORE_CLIP_LOOP_MS) + SPORE_CLIP_LOOP_MS) %
      SPORE_CLIP_LOOP_MS;
    const index = Math.min(
      SPORE_CLIP_FRAMES - 1,
      Math.floor((t / SPORE_CLIP_LOOP_MS) * SPORE_CLIP_FRAMES),
    );
    // R3F copies the `uniforms` prop into the material, so update the material's own copy.
    const live = (mesh.material as THREE.ShaderMaterial).uniforms;
    live.map.value = frames[index];

    // Blur spreads ~3 sigma past the frame, so the quad grows by that much on every side.
    const padPx = layout.blurPx * 3;
    live.blurUv.value.set(layout.blurPx / layout.width, layout.blurPx / layout.height);
    live.grow.value.set((2 * padPx) / layout.width, (2 * padPx) / layout.height);

    outer.position.set(
      layout.worldX - viewRef.current.worldScroll + layout.width / 2,
      layout.bottom + layout.height / 2,
      0,
    );
    mesh.scale.set(layout.width + 2 * padPx, layout.height + 2 * padPx, 1);
  });

  return (
    <EditableCard id={tree.id} outerRef={outerRef} userRef={userRef}>
      <mesh ref={meshRef} renderOrder={renderOrder} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={sporeVertexShader}
          fragmentShader={sporeFragmentShader}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </EditableCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Reveal sprite (b → g watercolor transition)                                */
/* -------------------------------------------------------------------------- */

type RevealSpriteProps = {
  id: CardId;
  /** One image, or the frames of a loop (played over `frameLoopMs`). */
  bFile: string | readonly string[];
  gFile: string | readonly string[];
  /** Duration of one loop when `bFile` / `gFile` are frame lists (ms). */
  frameLoopMs?: number;
  phase: RevealPhase;
  onRevealComplete: () => void;
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  renderOrder: number;
  getRect: (metrics: SceneMetrics) => {
    worldX: number;
    bottom: number;
    width: number;
    height: number;
  };
};

function RevealSprite({
  id,
  bFile,
  gFile,
  frameLoopMs = 1000,
  phase,
  onRevealComplete,
  metrics,
  viewRef,
  renderOrder,
  getRect,
}: RevealSpriteProps) {
  const bFrames = useSceneTextures(typeof bFile === "string" ? [bFile] : bFile);
  const gFrames = useSceneTextures(typeof gFile === "string" ? [gFile] : gFile);
  const bMap = bFrames[0];
  const gMap = gFrames[0];
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Group>(null);
  const userRef = useRef<THREE.Group>(null);
  const revealStartRef = useRef<number | null>(null);
  const completedAtRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onRevealComplete);
  onCompleteRef.current = onRevealComplete;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uB: { value: bMap },
          uG: { value: gMap },
          uBOpacity: { value: 1 },
          uGOpacity: { value: 0 },
          uBlurPx: { value: 0 },
          uMaskSize: { value: 0.12 },
          uSize: { value: new THREE.Vector2(1, 1) },
        },
        vertexShader: revealVertexShader,
        fragmentShader: revealFragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [bMap, gMap],
  );

  useEffect(() => () => material.dispose(), [material]);

  // Each sprite owns its timer so overlapping reveals keep independent tempos.
  useEffect(() => {
    if (phase === "revealing") {
      revealStartRef.current = performance.now();
      const timer = window.setTimeout(() => {
        onCompleteRef.current();
      }, REVEAL_COMPLETE_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === "g" && completedAtRef.current === null) {
      completedAtRef.current = performance.now();
    }
  }, [phase]);

  useFrame(() => {
    const mesh = meshRef.current;
    const outer = outerRef.current;
    if (!mesh || !outer) return;

    const rect = getRect(metrics);
    outer.position.set(
      rect.worldX - viewRef.current.worldScroll + rect.width / 2,
      rect.bottom + rect.height / 2,
      0,
    );
    mesh.scale.set(rect.width, rect.height, 1);

    const uniforms = material.uniforms;
    (uniforms.uSize.value as THREE.Vector2).set(rect.width, rect.height);

    if (bFrames.length > 1) {
      uniforms.uB.value = bFrames[loopFrameIndex(Date.now(), bFrames.length, frameLoopMs)];
    }
    if (gFrames.length > 1) {
      uniforms.uG.value = gFrames[loopFrameIndex(Date.now(), gFrames.length, frameLoopMs)];
    }

    const now = performance.now();

    if (phase === "b") {
      uniforms.uBOpacity.value = 1;
      uniforms.uGOpacity.value = 0;
      uniforms.uBlurPx.value = 0;
      uniforms.uMaskSize.value = 0.12;
      return;
    }

    if (phase === "revealing") {
      const start = revealStartRef.current ?? now;
      const values = getRevealValues(now - start);
      uniforms.uBOpacity.value = 1;
      uniforms.uGOpacity.value = values.opacity;
      uniforms.uBlurPx.value = values.blurPx;
      uniforms.uMaskSize.value = values.maskSize;
      return;
    }

    const completedAt = completedAtRef.current ?? now;
    const fade = easeOut((now - completedAt) / B_FADE_MS);
    uniforms.uBOpacity.value = 1 - fade;
    uniforms.uGOpacity.value = 1;
    uniforms.uBlurPx.value = 0;
    uniforms.uMaskSize.value = REVEAL_MASK_FINAL;
  });

  return (
    <EditableCard id={id} outerRef={outerRef} userRef={userRef}>
      <mesh ref={meshRef} renderOrder={renderOrder} frustumCulled={false} material={material}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </EditableCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Kid / worm (grey loop → click → transformation once → green loop)          */
/* -------------------------------------------------------------------------- */

type TransformSpriteProps = {
  id: CardId;
  /** Clips positioned in the character's box px; `boxWidth` = width of `getRect`'s rect. */
  clips: TransformClipSet;
  boxWidth: number;
  phase: RevealPhase;
  /** Called once the transformation clip has finished playing. */
  onRevealComplete: () => void;
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  renderOrder: number;
  getRect: (metrics: SceneMetrics) => {
    worldX: number;
    bottom: number;
    width: number;
    height: number;
  };
};

function TransformSprite({
  id,
  clips,
  boxWidth,
  phase,
  onRevealComplete,
  metrics,
  viewRef,
  renderOrder,
  getRect,
}: TransformSpriteProps) {
  const swFiles = useMemo(() => clipFrameFiles(clips.sw), [clips]);
  const mitteFiles = useMemo(() => clipFrameFiles(clips.mitte), [clips]);
  const gFiles = useMemo(() => clipFrameFiles(clips.g), [clips]);
  const swFrames = useSceneTextures(swFiles);
  const mitteFrames = useLazyClipTextures(mitteFiles, phase !== "b");
  const gFrames = useLazyClipTextures(gFiles, phase !== "b");
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Group>(null);
  const userRef = useRef<THREE.Group>(null);
  /** Date.now() when the transformation started (0 = not started). */
  const mitteStartRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onRevealComplete);
  onCompleteRef.current = onRevealComplete;

  useEffect(() => {
    if (phase === "b") {
      mitteStartRef.current = 0;
      completedRef.current = false;
    } else if (phase === "revealing" && mitteStartRef.current === 0) {
      mitteStartRef.current = Date.now();
    }
  }, [phase]);

  useFrame(() => {
    const mesh = meshRef.current;
    const outer = outerRef.current;
    if (!mesh || !outer) return;

    const now = Date.now();
    const mitteMs = clips.mitte.durationMs;
    const mitteElapsed = mitteStartRef.current > 0 ? now - mitteStartRef.current : Infinity;

    let clipId: TransformClipId;
    let frames: THREE.Texture[];
    let index: number;
    if (phase === "b") {
      clipId = "sw";
      frames = swFrames;
      index = loopFrameIndex(now, frames.length, clips.sw.durationMs);
    } else if (mitteElapsed < mitteMs) {
      clipId = "mitte";
      frames = mitteFrames.length > 0 ? mitteFrames : swFrames;
      index =
        mitteFrames.length > 0
          ? Math.min(frames.length - 1, Math.floor((mitteElapsed / mitteMs) * frames.length))
          : loopFrameIndex(now, swFrames.length, clips.sw.durationMs);
    } else {
      if (phase === "revealing" && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
      clipId = "g";
      frames = gFrames.length > 0 ? gFrames : swFrames;
      // Start the green loop on its first frame right where the transformation ends.
      const gElapsed = Number.isFinite(mitteElapsed) ? mitteElapsed - mitteMs : now;
      index =
        gFrames.length > 0
          ? loopFrameIndex(gElapsed, frames.length, clips.g.durationMs)
          : loopFrameIndex(now, swFrames.length, clips.sw.durationMs);
    }

    const material = mesh.material as THREE.MeshBasicMaterial;
    const map = frames[index] ?? swFrames[0];
    if (material.map !== map) material.map = map;

    // Place the clip's own box (in box px) relative to the character's layout rect.
    const rect = getRect(metrics);
    const clip = clips[clipId];
    const unit = rect.width / boxWidth;
    const width = clip.width * unit;
    const height = clip.height * unit;
    const left = rect.worldX + clip.x * unit;
    const top = rect.bottom + rect.height - clip.y * unit;
    outer.position.set(
      left - viewRef.current.worldScroll + width / 2,
      top - height / 2,
      0,
    );
    mesh.scale.set(width, height, 1);
  });

  return (
    <EditableCard id={id} outerRef={outerRef} userRef={userRef}>
      <mesh ref={meshRef} renderOrder={renderOrder} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={swFrames[0]}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </EditableCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Traffic light (floats; click → red to green)                                 */
/* -------------------------------------------------------------------------- */

type AmpelSpriteProps = {
  phase: RevealPhase;
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  renderOrder: number;
};

function AmpelSprite({ phase, metrics, viewRef, renderOrder }: AmpelSpriteProps) {
  const bMap = useSceneTexture(IMAGE_SIZES.ampel_b.file);
  const gMap = useSceneTexture(IMAGE_SIZES.ampel_g.file);
  const outerRef = useRef<THREE.Group>(null);
  const userRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);
  const bMeshRef = useRef<THREE.Mesh>(null);
  const gMeshRef = useRef<THREE.Mesh>(null);
  /** Date.now() when the light was clicked (0 = still red). */
  const switchStartRef = useRef(0);

  useEffect(() => {
    if (phase === "b") switchStartRef.current = 0;
    else if (switchStartRef.current === 0) switchStartRef.current = Date.now();
  }, [phase]);

  useFrame(() => {
    const outer = outerRef.current;
    const float = floatRef.current;
    const bMesh = bMeshRef.current;
    const gMesh = gMeshRef.current;
    if (!outer || !float || !bMesh || !gMesh) return;

    const now = Date.now();
    const rect = getAmpelLayout(metrics);
    const unit = metrics.height / SCENE_REFERENCE_HEIGHT;
    outer.position.set(
      rect.worldX - viewRef.current.worldScroll + rect.width / 2,
      rect.bottom + rect.height / 2,
      0,
    );

    // Float: slow up/down drift with a slightly offset sway.
    const wave = (now / AMPEL_FLOAT.periodMs) * Math.PI * 2;
    float.position.y = Math.sin(wave) * AMPEL_FLOAT.amplitudePx * unit;
    float.rotation.z = Math.sin(wave * 0.5 + 1.3) * THREE.MathUtils.degToRad(AMPEL_FLOAT.tiltDeg);

    bMesh.scale.set(rect.width, rect.height, 1);
    gMesh.scale.set(rect.width, rect.height, 1);

    const elapsed = switchStartRef.current > 0 ? now - switchStartRef.current : -1;
    const gMaterial = gMesh.material as THREE.MeshBasicMaterial;
    if (elapsed < 0) {
      gMesh.visible = false;
      bMesh.visible = true;
      const bMaterial = bMesh.material as THREE.MeshBasicMaterial;
      bMaterial.opacity = 1;
    } else {
      gMesh.visible = true;
      const t = Math.min(1, elapsed / AMPEL_SWITCH.fadeMs);
      const ease = t * t * (3 - 2 * t);
      gMaterial.opacity = ease;
      gMaterial.color.setScalar(1);
      const bMaterial = bMesh.material as THREE.MeshBasicMaterial;
      bMaterial.opacity = 1 - ease;
      bMesh.visible = bMaterial.opacity > 0.02;
    }
  });

  return (
    <EditableCard id="ampel" outerRef={outerRef} userRef={userRef}>
      <group ref={floatRef}>
        <mesh ref={bMeshRef} renderOrder={renderOrder} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={bMap}
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={gMeshRef} renderOrder={renderOrder + 0.01} frustumCulled={false} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={gMap}
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </EditableCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Grun (animated GIF → canvas texture)                                       */
/* -------------------------------------------------------------------------- */

type GrunQuadProps = {
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  sourceRef: GrunFrameSourceRef;
  renderOrder: number;
};

function GrunQuad({ metrics, viewRef, sourceRef, renderOrder }: GrunQuadProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Group>(null);
  const userRef = useRef<THREE.Group>(null);
  const hasFrameRef = useRef(false);
  /** Idle breathing: last walk-cycle time seen, when it last changed, and fade-in weight. */
  const breathRef = useRef({ timeMs: Number.NaN, changedAt: 0, weight: 0 });

  const { ctx, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = GRUN_WALK.width;
    canvas.height = GRUN_WALK.height;
    const ctx = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { ctx, texture };
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const outer = outerRef.current;
    if (!mesh || !outer) return;

    const source = sourceRef.current;
    const movie = source.movie;

    // Standing still = the walk-cycle time hasn't changed for a moment.
    const breath = breathRef.current;
    const now = performance.now();
    if (source.timeMs !== breath.timeMs) {
      breath.timeMs = source.timeMs;
      breath.changedAt = now;
    }
    const idleMs = now - breath.changedAt - GRUN_IDLE_BREATH.delayMs;
    const fadeStep = (delta * 1000) / GRUN_IDLE_BREATH.fadeMs;
    breath.weight =
      idleMs > 0
        ? Math.min(1, breath.weight + fadeStep)
        : Math.max(0, breath.weight - fadeStep * 4);
    // 0 → 1 → 0 once per period, starting from rest when he stops.
    const cycle = idleMs > 0 ? (idleMs % GRUN_IDLE_BREATH.periodMs) / GRUN_IDLE_BREATH.periodMs : 0;
    const swell = breath.weight * GRUN_IDLE_BREATH.amplitude * (0.5 - 0.5 * Math.cos(cycle * Math.PI * 2));

    if (ctx && movie && source.dirty) {
      if (movie.drawAt(source.timeMs, ctx, !hasFrameRef.current)) {
        texture.needsUpdate = true;
      }
      source.dirty = false;
      hasFrameRef.current = true;
    }

    mesh.visible = hasFrameRef.current;

    const height = metrics.height;
    const width = getGrunDisplayWidth(metrics);
    const displayHeight = height * GRUN_SCALE;
    const offsetY = height * GRUN_OFFSET_Y_RATIO;

    outer.position.set(
      viewRef.current.grunWorldX - viewRef.current.worldScroll + width / 2,
      -offsetY + displayHeight / 2,
      0,
    );
    // Grow from the feet: scale around the bottom edge.
    mesh.scale.set(
      width * (1 - swell * GRUN_IDLE_BREATH.widthRatio),
      displayHeight * (1 + swell),
      1,
    );
    mesh.position.y = (displayHeight * swell) / 2;
  });

  return (
    <EditableCard id="grun" outerRef={outerRef} userRef={userRef}>
      <mesh ref={meshRef} renderOrder={renderOrder} frustumCulled={false} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </EditableCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Ready signal                                                               */
/* -------------------------------------------------------------------------- */

/** Mounts only after every texture above resolved; fires after a couple of painted frames. */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let frames = 0;
    let frameId = 0;

    const step = () => {
      frames += 1;
      if (frames >= 3) {
        onReadyRef.current?.();
        return;
      }
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return null;
}

/* -------------------------------------------------------------------------- */
/* World                                                                      */
/* -------------------------------------------------------------------------- */

export type WebGLWorldProps = {
  metrics: SceneMetrics;
  viewRef: WorldViewRef;
  grunSourceRef: GrunFrameSourceRef;
  wormPhase: RevealPhase;
  kindPhase: RevealPhase;
  ampelPhase: RevealPhase;
  mossPhases: MossPhases;
  onWormRevealComplete: () => void;
  onKindRevealComplete: () => void;
  onMossRevealComplete: (id: MossInstanceId) => void;
  editor: EditorState;
  onReady?: () => void;
};

const kindRect = (metrics: SceneMetrics) => {
  const kind = getKindLayout(metrics);
  return { worldX: kind.worldX, bottom: kind.bottom, width: kind.width, height: kind.height };
};

const wormRect = (metrics: SceneMetrics) => {
  const worm = getWormLayout(metrics);
  return {
    worldX: worm.worldX,
    bottom: worm.bottom,
    width: worm.width,
    height: worm.height,
  };
};

const steinRect = (metrics: SceneMetrics) => {
  const stein = getSteinLayout(metrics);
  return { worldX: stein.worldX, bottom: 0, width: stein.width, height: stein.height };
};

function createMossRect(id: MossInstanceId) {
  return (metrics: SceneMetrics) => {
    const stein = getSteinLayout(metrics);
    const moss = getMossOnSteinLayouts(metrics).find((layer) => layer.id === id);
    if (!moss) return { worldX: 0, bottom: 0, width: 0, height: 0 };
    return {
      worldX: stein.worldX + moss.left,
      bottom: moss.bottom,
      width: moss.width,
      height: moss.height,
    };
  };
}

const MOSS_RECTS = Object.fromEntries(
  MOSS_INSTANCE_IDS.map((id) => [id, createMossRect(id)]),
) as Record<MossInstanceId, ReturnType<typeof createMossRect>>;

const MOSS_FILES: Record<MossInstanceId, { b: string; g: string }> = {
  moss1_b: { b: IMAGE_SIZES.moss1_b.file, g: IMAGE_SIZES.moss1_g.file },
  "moss2_b-left": { b: IMAGE_SIZES.moss2_b.file, g: IMAGE_SIZES.moss2_g.file },
  "moss2_b-right": { b: IMAGE_SIZES.moss2_b.file, g: IMAGE_SIZES.moss2_g.file },
};

export default function WebGLWorld({
  metrics,
  viewRef,
  grunSourceRef,
  wormPhase,
  kindPhase,
  ampelPhase,
  mossPhases,
  onWormRevealComplete,
  onKindRevealComplete,
  onMossRevealComplete,
  editor,
  onReady,
}: WebGLWorldProps) {
  const hasMetrics = metrics.height > 0;

  const mossCompleteHandlers = useMemo(
    () =>
      Object.fromEntries(
        MOSS_INSTANCE_IDS.map((id) => [id, () => onMossRevealComplete(id)]),
      ) as Record<MossInstanceId, () => void>,
    [onMossRevealComplete],
  );

  return (
    <EditorContext.Provider value={editor}>
      <PixelCamera />
      {hasMetrics && (
        <>
          <BergLayer layerKey="berg4" metrics={metrics} viewRef={viewRef} renderOrder={1} />
          <BergLayer layerKey="berg3" metrics={metrics} viewRef={viewRef} renderOrder={2} />
          {SHOW_LANDMARKS &&
            SPORE_TREES.filter((tree) => tree.front === false).map((tree) => (
              <SporeSprite
                key={tree.id}
                tree={tree}
                metrics={metrics}
                viewRef={viewRef}
                renderOrder={2.5}
              />
            ))}
          {SHOW_LANDMARKS && (
            <TransformSprite
              id="kind"
              clips={KIND_CLIPS}
              boxWidth={KIND_BOX.width}
              phase={kindPhase}
              onRevealComplete={onKindRevealComplete}
              metrics={metrics}
              viewRef={viewRef}
              renderOrder={3}
              getRect={kindRect}
            />
          )}
          <GrunQuad
            metrics={metrics}
            viewRef={viewRef}
            sourceRef={grunSourceRef}
            renderOrder={4}
          />
          {SHOW_LANDMARKS && (
            <WorldSprite
              id="stein"
              file={IMAGE_SIZES.stein.file}
              metrics={metrics}
              viewRef={viewRef}
              renderOrder={5}
              getRect={steinRect}
            />
          )}
          <BergLayer layerKey="berg2" metrics={metrics} viewRef={viewRef} renderOrder={6} />
          <BergLayer layerKey="berg1" metrics={metrics} viewRef={viewRef} renderOrder={7} />
          {SHOW_LANDMARKS &&
            MOSS_INSTANCE_IDS.map((id) => (
              <RevealSprite
                key={id}
                id={id}
                bFile={MOSS_FILES[id].b}
                gFile={MOSS_FILES[id].g}
                phase={mossPhases[id]}
                onRevealComplete={mossCompleteHandlers[id]}
                metrics={metrics}
                viewRef={viewRef}
                renderOrder={8}
                getRect={MOSS_RECTS[id]}
              />
            ))}
          {SHOW_LANDMARKS && (
            <TransformSprite
              id="worm"
              clips={WORM_CLIPS}
              boxWidth={WORM_BOX.width}
              phase={wormPhase}
              onRevealComplete={onWormRevealComplete}
              metrics={metrics}
              viewRef={viewRef}
              renderOrder={9}
              getRect={wormRect}
            />
          )}
          {SHOW_LANDMARKS && (
            <AmpelSprite
              phase={ampelPhase}
              metrics={metrics}
              viewRef={viewRef}
              renderOrder={3.2}
            />
          )}
          {SHOW_LANDMARKS &&
            SPORE_TREES.filter((tree) => tree.front === true).map((tree) => (
              <SporeSprite
                key={tree.id}
                tree={tree}
                metrics={metrics}
                viewRef={viewRef}
                renderOrder={10}
              />
            ))}
          <ReadySignal onReady={onReady} />
        </>
      )}
    </EditorContext.Provider>
  );
}
