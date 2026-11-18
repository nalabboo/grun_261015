"""Extracts the traffic light's red → green turn for chapter 1 and removes the white background.

  ../source_videos/ampel_mitte.mp4 -> public/scene1/landmark/ampel_mitte/   plays once after the click

- The video has a plain white background (not a chroma screen). Only white that is connected to
  the outside becomes transparent, so light highlights on the lamp stay. Semi-transparent pixels
  are "un-mixed" from white, so the coloured glow around the spinning lamp stays as a soft glow.
- Placed in the "ampel box": the 821x1000 canvas of ampel_b.webp / ampel_g.webp. The first frame
  is lined up with ampel_b's silhouette (`scale`, `origin`: box px = video px * scale + origin).
  Frames are cropped to their content; the placement in box px is printed for `AMPEL_MITTE_CLIP`
  in src/constants/sceneConfig.ts.
- Saved at `out_scale` x box px: the light is small on screen, so full size isn't needed.

Requires:  pip install imageio-ffmpeg numpy pillow scipy
Run:       python3 scripts/extract_ampel.py
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
OUT_DIR = os.path.join(ROOT, "public/scene1/landmark/ampel_mitte")

VIDEO = "ampel_mitte.mp4"
FPS = 24
SCREEN = np.array([252.0, 252.0, 252.0])
# Distance from the white background: at or above `solid` -> opaque, at or below `clear` -> clear.
SOLID = 40.0
CLEAR = 8.0
# Video px -> ampel-box px (matched to ampel_b's silhouette by extract run / IoU check).
SCALE = None  # filled by `register()` when None
ORIGIN = None
OUT_SCALE = 0.5


def key_frame(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    dist = np.sqrt(((rgb - SCREEN) ** 2).sum(-1))
    alpha = np.clip((dist - CLEAR) / (SOLID - CLEAR), 0.0, 1.0)

    # Only see-through regions that touch real background stay see-through.
    labels, count = ndimage.label(alpha < 1.0)
    if count:
        has_screen = ndimage.maximum(alpha <= 0.0, labels, np.arange(1, count + 1))
        keep = np.concatenate([[False], np.asarray(has_screen, bool)])
        alpha = np.where(keep[labels], alpha, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    # Un-mix white from partly transparent pixels: C = a*F + (1-a)*W.
    edge = (alpha > 0.0) & (alpha < 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1.0 - a) * SCREEN) / a
    rgb = np.where(edge[..., None], unmixed, rgb)

    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255.0]).round().astype(np.uint8)
    rgba[alpha <= 0.0] = 0
    return Image.fromarray(rgba)


def bbox(mask: np.ndarray):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def register(first: Image.Image):
    """Scale and origin that put the first frame onto ampel_b (bounding boxes, then IoU)."""
    target = np.asarray(Image.open(os.path.join(ROOT, "public/scene1/landmark/ampel_b.webp")))[..., 3] > 128
    source = np.asarray(first)[..., 3] > 128
    tx0, ty0, tx1, ty1 = bbox(target)
    sx0, sy0, sx1, sy1 = bbox(source)
    best = (-1.0, 1.0, 0, 0)
    base = (ty1 - ty0) / (sy1 - sy0)
    for scale in np.linspace(base * 0.96, base * 1.04, 9):
        small = Image.fromarray(source.astype(np.uint8) * 255).resize(
            (round(source.shape[1] * scale), round(source.shape[0] * scale)), Image.BILINEAR
        )
        sm = np.asarray(small) > 127
        bx0, by0, bx1, by1 = bbox(sm)
        # Align centres, then search a small window.
        cx = round((tx0 + tx1) / 2 - (bx0 + bx1) / 2)
        cy = round((ty0 + ty1) / 2 - (by0 + by1) / 2)
        for dy in range(cy - 12, cy + 13, 3):
            for dx in range(cx - 12, cx + 13, 3):
                canvas = np.zeros_like(target)
                ys, xs = np.nonzero(sm)
                xs2, ys2 = xs + dx, ys + dy
                ok = (xs2 >= 0) & (xs2 < target.shape[1]) & (ys2 >= 0) & (ys2 < target.shape[0])
                canvas[ys2[ok], xs2[ok]] = True
                iou = (canvas & target).sum() / (canvas | target).sum()
                if iou > best[0]:
                    best = (iou, scale, dx, dy)
    return best


def main():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", os.path.join(VIDEO_DIR, VIDEO),
             os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        names = sorted(os.listdir(tmp))
        keyed = [key_frame(Image.open(os.path.join(tmp, n))) for n in names]

    scale, origin = SCALE, ORIGIN
    if scale is None:
        iou, scale, ox, oy = register(keyed[0])
        origin = (ox, oy)
        print(f"registered to ampel_b: iou {iou:.3f}, scale {scale:.4f}, origin {origin}")

    # Content box (video px) over all frames.
    union = np.logical_or.reduce([np.asarray(im)[..., 3] > 8 for im in keyed])
    x0, y0, x1, y1 = bbox(union)
    box_x, box_y = x0 * scale + origin[0], y0 * scale + origin[1]
    box_w, box_h = (x1 - x0) * scale, (y1 - y0) * scale
    out_size = (round(box_w * OUT_SCALE), round(box_h * OUT_SCALE))

    shutil.rmtree(OUT_DIR, ignore_errors=True)
    os.makedirs(OUT_DIR)
    for index, im in enumerate(keyed):
        frame = im.crop((x0, y0, x1, y1)).resize(out_size, Image.LANCZOS)
        frame.save(os.path.join(OUT_DIR, f"frame_{index:02d}.webp"), quality=90, method=6)

    print(json.dumps({
        "dir": "landmark/ampel_mitte",
        "frames": len(keyed),
        "durationMs": round(len(keyed) * 1000 / FPS),
        "x": round(box_x),
        "y": round(box_y),
        "width": round(box_w),
        "height": round(box_h),
    }, indent=2))


if __name__ == "__main__":
    main()
