export type GifMovie = {
  width: number;
  height: number;
  frameCount: number;
  /** Sum of frame delays. One walk cycle. */
  totalMs: number;
  /**
   * Paints the frame at `timeMs` (wrapped over the loop) into `target` (RGBA, full frame).
   * Returns true when the pixels changed.
   */
  renderAt(timeMs: number, target: Uint8ClampedArray): boolean;
};

type GifFrame = {
  delayMs: number;
  x: number;
  y: number;
  width: number;
  height: number;
  transparentIndex: number;
  disposal: number;
  minCodeSize: number;
  data: Uint8Array;
};

/** GIF LZW. Port of the decoder used by gifuct-js, which matches the GIF89a spec. */
function lzwDecode(minCodeSize: number, data: Uint8Array, pixelCount: number) {
  const pixels = new Uint8Array(pixelCount);
  const prefix = new Uint16Array(4096);
  const suffix = new Uint8Array(4096);
  const pixelStack = new Uint8Array(4097);

  const clear = 1 << minCodeSize;
  const endOfInformation = clear + 1;
  let available = clear + 2;
  let oldCode = -1;
  let codeSize = minCodeSize + 1;
  let codeMask = (1 << codeSize) - 1;

  for (let code = 0; code < clear; code += 1) suffix[code] = code;

  let datum = 0;
  let bits = 0;
  let bi = 0;
  let first = 0;
  let top = 0;
  let i = 0;

  while (i < pixelCount) {
    if (top === 0) {
      if (bits < codeSize) {
        if (bi >= data.length) break;
        datum += data[bi] << bits;
        bits += 8;
        bi += 1;
        continue;
      }

      const code = datum & codeMask;
      datum >>= codeSize;
      bits -= codeSize;

      if (code > available || code === endOfInformation) break;

      if (code === clear) {
        codeSize = minCodeSize + 1;
        codeMask = (1 << codeSize) - 1;
        available = clear + 2;
        oldCode = -1;
        continue;
      }

      if (oldCode === -1) {
        pixelStack[top] = suffix[code];
        top += 1;
        oldCode = code;
        first = code;
        continue;
      }

      let decodeCode = code;
      const inCode = code;
      if (code === available) {
        pixelStack[top] = first;
        top += 1;
        decodeCode = oldCode;
      }

      while (decodeCode > clear) {
        pixelStack[top] = suffix[decodeCode];
        top += 1;
        decodeCode = prefix[decodeCode];
      }

      first = suffix[decodeCode];
      pixelStack[top] = first;
      top += 1;

      if (available < 4096) {
        prefix[available] = oldCode;
        suffix[available] = first;
        available += 1;
        if ((available & codeMask) === 0 && available < 4096) {
          codeSize += 1;
          codeMask += available;
        }
      }
      oldCode = inCode;
    }

    top -= 1;
    pixels[i] = pixelStack[top];
    i += 1;
  }

  return pixels;
}

function readSubBlocks(bytes: Uint8Array, offset: number) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let cursor = offset;
  while (cursor < bytes.length) {
    const size = bytes[cursor];
    cursor += 1;
    if (size === 0) break;
    chunks.push(bytes.subarray(cursor, cursor + size));
    total += size;
    cursor += size;
  }

  const data = new Uint8Array(total);
  let write = 0;
  for (const chunk of chunks) {
    data.set(chunk, write);
    write += chunk.length;
  }
  return { data, offset: cursor };
}

function parseFrames(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 13 || String.fromCharCode(...bytes.subarray(0, 6)) !== "GIF89a") {
    throw new Error("Expected a GIF89a walk cycle");
  }

  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  const packed = bytes[10];
  let offset = 13;
  let palette = new Uint8Array(0);

  if (packed & 0x80) {
    const colors = 3 * (1 << ((packed & 7) + 1));
    palette = bytes.slice(offset, offset + colors);
    offset += colors;
  }

  const frames: GifFrame[] = [];
  let delayMs = 100;
  let transparentIndex = -1;
  let disposal = 0;

  while (offset < bytes.length) {
    const block = bytes[offset];
    offset += 1;

    if (block === 0x3b) break;

    if (block === 0x21) {
      const label = bytes[offset];
      offset += 1;
      if (label === 0xf9) {
        const size = bytes[offset];
        const gce = bytes[offset + 1];
        const delayCs = bytes[offset + 2] | (bytes[offset + 3] << 8);
        disposal = (gce >> 2) & 7;
        transparentIndex = gce & 1 ? bytes[offset + 4] : -1;
        delayMs = Math.max(delayCs * 10, 10);
        offset += 1 + size;
        if (bytes[offset] === 0) offset += 1;
      } else {
        while (offset < bytes.length) {
          const size = bytes[offset];
          offset += 1;
          if (size === 0) break;
          offset += size;
        }
      }
      continue;
    }

    if (block !== 0x2c) break;

    const x = bytes[offset] | (bytes[offset + 1] << 8);
    const y = bytes[offset + 2] | (bytes[offset + 3] << 8);
    const frameWidth = bytes[offset + 4] | (bytes[offset + 5] << 8);
    const frameHeight = bytes[offset + 6] | (bytes[offset + 7] << 8);
    const imagePacked = bytes[offset + 8];
    offset += 9;

    if (imagePacked & 0x80) {
      const colors = 3 * (1 << ((imagePacked & 7) + 1));
      offset += colors;
    }
    if (imagePacked & 0x40) {
      throw new Error("Interlaced GIF frames are not supported");
    }

    const minCodeSize = bytes[offset];
    offset += 1;
    const compressed = readSubBlocks(bytes, offset);
    offset = compressed.offset;

    frames.push({
      delayMs,
      x,
      y,
      width: frameWidth,
      height: frameHeight,
      transparentIndex,
      disposal,
      minCodeSize,
      data: compressed.data,
    });
  }

  return { width, height, palette, frames };
}

/** Decodes a walk-cycle GIF into a player that can paint any time in the loop. */
export function parseGifMovie(buffer: ArrayBuffer): GifMovie {
  const { width, height, palette, frames } = parseFrames(buffer);
  const totalMs = frames.reduce((sum, frame) => sum + frame.delayMs, 0) || 1;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const independent = frames.every((frame) => frame.disposal === 2);

  let lastIndex = -1;

  const paintFrame = (index: number) => {
    pixels.fill(0);
    const frame = frames[index];
    const indices = lzwDecode(frame.minCodeSize, frame.data, frame.width * frame.height);
    const transparent = frame.transparentIndex;

    for (let row = 0; row < frame.height; row += 1) {
      const destRow = (frame.y + row) * width + frame.x;
      const srcRow = row * frame.width;
      for (let col = 0; col < frame.width; col += 1) {
        const colorIndex = indices[srcRow + col];
        if (colorIndex === transparent) continue;
        const dest = (destRow + col) * 4;
        const color = colorIndex * 3;
        pixels[dest] = palette[color];
        pixels[dest + 1] = palette[color + 1];
        pixels[dest + 2] = palette[color + 2];
        pixels[dest + 3] = 255;
      }
    }
  };

  return {
    width,
    height,
    frameCount: frames.length,
    totalMs,
    renderAt(timeMs, target) {
      const wrapped = ((timeMs % totalMs) + totalMs) % totalMs;
      let elapsed = 0;
      let index = frames.length - 1;
      for (let i = 0; i < frames.length; i += 1) {
        elapsed += frames[i].delayMs;
        if (wrapped < elapsed) {
          index = i;
          break;
        }
      }

      if (index === lastIndex) return false;
      if (!independent) {
        throw new Error("Only disposal-2 walk GIFs are supported");
      }
      paintFrame(index);
      target.set(pixels);
      lastIndex = index;
      return true;
    },
  };
}

const movieCache = new Map<string, Promise<GifMovie>>();

/** Fetches and decodes a walk GIF once per URL. */
export function loadGifMovie(url: string) {
  const cached = movieCache.get(url);
  if (cached) return cached;

  const pending = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load walk GIF (${response.status})`);
      return response.arrayBuffer();
    })
    .then(parseGifMovie);
  movieCache.set(url, pending);
  return pending;
}
