/** Odd kernel widths whose 3-box stack approximates a Gaussian of this sigma (px). */
function boxesForGauss(sigma: number, passes: number) {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / passes + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl -= 1;
  if (wl < 1) wl = 1;
  const wu = wl + 2;
  const mIdeal =
    (12 * sigma * sigma - passes * wl * wl - 4 * passes * wl - 3 * passes) / (-4 * wl - 4);
  const m = Math.min(passes, Math.max(0, Math.round(mIdeal)));
  const sizes = new Array<number>(passes);
  for (let i = 0; i < passes; i += 1) sizes[i] = i < m ? wl : wu;
  return sizes;
}

function boxBlurHorizontal(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number,
) {
  const iarr = 1 / (radius + radius + 1);
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    let ti = row;
    let li = row;
    let ri = row + radius * 4;
    const fv0 = src[row];
    const fv1 = src[row + 1];
    const fv2 = src[row + 2];
    const fv3 = src[row + 3];
    const last = row + (width - 1) * 4;
    const lv0 = src[last];
    const lv1 = src[last + 1];
    const lv2 = src[last + 2];
    const lv3 = src[last + 3];
    let v0 = (radius + 1) * fv0;
    let v1 = (radius + 1) * fv1;
    let v2 = (radius + 1) * fv2;
    let v3 = (radius + 1) * fv3;

    for (let j = 0; j < radius; j += 1) {
      const idx = row + j * 4;
      v0 += src[idx];
      v1 += src[idx + 1];
      v2 += src[idx + 2];
      v3 += src[idx + 3];
    }

    for (let x = 0; x <= radius; x += 1) {
      v0 += src[ri] - fv0;
      v1 += src[ri + 1] - fv1;
      v2 += src[ri + 2] - fv2;
      v3 += src[ri + 3] - fv3;
      dst[ti] = v0 * iarr;
      dst[ti + 1] = v1 * iarr;
      dst[ti + 2] = v2 * iarr;
      dst[ti + 3] = v3 * iarr;
      ri += 4;
      ti += 4;
    }
    for (let x = radius + 1; x < width - radius; x += 1) {
      v0 += src[ri] - src[li];
      v1 += src[ri + 1] - src[li + 1];
      v2 += src[ri + 2] - src[li + 2];
      v3 += src[ri + 3] - src[li + 3];
      dst[ti] = v0 * iarr;
      dst[ti + 1] = v1 * iarr;
      dst[ti + 2] = v2 * iarr;
      dst[ti + 3] = v3 * iarr;
      li += 4;
      ri += 4;
      ti += 4;
    }
    for (let x = width - radius; x < width; x += 1) {
      v0 += lv0 - src[li];
      v1 += lv1 - src[li + 1];
      v2 += lv2 - src[li + 2];
      v3 += lv3 - src[li + 3];
      dst[ti] = v0 * iarr;
      dst[ti + 1] = v1 * iarr;
      dst[ti + 2] = v2 * iarr;
      dst[ti + 3] = v3 * iarr;
      li += 4;
      ti += 4;
    }
  }
}

function boxBlurVertical(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number,
) {
  const iarr = 1 / (radius + radius + 1);
  const stride = width * 4;
  for (let x = 0; x < width; x += 1) {
    const col = x * 4;
    let ti = col;
    let li = col;
    let ri = col + radius * stride;
    const fv0 = src[col];
    const fv1 = src[col + 1];
    const fv2 = src[col + 2];
    const fv3 = src[col + 3];
    const last = col + (height - 1) * stride;
    const lv0 = src[last];
    const lv1 = src[last + 1];
    const lv2 = src[last + 2];
    const lv3 = src[last + 3];
    let v0 = (radius + 1) * fv0;
    let v1 = (radius + 1) * fv1;
    let v2 = (radius + 1) * fv2;
    let v3 = (radius + 1) * fv3;

    for (let j = 0; j < radius; j += 1) {
      const idx = col + j * stride;
      v0 += src[idx];
      v1 += src[idx + 1];
      v2 += src[idx + 2];
      v3 += src[idx + 3];
    }

    for (let y = 0; y <= radius; y += 1) {
      v0 += src[ri] - fv0;
      v1 += src[ri + 1] - fv1;
      v2 += src[ri + 2] - fv2;
      v3 += src[ri + 3] - fv3;
      dst[ti] = v0 * iarr;
      dst[ti + 1] = v1 * iarr;
      dst[ti + 2] = v2 * iarr;
      dst[ti + 3] = v3 * iarr;
      ri += stride;
      ti += stride;
    }
    for (let y = radius + 1; y < height - radius; y += 1) {
      v0 += src[ri] - src[li];
      v1 += src[ri + 1] - src[li + 1];
      v2 += src[ri + 2] - src[li + 2];
      v3 += src[ri + 3] - src[li + 3];
      dst[ti] = v0 * iarr;
      dst[ti + 1] = v1 * iarr;
      dst[ti + 2] = v2 * iarr;
      dst[ti + 3] = v3 * iarr;
      li += stride;
      ri += stride;
      ti += stride;
    }
    for (let y = height - radius; y < height; y += 1) {
      v0 += lv0 - src[li];
      v1 += lv1 - src[li + 1];
      v2 += lv2 - src[li + 2];
      v3 += lv3 - src[li + 3];
      dst[ti] = v0 * iarr;
      dst[ti + 1] = v1 * iarr;
      dst[ti + 2] = v2 * iarr;
      dst[ti + 3] = v3 * iarr;
      li += stride;
      ti += stride;
    }
  }
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * In-place Gaussian blur matching CSS `blur(radius px)` (sigma = radius).
 * Straight alpha in, straight alpha out. No-op for tiny radii.
 */
export function gaussianBlurStraightRGBA(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
) {
  if (radius < 0.5 || width < 2 || height < 2) return;

  const count = width * height;
  const src = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    const o = i * 4;
    const alpha = data[o + 3] / 255;
    src[o] = (data[o] / 255) * alpha;
    src[o + 1] = (data[o + 1] / 255) * alpha;
    src[o + 2] = (data[o + 2] / 255) * alpha;
    src[o + 3] = alpha;
  }

  const tmp = new Float32Array(count * 4);
  const limit = Math.min(width, height) - 1;
  for (const size of boxesForGauss(radius, 3)) {
    const r = Math.min((size - 1) >> 1, limit);
    boxBlurHorizontal(src, tmp, width, height, r);
    boxBlurVertical(tmp, src, width, height, r);
  }

  for (let i = 0; i < count; i += 1) {
    const o = i * 4;
    const alpha = src[o + 3];
    data[o + 3] = Math.round(clamp01(alpha) * 255);
    if (alpha > 1 / 255) {
      data[o] = Math.round(clamp01(src[o] / alpha) * 255);
      data[o + 1] = Math.round(clamp01(src[o + 1] / alpha) * 255);
      data[o + 2] = Math.round(clamp01(src[o + 2] / alpha) * 255);
    } else {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
    }
  }
}
