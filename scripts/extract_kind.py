"""Extracts the kid's three clips for chapter 1 and removes the screen background.

  ../source_videos/kind1_sw.mp4   -> public/scene1/character/kind_sw/     grey idle loop
  ../source_videos/kind_mitte.mp4 -> public/scene1/character/kind_mitte/  grey -> green, plays once
  ../source_videos/kind_g.mp4     -> public/scene1/character/kind_g/      green idle loop

- Every 3rd frame of the 60 fps videos is kept (~20 fps).
- Each video has its own screen colour; only that colour becomes transparent.
- Semi-transparent edge pixels are "un-mixed" from the screen colour so no fringe remains.
- All clips share one coordinate system: the 509x678 box of the former kind_sw.png ("kid box",
  same figure height / feet line as before). kind_sw fills exactly that box. kind_mitte (swirls,
  sparkles) and kind_g are cropped to their content and may reach outside it; their placement in
  kid-box px is printed for `KIND_CLIPS` in src/constants/sceneConfig.ts.
- The videos were lined up by matching silhouettes: kind_mitte = kind1_sw shifted 150px right;
  kind_g's kid sits 13px left / 7px higher than kind_mitte's last frame.

Requires:  pip install imageio-ffmpeg numpy pillow
Run:       python3 scripts/extract_kind.py            (all)
           python3 scripts/extract_kind.py mitte g    (some)
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

STEP = 3
KID_BOX = (509, 678)
# Video px -> kid-box px: kid = video * SCALE + origin (origin = where the video's top-left lands).
SCALE = 0.6821


def blueness(rgb):
    return rgb[..., 2] - np.maximum(rgb[..., 0], rgb[..., 1])


def screen_distance(screen):
    return lambda rgb: -np.sqrt(((rgb - screen) ** 2).sum(-1))


CLIPS = {
    "sw": {
        "video": "kind1_sw.mp4",
        "out": "kind_sw",
        "screen": (52.0, 84.0, 146.0),
        # key value: high = screen. (solid, clear) thresholds on that value.
        "key": blueness,
        "solid": 12.0,
        "clear": 50.0,
        "spill": 4.0,
        "origin": (11, -30),
        "crop": "box",
    },
    "mitte": {
        "video": "kind_mitte.mp4",
        "out": "kind_mitte",
        "screen": (0.0, 95.0, 252.0),
        "key": blueness,
        "solid": 70.0,
        "clear": 130.0,
        "spill": 0.0,
        # The swirls' soft glow picks up the bright blue screen everywhere, not just at edges.
        "spill_everywhere": True,
        # The final burst of rays runs past the video frame and is cut off by its border.
        # Fade everything out towards the border so the rays dissolve instead of ending in a
        # straight line. The kid's own area (video px) only gets a thin fade.
        "edge_fade": {"px": 170, "protect": (236, 30, 777, 1080), "protect_px": 30},
        "origin": (-91, -30),  # (-150 * SCALE + 11, -30)
        "crop": "content",
    },
    "g": {
        "video": "kind_g.mp4",
        "out": "kind_g",
        "screen": (79.0, 94.0, 144.0),
        # Greyish-blue screen is close to the kid's teal, so key on colour distance instead.
        "key": screen_distance(np.array([79.0, 94.0, 144.0])),
        "solid": -40.0,
        "clear": -18.0,
        "spill": 10.0,
        "origin": (-82, -25),  # ((13 - 150) * SCALE + 11, 7 * SCALE - 30)
        "crop": "content",
    },
}


def key_frame(img: Image.Image, clip: dict) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    screen = np.array(clip["screen"])
    value = clip["key"](rgb)
    alpha = np.clip((clip["clear"] - value) / (clip["clear"] - clip["solid"]), 0.0, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    edge = (alpha > 0.0) & (alpha < 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1.0 - a) * screen) / a
    rgb = np.where(edge[..., None], unmixed, rgb)

    # Remove blue spill along the edge.
    edge_zone = np.ones_like(alpha, bool) if clip.get("spill_everywhere") else alpha < 0.98
    limit = np.maximum(rgb[..., 0], rgb[..., 1]) + clip["spill"]
    rgb[..., 2] = np.where(edge_zone, np.minimum(rgb[..., 2], limit), rgb[..., 2])

    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255.0]).round().astype(np.uint8)
    rgba[alpha <= 0.0] = 0
    return Image.fromarray(rgba)


def edge_fade_mask(width: int, height: int, fade: dict) -> np.ndarray:
    """0 at the frame border rising smoothly to 1 at `px` inside (less inside `protect`)."""
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    dist = np.minimum.reduce([xs, width - 1 - xs, ys, height - 1 - ys])
    x0, y0, x1, y1 = fade["protect"]
    inside = (xs >= x0) & (xs <= x1) & (ys >= y0) & (ys <= y1)
    span = np.where(inside, fade["protect_px"], fade["px"])
    t = np.clip(dist / span, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def extract(name: str) -> dict:
    clip = CLIPS[name]
    out_dir = os.path.join(CHARACTER_DIR, clip["out"])
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", os.path.join(VIDEO_DIR, clip["video"]),
             os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        names = sorted(os.listdir(tmp))[::STEP]
        scaled = []
        fade_mask = None
        for frame_name in names:
            keyed = key_frame(Image.open(os.path.join(tmp, frame_name)), clip)
            if clip.get("edge_fade"):
                if fade_mask is None:
                    fade_mask = edge_fade_mask(keyed.width, keyed.height, clip["edge_fade"])
                rgba = np.asarray(keyed).copy()
                rgba[..., 3] = (rgba[..., 3] * fade_mask).round().astype(np.uint8)
                keyed = Image.fromarray(rgba)
            size = (round(keyed.width * SCALE), round(keyed.height * SCALE))
            scaled.append(keyed.resize(size, Image.LANCZOS))

    ox, oy = clip["origin"]
    if clip["crop"] == "box":
        # Crop rectangle in scaled-video px that maps onto the kid box.
        left, top, right, bottom = -ox, -oy, -ox + KID_BOX[0], -oy + KID_BOX[1]
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
        "dir": f"character/{clip['out']}",
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
