"""Extracts chapter 2's blue-screen prop clips (butterflies, bird, salamander) and removes the screen.

  ../source_videos/nabi1.mp4 -> public/scene2/gelb objekt/nabi1/   replaces g_nabi2.png (same butterfly)
  ../source_videos/nabi3.mp4 -> public/scene2/gelb objekt/nabi3/   replaces g_nabi3.png
  ../source_videos/vogel.mp4 -> public/scene2/gelb objekt/vogel/   replaces g_vogel.png
  ../source_videos/celemen1-1.mp4 -> public/scene2/rot objekt/celemen1-1/   replaces r_celemen1.png:
  ../source_videos/celemen1-2.mp4 -> public/scene2/rot objekt/celemen1-2/   entrance once, then loop
  ../source_videos/celemen2-1.mp4 -> public/scene2/rot objekt/celemen2-1/   replaces r_celemen2.png:
  ../source_videos/celemen2-2.mp4 -> public/scene2/rot objekt/celemen2-2/   entrance once, then loop

- Keyed on "blueness" = B - max(R, G): the screen scores ~165 (butterflies) / ~217 (bird), while the
  drawings, even their pale-blue / teal wing spots, stay below ~20-40. Edge pixels are un-mixed from
  the screen colour and leftover blue spill is pulled down, so no blue fringe stays.
- Each clip is placed in the box of the still it replaces (its 500x461 / 600x492 / 400x411 /
  1435x962 / 1305x857 canvas): the video frame that best matches the still's silhouette sets the scale and offset (IoU). All
  frames share one canvas = everything the motion covers; its placement in still-box px is printed
  for `CHAPTER2_GELB_CLIPS` in src/constants/chapter2PropClips.ts.
- A clip with an `intro` (plays once, then `loop`): both videos share one camera / canvas, so the
  same placement and one shared box are used for both.
- Saved at `out_scale` x still px (the butterflies are small on screen).

Requires:  pip install imageio-ffmpeg numpy pillow scipy
Run:       python3 scripts/extract_gelb.py            (all)
           python3 scripts/extract_gelb.py vogel      (some; celemen1-2 = the salamander)
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
VIDEO_DIR = os.environ.get("GRUN_VIDEO_DIR", os.path.join(os.path.dirname(ROOT), "source_videos"))
SCENE2_DIR = os.path.join(ROOT, "public/scene2")

CLIPS = {
    # folder: under public/scene2 (still and output); still: the picture the clip replaces;
    # step: keep every n-th video frame; intro (optional): video played once before the loop.
    "nabi1": {"folder": "gelb objekt", "video": "nabi1.mp4", "still": "g_nabi2.png", "fps": 60, "step": 2, "out_scale": 0.6},
    "nabi3": {"folder": "gelb objekt", "video": "nabi3.mp4", "still": "g_nabi3.png", "fps": 60, "step": 2, "out_scale": 0.6},
    "vogel": {"folder": "gelb objekt", "video": "vogel.mp4", "still": "g_vogel.png", "fps": 24, "step": 1, "out_scale": 1.5},
    "celemen1-2": {"folder": "rot objekt", "intro": "celemen1-1.mp4", "video": "celemen1-2.mp4",
                   "still": "r_celemen1.png", "fps": 24, "step": 1, "out_scale": 0.5},  # shown ~450 px tall (1080p)
    "celemen2-2": {"folder": "rot objekt", "intro": "celemen2-1.mp4", "video": "celemen2-2.mp4",
                   "still": "r_celemen2.png", "fps": 24, "step": 1, "out_scale": 0.3},  # layout scale 0.5: ~180 px tall
}
# Share of the screen's blueness: at or below `SOLID` -> opaque, at or above `CLEAR` -> clear.
SOLID = 0.3
CLEAR = 0.8
# Blue a drawn pixel may keep above max(R, G) (pale-blue wing spots); more is screen spill.
SPILL_KEEP = 30.0


def blueness(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 2] - np.maximum(rgb[..., 0], rgb[..., 1])


def key_frame(rgb: np.ndarray, screen: np.ndarray) -> Image.Image:
    screen_blue = blueness(screen[None, None, :])[0, 0]
    blue = blueness(rgb)
    alpha = np.clip((CLEAR * screen_blue - blue) / ((CLEAR - SOLID) * screen_blue), 0.0, 1.0)

    matte = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

    # Un-mix the screen from edge pixels: C = a*F + (1-a)*S.
    edge = (alpha > 0.0) & (alpha < 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    unmixed = np.clip((rgb - (1.0 - a) * screen) / a, 0, 255)
    out = np.where(edge[..., None], unmixed, rgb)
    # Pull leftover blue spill down to what a drawn pale blue may have.
    cap = np.maximum(out[..., 0], out[..., 1]) + SPILL_KEEP
    out[..., 2] = np.minimum(out[..., 2], cap)

    rgba = np.dstack([out, alpha * 255.0]).round().astype(np.uint8)
    rgba[alpha <= 0.0] = 0
    return Image.fromarray(rgba)


def bbox(mask: np.ndarray):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def register(source_img: Image.Image, target: np.ndarray):
    """(iou, scale, dx, dy): target px = source px * scale + (dx, dy)."""
    source = np.asarray(source_img)[..., 3] > 128
    tx0, ty0, tx1, ty1 = bbox(target)
    sx0, sy0, sx1, sy1 = bbox(source)
    best = (-1.0, 1.0, 0, 0)
    base = np.sqrt((ty1 - ty0) * (tx1 - tx0) / ((sy1 - sy0) * (sx1 - sx0)))
    for scale in np.linspace(base * 0.92, base * 1.08, 9):
        small = Image.fromarray(source.astype(np.uint8) * 255).resize(
            (max(1, round(source.shape[1] * scale)), max(1, round(source.shape[0] * scale))),
            Image.BILINEAR,
        )
        sm = np.asarray(small) > 127
        bx0, by0, bx1, by1 = bbox(sm)
        cx = round((tx0 + tx1) / 2 - (bx0 + bx1) / 2)
        cy = round((ty0 + ty1) / 2 - (by0 + by1) / 2)
        ys, xs = np.nonzero(sm)
        for dy in range(cy - 12, cy + 13, 3):
            for dx in range(cx - 12, cx + 13, 3):
                canvas = np.zeros_like(target)
                xs2, ys2 = xs + dx, ys + dy
                ok = (xs2 >= 0) & (xs2 < target.shape[1]) & (ys2 >= 0) & (ys2 < target.shape[0])
                canvas[ys2[ok], xs2[ok]] = True
                iou = (canvas & target).sum() / (canvas | target).sum()
                if iou > best[0]:
                    best = (iou, scale, dx, dy)
    return best


def load_frames(ffmpeg: str, video: str, step: int):
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", os.path.join(VIDEO_DIR, video),
             os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        names = sorted(os.listdir(tmp))[::step]
        return [np.asarray(Image.open(os.path.join(tmp, n)).convert("RGB")).astype(np.float32) for n in names]


def extract(name: str, spec: dict, ffmpeg: str):
    parts = {}
    if "intro" in spec:
        parts["intro"] = (spec["intro"][:-4], load_frames(ffmpeg, spec["intro"], spec["step"]))
    parts["loop"] = (name, load_frames(ffmpeg, spec["video"], spec["step"]))
    first_raw = next(iter(parts.values()))[1][0]
    # Screen colour: the median of the frame border.
    border = np.concatenate([first_raw[:8].reshape(-1, 3), first_raw[-8:].reshape(-1, 3),
                             first_raw[:, :8].reshape(-1, 3), first_raw[:, -8:].reshape(-1, 3)])
    screen = np.median(border, axis=0)
    keyed = {part: (folder, [key_frame(raw, screen) for raw in raws]) for part, (folder, raws) in parts.items()}

    still = Image.open(os.path.join(SCENE2_DIR, spec["folder"], spec["still"]))
    target = np.asarray(still)[..., 3] > 128
    # The frame that matches the still best sets the placement.
    best = None
    for part, (_, ims) in keyed.items():
        for index in range(0, len(ims), max(1, len(ims) // 12)):
            result = register(ims[index], target)
            if best is None or result[0] > best[0][0]:
                best = (result, f"{part} {index}")
    (iou, scale, dx, dy), at = best
    print(f"{name}: frame {at} matches {spec['still']} (iou {iou:.3f}), scale {scale:.4f}, origin ({dx}, {dy})")
    if "intro" in keyed:
        a = np.asarray(keyed["intro"][1][-1])[..., 3] > 128
        b = np.asarray(keyed["loop"][1][0])[..., 3] > 128
        print(f"{name}: intro last vs loop first overlap {(a & b).sum() / (a | b).sum():.3f}")

    union = np.logical_or.reduce([np.asarray(im)[..., 3] > 8 for _, ims in keyed.values() for im in ims])
    x0, y0, x1, y1 = bbox(union)
    box = [np.floor(x0 * scale + dx), np.floor(y0 * scale + dy),
           np.ceil(x1 * scale + dx), np.ceil(y1 * scale + dy)]
    k = scale * spec["out_scale"]
    out_w = round((box[2] - box[0]) * spec["out_scale"])
    out_h = round((box[3] - box[1]) * spec["out_scale"])

    fps = spec["fps"] / spec["step"]
    result = {
        "x": int(box[0]),
        "y": int(box[1]),
        "width": int(box[2] - box[0]),
        "height": int(box[3] - box[1]),
    }
    for part, (folder, ims) in keyed.items():
        out_dir = os.path.join(SCENE2_DIR, spec["folder"], folder)
        shutil.rmtree(out_dir, ignore_errors=True)
        os.makedirs(out_dir)
        for index, im in enumerate(ims):
            small = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            canvas = Image.new("RGBA", (out_w, out_h))
            canvas.paste(small, (round((dx - box[0]) * spec["out_scale"]), round((dy - box[1]) * spec["out_scale"])), small)
            canvas.save(os.path.join(out_dir, f"frame_{index:02d}.webp"), quality=90, method=6)
        result[part] = {"dir": f"{spec['folder']}/{folder}", "frames": len(ims), "durationMs": round(len(ims) * 1000 / fps)}
    return result


def main():
    names = sys.argv[1:] or list(CLIPS)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    print(json.dumps({name: extract(name, CLIPS[name], ffmpeg) for name in names}, indent=2))


if __name__ == "__main__":
    main()
