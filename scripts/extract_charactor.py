"""Extracts chapter 2 characters' entrance + idle loop videos and removes the white background.

  nari:  ../source_videos/nari1.mp4   -> public/scene2/charactor/nari1/    entrance, plays once
         ../source_videos/nari2.mp4   -> public/scene2/charactor/nari2/    idle loop afterwards
  laubl: ../source_videos/lauble1.mp4 -> public/scene2/charactor/laubl1/   entrance, plays once
         ../source_videos/laubl2.mp4  -> public/scene2/charactor/laubl2/   idle loop afterwards
  koki:  ../source_videos/koki1.mp4   -> public/scene2/charactor/koki1/    entrance, plays once
         ../source_videos/koki2.mp4   -> public/scene2/charactor/koki2/    idle loop afterwards

- Plain white background (like extract_ampel.py): only white connected to the outside becomes
  transparent. The background is a very even white (252-253, noise <= ~5 away), while their pale
  skin / dress is cream or grey-white (25-35+ away), so the limits are tight (`CLEAR` / `SOLID`):
  with wider ones a forehead touching the background between hair keyed half away in some frames
  only, and the character flickered. Tiny faint specks of dust in the background are dropped.
- The entrance fades in from white: see `fix_fade_in`.
- Both clips are placed in the box of the still they replace (nari.png 455x600, laubl.png
  700x1046, koki.png 500x683): the entrance's last frame is lined up with the still, the loop's first frame with the
  entrance's last frame (bounding boxes, then IoU). Frames share one canvas = the content of both
  clips; its placement in box px is printed for the clip in src/constants/chapter2PropClips.ts.

Requires:  pip install imageio-ffmpeg numpy pillow scipy
Run:       python3 scripts/extract_charactor.py            (all, ~4 min each)
           python3 scripts/extract_charactor.py laubl      (some)
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
OUT_ROOT = os.path.join(ROOT, "public/scene2/charactor")

CHARACTERS = {
    # still: the picture the clips replace; intro / loop: name (= output folder), video, keep
    # every `step`-th frame, source fps; out_scale: output px per still px.
    "nari": {
        "still": "nari.png",
        "intro": {"name": "nari1", "video": "nari1.mp4", "step": 1, "fps": 24},
        "loop": {"name": "nari2", "video": "nari2.mp4", "step": 2, "fps": 60},
        "out_scale": 1.0,  # nari.png is shown at ~0.9x on a 1080p screen
    },
    "laubl": {
        "still": "laubl.png",
        "intro": {"name": "laubl1", "video": "lauble1.mp4", "step": 1, "fps": 24},
        "loop": {"name": "laubl2", "video": "laubl2.mp4", "step": 1, "fps": 24},
        "out_scale": 0.55,  # laubl.png (1046 px tall) is shown ~420 px tall on a 1080p screen
    },
    "koki": {
        "still": "koki.png",
        "intro": {"name": "koki1", "video": "koki1.mp4", "step": 1, "fps": 24},
        "loop": {"name": "koki2", "video": "koki2.mp4", "step": 2, "fps": 60},
        "out_scale": 0.8,
    },
}
SCREEN = np.array([252.5, 252.5, 252.5])
SOLID = 18.0
CLEAR = 6.0
# Background specks: parts smaller than this (video px), or fainter than `SPECK_ALPHA` and smaller
# than `SPECK_FAINT_AREA`, are dropped.
SPECK_AREA = 60
SPECK_ALPHA = 0.6
SPECK_FAINT_AREA = 2000
# Fade-in frames weaker than this (0..1) borrow a stronger frame's silhouette (see fix_fade_in).
SOLID_FADE = 0.35


def key_frame(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    dist = np.sqrt(((rgb - SCREEN) ** 2).sum(-1))
    alpha = np.clip((dist - CLEAR) / (SOLID - CLEAR), 0.0, 1.0)

    labels, count = ndimage.label(alpha < 1.0)
    if count:
        has_screen = ndimage.maximum(alpha <= 0.0, labels, np.arange(1, count + 1))
        keep = np.concatenate([[False], np.asarray(has_screen, bool)])
        alpha = np.where(keep[labels], alpha, 1.0)

    # Drop dust specks in the background.
    labels, count = ndimage.label(alpha > 0.02)
    if count > 1:
        index = np.arange(1, count + 1)
        area = ndimage.sum(np.ones_like(alpha), labels, index)
        peak = ndimage.maximum(alpha, labels, index)
        drop = (area < SPECK_AREA) | ((peak < SPECK_ALPHA) & (area < SPECK_FAINT_AREA))
        alpha = np.where(np.concatenate([[False], drop])[labels], 0.0, alpha)

    matte = Image.fromarray((alpha * 255).astype(np.uint8))
    matte = matte.filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(matte).astype(np.float32) / 255.0

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


def register(source_img: Image.Image, target: np.ndarray):
    """(iou, scale, dx, dy): target px = source px * scale + (dx, dy)."""
    source = np.asarray(source_img)[..., 3] > 128
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
        cx = round((tx0 + tx1) / 2 - (bx0 + bx1) / 2)
        cy = round((ty0 + ty1) / 2 - (by0 + by1) / 2)
        ys, xs = np.nonzero(sm)
        for dy in range(cy - 12, cy + 13, 2):
            for dx in range(cx - 12, cx + 13, 2):
                canvas = np.zeros_like(target)
                xs2, ys2 = xs + dx, ys + dy
                ok = (xs2 >= 0) & (xs2 < target.shape[1]) & (ys2 >= 0) & (ys2 < target.shape[0])
                canvas[ys2[ok], xs2[ok]] = True
                iou = (canvas & target).sum() / (canvas | target).sum()
                if iou > best[0]:
                    best = (iou, scale, dx, dy)
    return best


def load_clip(ffmpeg: str, clip: dict, fade_in: bool):
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [ffmpeg, "-loglevel", "error", "-i", os.path.join(VIDEO_DIR, clip["video"]),
             os.path.join(tmp, "f_%03d.png")],
            check=True,
        )
        names = sorted(os.listdir(tmp))[:: clip["step"]]
        raws = [np.asarray(Image.open(os.path.join(tmp, n)).convert("RGB")).astype(np.float32) for n in names]
    keyed = [key_frame(Image.fromarray(raw.astype(np.uint8))) for raw in raws]
    if fade_in:
        keyed = fix_fade_in(raws, keyed)
    return keyed


def fix_fade_in(raws, keyed):
    """The entrance opens by fading in from white (frame = w * picture + (1 - w) * white) while the
    character starts to move. Keying those pale frames directly punches holes in her face, so for each fade
    frame: estimate w (how far it is from white, compared with the first frame after the fade),
    take the white back out to get the full-strength picture, key that, and use w as opacity."""
    ink = [np.abs(SCREEN - raw).sum(-1) for raw in raws]
    # First frame that is (nearly) as strong as the next ones = the fade is over.
    # (Blank white frames at the very start look "steady" too: skip anything near the first frame.)
    blank = ink[0].mean()
    full = next(
        i for i in range(1, len(raws) - 2)
        if ink[i].mean() > 4 * blank
        and ink[i].mean() >= 0.97 * ink[i + 2].mean()
    )
    region = np.asarray(keyed[full])[..., 3] > 200
    base = ink[full][region].mean()
    out = list(keyed)
    weights = [float(np.clip(ink[i][region].mean() / base, 0.0, 1.0)) for i in range(full)]
    solids = {}
    for i in range(full):
        w = weights[i]
        if w < 0.03:
            continue
        picture = np.clip((raws[i] - (1.0 - w) * SCREEN) / w, 0, 255)
        rgba = np.asarray(key_frame(Image.fromarray(picture.round().astype(np.uint8)))).astype(np.float32)
        # Pale skin / dress inside her outline can still key out: fill the silhouette's holes.
        solids[i] = ndimage.binary_fill_holes(rgba[..., 3] > 128)
        out[i] = rgba
    # The faintest frames have a broken outline (holes leak out) and noisy colours: use the first
    # frame that is strong enough instead — she hasn't moved yet then.
    ref = next(i for i in range(full) if weights[i] >= SOLID_FADE)
    for i in range(full):
        w = weights[i]
        if w < 0.03:
            out[i] = Image.new("RGBA", keyed[i].size)
            print(f"  fade-in frame {i}: empty")
            continue
        # Too faint to key well: reuse the reference frame's picture (she is still standing).
        rgba = (out[ref] if w < SOLID_FADE else out[i]).copy()
        solid = solids[ref] if w < SOLID_FADE else solids[i]
        rgba[..., 3] = np.maximum(rgba[..., 3], solid * 255.0) * w
        out[i] = Image.fromarray(rgba.round().astype(np.uint8))
        print(f"  fade-in frame {i}: opacity {w:.2f}")
    print(f"  fade-in ends at frame {full}")
    return out


def extract(spec: dict, ffmpeg: str):
    intro, loop = spec["intro"], spec["loop"]
    out_scale = spec["out_scale"]
    frames = {
        intro["name"]: load_clip(ffmpeg, intro, fade_in=True),
        loop["name"]: load_clip(ffmpeg, loop, fade_in=False),
    }

    # Entrance (video px) -> still box.
    still = np.asarray(Image.open(os.path.join(OUT_ROOT, spec["still"])))[..., 3] > 128
    iou1, s1, dx1, dy1 = register(frames[intro["name"]][-1], still)
    print(f"{intro['name']} last -> {spec['still']}: iou {iou1:.3f}, scale {s1:.4f}, origin ({dx1}, {dy1})")

    # Loop (video px) -> entrance (video px), then -> still box.
    last1 = np.asarray(frames[intro["name"]][-1])[..., 3] > 128
    iou2, s2, dx2, dy2 = register(frames[loop["name"]][0], last1)
    print(f"{loop['name']} first -> {intro['name']} last: iou {iou2:.3f}, scale {s2:.4f}, origin ({dx2}, {dy2})")
    place = {
        intro["name"]: (s1, dx1, dy1),
        loop["name"]: (s2 * s1, dx2 * s1 + dx1, dy2 * s1 + dy1),
    }

    # Shared content box (still-box px) over both clips.
    x0 = y0 = float("inf")
    x1 = y1 = float("-inf")
    for name, ims in frames.items():
        scale, ox, oy = place[name]
        union = np.logical_or.reduce([np.asarray(im)[..., 3] > 8 for im in ims])
        bx0, by0, bx1, by1 = bbox(union)
        x0, y0 = min(x0, bx0 * scale + ox), min(y0, by0 * scale + oy)
        x1, y1 = max(x1, bx1 * scale + ox), max(y1, by1 * scale + oy)
    x0, y0, x1, y1 = np.floor(x0), np.floor(y0), np.ceil(x1), np.ceil(y1)
    out_w, out_h = round((x1 - x0) * out_scale), round((y1 - y0) * out_scale)

    result = {"x": int(x0), "y": int(y0), "width": int(x1 - x0), "height": int(y1 - y0)}
    for part, clip in (("intro", intro), ("loop", loop)):
        name = clip["name"]
        scale, ox, oy = place[name]
        out_dir = os.path.join(OUT_ROOT, name)
        shutil.rmtree(out_dir, ignore_errors=True)
        os.makedirs(out_dir)
        k = scale * out_scale
        for index, im in enumerate(frames[name]):
            small = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            canvas = Image.new("RGBA", (out_w, out_h))
            canvas.paste(small, (round((ox - x0) * out_scale), round((oy - y0) * out_scale)), small)
            canvas.save(os.path.join(out_dir, f"frame_{index:02d}.webp"), quality=90, method=6)
        fps = clip["fps"] / clip["step"]
        result[part] = {
            "dir": f"charactor/{name}",
            "frames": len(frames[name]),
            "durationMs": round(len(frames[name]) * 1000 / fps),
        }
    return result


def main():
    names = sys.argv[1:] or list(CHARACTERS)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    print(json.dumps({name: extract(CHARACTERS[name], ffmpeg) for name in names}, indent=2))


if __name__ == "__main__":
    main()
