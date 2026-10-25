"""Monster Buddy's buddies (docs/2026-10-25-monster-buddy.md), painted like the Grumbles in the owner's local ComfyUI, with
scripts/art/grumble-art.py's helpers and clay look. One buddy per class, in three sizes (little, grown, grand), each as
five stills the app brings to life: idle, blink, happy, throw and sleep. And the buddy doing each kind of quest.

Start ComfyUI first (scripts/art/story-art.py says how), and run with its Python:
  D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe scripts/art/buddy-art.py paint [CLASS ...]  -> art/buddies/renders/<class>-1-green.png
  buddy-art.py grow [CLASS ...]     -> <class>-2-green.png from -1, -3 from -2 (Qwen-Image-Edit, so it stays itself)
  buddy-art.py black [CLASS ...]    -> <class>-<size>.png: each size on black, without the green screen's light (a white
                                       seal's chin keys out with it otherwise; grumble-art.py BLACK)
  buddy-art.py poses [CLASS ...]    -> <class>-<size>-<pose>.png (blink, happy, throw, sleep) for each size, on black
  buddy-art.py quests [CLASS ...]   -> <class>-1-q-<key>.png, the little buddy doing each kind of quest
  buddy-art.py pick                 -> apps/mobile/assets/buddies/*.webp and apps/mobile/src/art/buddies.ts (the manifest)
Existing renders are skipped, so a changed instruction needs the old render deleted.
"""
import argparse, importlib.util, shutil, time
from pathlib import Path

_spec = importlib.util.spec_from_file_location("grumble_art", Path(__file__).with_name("grumble-art.py"))
ga = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ga)

ROOT = ga.ROOT
RENDERS = ROOT / "art" / "buddies" / "renders"
ASSETS = ROOT / "apps" / "mobile" / "assets" / "buddies"
MANIFEST = ROOT / "apps" / "mobile" / "src" / "art" / "buddies.ts"
CLASSES = ["warrior", "mage", "rogue", "monk"]
SIZES = [1, 2, 3]
STILLS = ["idle", "blink", "happy", "throw", "sleep"]
KEEP = "The same character, the same colours and accessories, the same plain background."

# Each buddy's one description and seed (the owner saw these on the canvas), what it gains as it grows, and its shot.
BUDDIES = {
    "warrior": dict(seed=11, look=("a chubby little baby dragon monster with soft candy pink skin, tiny stubby wings, a little red "
                                   "cloth headband, small bandaged paws held up like a boxer, a brave grin with one tiny fang"),
                    grown="small rounded pink shoulder guards and slightly bigger wings",
                    grand="its wings spread wide and a short flowing candy pink cape",
                    keep="its friendly face, its colours and its red headband", ball="a glowing pink sparkle ball"),
    "mage": dict(seed=22, look=("a small round fox spirit monster with deep blue-violet fur, a big fluffy tail tipped with a glowing "
                                "pale star, a tiny pointed wizard hood, big sparkly starry eyes"),
                 grown="a longer wizard hood with a little star pin and a small star charm on a string",
                 grand="a flowing violet cape dotted with tiny stars and a bigger star on its tail",
                 keep="its friendly face, its colours, its hood and its star-tipped tail", ball="a glowing pale blue star"),
    "rogue": dict(seed=11, look=("a sleek little cat monster with dark navy fur, a soft cyan bandana mask over its eyes, a long "
                                 "fluffy tail, big glowing cyan eyes, a sneaky playful smile"),
                  grown="a short navy cloak and a little belt with tiny pouches",
                  grand="a flowing dark navy cape with a cyan lining and a cyan scarf",
                  keep="its friendly face, its colours and its cyan mask", ball="a glowing cyan sparkle"),
    "monk": dict(seed=22, look=("a calm round snow-white seal pup monster wearing a tiny lilac wrap robe and wooden prayer beads, "
                                "serene closed eyes, a peaceful smile"),
                 grown="a longer lilac robe with a wide cloth sash and bigger prayer beads",
                 grand="a flowing lilac and cream robe, a lilac halo ring behind its head and a few floating petals",
                 keep="it as a round white seal pup with no ears and a small black nose, its white fur and its prayer beads",
                 ball="a glowing lilac sparkle ball"),
}

POSES = {
    "blink": "Make its eyes fully closed in a calm blink. Keep everything else exactly the same: the same character, the same pose, the same colours, the same plain background.",
    "happy": "Make it beam with joy: eyes closed in happy arcs, a big open smile, both little arms raised in cheer. " + KEEP,
    "throw": "Make it throw {ball} forward with one paw, leaning into the throw, an excited open-mouth grin. " + KEEP,
    "sleep": "Make it fast asleep, curled up cozily with its eyes closed and a peaceful smile. " + KEEP,
}

# What the buddy does for each kind of quest (packages/content/src/art.ts ART_KEYS).
QUESTS = {
    "article": "sit reading a small open book that glows softly",
    "core-dead-bug": "lie on its back on a small mat with both arms reaching straight up and both legs lifted, like the dead bug exercise",
    "dawn-ritual": "stretch both arms up high with a big happy morning yawn, a tiny rising sun behind it",
    "ladder-breathing": "sit cross-legged with its eyes closed, breathing calmly, a few soft breath swirls around it",
    "ladder-core": "hold a plank on a small mat, body straight, resting on its little forearms",
    "ladder-focus": "sit at a tiny desk wearing small headphones, focused, a little kitchen timer beside it",
    "ladder-insight": "write in a small notebook with a pencil, thoughtful",
    "ladder-mobility": "do a big side stretch on a small mat, one arm reaching over its head",
    "ladder-own-program": "lift a small dumbbell in each paw, proud",
    "ladder-phone-free": "happily put a small phone into a little drawer and wave goodbye to it",
    "ladder-push": "do a push-up on a small mat, body straight and level, little arms bent",
    "ladder-reading": "sit reading a small open book with a tiny cup of tea beside it",
    "ladder-sleep": "sleep tucked under a tiny blanket on a small pillow, a phone lying face down beside it",
    "ladder-squat": "do a bodyweight squat, knees bent, arms stretched forward, a determined face",
    "ladder-walk": "walk briskly mid-step, swinging its arms, cheerful",
    "micro-focus": "write on a single small card with a pencil, focused",
    "micro-strength": "stand up from a tiny wooden chair with its arms crossed over its chest",
    "micro-vitality": "drink a glass of water happily",
    "micro-wisdom": "read one page of a small book held up close",
    "move-core": "hang from a small bar with both paws and lift its knees up",
    "move-hinge": "do a deadlift with a small dumbbell in each paw, hips pushed back, back flat",
    "move-isolation": "curl a small dumbbell, proudly flexing",
    "move-press": "press two small dumbbells straight up over its head",
    "move-pull": "do a one-arm row with a small dumbbell, leaning one paw on a tiny bench",
    "move-push": "lie on a tiny bench pressing a pair of small dumbbells up",
    "move-squat": "do a squat holding one small dumbbell against its chest",
    "push-incline": "do a push-up with its front paws on the edge of a small table, its body one straight leaning line",
    "push-knee": "do a push-up from its knees on a small mat",
    "push-wall": "do a standing push-up against a small wall, paws flat on it, leaning in",
    "recovery": "get back up from the ground, brushing itself off, with a brave little smile",
    "squat-chair": "squat down until it nearly sits on a tiny chair behind it, arms stretched forward",
    "squat-split": "do a split squat, one foot forward and one back, paws on its hips",
    "stillness": "sit very still and calm with its eyes closed and paws in its lap",
}


def render(dest: Path, wf) -> None:
    if dest.exists():
        return
    t = time.time()
    ga.fetch(ga.run(wf)[0], dest)
    print(f"{dest.name} ({time.time() - t:.0f} s)", flush=True)


def edit(src: Path, dest: Path, instruction: str, seed: int) -> None:
    if not dest.exists():
        render(dest, ga.qwen_edit(ga.upload(src), instruction, seed, f"lmu/buddy-{dest.stem}"))


def paint(classes: list[str]) -> None:
    for c in classes:
        b = BUDDIES[c]
        render(RENDERS / f"{c}-1-green.png", ga.zimage(f"{ga.LOOKS['clay']}. {b['look']}. {ga.BACKDROP}", b["seed"], f"lmu/buddy-{c}-1"))


def grow(classes: list[str]) -> None:
    for c in classes:
        b = BUDDIES[c]
        edit(RENDERS / f"{c}-1-green.png", RENDERS / f"{c}-2-green.png", f"Make it a little older, bigger and braver, like a young "
             f"adventurer, with {b['grown']}. Keep {b['keep']}, still cute and round, with a friendly happy smile, never angry "
             f"or frowning. {KEEP}", b["seed"])
        edit(RENDERS / f"{c}-2-green.png", RENDERS / f"{c}-3-green.png", f"Make it the grand grown-up version: bigger and strong but "
             f"still cute and round, with {b['grand']}. Keep {b['keep']}, with a friendly happy smile, never angry or frowning. "
             f"{KEEP}", b["seed"])


def black(classes: list[str]) -> None:
    for c in classes:
        for s in SIZES:
            edit(RENDERS / f"{c}-{s}-green.png", RENDERS / f"{c}-{s}.png", ga.BLACK, BUDDIES[c]["seed"])


def poses(classes: list[str]) -> None:
    for c in classes:
        for s in SIZES:
            for pose, words in POSES.items():
                edit(RENDERS / f"{c}-{s}.png", RENDERS / f"{c}-{s}-{pose}.png", words.format(ball=BUDDIES[c]["ball"]), BUDDIES[c]["seed"])


def quests(classes: list[str]) -> None:
    for c in classes:
        for key, action in QUESTS.items():
            edit(RENDERS / f"{c}-1.png", RENDERS / f"{c}-1-q-{key}.png", f"Make it {action}. {KEEP}", BUDDIES[c]["seed"])


def still(c: str, s: int, pose: str) -> Path:
    return RENDERS / (f"{c}-{s}.png" if pose == "idle" else f"{c}-{s}-{pose}.png")


def pick() -> None:
    """Keys every still to 384 px WebP in the app's assets and the quest pictures one by one, then writes the manifest the
    app reads. A size's idle, blink, happy and sleep share one box, so a pose change doesn't move it; the throw is framed
    with its ball too (it shows only in the battle replay, where the shots leave from the ball). Checks everything is
    painted before writing anything, and keys into a fresh folder that replaces the old one only when all of it is done."""
    missing = [p.name for c in CLASSES for s in SIZES for pose in STILLS if not (p := still(c, s, pose)).exists()]
    missing += [f"{c}-1-q-{k}.png" for c in CLASSES for k in QUESTS if not (RENDERS / f"{c}-1-q-{k}.png").exists()]
    if missing:
        raise SystemExit(f"missing renders: {', '.join(missing)}")
    new = ASSETS.with_name(ASSETS.name + ".new")
    shutil.rmtree(new, ignore_errors=True)
    new.mkdir(parents=True)
    sizes, quest_lines = [], []
    for c in CLASSES:
        per_size = []
        for s in SIZES:
            box = ga.union([ga.box_of(still(c, s, pose)) for pose in STILLS if pose != "throw"])
            for pose in STILLS:
                framed = ga.union([box, ga.box_of(still(c, s, pose))]) if pose == "throw" else box
                ga.key(still(c, s, pose), new / f"{c}-{s}-{pose}.webp", 384, framed)
            per_size.append("{ " + ", ".join(f"{p}: require('../../assets/buddies/{c}-{s}-{p}.webp')" for p in STILLS) + " }")
        sizes.append(f"  {c}: [\n    " + ",\n    ".join(per_size) + ",\n  ],")
        for k in QUESTS:
            ga.key(RENDERS / f"{c}-1-q-{k}.png", new / f"{c}-q-{k}.webp", 384)
        quest_lines.append(f"  {c}: {{\n" + "\n".join(f"    '{k}': require('../../assets/buddies/{c}-q-{k}.webp')," for k in QUESTS) + "\n  },")
    shutil.rmtree(ASSETS, ignore_errors=True)
    new.rename(ASSETS)
    head = MANIFEST.read_text(encoding="utf-8").split("/** Filled by the art pipeline")[0]
    MANIFEST.write_text(
        head + "/** Filled by the art pipeline (scripts/art/buddy-art.py pick): each class's buddy, little, grown and grand. */\n"
        "export const BUDDY_ART: Readonly<Partial<Record<ClassId, readonly [BuddyStills, BuddyStills, BuddyStills]>>> = {\n"
        + "\n".join(sizes) + "\n};\n\n/** The little buddy doing each kind of quest, by art key (packages/content/src/art.ts). */\n"
        "export const BUDDY_QUEST_ART: Readonly<Partial<Record<ClassId, Readonly<Record<string, ImageSourcePropType>>>>> = {\n"
        + "\n".join(quest_lines) + "\n};\n", encoding="utf-8")
    total = sum(f.stat().st_size for f in ASSETS.glob("*.webp"))
    print(f"{len(list(ASSETS.glob('*.webp')))} pictures, {total // 1024} KB in {ASSETS}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cmd", choices=["paint", "grow", "black", "poses", "quests", "pick"])
    p.add_argument("classes", nargs="*", help=f"some of {', '.join(CLASSES)} (all when none given)")
    a = p.parse_args()
    if unknown := [c for c in a.classes if c not in CLASSES]:
        p.error(f"no such class: {', '.join(unknown)}")
    if a.cmd == "pick" and a.classes:
        p.error("pick takes every class at once (the manifest lists them all)")
    RENDERS.mkdir(parents=True, exist_ok=True)
    {"paint": paint, "grow": grow, "black": black, "poses": poses, "quests": quests}.get(a.cmd, lambda _: pick())(a.classes or CLASSES)


if __name__ == "__main__":
    main()
