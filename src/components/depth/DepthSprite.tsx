"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { depthTextureUrl, type DepthLayer } from "@/constants/depthConfig";
import { clamp01, damp, smoothstep } from "@/lib/depthMath";
import { applyPaperRelief } from "@/lib/paperRelief";
import { registerLayer, selectLayer } from "./DepthEditor";

type DepthSpriteProps = Pick<
  DepthLayer,
  "id" | "texture" | "revealTexture" | "revealRange" | "width" | "height" | "nearFade"
> & {
  /** Local position (relative to the parent group). */
  position: readonly [number, number, number];
};

const DEFAULT_NEAR_FADE = [1.5, 4] as const;
const _worldPosition = new THREE.Vector3();

/**
 * A flat hand-drawn PNG living in 3D space.
 * - fades out when the camera gets close so it never clips through the lens
 * - optionally cross-fades to a colour version as the camera approaches
 */
export default function DepthSprite({
  id,
  texture,
  revealTexture,
  revealRange,
  position,
  width,
  height,
  nearFade = DEFAULT_NEAR_FADE,
}: DepthSpriteProps) {
  const urls = revealTexture
    ? [depthTextureUrl(texture), depthTextureUrl(revealTexture)]
    : [depthTextureUrl(texture)];

  const textures = useTexture(urls, (loaded) => {
    for (const tex of Array.isArray(loaded) ? loaded : [loaded]) {
      tex.anisotropy = 8;
    }
  });
  const [baseMap, revealMap] = Array.isArray(textures) ? textures : [textures];

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const baseMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const revealMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const revealAmount = useRef(0);
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.userData.id = id;
    return registerLayer(id, group);
  }, [id]);

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current;
    const base = baseMaterial.current;
    if (!mesh || !base) return;

    mesh.getWorldPosition(_worldPosition);
    const distance = camera.position.z - _worldPosition.z;

    // Behind the camera or touching the lens → invisible.
    const fade = smoothstep(nearFade[0], nearFade[1], distance);
    mesh.visible = fade > 0.001;
    if (!mesh.visible) return;

    if (!revealRange || !revealMaterial.current) {
      base.opacity = fade;
      return;
    }

    const target = smoothstep(
      0,
      1,
      clamp01((revealRange[0] - distance) / (revealRange[0] - revealRange[1])),
    );
    revealAmount.current = damp(revealAmount.current, target, 5, Math.min(delta, 0.05));

    const t = revealAmount.current;
    revealMaterial.current.opacity = fade * t;
    // Fade the sketch out slightly later so the silhouette never dips in opacity.
    base.opacity = fade * (1 - clamp01((t - 0.35) / 0.65));
  });

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onPointerDown={(event) => {
        event.stopPropagation();
        selectLayer(id);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <mesh ref={meshRef} scale={[width, height, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={baseMaterial}
          map={baseMap}
          onBeforeCompile={applyPaperRelief}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
        {revealMap ? (
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={revealMaterial}
              map={revealMap}
              onBeforeCompile={applyPaperRelief}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ) : null}
      </mesh>
    </group>
  );
}
