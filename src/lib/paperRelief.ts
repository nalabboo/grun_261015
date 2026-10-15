import * as THREE from "three";
import { DEPTH_CAMERA, PAPER_RELIEF } from "@/constants/depthConfig";
import { createPaperNormalMap } from "./paperNormalMap";

type PaperUniforms = {
  uPaperNormal: THREE.IUniform<THREE.Texture>;
  uPaperLight: THREE.IUniform<THREE.Vector3>;
  uPaperShade: THREE.IUniform<number>;
  uPaperZStart: THREE.IUniform<number>;
  uPaperViewK: THREE.IUniform<number>;
  uPaperTileFrac: THREE.IUniform<number>;
};

let uniforms: PaperUniforms | null = null;

/**
 * Uniforms shared by every sprite (one normal map, one light), created lazily so
 * nothing touches `document`/WebGL during SSR.
 */
export function getPaperUniforms(): PaperUniforms {
  if (!uniforms) {
    uniforms = {
      uPaperNormal: { value: createPaperNormalMap({ strength: PAPER_RELIEF.bumpStrength }) },
      uPaperLight: { value: new THREE.Vector3(...PAPER_RELIEF.lightBase).normalize() },
      uPaperShade: { value: PAPER_RELIEF.shade },
      uPaperZStart: { value: DEPTH_CAMERA.zStart },
      uPaperViewK: { value: 2 * Math.tan((DEPTH_CAMERA.fov * Math.PI) / 360) },
      uPaperTileFrac: { value: PAPER_RELIEF.tileFrac },
    };
  }
  return uniforms;
}

const VERTEX_DECLARATIONS = /* glsl */ `
varying vec2 vPaperUv;
uniform float uPaperZStart;
uniform float uPaperViewK;
uniform float uPaperTileFrac;
`;

// The normal map tiles in *world* space relative to each sprite's start depth, so the
// grain has the same apparent size on every layer instead of being baked into the PNG's size.
const VERTEX_BODY = /* glsl */ `
{
  float paperDistance = max(uPaperZStart - modelMatrix[3].z, 4.0);
  float paperTile = paperDistance * uPaperViewK * uPaperTileFrac;
  vec2 paperSize = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
  vPaperUv = uv * paperSize / paperTile;
}
`;

const FRAGMENT_DECLARATIONS = /* glsl */ `
varying vec2 vPaperUv;
uniform sampler2D uPaperNormal;
uniform vec3 uPaperLight;
uniform float uPaperShade;
`;

// Only the *difference* from a flat surface lights the pixel, so average colour is unchanged.
const FRAGMENT_BODY = /* glsl */ `
{
  vec3 paperN = normalize(texture2D(uPaperNormal, vPaperUv).xyz * 2.0 - 1.0);
  float paperLit = dot(paperN, uPaperLight) - uPaperLight.z;
  diffuseColor.rgb *= 1.0 + paperLit * uPaperShade;
}
`;

/**
 * `onBeforeCompile` hook for MeshBasicMaterial: adds a thin normal-map relief on top of the
 * painted colours. Must stay a single shared function so all sprites reuse one program.
 */
export function applyPaperRelief(shader: THREE.WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, getPaperUniforms());

  shader.vertexShader = shader.vertexShader
    .replace("void main() {", `${VERTEX_DECLARATIONS}\nvoid main() {`)
    .replace("#include <uv_vertex>", `#include <uv_vertex>\n${VERTEX_BODY}`);

  shader.fragmentShader = shader.fragmentShader
    .replace("void main() {", `${FRAGMENT_DECLARATIONS}\nvoid main() {`)
    .replace("#include <map_fragment>", `#include <map_fragment>\n${FRAGMENT_BODY}`);
}
