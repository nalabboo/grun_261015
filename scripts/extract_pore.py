"""Extracts the swaying spore loops from ../source_videos/pore.mp4 (blue screen) for chapter 1.

pore.mp4 shows the three spore plants side by side (left = spore1, middle = spore2,
right = spore3). Each one is cut out into its own frame sequence:

  public/scene1/landmark/pore/spore1/frame_XX.webp  (and spore2, spore3)

- Every 3rd frame of the 60 fps video is kept (~20 fps, seamless loop).
- Only the blue screen (RGB ~27,98,200) becomes transparent; the spores have no blue cast.
- Semi-transparent edge pixels are "un-mixed" from the screen colour so no blue fringe remains.
- Every frame of one spore uses the same crop, centred on the crown at rest, so it does not jump.
- Frames are scaled by SCALE (the spores are shown small on screen) to keep files light.

Prints the sizes to copy into `SPORE_CLIPS` in src/constants/sceneConfig.ts.

Requires:  pip install imageio-ffmpeg numpy pillow scipy
Run:       python3 scripts/extract_pore.py
"""
import json
import os
import shutil
import subprocess
import tempfile

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Source videos live outside the repo (not committed / deployed). Override with GRUN_VIDEO_DIR.
VIDEO_DIR = os.environ.get("GRUN_VIDEO_DIR", os.path.join(os.path.dirname(ROOT), "source_videos"))
LANDMARK_DIR = os.path.join(ROOT, "public/scene1/landmark")
SRC = os.path.join(VIDEO_DIR, "pore.mp4")
OUT_DIR = os.path.join(LANDMARK_DIR, "pore")

STEP = 3
SCALE = 0.6
MARGIN = 6  # px of transparent border kept around each spore (source px)
SCREEN = np.array([27.0, 98.0, 200.0])
# "Blueness" = B - max(R, G). Screen ~100; spores stay below 0.
KEY_SOLID = 25.0  # at or below -> fully opaque
KEY_CLEAR = 75.0  # at or above -> fully transparent
# The plants sway into each other's columns, but never touch. Each connected shape is assigned
# to a spore by the x of its stem base (bottom of the shape) in the 1080px frame.
BASE_RANGES = {"spore1": (0, 420), "spore2": (420, 700), "spore3": (700, 1080)}
MIN_SHAPE_PX = 300  # smaller shapes are video noise
# Top part of a spore (fraction of its height) that counts as the crown.
CROWN_FRACTION = 0.3


def key_frame(img: Image.Image) -> np.ndarray:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    blueness = b - np.maximum(r, g)
    alpha = np.clip((KEY_CLEAR - blueness) / (KEY_CLEAR - KEY_SOLID), 0.0, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    edge = (alpha > 0.0) & (alpha < 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1.0 - a) * SCREEN) / a
    rgb = np.where(edge[..., None], unmixed, rgb)

    edge_zone = alpha < 0.98
    limit = np.maximum(rgb[..., 0], rgb[..., 1])
    rgb[..., 2] = np.where(edge_zone, np.minimum(rgb[..., 2], limit), rgb[..., 2])

    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255.0]).round().astype(np.uint8)
    rgba[alpha <= 0.0] = 0
    return rgba


def split_spores(rgba: np.ndarray) -> dict:
    """Returns {spore: rgba} with everything but that plant made transparent."""
    labels, count = ndimage.label(rgba[..., 3] > 8)
    out = {spore: np.zeros_like(rgba) for spore in BASE_RANGES}
    for label in range(1, count + 1):
        shape = labels == label
        ys, xs = np.nonzero(shape)
        if len(ys) < MIN_SHAPE_PX:
            continue
        base_x = xs[ys > ys.max() - 20].mean()
        for spore, (x0, x1) in BASE_RANGES.items():
            if x0 <= base_x < x1:
                # Grow by 1px so the faint outer edge (alpha <= 8) stays with the shape.
                grown = ndimage.binary_dilation(shape, iterations=1)
                out[spore][grown] = rgba[grown]
    return out


def main():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", SRC, os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        names = sorted(os.listdir(tmp))[::STEP]
        frames = [key_frame(Image.open(os.path.join(tmp, name))) for name in names]

    shutil.rmtree(OUT_DIR, ignore_errors=True)
    meta = {}
    split = [split_spores(f) for f in frames]
    for spore in BASE_RANGES:
        cols = [s[spore] for s in split]
        solid = [c[..., 3] > 8 for c in cols]
        union = np.logical_or.reduce(solid)
        ys = np.nonzero(union.any(1))[0]
        top, bottom = ys.min(), ys.max()

        # Crown at rest (frame 0): centre and width of the top part of the plant.
        rest = cols[0][..., 3] > 128
        crown_rows = rest[top : top + int((bottom - top) * CROWN_FRACTION)]
        crown_xs = np.nonzero(crown_rows.any(0))[0]
        crown_left, crown_right = crown_xs.min(), crown_xs.max()
        center = (crown_left + crown_right) / 2

        xs = np.nonzero(union.any(0))[0]
        half = max(center - xs.min(), xs.max() - center) + MARGIN
        left = int(np.floor(center - half))
        right = int(np.ceil(center + half))
        crop_top = max(0, top - MARGIN)
        crop_bottom = min(union.shape[0], bottom + MARGIN + 1)

        out_dir = os.path.join(OUT_DIR, spore)
        os.makedirs(out_dir)
        size = None
        for index, col in enumerate(cols):
            canvas = np.zeros((crop_bottom - crop_top, right - left, 4), np.uint8)
            src_l, src_r = max(left, 0), min(right, col.shape[1])
            canvas[:, src_l - left : src_r - left] = col[crop_top:crop_bottom, src_l:src_r]
            image = Image.fromarray(canvas)
            size = (round(image.width * SCALE), round(image.height * SCALE))
            image = image.resize(size, Image.LANCZOS)
            image.save(os.path.join(out_dir, f"frame_{index:02d}.webp"), quality=88, method=6)

        meta[spore] = {
            "width": size[0],
            "height": size[1],
            "crown": round((crown_right - crown_left + 1) * SCALE),
        }

    print("frames", len(frames))
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
