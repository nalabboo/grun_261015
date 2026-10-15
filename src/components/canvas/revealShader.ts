export const revealVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Port of the former CSS watercolor reveal:
 *  - "g" layer: blur(px) -> radial-gradient mask (growing tile) -> opacity
 *  - "b" layer: plain opacity
 *  - g composited over b
 *
 * Textures hold raw sRGB-encoded values and the renderer outputs linear (no
 * encode), so blending/brightness behave exactly like the CSS version.
 */
export const revealFragmentShader = /* glsl */ `
  uniform sampler2D uB;
  uniform sampler2D uG;
  uniform float uBOpacity;
  uniform float uGOpacity;
  uniform float uBlurPx;
  uniform float uMaskSize;
  uniform vec2 uSize;

  varying vec2 vUv;

  const int TAPS = 24;

  // mask-image: radial-gradient(ellipse 90% 85% at 50% 88%, #000 35%, transparent 72%)
  // mask-size: s s; mask-position: 50% 88%; mask-repeat: no-repeat
  float revealMask(vec2 p) {
    float s = uMaskSize;
    vec2 center = vec2(0.5, 0.88);
    vec2 tileMin = vec2(0.5 - 0.5 * s, 0.88 - 0.88 * s);
    vec2 tileMax = tileMin + vec2(s);

    if (p.x < tileMin.x || p.x > tileMax.x || p.y < tileMin.y || p.y > tileMax.y) {
      return 0.0;
    }

    float dist = length((p - center) / vec2(0.9 * s, 0.85 * s));
    return 1.0 - clamp((dist - 0.35) / (0.72 - 0.35), 0.0, 1.0);
  }

  // Disc blur on premultiplied color (std-dev ~= blurPx, like CSS blur()).
  vec4 blurSample(sampler2D map, vec2 uv, float blurPx) {
    if (blurPx < 0.05) {
      return texture2D(map, uv);
    }

    vec2 radius = vec2(2.0 * blurPx) / uSize;
    vec4 acc = vec4(0.0);

    for (int i = 0; i < TAPS; i++) {
      float fi = float(i);
      float r = sqrt((fi + 0.5) / float(TAPS));
      float a = fi * 2.39996323;
      vec2 offset = vec2(cos(a), sin(a)) * r * radius;
      vec4 c = texture2D(map, uv + offset);
      acc.rgb += c.rgb * c.a;
      acc.a += c.a;
    }

    acc /= float(TAPS);
    vec3 rgb = acc.a > 0.0001 ? acc.rgb / acc.a : vec3(0.0);
    return vec4(rgb, acc.a);
  }

  void main() {
    vec4 b = texture2D(uB, vUv);
    b.a *= uBOpacity;

    vec4 g = blurSample(uG, vUv, uBlurPx);
    g.a *= uGOpacity * revealMask(vec2(vUv.x, 1.0 - vUv.y));

    float a = g.a + b.a * (1.0 - g.a);
    vec3 rgb = a > 0.0001 ? (g.rgb * g.a + b.rgb * b.a * (1.0 - g.a)) / a : vec3(0.0);

    gl_FragColor = vec4(rgb, a);
  }
`;
