"""Extracts the worm's three clips for chapter 1 and removes the pink screen background.

  ../source_videos/worme_sw.mp4    -> public/scene1/landmark/worm_sw/     grey idle loop
  ../source_videos/worme_mitte.mp4 -> public/scene1/landmark/worm_mitte/  grey -> green, plays once
  ../source_videos/worme_g.mp4     -> public/scene1/landmark/worm_g/      green idle loop

- Every 3rd frame of the 60 fps videos is kept (~20 fps).
- Each video has its own screen colour; only that colour becomes transparent.
- Semi-transparent edge pixels are "un-mixed" from the screen colour so no pink fringe remains.
- All clips share one coordinate system: the 604x700 canvas of the former worm_b.png ("worm box").
  worm_sw fills exactly that box. worm_mitte (flips over) and worm_g are cropped to their content;
  their placement in worm-box px is printed for `WORM_CLIPS` in src/constants/sceneConfig.ts.
- worm_mitte's brief shrink before the flip is undone (`steady_size`).
- The videos were lined up by matching silhouettes: worm_mitte's first frame = worm_sw's first
  frame, worm_g's first frame = worm_mitte's last frame.

Requires:  pip install imageio-ffmpeg numpy pillow scipy
Run:       python3 scripts/extract_worm.py            (all)
           python3 scripts/extract_worm.py mitte g    (some)
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
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Source videos live outside the repo (not committed / deployed). Override with GRUN_VIDEO_DIR.
VIDEO_DIR = os.environ.get("GRUN_VIDEO_DIR", os.path.join(os.path.dirname(ROOT), "source_videos"))
LANDMARK_DIR = os.path.join(ROOT, "public/scene1/landmark")

STEP = 3
WORM_BOX = (604, 700)


def pinkness(rgb):
    return rgb[..., 0] - rgb[..., 1]


def screen_distance(screen):
    return lambda rgb: -np.sqrt(((rgb - np.array(screen)) ** 2).sum(-1))


CLIPS = {
    "sw": {
        "video": "worme_sw.mp4",
        "out": "worm_sw",
        "screen": (242.0, 16.0, 112.0),
        # key value: high = screen. (solid, clear) thresholds on that value.
        "key": pinkness,
        "solid": 60.0,
        "clear": 140.0,
        # Video px -> worm-box px: box = video * scale + origin.
        "scale": 0.654,
        "origin": (-52, -2),
        "crop": "box",
    },
    "mitte": {
        "video": "worme_mitte.mp4",
        "out": "worm_mitte",
        "screen": (250.0, 1.0, 133.0),
        "key": screen_distance((250.0, 1.0, 133.0)),
        "solid": -60.0,
        "clear": -14.0,
        # The pink cheeks are close to the screen colour: only pink that is connected to the
        # real background may turn transparent.
        "outside_only": True,
        # Frames 5-12 (kept-frame index): the video shrinks the whole worm by ~12% before the
        # flip. Scale those frames back to the first frame's size (anchored at the feet) so the
        # worm doesn't visibly shrink when clicked.
        "steady_size": range(5, 13),
        "scale": 1.1576,  # 1.77 * 0.654 (720px video vs 1080px worme_sw)
        "origin": (-115, -66),
        "crop": "content",
    },
    "g": {
        "video": "worme_g.mp4",
        "out": "worm_g",
        "screen": (238.0, 97.0, 145.0),
        "key": screen_distance((238.0, 97.0, 145.0)),
        "solid": -55.0,
        "clear": -12.0,
        "outside_only": True,
        "scale": 1.065,  # 0.92 * mitte
        "origin": (-61, -29),
        "crop": "content",
    },
}


def key_frame(img: Image.Image, clip: dict) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    screen = np.array(clip["screen"])
    value = clip["key"](rgb)
    alpha = np.clip((clip["clear"] - value) / (clip["clear"] - clip["solid"]), 0.0, 1.0)

    if clip.get("outside_only"):
        # Keep only see-through areas that belong to a region containing real screen colour
        # (outside background, gaps between legs). Pinkish patches inside the worm stay opaque.
        labels, count = ndimage.label(alpha < 1.0)
        if count:
            has_screen = ndimage.maximum(alpha <= 0.0, labels, np.arange(1, count + 1))
            keep = np.concatenate([[False], np.asarray(has_screen, bool)])
            alpha = np.where(keep[labels], alpha, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

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


def opaque_bbox(img: Image.Image):
    ys, xs = np.nonzero(np.asarray(img)[..., 3] > 128)
    return xs.min(), ys.min(), xs.max(), ys.max()


def steady_size(frames: list, indices) -> list:
    """Scales frames in `indices` so their figure size (bbox area) matches frame 0, keeping the
    feet line and frame 0's horizontal centre in place."""
    x0, y0, x1, y1 = opaque_bbox(frames[0])
    area0 = (x1 - x0) * (y1 - y0)
    anchor_x = (x0 + x1) / 2
    out = list(frames)
    for i in indices:
        bx0, by0, bx1, by1 = opaque_bbox(frames[i])
        f = float(np.sqrt(area0 / ((bx1 - bx0) * (by1 - by0))))
        if abs(f - 1.0) < 0.005:
            continue
        cx, ay = (bx0 + bx1) / 2, by1
        # Output (x, y) samples input ((x - ax) / f + cx, (y - ay) / f + ay).
        coeffs = (1 / f, 0, cx - anchor_x / f, 0, 1 / f, ay - ay / f)
        out[i] = frames[i].transform(frames[i].size, Image.AFFINE, coeffs, Image.BICUBIC)
    return out


def extract(name: str) -> dict:
    clip = CLIPS[name]
    out_dir = os.path.join(LANDMARK_DIR, clip["out"])
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", os.path.join(VIDEO_DIR, clip["video"]),
             os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        names = sorted(os.listdir(tmp))[::STEP]
        keyed = [key_frame(Image.open(os.path.join(tmp, n)), clip) for n in names]
    if clip.get("steady_size"):
        keyed = steady_size(keyed, clip["steady_size"])
    scaled = []
    for frame in keyed:
        size = (round(frame.width * clip["scale"]), round(frame.height * clip["scale"]))
        scaled.append(frame.resize(size, Image.LANCZOS))

    ox, oy = clip["origin"]
    if clip["crop"] == "box":
        # Crop rectangle in scaled-video px that maps onto the worm box.
        left, top, right, bottom = -ox, -oy, -ox + WORM_BOX[0], -oy + WORM_BOX[1]
    else:
        union = np.logical_or.reduce([np.asarray(im)[..., 3] > 8 for im in scaled])
        ys, xs = np.nonzero(union)
        left, top, right, bottom = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

    shutil.rmtree(out_dir, ignore_errors=True)
    os.makedirs(out_dir)
    for index, im in enumerate(scaled):
        canvas = Image.new("RGBA", (right - left, bottom - top), (0, 0, 0, 0))
        canvas.alpha_composite(im, (max(0, -left), max(0, -top)), (max(0, left), max(0, top)))
        canvas.save(os.path.join(out_dir, f"frame_{index:02d}.webp"), quality=90, method=6)

    return {
        "dir": f"landmark/{clip['out']}",
        "frames": len(names),
        "x": int(left + ox),
        "y": int(top + oy),
        "width": int(right - left),
        "height": int(bottom - top),
    }


def main():
    keys = sys.argv[1:] or list(CLIPS)
    meta = {key: extract(key) for key in keys}
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
