"""Extracts the looping characters of the chapter 1 closing tableau and removes the pink screen.

  ../source_videos/ricori_v.mp4 -> public/scene1/character/ricori_v/   Grun   (was grun_v.webp)
  ../source_videos/ai1.mp4      -> public/scene1/character/ai1/        kid    (was kinder2.webp)
  ../source_videos/ai2.mp4      -> public/scene1/character/ai2/        girl   (was kinder3.webp)
  ../source_videos/ai3.mp4      -> public/scene1/character/ai3/        kid + dog (was kinder1.webp + hund.webp)

- The videos are hand-drawn: each drawing is held for several video frames. Only the distinct
  drawings are kept; how long each one is shown is printed as `holdMs` for the clip's entry in
  src/constants/scene2Config.ts (together with `width` / `height`).
- Keyed on "magenta-ness" = min(R, B) - G: the screen scores ~90-115, while drawn pinks
  (cheeks, hair highlights, skin) still contain a lot of green and score below ~30. Unlike a plain
  colour distance, this also clears screen that video compression mixed into dark outlines or
  between hair leaves.
- Each clip is placed onto the box of the still image it replaces ("target", in that image's
  px): target px = video px * `scale` + `offset`. Frames are saved at the video's own resolution
  (the target box scaled by 1 / `scale`), plus `pad_x` on both sides / `pad_top` above where the
  motion reaches outside the old image. The tableau centres each image horizontally and stands it
  on its bottom edge, so with symmetric `pad_x` and no bottom padding the character stays in place;
  only the item's `height` in scene2Config.ts grows by `pad_top` (and `pad_bottom`, which also
  lowers the item's `bottom`).
    ricori_v: matched to grun_v's silhouette (1163x1800).
    ai1:      a new drawing, matched to kinder2 (596x1000) by height (hand tips to feet), feet
              line and horizontal centre.
    ai2:      a new drawing, matched to kinder3 (616x1150) the same way (head to feet).
    ai3:      the kid matched to kinder1 (596x1300) the same way; the dog in the same video
              replaces hund.webp. It sits left of and slightly below the kid, hence the large
              `pad_x` and `pad_bottom` (the item's `bottom` in scene2Config.ts moves down by it).

Requires:  pip install imageio-ffmpeg numpy pillow
Run:       python3 scripts/extract_tableau.py            (all)
           python3 scripts/extract_tableau.py ai1        (some)
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Source videos live outside the repo (not committed / deployed). Override with GRUN_VIDEO_DIR.
VIDEO_DIR = os.environ.get("GRUN_VIDEO_DIR", os.path.join(os.path.dirname(ROOT), "source_videos"))
CHARACTER_DIR = os.path.join(ROOT, "public/scene1/character")

FPS = 60
# A new drawing starts when the frame changes more than this (mean abs diff, 0-255).
CHANGE_THRESHOLD = 3.0

CLIPS = {
    "ricori_v": {
        "video": "ricori_v.mp4",
        "screen": (251.0, 8.0, 120.0),
        "solid": 35.0,  # magenta-ness at or below -> fully opaque
        "clear": 95.0,  # at or above -> fully transparent
        "target": (1163, 1800),
        "scale": 1.82,
        "offset": (-320, 8),
        "pad_x": 48,  # arms swing up to ~44 video px past grun_v's edges
        "pad_top": 0,
    },
    "ai1": {
        "video": "ai1.mp4",
        "screen": (246.0, 10.0, 103.0),
        "solid": 25.0,
        "clear": 78.0,  # this screen is less saturated (~93)
        "target": (596, 1000),
        "scale": 1.648,
        "offset": (-279, -106),
        "pad_x": 42,  # hands reach ~37 video px past kinder2's left edge
        "pad_top": 50,  # and ~48 video px above it when they jump
    },
    "ai2": {
        "video": "ai2.mp4",
        "screen": (249.0, 1.0, 117.0),
        "solid": 35.0,
        "clear": 95.0,
        "target": (616, 1150),
        "scale": 1.878,
        "offset": (-326, -139),
        "pad_x": 134,  # the hair swings up to ~131 video px past kinder3's right edge
        "pad_top": 3,
    },
    "ai3": {
        "video": "ai3.mp4",
        "screen": (249.0, 1.0, 117.0),
        "solid": 35.0,
        "clear": 95.0,
        # The sparkles on the coat twinkle between the line changes: these differ only slightly.
        "change_threshold": 0.15,
        "target": (596, 1300),
        "scale": 2.289,
        "offset": (-752, -92),
        "pad_x": 294,  # the dog's tail swings ~290 video px left of kinder1's box
        "pad_top": 2,
        "pad_bottom": 40,  # and its feet ~37 video px below the kid's
    },
}


def key_frame(img: Image.Image, clip: dict) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    screen = np.array(clip["screen"])
    magenta = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    alpha = np.clip((clip["clear"] - magenta) / (clip["clear"] - clip["solid"]), 0.0, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    # Un-mix the screen colour from partly transparent pixels: C = a*F + (1-a)*S.
    edge = (alpha > 0.0) & (alpha < 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1.0 - a) * screen) / a
    rgb = np.where(edge[..., None], unmixed, rgb)

    # Remove pink spill along the edge: red / blue may not rise above green there.
    edge_zone = (alpha < 0.98)[..., None]
    limit = rgb[..., 1:2] + 8.0
    rgb[..., 0:1] = np.where(edge_zone, np.minimum(rgb[..., 0:1], limit), rgb[..., 0:1])
    rgb[..., 2:3] = np.where(edge_zone, np.minimum(rgb[..., 2:3], limit), rgb[..., 2:3])

    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255.0]).round().astype(np.uint8)
    rgba[alpha <= 0.0] = 0
    return Image.fromarray(rgba)


def extract(name: str) -> dict:
    clip = CLIPS[name]
    out_dir = os.path.join(CHARACTER_DIR, name)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", os.path.join(VIDEO_DIR, clip["video"]),
             os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        paths = [os.path.join(tmp, n) for n in sorted(os.listdir(tmp))]

        # Group video frames into drawings.
        starts, prev = [0], None
        for index, path in enumerate(paths):
            small = np.asarray(Image.open(path).convert("L").resize((250, 250))).astype(np.int16)
            if prev is not None and np.abs(small - prev).mean() > clip.get("change_threshold", CHANGE_THRESHOLD):
                starts.append(index)
            prev = small
        ends = starts[1:] + [len(paths)]
        hold_ms = [round((end - start) * 1000 / FPS) for start, end in zip(starts, ends)]

        # Crop box (video px) that maps onto the target box, plus padding.
        scale, (ox, oy) = clip["scale"], clip["offset"]
        left = round(-ox / scale) - clip["pad_x"]
        top = round(-oy / scale) - clip["pad_top"]
        width = round(clip["target"][0] / scale) + 2 * clip["pad_x"]
        base_height = round(clip["target"][1] / scale)
        height = base_height + clip["pad_top"] + clip.get("pad_bottom", 0)
        box = (left, top, left + width, top + height)

        shutil.rmtree(out_dir, ignore_errors=True)
        os.makedirs(out_dir)
        for index, start in enumerate(starts):
            # Middle frame of the hold: least affected by compression around the change.
            middle = (start + ends[index] - 1) // 2
            keyed = key_frame(Image.open(paths[middle]), clip)
            ys, xs = np.nonzero(np.asarray(keyed)[..., 3] > 8)
            if xs.min() < box[0] or ys.min() < box[1] or xs.max() >= box[2] or ys.max() >= box[3]:
                print(f"warning: {name} drawing {index} reaches outside its box")
            keyed.crop(box).save(os.path.join(out_dir, f"frame_{index:02d}.webp"), quality=90, method=6)

    return {
        "dir": f"character/{name}",
        "width": width,
        "height": height,
        # Item height in scene2Config.ts grows by this factor (top / bottom padding) ...
        "heightScale": round(height / base_height, 4),
        # ... and its bottom moves down by this fraction of the old height (bottom padding).
        "bottomShift": round(clip.get("pad_bottom", 0) / base_height, 4),
        "holdMs": hold_ms,
    }


def main():
    keys = sys.argv[1:] or list(CLIPS)
    print(json.dumps({key: extract(key) for key in keys}, indent=2))


if __name__ == "__main__":
    main()
