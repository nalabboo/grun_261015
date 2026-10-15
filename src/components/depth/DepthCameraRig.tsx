"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DEPTH_CAMERA, DEPTH_DAMPING, PAPER_RELIEF } from "@/constants/depthConfig";
import { clamp01, damp, lerp } from "@/lib/depthMath";
import { getPaperUniforms } from "@/lib/paperRelief";
import type { DepthInput } from "./depthInput";

const _lookTarget = new THREE.Vector3();

/**
 * Scroll  → dolly the camera along −Z (and gently down).
 * Pointer → shift the camera sideways while it keeps looking at a point straight
 *           ahead, so the view orbits slightly instead of just sliding.
 */
export default function DepthCameraRig({ input }: { input: React.RefObject<DepthInput> }) {
  const smooth = useRef({ progress: 0, x: 0, y: 0, velocity: 0 });

  useFrame(({ camera }, delta) => {
    const perspective = camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 0.05);
    if (dt <= 0) return;

    const s = smooth.current;
    const { progress, pointerX, pointerY } = input.current;

    const previousProgress = s.progress;
    s.progress = damp(s.progress, progress, DEPTH_DAMPING.scroll, dt);
    s.x = damp(s.x, pointerX, DEPTH_DAMPING.pointer, dt);
    s.y = damp(s.y, pointerY, DEPTH_DAMPING.pointer, dt);
    s.velocity = damp(s.velocity, (s.progress - previousProgress) / dt, 8, dt);

    const baseZ = lerp(DEPTH_CAMERA.zStart, DEPTH_CAMERA.zEnd, s.progress);
    const baseY = lerp(DEPTH_CAMERA.yStart, DEPTH_CAMERA.yEnd, s.progress);

    const baseX = lerp(DEPTH_CAMERA.xStart, DEPTH_CAMERA.xEnd, s.progress);

    perspective.position.set(
      baseX + s.x * DEPTH_CAMERA.panX,
      baseY + s.y * DEPTH_CAMERA.panY,
      baseZ,
    );
    _lookTarget.set(baseX, baseY, baseZ - DEPTH_CAMERA.focusDistance);
    perspective.lookAt(_lookTarget);
    perspective.rotateZ(-s.x * DEPTH_CAMERA.roll);

    // The relief light follows the pointer, so the crayon grain glints as you move.
    const [lightX, lightY, lightZ] = PAPER_RELIEF.lightBase;
    getPaperUniforms().uPaperLight.value
      .set(
        lightX + s.x * PAPER_RELIEF.lightPointerSwing[0],
        lightY + s.y * PAPER_RELIEF.lightPointerSwing[1],
        lightZ,
      )
      .normalize();

    const rush = clamp01(Math.abs(s.velocity) * 2.5);
    const fov = DEPTH_CAMERA.fov + rush * DEPTH_CAMERA.velocityFov;
    if (Math.abs(perspective.fov - fov) > 0.01) {
      perspective.fov = fov;
      perspective.updateProjectionMatrix();
    }
  });

  return null;
}
