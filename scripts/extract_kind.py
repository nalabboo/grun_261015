"""Extracts the idle loop of the grey kid from kind1_sw.mp4 (blue screen) for chapter 1.

  ../source_videos/kind1_sw.mp4 -> public/scene1/character/kind_sw/frame_XX.webp

- Every 3rd frame of the 60 fps video is kept (~20 fps, seamless loop).
- Only the blue screen (RGB ~52,84,146) becomes transparent; the kid has no blue cast.
- Semi-transparent edge pixels are "un-mixed" from the screen colour so no blue fringe remains.
- Each frame is scaled / shifted onto the 509x678 canvas of the former kind_sw.png: same figure
  height, same feet line and horizontal centre, so the kid's layout and click area stay as before.

Requires:  pip install imageio-ffmpeg numpy pillow
Run:       python3 scripts/extract_kind.py
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
SRC = os.path.join(VIDEO_DIR, "kind1_sw.mp4")
OUT_DIR = os.path.join(ROOT, "public/scene1/character/kind_sw")

STEP = 3
SCREEN = np.array([52.0, 84.0, 146.0])
# "Blueness" = B - max(R, G). Screen ~60; the kid stays below ~5.
KEY_SOLID = 12.0  # at or below -> fully opaque
KEY_CLEAR = 50.0  # at or above -> fully transparent
# Placement onto the former kind_sw.png canvas. The kid spans x 106-609, y 44-1037 in the video;
# scaled to the old figure height (678) with the feet on the bottom row, centred at x 254.5.
CANVAS = (509, 678)
SCALE = 0.6821
OFFSET = (11, -30)


def key_frame(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    blueness = rgb[..., 2] - np.maximum(rgb[..., 0], rgb[..., 1])
    alpha = np.clip((KEY_CLEAR - blueness) / (KEY_CLEAR - KEY_SOLID), 0.0, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    edge = (alpha > 0.0) & (alpha < 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1.0 - a) * SCREEN) / a
    rgb = np.where(edge[..., None], unmixed, rgb)

    # Remove blue spill along the edge.
    edge_zone = alpha < 0.98
    limit = np.maximum(rgb[..., 0], rgb[..., 1]) + 4.0
    rgb[..., 2] = np.where(edge_zone, np.minimum(rgb[..., 2], limit), rgb[..., 2])

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
            scaled = keyed.resize(size, Image.LANCZOS)
            canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            canvas.alpha_composite(scaled, (OFFSET[0], 0), (0, -OFFSET[1]))
            canvas.save(os.path.join(OUT_DIR, f"frame_{index:02d}.webp"), quality=90, method=6)
    print("frames", len(names))


if __name__ == "__main__":
    main()
