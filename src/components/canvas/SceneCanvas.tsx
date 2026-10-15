"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import WebGLWorld, { type WebGLWorldProps } from "./WebGLWorld";

export type SceneCanvasProps = WebGLWorldProps;

export default function SceneCanvas(props: SceneCanvasProps) {
  return (
    <Canvas
      className="scene-canvas"
      orthographic
      linear
      flat
      camera={{ position: [0, 0, 10000], near: 9000, far: 11000, zoom: 1 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        // Textures hold raw sRGB values; skip any encode so blending matches CSS.
        gl.outputColorSpace = THREE.LinearSRGBColorSpace;
        gl.setClearColor(0x000000, 0);
      }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <WebGLWorld {...props} />
      </Suspense>
    </Canvas>
  );
}
