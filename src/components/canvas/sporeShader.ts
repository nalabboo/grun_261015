export const sporeVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Draws one spore frame with an optional Gaussian depth-of-field blur (like CSS blur(px)).
 *
 * The quad is larger than the frame by `grow` (fraction of the frame size) so the blur can
 * spread past the frame edges. `blurUv` is sigma in frame-uv units (0 = sharp).
 * Colours are averaged premultiplied, so transparent pixels don't darken the edge.
 * Textures hold raw sRGB-encoded values and the renderer outputs linear (no encode).
 */
export const sporeFragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 blurUv;
  uniform vec2 grow;

  varying vec2 vUv;

  const int TAPS = 32;
  const float GOLDEN_ANGLE = 2.39996323;

  vec4 tapPremultiplied(vec2 uv) {
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
    vec4 c = texture2D(map, uv);
    return vec4(c.rgb * c.a, c.a);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * (1.0 + grow) + 0.5;
    vec4 sum;

    if (blurUv.x <= 0.0) {
      sum = tapPremultiplied(uv);
    } else {
      // Golden-angle spiral covering 3 sigma, Gaussian-weighted.
      float weightSum = 0.0;
      sum = vec4(0.0);
      for (int i = 0; i < TAPS; i++) {
        float r = sqrt((float(i) + 0.5) / float(TAPS)) * 3.0;
        float a = float(i) * GOLDEN_ANGLE;
        float w = exp(-0.5 * r * r);
        sum += tapPremultiplied(uv + vec2(cos(a), sin(a)) * r * blurUv) * w;
        weightSum += w;
      }
      sum /= weightSum;
    }

    if (sum.a <= 0.001) discard;
    gl_FragColor = vec4(sum.rgb / sum.a, sum.a);
  }
`;
