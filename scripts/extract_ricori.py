"""Extracts Grun's walk cycle from the green-screen video and removes the background.

  ../source_videos/ricori_walk.mp4 -> public/scene1/character/ricori_walk/frame_XX.png

- Every 3rd frame of the 60 fps video is kept (~20 fps).
- Only the strong screen green (RGB ~3,254,0) becomes transparent. Grun's own greens (hair,
  trousers) are much less saturated, so they stay opaque.
- Semi-transparent edge pixels are "un-mixed" from the green screen so no green fringe remains.

Requires:  pip install imageio-ffmpeg numpy pillow
Run:       python3 scripts/extract_ricori.py
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
CHARACTER_DIR = os.path.join(ROOT, "public/scene1/character")
NAME = "ricori_walk"
STEP = 3
SCREEN = np.array([3.0, 254.0, 0.0])
# "Greenness" = G - max(R, B). Screen ~250; Grun's greens stay well below KEY_SOLID.
KEY_SOLID = 105.0  # at or below -> fully opaque
KEY_CLEAR = 200.0  # at or above -> fully transparent
CROP = (14, 6, 700, 1080)  # x0, y0, x1, y1 in the 700x1080 video frame


def key_frame(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    greenness = g - np.maximum(r, b)
    alpha = np.clip((KEY_CLEAR - greenness) / (KEY_CLEAR - KEY_SOLID), 0.0, 1.0)

    # Shrink the matte by 1px and soften it so compression noise on the edge disappears.
    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    # Un-mix the screen colour from partly transparent pixels: C = a*F + (1-a)*S.
    edge = (alpha > 0.0) & (alpha < 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1.0 - a) * SCREEN) / a
    rgb = np.where(edge[..., None], unmixed, rgb)

    # Remove any remaining green spill along the edge.
    edge_zone = alpha < 0.98
    limit = np.maximum(rgb[..., 0], rgb[..., 2]) + 20.0
    rgb[..., 1] = np.where(edge_zone, np.minimum(rgb[..., 1], limit), rgb[..., 1])

    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255.0]).round().astype(np.uint8)
    rgba[alpha <= 0.0] = 0
    return Image.fromarray(rgba)


def main():
    src = os.path.join(VIDEO_DIR, f"{NAME}.mp4")
    out_dir = os.path.join(CHARACTER_DIR, NAME)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    shutil.rmtree(out_dir, ignore_errors=True)
    os.makedirs(out_dir)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", src, os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        names = sorted(os.listdir(tmp))
        count = 0
        for index in range(0, len(names), STEP):
            frame = Image.open(os.path.join(tmp, names[index]))
            key_frame(frame).crop(CROP).save(
                os.path.join(out_dir, f"frame_{count:02d}.png"), optimize=True
            )
            count += 1
    print(NAME, "frames", count)


if __name__ == "__main__":
    main()
