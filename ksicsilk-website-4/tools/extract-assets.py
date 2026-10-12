"""Cut the page imagery out of the approved design comp.

Run from the ksicsilk-website-4 folder:  python3 tools/extract-assets.py
Coordinates are pixels in magnific__enhance__12606.jpg (1450 x 4340).
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "magnific__enhance__12606.jpg"
OUT = ROOT / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)

comp = Image.open(SRC).convert("RGB")


def erase(img, box, pad=4):
    """Paint over baked-in text by blending the columns either side of the box, row by row."""
    a = np.asarray(img).astype(np.float32).copy()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        left = a[y, x0 - pad:x0].mean(axis=0)
        right = a[y, x1:x1 + pad].mean(axis=0)
        t = np.linspace(0, 1, x1 - x0)[:, None]
        a[y, x0:x1] = left * (1 - t) + right * t
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def keyout(img, bg, lo=10, hi=60):
    """Turn a flat background colour transparent so line art sits on any surface."""
    a = np.asarray(img).astype(np.float32)
    bgc = np.array(bg, np.float32)
    dist = np.sqrt(((a - bgc) ** 2).sum(axis=2))
    alpha = ((dist - lo) / (hi - lo)).clip(0, 1)
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = ((a - (1 - alpha[..., None]) * bgc) / safe).clip(0, 255)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def save(img, name, q=82):
    img.save(OUT / name, "WEBP", quality=q, method=6)
    print(name, img.size)


def crop(box):
    return comp.crop(box)


# Hero visual (palace, model, silk swirls) with the overlay copy removed — it is real text on the page.
hero = erase(comp, (1236, 282, 1418, 474))
save(hero.crop((672, 175, 1450, 1008)), "hero.webp", 86)

# Shop by occasion — arch photos are AI-generated (people) or Magnific-enhanced (gifts), not cut here.

# New arrivals — product photos are AI-generated replacements (sharper than the comp), not cut here.

# Colours of heritage — swatches
for name, cx in [("royal-blues", 549), ("rich-pinks", 737), ("traditional-greens", 925),
                 ("graceful-neutrals", 1114), ("signature-reds", 1303)]:
    r = 78
    save(crop((cx - r, 2272 - r, cx + r, 2272 + r)), f"colour-{name}.webp", 85)

# Art of the weave — silk roll (right part only, the left half carries baked text)
save(crop((396, 2460, 792, 3050)), "weave.webp", 84)

# Our story — palace illustration, side copy removed
story = erase(comp, (1196, 3098, 1402, 3274))
save(story.crop((528, 3080, 1400, 3470)), "palace.webp", 84)

# Find your perfect silk — drape illustration
save(keyout(crop((480, 3484, 640, 3714)), (250, 241, 232), 14, 70), "drape.webp", 88)

# Newsletter band — silk drapes either side
save(crop((0, 3732, 440, 3944)), "band-left.webp", 82)
save(crop((1040, 3732, 1450, 3944)), "band-right.webp", 82)

# Line-art ornaments
# The hero lotus overlaps the beige circle, so key out both the page cream and the circle beige.
lotus_box = (515, 255, 635, 375)
lotus = np.asarray(keyout(crop(lotus_box), (252, 247, 238))).copy()
lotus[..., 3] = np.minimum(lotus[..., 3], np.asarray(keyout(crop(lotus_box), (249, 231, 207), 12, 50))[..., 3])
save(Image.fromarray(lotus, "RGBA"), "orn-lotus.webp", 90)
save(keyout(crop((0, 1010, 104, 1632)), (247, 244, 236), 12, 55), "orn-leaves-left.webp", 86)
save(keyout(crop((1362, 1395, 1450, 1632)), (246, 244, 238), 12, 55), "orn-leaves-right.webp", 86)
save(keyout(crop((1180, 1008, 1450, 1160)), (250, 246, 240), 12, 55), "orn-swoosh.webp", 86)
save(keyout(crop((332, 1152, 392, 1250)), (246, 244, 238), 12, 55), "orn-stem.webp", 90)
save(keyout(crop((1300, 2464, 1446, 2660)), (66, 7, 25), 14, 60), "orn-leaves-maroon.webp", 86)
