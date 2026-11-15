"""Extracts Grun's idle loop for the chapter 1 closing tableau and removes the pink screen.

  ../source_videos/ricori_v.mp4 -> public/scene1/character/ricori_v/frame_XX.webp

- The video is hand-drawn on "fours": each drawing is held for several video frames. Only the
  distinct drawings are kept; how long each one is shown is printed for `RICORI_V_CLIP.holdMs`
  in src/constants/scene2Config.ts.
- Keyed on "magenta-ness" = min(R, B) - G: the screen (RGB ~251,8,120) scores ~114, while the
  drawn pinks (cheeks, hair highlights, coat) still contain a lot of green and score below ~30.
  Unlike a plain colour distance, this also clears screen that video compression mixed into
  dark outlines or between hair leaves (e.g. RGB ~171,74,118 or ~217,53,128).
- Frames use the framing of the former grun_v.webp (1163x1800 scaled down to the video's
  resolution, plus `PAD_X` on both sides for the swinging arms), so Grun stays where he was. Found by matching silhouettes:
  grun_v px = video px * 1.82 + (-320, 8).

Requires:  pip install imageio-ffmpeg numpy pillow
Run:       python3 scripts/extract_ricori_v.py
"""
import json
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
SRC = os.path.join(VIDEO_DIR, "ricori_v.mp4")
OUT_DIR = os.path.join(ROOT, "public/scene1/character/ricori_v")

FPS = 60
SCREEN = np.array([251.0, 8.0, 120.0])
KEY_SOLID = 35.0  # magenta-ness at or below -> fully opaque
KEY_CLEAR = 95.0  # at or above -> fully transparent
# A new drawing starts when the frame changes more than this (mean abs diff, 0-255).
CHANGE_THRESHOLD = 3.0
# grun_v.webp box mapped into video px.
GRUN_V_SIZE = (1163, 1800)
VIDEO_TO_GRUN_V = 1.82
GRUN_V_OFFSET = (-320, 8)
# The arms swing up to ~44 video px past grun_v's left / right edge: widen the frame equally on
# both sides (the tableau centres the image, so Grun stays in place).
PAD_X = 48


def key_frame(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    magenta = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    alpha = np.clip((KEY_CLEAR - magenta) / (KEY_CLEAR - KEY_SOLID), 0.0, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    # Un-mix the screen colour from partly transparent pixels: C = a*F + (1-a)*S.
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
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", SRC, os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        paths = [os.path.join(tmp, n) for n in sorted(os.listdir(tmp))]

        # Group video frames into drawings.
        starts, prev = [0], None
        for index, path in enumerate(paths):
            small = np.asarray(Image.open(path).convert("L").resize((250, 250))).astype(np.int16)
            if prev is not None and np.abs(small - prev).mean() > CHANGE_THRESHOLD:
                starts.append(index)
            prev = small
        ends = starts[1:] + [len(paths)]
        hold_ms = [round((end - start) * 1000 / FPS) for start, end in zip(starts, ends)]

        # Crop box (video px) that maps onto the grun_v box.
        left = -GRUN_V_OFFSET[0] / VIDEO_TO_GRUN_V
        top = -GRUN_V_OFFSET[1] / VIDEO_TO_GRUN_V
        width = round(GRUN_V_SIZE[0] / VIDEO_TO_GRUN_V)
        height = round(GRUN_V_SIZE[1] / VIDEO_TO_GRUN_V)
        width += 2 * PAD_X
        box = (round(left) - PAD_X, round(top), round(left) - PAD_X + width, round(top) + height)

        shutil.rmtree(OUT_DIR, ignore_errors=True)
        os.makedirs(OUT_DIR)
        for index, start in enumerate(starts):
            # Middle frame of the hold: least affected by compression around the change.
            middle = (start + ends[index] - 1) // 2
            keyed = key_frame(Image.open(paths[middle]))
            outside = np.asarray(keyed)[..., 3] > 8
            ys, xs = np.nonzero(outside)
            if xs.min() < box[0] or ys.min() < box[1] or xs.max() >= box[2] or ys.max() >= box[3]:
                print(f"warning: drawing {index} reaches outside the grun_v box")
            keyed.crop(box).save(os.path.join(OUT_DIR, f"frame_{index:02d}.webp"), quality=90, method=6)

    print(json.dumps({"frames": len(starts), "width": width, "height": height, "holdMs": hold_ms}))


if __name__ == "__main__":
    main()
