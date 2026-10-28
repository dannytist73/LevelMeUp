"""The base app's story pictures (2026-10-28): the same covers and card moments as the clay set (story-art.py's SCENES and
BEATS, the same regulars from CAST), drawn again in a style that sits with the Graphite look, with no monsters. Rendered
with Z-Image Turbo in the owner's local ComfyUI and bundled into the app (apps/mobile/assets/stories, src/base/storyArt.ts).

Start ComfyUI first (Windows Application Control blocks torchaudio, so use the no-audio starter):
  Start-Process D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe run_noaudio.py -WorkingDirectory D:\\ai\\ComfyUI

usage (with D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe):
  base-story-art.py render [ARTICLE[:CARD] ...] [--seeds 11]
                                                      -> art/story/<STYLE>-renders/<article>-<seed>.png and
                                                         <article>-b<card>-<seed>.png (every story when none given;
                                                         CARD 0 is the cover)
  base-story-art.py sheet [ARTICLE ...]                -> art/story/<STYLE>-renders/_sheet-<article>.jpg (cover + cards)
  base-story-art.py pick                               -> art/story/<STYLE>/<article>.webp and <article>-<card>.webp
  base-story-art.py app                                -> the picked set into apps/mobile/assets/stories, and storyArt.ts
Existing renders are skipped, so a changed prompt needs new seeds (or the old renders deleted).
"""
import argparse, importlib.util, shutil, sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("story_art", Path(__file__).with_name("story-art.py"))
sa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sa)

# Picked 2026-10-28 from five candidates (pencil, gouache, ink, risograph, photo) on the same three covers: the Graphite
# greys with its cobalt, mid-tone backgrounds that sit on both looks, and shapes that still read at phone size.
STYLE_NAME = "gouache"
STYLE = ("a calm modern editorial illustration painted in flat gouache, a muted palette of slate grey, charcoal and soft "
         "off-white with a few cobalt blue accents, subtle paper grain, simple shapes, realistic adult proportions, soft "
         "diffused light, an uncluttered background; no text, no letters, no numbers, no logo, no signature, no watermark")
FRAME = "medium wide shot, one person, the face clearly visible, quiet everyday moment"
RENDERS = sa.ROOT / "art" / "story" / f"{STYLE_NAME}-renders"
OUT = sa.ROOT / "art" / "story" / STYLE_NAME
APP = sa.ROOT / "apps" / "mobile"
ASSETS = APP / "assets" / "stories"

# A render other than seed 11, picked from the sheets: "<article>" for the cover, "<article>-b<card>" for a card.
PICKS: dict[str, int] = {"article-20-b1": 33, "article-55-b1": 55, "article-55-b2": 55, "article-56-b2": 22,
                         "article-122-b3": 22}  # picked 2026-10-28: a smudged beard, a hidden face, branded-looking shoes
#                                                 and a doubled person were drawn again

# A card's moment said again where the clay wording drew a hidden face, tangled hands or branded-looking shoes.
SCENE_FIX: dict[str, str] = {
    "article-55-b1": "sitting back on a couch in the evening, tired, eyes closed, one hand resting on his lower back, his face "
                     "turned towards us, wearing a navy bus driver's uniform shirt",
    "article-55-b2": "sitting on a couch frowning at a pair of plain solid grey sneakers on the floor, "
                     "wearing a navy bus driver's uniform shirt",
    "article-56-b2": "by the front door of a house looking sheepishly at a pair of plain grey running shoes with no logo or "
                     "stripes sitting unused, wearing a casual shirt",
}


def prompt(who: str, scene: str) -> str:
    return f"{STYLE}. {FRAME}. {sa.CAST[who]}, {scene}"


def render(article: str, beat: int, seed: int) -> Path:
    """The cover (beat 0) or card BEAT (from 1) of ARTICLE; a card is in the clothes of the cover unless it says otherwise."""
    who, scene = sa.SCENES[article]
    name = article if beat == 0 else f"{article}-b{beat}"
    dest = RENDERS / f"{name}-{seed}.png"
    if dest.exists():
        return dest
    if beat > 0:
        scene = SCENE_FIX.get(name) or sa.BEATS[article][beat - 1]
        assert scene is not None, f"{article} card {beat} is the cover's"
        if "wearing" not in scene:
            scene += f", wearing {sa.wear(article)}"
    return sa.queue_and_fetch(sa.workflow(prompt(who, scene), seed, f"lmu/{STYLE_NAME}-{dest.stem}"), dest)


def shots(article: str) -> list[int]:
    """The cover (0) and every card with its own moment."""
    return [0] + [b for b in range(1, len(sa.BEATS[article]) + 1) if sa.BEATS[article][b - 1] is not None]


def picked(article: str, beat: int) -> Path:
    name = article if beat == 0 else f"{article}-b{beat}"
    return RENDERS / f"{name}-{PICKS.get(name, 11)}.png"


def sheet(articles: list[str]) -> None:
    for article in articles:
        files = [p for b in shots(article) if (p := picked(article, b)).exists()]
        sa.contact(files, RENDERS / f"_sheet-{article}.jpg", (480, 274), 3)


def pick() -> None:
    missing = [p.name for a in sa.SCENES for b in shots(a) if not (p := picked(a, b)).exists()]
    if missing:
        sys.exit(f"missing renders: {', '.join(missing)}")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("article-*.webp"):
        old.unlink()
    for article in sa.SCENES:
        sa.webp(picked(article, 0), OUT / f"{article}.webp")
        for beat in range(1, len(sa.BEATS[article]) + 1):
            dest = OUT / f"{article}-{beat}.webp"
            if sa.BEATS[article][beat - 1] is None:
                shutil.copyfile(OUT / f"{article}.webp", dest)
            else:
                sa.webp(picked(article, beat), dest)
    print(f"{len(list(OUT.glob('article-*.webp')))} pictures in {OUT}")


def app() -> None:
    """The picked set into the app: the same file names, so only the pictures and storyArt.ts's note change."""
    files = sorted(OUT.glob("article-*.webp"))
    if not files:
        sys.exit("run pick first")
    for old in ASSETS.glob("article-*.webp"):
        old.unlink()
    for f in files:
        shutil.copyfile(f, ASSETS / f.name)
    req = lambda name: f"require('../../assets/stories/{name}.webp')"
    lines = [
        f"// The first books' pictures (the gouache story art, art/story/{STYLE_NAME}), bundled so chapters show them",
        "// offline: each chapter's cover and one picture per story card. Generated by scripts/art/base-story-art.py (app).",
        "",
        "export const STORY_ART: Readonly<Record<string, { cover: number | null; cards: readonly (number | null)[] }>> = {",
    ]
    for article in sorted(sa.SCENES):
        cards = ", ".join(req(f"{article}-{b}") for b in range(1, len(sa.BEATS[article]) + 1))
        lines.append(f'  "{article}": {{ cover: {req(article)}, cards: [{cards}] }},')
    lines.append("};")
    (APP / "src" / "base" / "storyArt.ts").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(files)} pictures in {ASSETS}; storyArt.ts written")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["render", "sheet", "pick", "app"])
    ap.add_argument("articles", nargs="*")
    ap.add_argument("--seeds", type=int, nargs="+", default=[11])
    a = ap.parse_args()
    articles = a.articles or list(sa.SCENES)
    if a.cmd == "render":
        for target in articles:
            article, _, card = target.partition(":")
            for beat in ([int(card)] if card else shots(article)):
                for seed in a.seeds:
                    print(render(article, beat, seed).name, flush=True)
    elif a.cmd == "sheet":
        sheet(articles)
    elif a.cmd == "pick":
        pick()
    else:
        app()


main()
