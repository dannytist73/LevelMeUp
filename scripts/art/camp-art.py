"""Grumble Camp's camp (docs/2026-10-26-simpler-day.md, decision 12): one clay painting per stage, painted EMPTY in the
owner's local ComfyUI. The app stands your buddy, your friends and this week's visitor on it (apps/mobile/src/art/camp.ts
names their spots), so they stay alive. Z-Image Turbo, as grumble-art.py.

Start ComfyUI first (as scripts/art/story-art.py says), and run with its Python (PIL, numpy and scipy):
  D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe scripts/art/camp-art.py paint [STAGE ...] [--seeds 11 22 33]
    -> art/camp/renders/<stage>-<seed>.png
  camp-art.py sheet       -> art/camp/renders/_sheet.jpg (every take, for the owner to pick)
  camp-art.py pick        -> apps/mobile/assets/camp/<stage>.webp from PICKS: cropped to the island, the backdrop cut away
                             so the app's own night shows through (any look)
Existing renders are skipped, so a changed prompt needs new seeds (or the old renders deleted).
"""
import argparse, importlib.util, shutil, time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

_spec = importlib.util.spec_from_file_location("grumble_art", Path(__file__).with_name("grumble-art.py"))
ga = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ga)

ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "art" / "camp" / "renders"
ASSETS = ROOT / "apps" / "mobile" / "assets" / "camp"

STYLE = ("a tiny cozy 3D diorama made of glossy soft vinyl and smooth clay, soft subsurface glow, gentle rim light, three-quarter "
         "view from slightly above, miniature toy photography")
FIRE = "soft pink and pale blue flames, no orange flames, no yellow flames"
ROOM = ("the campfire sits in the front middle of the island with a wide ring of open empty grass all around it, room for "
        "little friends to sit")
NOBODY = "no characters, no mascot, no animals, no creatures, no people"
DARK = "isolated on a plain smooth dark navy blue background, soft studio light, no text, no letters, no logo, no watermark"

# The three stages, by friends made: first nights (0 to 2), the cabin (3 to 9), the lodge (10 or more).
STAGES = {
    "first": ("a small cozy campsite at night on a round floating island of soft green clay grass with a brown clay underside: "
              "one small lilac tent at the back left, a little campfire of logs with {fire}, one short log bench, a tiny "
              "wooden signpost at the front right edge, two small bushes, a few tiny yellow stars above"),
    "cabin": ("a cozy camp at night on a wide round floating island of soft green clay grass with a brown clay underside: a "
              "small wooden cabin with warm glowing windows at the back, a string of little round lights between two poles, a "
              "round stone fire pit with {fire}, two log benches, little mushrooms and round bushes, one round clay tree"),
    "lodge": ("a big cozy camp at night on a large round floating island of soft green clay grass with a brown clay underside: "
              "a wooden lodge with glowing windows and a little lantern tower at the back, a small vegetable garden, strings of "
              "little round lights, a big round stone fire pit with {fire}, log benches in a circle, round clay trees at the "
              "edges, a tiny pond"),
}

# Filled in after the owner picks: stage -> the render whose painting ships.
PICKS = {"first": "first-22", "cabin": "cabin-22", "lodge": "lodge-22"}
# The island's box in a 1024 render (the app's spots are fractions of it).
CROP = (60, 140, 964, 880)


def paint(stages: list[str], seeds: list[int]) -> None:
    RENDERS.mkdir(parents=True, exist_ok=True)
    for stage in stages:
        for seed in seeds:
            dest = RENDERS / f"{stage}-{seed}.png"
            if dest.exists():
                continue
            t = time.time()
            prompt = f"{STYLE}. {STAGES[stage].format(fire=FIRE)}, {ROOM}, {NOBODY}. {DARK}"
            ga.fetch(ga.run(ga.zimage(prompt, seed, f"lmu/camp-{dest.stem}"))[0], dest)
            print(f"{dest.name} ({time.time() - t:.0f} s)", flush=True)


def sheet() -> None:
    files = sorted(f for f in RENDERS.glob("*.png") if not f.name.startswith("_"))
    cols, w = 3, 400
    rows = (len(files) + cols - 1) // cols
    out = Image.new("RGB", (cols * w, rows * w), (25, 27, 51))
    draw = ImageDraw.Draw(out)
    for i, f in enumerate(files):
        x, y = (i % cols) * w, (i // cols) * w
        out.paste(Image.open(f).convert("RGB").resize((w, w)), (x, y))
        draw.text((x + 8, y + 8), f.stem, fill=(255, 255, 255))
    dest = RENDERS / "_sheet.jpg"
    out.save(dest, quality=85)
    print(dest)


def cut(src: Path) -> Image.Image:
    """The island on transparency: the navy backdrop is whatever bluish dark region touches the edge, so the tent's
    shadows and the night inside the scene stay; stars over the backdrop stay too. The edge is feathered a little."""
    im = Image.open(src).convert("RGB").crop(CROP)
    rgb = np.asarray(im).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    navy = (b > r + 12) & (b > g + 6) & ((r + g + b) < 300)
    labels, _ = ndimage.label(navy)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    backdrop = np.isin(labels, edge[edge != 0])
    alpha = Image.fromarray(np.where(backdrop, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def pick() -> None:
    missing = [stem for stem in PICKS.values() if not (RENDERS / f"{stem}.png").exists()]
    if missing:  # check everything before writing anything
        raise SystemExit(f"missing renders: {', '.join(missing)}")
    new = ASSETS.with_name(ASSETS.name + ".new")
    shutil.rmtree(new, ignore_errors=True)
    new.mkdir(parents=True)
    for stage, stem in PICKS.items():
        cut(RENDERS / f"{stem}.png").save(new / f"{stage}.webp", quality=88, method=6)
    shutil.rmtree(ASSETS, ignore_errors=True)
    new.rename(ASSETS)
    total = sum(f.stat().st_size for f in ASSETS.glob("*.webp"))
    print(f"{len(PICKS)} camps, {total // 1024} KB in {ASSETS}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("paint")
    s.add_argument("stages", nargs="*", help=f"any of {', '.join(STAGES)} (all when none)")
    s.add_argument("--seeds", type=int, nargs="+", default=[11, 22, 33])
    sub.add_parser("sheet")
    sub.add_parser("pick")
    a = p.parse_args()
    if a.cmd == "paint":
        unknown = [s for s in a.stages if s not in STAGES]
        if unknown:
            p.error(f"unknown stage: {', '.join(unknown)}")
        paint(a.stages or list(STAGES), a.seeds)
    elif a.cmd == "sheet":
        sheet()
    else:
        pick()


if __name__ == "__main__":
    main()
