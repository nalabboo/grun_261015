"""Extracts the idle loop of the grey worm from worme_sw.mp4 (magenta screen) for chapter 1.

  ../source_videos/worme_sw.mp4 -> public/scene1/landmark/worm_sw/frame_XX.webp

- Every 3rd frame of the 60 fps video is kept (~20 fps, seamless loop).
- Only the magenta screen (RGB ~242,16,112) becomes transparent; the worm is grey.
- Semi-transparent edge pixels are "un-mixed" from the screen colour so no pink fringe remains.
- Each frame is scaled / shifted onto the 604x700 canvas of the former worm_b.png (silhouettes overlap
  ~99%), so the worm's layout, click area and the green reveal stay exactly as before.

Requires:  pip install imageio-ffmpeg numpy pillow
Run:       python3 scripts/extract_worm.py
"""
import os
import shutil
import subprocess
import tempfile

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Source videos live outside the repo (not committed / deployed). Override with GRUN_VIDEO_DIR.
VIDEO_DIR = os.environ.get("GRUN_VIDEO_DIR", os.path.join(os.path.dirname(ROOT), "source_videos"))
LANDMARK_DIR = os.path.join(ROOT, "public/scene1/landmark")
SRC = os.path.join(VIDEO_DIR, "worme_sw.mp4")
OUT_DIR = os.path.join(LANDMARK_DIR, "worm_sw")

STEP = 3
SCREEN = np.array([242.0, 16.0, 112.0])
# "Pinkness" = R - G. Screen ~226; the grey worm stays near 0.
KEY_SOLID = 60.0  # at or below -> fully opaque
KEY_CLEAR = 140.0  # at or above -> fully transparent
# Placement onto the former worm_b.png canvas (found by matching silhouettes).
CANVAS = (604, 700)
SCALE = 0.654
OFFSET = (-52, -2)


def key_frame(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    pinkness = rgb[..., 0] - rgb[..., 1]
    alpha = np.clip((KEY_CLEAR - pinkness) / (KEY_CLEAR - KEY_SOLID), 0.0, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    edge = (alpha > 0.0) & (alpha < 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1.0 - a) * SCREEN) / a
    rgb = np.where(edge[..., None], unmixed, rgb)

    # Remove pink spill along the edge: red / blue may not rise above green there.
    edge_zone = (alpha < 0.98)[..., None]
    limit = rgb[..., 1:2] + 8.0
    rgb[..., 0:1] = np.where(edge_zone, np.minimum(rgb[..., 0:1], limit), rgb[..., 0:1])
    rgb[..., 2:3] = np.where(edge_zone, np.minimum(rgb[..., 2:3], limit), rgb[..., 2:3])

    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255.0]).round().astype(np.uint8)
    rgba[alpha <= 0.0] = 0
    return Image.fromarray(rgba)


def main():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    shutil.rmtree(OUT_DIR, ignore_errors=True)
    os.makedirs(OUT_DIR)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", SRC, os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        names = sorted(os.listdir(tmp))[::STEP]
        for index, name in enumerate(names):
            keyed = key_frame(Image.open(os.path.join(tmp, name)))
            size = (round(keyed.width * SCALE), round(keyed.height * SCALE))
            canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            canvas.alpha_composite(keyed.resize(size, Image.LANCZOS), (0, 0), (-OFFSET[0], -OFFSET[1]))
            canvas.save(os.path.join(OUT_DIR, f"frame_{index:02d}.webp"), quality=90, method=6)
    print("frames", len(names))


if __name__ == "__main__":
    main()
