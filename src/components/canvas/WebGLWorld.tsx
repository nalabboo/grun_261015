"use client";

/* eslint-disable react-hooks/immutability, react-hooks/refs -- R3F scene objects (textures, meshes, uniforms) are mutated imperatively in useFrame by design. */

import { TransformControls, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import {
  GRUN_OFFSET_Y_RATIO,
  GRUN_SCALE,
  IMAGE_SIZES,
  MOSS_INSTANCE_IDS,
  SCENE_LAYERS,
  SCENE_PERSPECTIVE_RATIO,
  SCENE_REFERENCE_HEIGHT,
  SHOW_LANDMARKS,
  assetUrl,
  getFroschLayout,
  getGrunDisplayWidth,
  getKindLayout,
  getMossOnSteinLayouts,
  getSteinLayout,
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
import { createBakedLayerTexture, createReliefSpriteTexture } from "@/lib/bakeLayerTexture";
import { PAPER_GRAIN_TILE_PX } from "@/lib/paperGrain";
import { revealFragmentShader, revealVertexShader } from "./revealShader";
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

/** Same as `useSceneTexture`, with a lit relief baked in so the sprite looks rounded. */
function useReliefTexture(file: string, strength: number) {
  const texture = useSceneTexture(file);
  return useMemo(() => {
    const image = texture.image as HTMLImageElement;
    return strength > 0 ? createReliefSpriteTexture(image, strength) : texture;
  }, [texture, strength]);
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
  getRect: (metrics: SceneMetrics) => {
    worldX: number;
    bottom: number;
    width: number;
    height: number;
  };
};

function WorldSprite({ id, file, metrics, viewRef, renderOrder, getRect }: WorldSpriteProps) {
  const map = useSceneTexture(file);
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
    mesh.scale.set(rect.width, rect.height, 1);
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
/* Reveal sprite (b → g watercolor transition)                                */
/* -------------------------------------------------------------------------- */

type RevealSpriteProps = {
  id: CardId;
  bFile: string;
  gFile: string;
  /** Baked 3D relief strength for the sprite (0 = flat painting). */
  relief?: number;
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
  relief = 0,
  phase,
  onRevealComplete,
  metrics,
  viewRef,
  renderOrder,
  getRect,
}: RevealSpriteProps) {
  const bMap = useReliefTexture(bFile, relief);
  const gMap = useReliefTexture(gFile, relief);
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

  const { canvas, ctx, texture, frameBuffer } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_SIZES.grun_t.width;
    canvas.height = IMAGE_SIZES.grun_t.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const frameBuffer = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    return { canvas, ctx, texture, frameBuffer };
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const mesh = meshRef.current;
    const outer = outerRef.current;
    if (!mesh || !outer) return;

    const source = sourceRef.current;
    const movie = source.movie;

    if (ctx && movie && (source.animating || source.dirty)) {
      const time = source.animating ? Date.now() - source.playStartMs : 0;
      if (movie.renderAt(time, frameBuffer)) {
        ctx.putImageData(new ImageData(frameBuffer, canvas.width, canvas.height), 0, 0);
        texture.needsUpdate = true;
      }
      source.dirty = false;
      hasFrameRef.current = true;
    } else if (
      ctx &&
      !movie &&
      source.img &&
      source.img.complete &&
      source.img.naturalWidth > 0 &&
      source.dirty
    ) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source.img, 0, 0, canvas.width, canvas.height);
      texture.needsUpdate = true;
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
    mesh.scale.set(width, displayHeight, 1);
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
  froschPhase: RevealPhase;
  kindPhase: RevealPhase;
  mossPhases: MossPhases;
  onFroschRevealComplete: () => void;
  onKindRevealComplete: () => void;
  onMossRevealComplete: (id: MossInstanceId) => void;
  editor: EditorState;
  onReady?: () => void;
};

const kindRect = (metrics: SceneMetrics) => {
  const kind = getKindLayout(metrics);
  return { worldX: kind.worldX, bottom: kind.bottom, width: kind.width, height: kind.height };
};

const froschRect = (metrics: SceneMetrics) => {
  const frosch = getFroschLayout(metrics);
  return {
    worldX: frosch.worldX,
    bottom: frosch.bottom,
    width: frosch.width,
    height: frosch.height,
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

/** Baked 3D shading strength for the moss sprites. */
const MOSS_RELIEF = 0.55;

const MOSS_FILES: Record<MossInstanceId, { b: string; g: string }> = {
  moss1_b: { b: IMAGE_SIZES.moss1_b.file, g: IMAGE_SIZES.moss1_g.file },
  "moss2_b-left": { b: IMAGE_SIZES.moss2_b.file, g: IMAGE_SIZES.moss2_g.file },
  "moss2_b-right": { b: IMAGE_SIZES.moss2_b.file, g: IMAGE_SIZES.moss2_g.file },
};

export default function WebGLWorld({
  metrics,
  viewRef,
  grunSourceRef,
  froschPhase,
  kindPhase,
  mossPhases,
  onFroschRevealComplete,
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
          {SHOW_LANDMARKS && (
            <RevealSprite
              id="kind"
              bFile={IMAGE_SIZES.kind_sw.file}
              gFile={IMAGE_SIZES.kind_g.file}
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
                relief={MOSS_RELIEF}
                phase={mossPhases[id]}
                onRevealComplete={mossCompleteHandlers[id]}
                metrics={metrics}
                viewRef={viewRef}
                renderOrder={8}
                getRect={MOSS_RECTS[id]}
              />
            ))}
          {SHOW_LANDMARKS && (
            <RevealSprite
              id="frosch"
              bFile={IMAGE_SIZES.frosch_b.file}
              gFile={IMAGE_SIZES.frosch_g.file}
              phase={froschPhase}
              onRevealComplete={onFroschRevealComplete}
              metrics={metrics}
              viewRef={viewRef}
              renderOrder={9}
              getRect={froschRect}
            />
          )}
          <ReadySignal onReady={onReady} />
        </>
      )}
    </EditorContext.Provider>
  );
}
