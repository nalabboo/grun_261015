"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { DEPTH_BACKGROUND, DEPTH_CAMERA } from "@/constants/depthConfig";
import DepthWorld from "./DepthWorld";
import type { DepthInput } from "./depthInput";

function LoadingOverlay() {
  const { progress, active } = useProgress();
  const loaded = progress >= 100 && !active;

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#3d4a44] transition-opacity duration-700 ${loaded ? "opacity-0" : "opacity-100"}`}
      style={{ backgroundColor: DEPTH_BACKGROUND }}
    >
      Loading {Math.round(progress)}%
    </div>
  );
}

export default function DepthCanvas({ input }: { input: React.RefObject<DepthInput> }) {
  return (
    <>
    <Canvas
      // No tone mapping: keep the painted colours exactly as drawn.
      flat
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{
        fov: DEPTH_CAMERA.fov,
        near: DEPTH_CAMERA.near,
        far: DEPTH_CAMERA.far,
        position: [0, DEPTH_CAMERA.yStart, DEPTH_CAMERA.zStart],
      }}
    >
      <Suspense fallback={null}>
        <DepthWorld input={input} />
      </Suspense>
    </Canvas>
    <LoadingOverlay />
    </>
  );
}
