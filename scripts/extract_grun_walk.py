"""Extracts the walk cycle frames from the Kling-made grun_t.gif.

Every 3rd frame is kept (86 -> 29 frames), the static "KlingAI" watermark is erased and each
frame is cropped to the figure's area of the logical 1000x1080 frame.

Run:  python3 scripts/extract_grun_walk.py
"""
import os
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public/scene1/_unused/grun_t.gif")
OUT_DIR = os.path.join(ROOT, "public/scene1/character/grun_walk")

STEP = 3
WATERMARK = (796, 981, 984, 1028)  # x0, y0, x1, y1 in the 1000x1080 frame
CROP = (110, 20, 850, 1050)


def main():
    gif = Image.open(SRC)
    shutil.rmtree(OUT_DIR, ignore_errors=True)
    os.makedirs(OUT_DIR)
    count = 0
    for index in range(0, gif.n_frames, STEP):
        gif.seek(index)
        frame = gif.convert("RGBA")
        frame.paste((0, 0, 0, 0), WATERMARK)
        frame.crop(CROP).save(os.path.join(OUT_DIR, f"frame_{count:02d}.png"), optimize=True)
        count += 1
    print("frames", count)


if __name__ == "__main__":
    main()
