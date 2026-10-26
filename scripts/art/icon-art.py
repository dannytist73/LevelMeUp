"""Grumble Camp's app icon (the owner, 2026-10-27: "a dynamic app logo, something that can scream about our app").

The subject is painted in the owner's local ComfyUI in the app's clay look and keyed out, then laid on a background drawn
here in the app's own colours. Android gets an adaptive icon from the same pieces: the subject as the front layer, the
background as the back layer (launchers that support it move them a little apart), and a one-colour silhouette for themed
icons (Android 13+).

Start ComfyUI first (as scripts/art/story-art.py says), and run with its Python (PIL, numpy and scipy):
  D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe scripts/art/icon-art.py paint [CONCEPT ...] [--seeds 11 22]
    -> art/icon/renders/<concept>-<seed>.png
  icon-art.py sheet       -> art/icon/_sheet.jpg: every take keyed and laid on its background, as a launcher shows it
                             (a circle and a rounded square, at 192, 96 and 48 px)
  icon-art.py pick        -> apps/mobile/assets/icon.png, android-icon-{foreground,background,monochrome}.png,
                             splash-icon.png and favicon.png from PICK
Existing renders are skipped, so a changed prompt needs new seeds (or the old renders deleted).
"""
import argparse, importlib.util, time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

_spec = importlib.util.spec_from_file_location("grumble_art", Path(__file__).with_name("grumble-art.py"))
ga = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ga)

ROOT = Path(__file__).resolve().parents[2]
ICON = ROOT / "art" / "icon"
RENDERS = ICON / "renders"
ASSETS = ROOT / "apps" / "mobile" / "assets"

# The app's colours (apps/mobile/src/theme/tokens.ts, Monster Night).
NIGHT = (25, 27, 51)
VOID = (7, 8, 15)
LIME = (182, 240, 74)
CANDY = (255, 122, 217)
LILAC = (150, 120, 230)

CLAY = ga.LOOKS["clay"]
FIRE = "soft pink and pale blue flames, no orange flames, no yellow flames"
SNOOZLE = ga.RENDERS / "snoozle-black-11.png"
KEEP = "Keep the character exactly the same: the same face, shape, colours and nightcap. A plain flat solid pure black background."

# Each concept: how it's painted (Z-Image on the green screen, or Qwen-Image-Edit from Snoozle's own still so he stays on
# model) and the background it's laid on.
CONCEPTS = {
    # The game's promise in one picture: a Grumble brings you today's quest.
    "peek": ("qwen", ("Show the character from the chest up, big and close, filling most of the picture, leaning in with a big "
                      "excited hopeful smile and wide shiny eyes, holding up a small rolled paper scroll tied with a lime green "
                      f"ribbon in both little paws. {KEEP}"), "lime"),
    # Camp and Grumble together.
    "fireside": ("qwen", ("Make the character sit happily right beside a small cozy clay campfire of little logs with "
                          f"{FIRE}, toasting a marshmallow on a stick, a soft pink glow on its face, both filling the picture. {KEEP}"),
                 "night"),
    # The camp's fire as the mascot.
    "flame": ("zimage", (f"{CLAY}. A cute chubby campfire character: a small pile of three rounded brown clay logs with one big "
                         "soft rounded flame on top in candy pink fading to pale blue at the tips, the flame has two big shiny "
                         "black eyes and a wide happy open smile with a tiny tongue, little pink sparks around it, bold simple "
                         f"shape, front view. {ga.BACKDROP}"), "night"),
    # The camp at night, someone peeking out.
    "tent": ("zimage", (f"{CLAY}. A chunky little lilac clay camping tent glowing softly pink from inside, two big round cute "
                        "white eyes with black pupils peeking out of the dark open tent door, a tiny campfire with "
                        f"{FIRE} in front of it, bold simple shape, front view. {ga.BACKDROP}"), "night"),
    # A letter mark, for comparison.
    "letter": ("zimage", (f"{CLAY}. A single chunky bubbly rounded capital letter G made of glossy lime green clay, a small soft "
                          "candy pink flame burning on its top end, two tiny cute eyes on the letter, bold simple shape, front "
                          "view, isolated on a perfectly flat solid pure black background, no other letters, no text, no "
                          "watermark"), "night"),
}

# The owner picked A (2026-10-27): Snoozle holding out today's quest, on lime. BACKS: a background other than the concept's.
PICK = "peek-22"
BACKS: dict[str, str] = {}


def paint(concepts: list[str], seeds: list[int]) -> None:
    RENDERS.mkdir(parents=True, exist_ok=True)
    source = None
    for name in concepts:
        how, prompt, _ = CONCEPTS[name]
        for seed in seeds:
            dest = RENDERS / f"{name}-{seed}.png"
            if dest.exists():
                continue
            t = time.time()
            if how == "qwen":
                source = source or ga.upload(SNOOZLE)
                wf = ga.qwen_edit(source, prompt, seed, f"lmu/icon-{dest.stem}")
            else:
                wf = ga.zimage(prompt, seed, f"lmu/icon-{dest.stem}")
            ga.fetch(ga.run(wf)[0], dest)
            print(f"{dest.name} ({time.time() - t:.0f} s)", flush=True)


def bleeds(stem: str) -> bool:
    """A take that runs off the bottom of its picture: it runs off the bottom of the icon too."""
    return stem.startswith("peek")


def key_from_top(src: Path, dest: Path) -> None:
    """A still on black whose subject runs off the bottom: the black is measured on the top and the upper sides only (the
    shared `key` reads every edge, and the body along the bottom made it read the whole picture as backdrop)."""
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    bright = rgb.max(axis=2)
    h = bright.shape[0]
    edge = np.concatenate([bright[:12].ravel(), bright[: h // 2, :12].ravel(), bright[: h // 2, -12:].ravel()])
    alpha = np.clip((bright - float(np.percentile(edge, 99)) - 4.0) / 40.0, 0.0, 1.0)
    alpha = np.where(ndimage.binary_fill_holes(alpha > 0.5), np.maximum(alpha, 1.0), alpha)
    fg = np.where(alpha[..., None] > 0, rgb / np.maximum(alpha, 1e-3)[..., None], 0.0)
    img = Image.fromarray(np.dstack([fg, alpha[..., None] * 255.0]).clip(0, 255).astype(np.uint8), "RGBA")
    l, t, r, _ = Image.fromarray((alpha > 0.5).astype(np.uint8) * 255).getbbox()
    img = img.crop((l, t, r, img.height))
    side = max(img.width, img.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - img.width) // 2, side - img.height))
    dest.parent.mkdir(parents=True, exist_ok=True)
    square.resize((1024, 1024), Image.LANCZOS).save(dest)


def subject(stem: str) -> Image.Image:
    """The take keyed out and trimmed to the subject, squared, 1024 px."""
    out = ICON / "keyed" / f"{stem}.png"
    if not out.exists() and bleeds(stem):
        key_from_top(RENDERS / f"{stem}.png", out)
    if not out.exists():
        ga.key(RENDERS / f"{stem}.png", out, size=1024)
        # A floor shadow keyed out as a loose blob under the subject: only the subject's own pieces stay.
        img = Image.open(out).convert("RGBA")
        a = np.asarray(img).copy()
        parts, n = ndimage.label(a[..., 3] > 24)
        if n > 1:
            sizes = ndimage.sum(np.ones_like(parts), parts, np.arange(1, n + 1))
            keep = np.concatenate([[False], sizes >= sizes.max() * 0.03])
            a[..., 3] = np.where(keep[parts] | (parts == 0), a[..., 3], 0)
            Image.fromarray(a, "RGBA").save(out)
    return Image.open(out).convert("RGBA")


def background(kind: str, size: int = 1024) -> Image.Image:
    """The back layer: a glow from the middle, in the app's colours, so the subject pops at any size."""
    inner, outer = {"lime": (LIME, (96, 170, 40)), "night": ((70, 52, 120), NIGHT)}[kind]
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    d = np.clip(np.hypot(x - size / 2, y - size * 0.46) / (size * 0.62), 0, 1)[..., None]
    rgb = np.array(inner, np.float32) * (1 - d) + np.array(outer, np.float32) * d
    img = Image.fromarray(rgb.astype(np.uint8), "RGB").convert("RGBA")
    if kind == "night":
        # A soft candy glow behind the subject, like the camp's fire.
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse([size * 0.2, size * 0.24, size * 0.8, size * 0.84], fill=CANDY + (110,))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * 0.09)))
    return img


def foreground(stem: str, size: int = 1024, scale: float = 0.62, adaptive: bool = True) -> Image.Image:
    """The front layer: the subject inside Android's safe zone (66 of 108 dp, about 61%), centred. A subject that runs off
    the bottom: in the adaptive layer (a launcher shows its middle 72 of 108 dp) its hat to its scroll fill that middle and
    its cut edge stays below it; in the whole icon it stands on the bottom edge."""
    s = subject(stem)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if bleeds(stem):
        side, top = (int(size * 0.62), int(size * 0.22)) if adaptive else (int(size * scale), size - int(size * scale))
        s = s.resize((side, side), Image.LANCZOS)
        layer.alpha_composite(s, ((size - side) // 2, top))
        if adaptive:
            # The body's cut edge sits just under what a launcher shows: its last row carries on to the layer's bottom, so a
            # launcher that shifts the layers never shows a flat cut.
            last = s.crop((0, side - 1, side, side))
            for y in range(top + side, size):
                layer.alpha_composite(last, ((size - side) // 2, y))
        return layer
    side = int(size * scale)
    s = s.resize((side, side), Image.LANCZOS)
    layer.alpha_composite(s, ((size - side) // 2, (size - side) // 2))
    return layer


def full(stem: str, size: int = 1024, scale: float = 0.8, kind: str | None = None) -> Image.Image:
    """The whole icon, as a store listing or an older launcher shows it."""
    kind = kind or BACKS.get(stem) or CONCEPTS[stem.rsplit("-", 1)[0]][2]
    img = background(kind, size)
    img.alpha_composite(foreground(stem, size, scale, adaptive=False))
    return img


def masked(img: Image.Image, shape: str, size: int) -> Image.Image:
    small = img.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    d = ImageDraw.Draw(mask)
    if shape == "circle":
        d.ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=size * 4 * 0.24, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(small, (0, 0), mask.resize((size, size), Image.LANCZOS))
    return out


def sheet(kind: str | None = None) -> None:
    """Every take as a launcher shows it: a circle at 192 px, a rounded square at 192, then 96 and 48 (the real size); on
    each concept's own background, or on `kind` for all."""
    stems = sorted(p.stem for p in RENDERS.glob("*.png"))
    row_h, pad = 220, 18
    w = pad + (192 + pad) * 2 + (96 + pad) + (48 + pad) + 260
    img = Image.new("RGB", (w, pad + row_h * len(stems)), (38, 40, 62))
    d = ImageDraw.Draw(img)
    for i, stem in enumerate(stems):
        y = pad + i * row_h
        icon = full(stem, 1024, 0.8, kind)
        x = pad
        for shape, size in [("circle", 192), ("square", 192), ("circle", 96), ("circle", 48)]:
            m = masked(icon, shape, size)
            img.paste(m, (x, y + (192 - size) // 2), m)
            x += size + pad
        d.text((x + 8, y + 86), stem, fill=(235, 235, 245))
    out = ICON / (f"_sheet-{kind}.jpg" if kind else "_sheet.jpg")
    img.save(out, quality=90)
    print(out)


def pick() -> None:
    stem = PICK
    fg = foreground(stem)
    fg.save(ASSETS / "android-icon-foreground.png")
    background(BACKS.get(stem) or CONCEPTS[stem.rsplit("-", 1)[0]][2]).convert("RGB").save(ASSETS / "android-icon-background.png")
    # Themed icons: Android tints this one colour; only its shape counts.
    alpha = np.asarray(fg)[..., 3]
    mono = np.zeros((*alpha.shape, 4), np.uint8)
    mono[..., :3] = 255
    mono[..., 3] = np.where(alpha > 128, 255, 0)
    Image.fromarray(mono, "RGBA").save(ASSETS / "android-icon-monochrome.png")
    full(stem).convert("RGB").save(ASSETS / "icon.png")
    # The splash shows the whole icon, rounded like a launcher's, so a subject that runs off the bottom isn't cut loose.
    masked(full(stem), "square", 512).save(ASSETS / "splash-icon.png")
    full(stem, 48).save(ASSETS / "favicon.png")
    print(f"icon assets from {stem}")


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    pa = sub.add_parser("paint")
    pa.add_argument("concepts", nargs="*")
    pa.add_argument("--seeds", type=int, nargs="+", default=[11, 22])
    sh = sub.add_parser("sheet")
    sh.add_argument("--bg", choices=["lime", "night"])
    sub.add_parser("pick")
    a = p.parse_args()
    if a.cmd == "paint":
        paint(a.concepts or list(CONCEPTS), a.seeds)
    elif a.cmd == "sheet":
        sheet(a.bg)
    else:
        pick()


if __name__ == "__main__":
    main()
