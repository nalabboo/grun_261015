"use client";

import {
  BACKDROP_LAYERS,
  DEPTH_BACKGROUND,
  DEPTH_FOG,
  DEPTH_TEXTURES,
  FOREGROUND_LAYERS,
  GROUND_Y,
  LANDMARK_CHILDREN,
  LANDMARK_GROUP,
  getLandmarkGroupLayout,
  type DepthLayer,
} from "@/constants/depthConfig";
import DepthCameraRig from "./DepthCameraRig";
import { DepthTransformControls } from "./DepthEditor";
import DepthSprite from "./DepthSprite";
import type { DepthInput } from "./depthInput";

function getLandmarkLayers(): DepthLayer[] {
  const { pxToWorld, steinWidth, steinHeight } = getLandmarkGroupLayout();

  return [
    {
      id: "stein",
      texture: "stein",
      position: [
        LANDMARK_GROUP.x + steinWidth / 2,
        GROUND_Y + steinHeight / 2,
        LANDMARK_GROUP.z,
      ],
      width: steinWidth,
      height: steinHeight,
      nearFade: [2, 5],
    },
    ...LANDMARK_CHILDREN.map((child) => {
      const source = DEPTH_TEXTURES[child.texture];
      const width = source.width * child.scale * pxToWorld;
      const height = source.height * child.scale * pxToWorld;

      return {
        id: child.id,
        texture: child.texture,
        revealTexture: child.revealTexture,
        revealRange: child.revealRange,
        position: [
          LANDMARK_GROUP.x + child.leftPx * pxToWorld + width / 2,
          GROUND_Y + child.bottomPx * pxToWorld + height / 2,
          LANDMARK_GROUP.z + child.z,
        ] as const,
        width,
        height,
        nearFade: [2, 5] as const,
      };
    }),
  ];
}

export default function DepthWorld({ input }: { input: React.RefObject<DepthInput> }) {
  const landmarkLayers = getLandmarkLayers();

  return (
    <>
      <color attach="background" args={[DEPTH_BACKGROUND]} />
      <fog attach="fog" args={[DEPTH_BACKGROUND, DEPTH_FOG.near, DEPTH_FOG.far]} />
      <DepthCameraRig input={input} />

      {BACKDROP_LAYERS.map((layer) => (
        <DepthSprite key={layer.id} {...layer} />
      ))}

      {landmarkLayers.map((layer) => (
        <DepthSprite key={layer.id} {...layer} />
      ))}

      {FOREGROUND_LAYERS.map((layer) => (
        <DepthSprite key={layer.id} {...layer} />
      ))}

      <DepthTransformControls />
    </>
  );
}
