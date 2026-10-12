"""Pull every product image from ksicsilk.com, lift the subjects off their white
backgrounds and write the catalogue the home page renders from.

Run from the ksicsilk-website-5 folder (macOS only - the cut-outs use the Vision framework):

    python3 tools/build-assets.py            # scrape + download + cut out + build
    python3 tools/build-assets.py --offline  # rebuild from the files already in assets/img

Outputs
    assets/img/products/original/*.jpg   untouched product photos from the live site
    assets/img/products/cutout/*.webp    transparent cut-outs used on the page
    assets/img/designs/original|cutout   the same for each saree design (colourway)
    assets/img/site/*                    brand + lifestyle imagery
    assets/js/catalog.js                 window.KSIC_CATALOG, read by assets/js/app.js
"""
from __future__ import annotations

import html
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.ksicsilk.com"
IMG = ROOT / "assets" / "img"
PROD_ORIG, PROD_CUT = IMG / "products" / "original", IMG / "products" / "cutout"
DES_ORIG, DES_CUT = IMG / "designs" / "original", IMG / "designs" / "cutout"
SITE_DIR = IMG / "site"
SOURCE_JSON = ROOT / "tools" / "source.json"
OFFLINE = "--offline" in sys.argv

# Friendly names for the article codes used on ksicsilk.com.
SAREE_COLOURS = {
    29: "Peacock Teal", 33: "Black & Kumkum", 34: "Royal Blue", 35: "Parrot Green",
    38: "Navy with Kumkum Border", 39: "Rani Pink", 40: "Ivory with Red Border",
    42: "Kumkum Red", 43: "Magenta", 44: "Blue Zari Checks", 45: "Purple Zari Checks",
    46: "Marigold with Black Border", 47: "Ivory Gold", 48: "Rani Pink Brocade",
    49: "Midnight Navy", 51: "Slate Blue", 52: "Teal Georgette", 62: "Bottle Green Zari Checks",
    84: "Gandaberunda Navy",
}
# Colour stories used by the lookbook filters.
SAREE_TONES = {
    29: "blues", 33: "reds", 34: "blues", 35: "greens", 38: "blues", 39: "pinks", 40: "ivory",
    42: "reds", 43: "pinks", 44: "blues", 45: "blues", 46: "reds", 47: "ivory", 48: "pinks",
    49: "blues", 51: "blues", 52: "greens", 62: "greens", 84: "blues",
}
FAMILIES = {  # men's wear and gifting are listed once per colour on the live site; group them
    "shirt": dict(name="Pure Silk Shirt", category="men", ids=[58, 70, 71],
                  colours=["Turmeric Yellow", "Emerald", "Charcoal"]),
    "kurta": dict(name="Pure Silk Kurta", category="men", ids=[72, 73, 74, 75, 76],
                  colours=["Wine", "Plum", "Mint", "Blush Pink", "Bottle Green"]),
    "tie": dict(name="Pure Silk Tie", category="men", ids=[63, 66, 67, 68, 69],
                colours=["Aubergine Dot", "Crimson", "Slate Stripe", "Navy Gold Stripe", "Maroon Weave"]),
    "giftbox": dict(name="Tie & Pocket Square Gift Box", category="gifting", ids=[77, 78, 80],
                    colours=["Paisley Red", "Royal Blue", "Coral Red"]),
}


def curl(url: str, dest: Path | None = None) -> str:
    url = url.replace(" ", "%20").replace("(", "%28").replace(")", "%29")
    cmd = ["curl", "-sfL", "-A", "Mozilla/5.0", url]
    if dest:
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(cmd + ["-o", str(dest)], check=True)
        return ""
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower().replace("article", "")).strip("-")


def scrape() -> dict:
    listing = curl(f"{SITE}/product/getArticleList")
    cards = re.findall(
        r'href="(/product/(getArticle|getDetails)/(\d+))" class="product-img">\s*<img[^>]*?src="([^"]+)"'
        r'.*?class="title link">([^<]+)</a>\s*<span class="price">([^<]+)</span>', listing, re.S)
    products = []
    for link, kind, pid, img, title, price in cards:
        title = html.unescape(title).strip()
        products.append(dict(id=int(pid), kind="saree" if kind == "getArticle" else "item", link=SITE + link,
                             img=img, title=re.sub(r"\s+", " ", title), slug=f"{pid}-{slugify(title)}",
                             price=int(float(price.split()[0]))))
    designs = []
    for p in products:
        if p["kind"] != "saree":
            continue
        page = curl(p["link"])
        for did, img, name in re.findall(
                r'href="/product/getDesign/(\d+)" class="product-img">\s*<img[^>]*?src="([^"]+)"'
                r'.*?class="design">([^<]+)<', page, re.S):
            name = html.unescape(name).strip()
            if "dummy" in name.lower():
                continue
            designs.append(dict(id=int(did), article=p["id"], img=img, name=name,
                                link=f"{SITE}/product/getDesign/{did}"))
    data = dict(products=products, designs=designs)
    SOURCE_JSON.write_text(json.dumps(data, indent=1))
    return data


def download(data: dict) -> None:
    for p in data["products"]:
        curl(p["img"], PROD_ORIG / f"{p['slug']}.jpg")
    for d in data["designs"]:
        curl(d["img"], DES_ORIG / f"d{d['id']}.jpg")
    for name in ["slider3.jpg", "slider4.jpg", "Capture1.png", "Capture2.png"]:
        curl(f"{SITE}/assets/ksicimages/{name}", SITE_DIR / "source" / name)
    # Official logo + favicon, exactly as the live site serves them.
    curl(f"{SITE}/admin_assets/images/ksiclogo.png", SITE_DIR / "ksiclogo.png")
    curl(f"{SITE}/admin_assets/images/ksiclogo.ico", SITE_DIR / "favicon.ico")


def vision_cutout(files: list[Path], out: Path) -> None:
    binary = Path(tempfile.gettempdir()) / "ksic-cutout"
    if not binary.exists():
        subprocess.run(["swiftc", "-O", str(ROOT / "tools" / "cutout.swift"), "-o", str(binary)], check=True)
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run([str(binary), str(out), *map(str, files)], check=True)


def white_key(src: Path, dest: Path, tol: float = 40) -> None:
    """Fallback when Vision finds no subject: flood the white backdrop in from the borders."""
    from collections import deque
    im = Image.open(src).convert("RGB")
    dist = np.sqrt(((255 - np.asarray(im).astype(int)) ** 2).sum(2))
    h, w = dist.shape
    bg = np.zeros((h, w), bool)
    queue = deque([(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] +
                  [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)])
    while queue:
        y, x = queue.popleft()
        if bg[y, x] or dist[y, x] > tol:
            continue
        bg[y, x] = True
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx]:
                queue.append((ny, nx))
    rgba = im.convert("RGBA")
    rgba.putalpha(Image.fromarray(((~bg) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)))
    rgba.save(dest)


def finish(png: Path, dest: Path, max_h: int, pad: float = 0.02, trim: bool = True, halo: int = 0) -> Image.Image:
    """Defringe the white halo, trim to the subject and save as transparent WebP.

    halo > 0 also clears pale pixels within that many px of the edge - the lifestyle banners on
    ksicsilk.com were already composited with a white glow around the models."""
    im = Image.open(png).convert("RGBA")
    alpha = im.getchannel("A").filter(ImageFilter.MinFilter(3))
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    if halo:
        inner = np.asarray(alpha.filter(ImageFilter.MinFilter(halo * 2 + 1))) > 128
        light = rgb.max(axis=2)
        pale = (rgb.min(axis=2) > 170) & (light - rgb.min(axis=2) < 40)
        a0 = np.asarray(alpha).copy()
        a0[pale & ~inner] = 0
        alpha = Image.fromarray(a0).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MedianFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    a = np.asarray(alpha).astype(np.float32) / 255
    safe = np.maximum(a, 0.05)[..., None]
    rgb = np.where(a[..., None] < 0.98, (rgb - (1 - a[..., None]) * 255) / safe, rgb).clip(0, 255)
    out = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA")
    if trim:
        x0, y0, x1, y1 = out.getbbox()
        p = int(max(x1 - x0, y1 - y0) * pad)
        out = out.crop((max(0, x0 - p), max(0, y0 - p), min(out.width, x1 + p), min(out.height, y1 + p)))
    if out.height > max_h:
        out = out.resize((round(out.width * max_h / out.height), max_h), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "WEBP", quality=84, method=6, alpha_quality=90)
    return out


def swatch(im: Image.Image) -> str:
    """Median colour of the lower body of the garment, used for the colour dots."""
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    region = a[int(h * .55):int(h * .85), int(w * .25):int(w * .75)].reshape(-1, 4)
    region = region[region[:, 3] > 240][:, :3]
    if not len(region):
        region = a.reshape(-1, 4)[a.reshape(-1, 4)[:, 3] > 240][:, :3]
    r, g, b = np.median(region, axis=0).astype(int)
    return f"#{r:02x}{g:02x}{b:02x}"


def build() -> None:
    data = json.loads(SOURCE_JSON.read_text()) if OFFLINE else scrape()
    if not OFFLINE:
        download(data)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        vision_cutout(sorted(PROD_ORIG.glob("*.jpg")), tmp / "p")
        vision_cutout(sorted(DES_ORIG.glob("*.jpg")), tmp / "d")
        src = SITE_DIR / "source"
        vision_cutout([src / "slider3.jpg", src / "slider4.jpg", src / "Capture1.png", src / "Capture2.png"], tmp / "s")

        colours = {}
        for jpg in sorted(PROD_ORIG.glob("*.jpg")):
            png = tmp / "p" / f"{jpg.stem}.png"
            if not png.exists():
                white_key(jpg, png)
            colours[jpg.stem] = swatch(finish(png, PROD_CUT / f"{jpg.stem}.webp", 1100))
        for jpg in sorted(DES_ORIG.glob("*.jpg")):
            png = tmp / "d" / f"{jpg.stem}.png"
            if not png.exists():
                white_key(jpg, png)
            colours[jpg.stem] = swatch(finish(png, DES_CUT / f"{jpg.stem}.webp", 1100))
        finish(tmp / "s" / "slider3.png", SITE_DIR / "model-zari.webp", 1400, halo=6)
        finish(tmp / "s" / "slider4.png", SITE_DIR / "models-group.webp", 1400, halo=5)
        finish(tmp / "s" / "Capture1.png", SITE_DIR / "model-namaste.webp", 1400)
        finish(tmp / "s" / "Capture2.png", SITE_DIR / "model-ivory.webp", 1400)

    # Fabric close-ups cropped from the hero photograph for the craft section.
    hero = Image.open(SITE_DIR / "source" / "slider3.jpg").convert("RGB")
    hero.crop((1310, 200, 1625, 683)).save(SITE_DIR / "pallu-zari.webp", "WEBP", quality=86)
    hero.crop((900, 385, 1150, 625)).save(SITE_DIR / "brocade.webp", "WEBP", quality=86)

    catalog = []
    designs_by_article: dict[int, list] = {}
    for d in data["designs"]:
        designs_by_article.setdefault(d["article"], []).append(d)
    by_id = {p["id"]: p for p in data["products"]}
    grouped = {i for f in FAMILIES.values() for i in f["ids"]}

    for p in data["products"]:
        if p["kind"] != "saree":
            continue
        code = re.sub(r"^Article\s*", "", p["title"]).replace("(Georgette Saree )", "").replace("(Gandaberunda)", "").strip()
        variants = [dict(label=d["name"], img=f"assets/img/designs/cutout/d{d['id']}.webp",
                         photo=f"assets/img/designs/original/d{d['id']}.jpg", swatch=colours[f"d{d['id']}"],
                         link=d["link"]) for d in designs_by_article.get(p["id"], [])]
        catalog.append(dict(
            id=f"saree-{p['id']}", category="sarees", tone=SAREE_TONES.get(p["id"], "reds"),
            name=("Pure Silk Georgette Saree" if p["id"] == 52 else "Pure Mysore Silk Saree"),
            colour=SAREE_COLOURS.get(p["id"], ""), code=f"Art. {code}", price=p["price"], link=p["link"],
            img=f"assets/img/products/cutout/{p['slug']}.webp", photo=f"assets/img/products/original/{p['slug']}.jpg",
            swatch=colours[p["slug"]], variants=variants))

    for key, fam in FAMILIES.items():
        items = [by_id[i] for i in fam["ids"] if i in by_id]
        first = items[0]
        catalog.append(dict(
            id=key, category=fam["category"], tone="", name=fam["name"], colour=fam["colours"][0],
            code=f"{len(items)} colours", price=first["price"], link=first["link"],
            img=f"assets/img/products/cutout/{first['slug']}.webp", photo=f"assets/img/products/original/{first['slug']}.jpg",
            swatch=colours[first["slug"]],
            variants=[dict(label=c, img=f"assets/img/products/cutout/{it['slug']}.webp",
                           photo=f"assets/img/products/original/{it['slug']}.jpg",
                           swatch=colours[it["slug"]], link=it["link"]) for it, c in zip(items, fam["colours"])]))

    leftovers = [p for p in data["products"] if p["kind"] != "saree" and p["id"] not in grouped]
    if leftovers:
        print("warning: products not in a family:", [p["title"] for p in leftovers])

    js = ROOT / "assets" / "js" / "catalog.js"
    js.parent.mkdir(parents=True, exist_ok=True)
    js.write_text("// Generated by tools/build-assets.py from ksicsilk.com - do not edit by hand.\n"
                  f"window.KSIC_CATALOG = {json.dumps(catalog, indent=1, ensure_ascii=False)};\n")
    print(f"catalog: {len(catalog)} products, {sum(len(c['variants']) for c in catalog)} colourways")


if __name__ == "__main__":
    build()
