"use client";

import dynamic from "next/dynamic";
import type { SceneCanvasProps } from "./SceneCanvas";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), {
  ssr: false,
  loading: () => null,
});

export default function SceneCanvasLoader(props: SceneCanvasProps) {
  return (
    <div className="canvas-layer">
      <SceneCanvas {...props} />
    </div>
  );
}
