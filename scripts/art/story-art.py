"""LevelMeUp story pictures (M14): one picture per story lesson, of its regular in the story's turning moment, rendered
with Z-Image Turbo in the owner's local ComfyUI. Each regular has one fixed look (CAST), written into every prompt, so the
same person comes back from story to story. Monster Buddy (docs/2026-10-25-monster-buddy.md, decision 7): painted in clay
like the Grumbles, and when the story is about a habit a Grumble stands for, that Grumble is in the scene: painted as a
little monster first, then swapped for the real one with Qwen-Image-Edit and its still as the second image, so it looks
like itself (`grumble`). The set is published to lmu-art/story-clay (the flat story-v1 set was retired 2026-10-25).

Start ComfyUI first (Windows Application Control blocks torchaudio, so use the no-audio starter):
  Start-Process D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe run_noaudio.py -WorkingDirectory D:\\ai\\ComfyUI

usage (with D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe, or any Python 3.11+):
  story-art.py cast [ID ...] [--seeds 11 22]        -> art/story/renders/cast-<id>-<seed>.png (each regular's look)
  story-art.py render [ARTICLE ...] [--seeds ...]   -> art/story/clay-renders/<article>-<seed>.png (every scene when none given)
  story-art.py sheet [PATTERN]                      -> art/story/clay-renders/_sheet-<page>.jpg (renders matching PATTERN)
  story-art.py grumbles                             -> <article>-<seed>-g.png: each picked render with its real Grumble
  story-art.py pick                                 -> art/story/clay/<article>.webp from PICKS (to lmu-art/story-clay,
                                                       with `npm run studio -- pictures`)
  story-art.py final                                -> art/story/_set.jpg (the picked set, for the owner)
  story-art.py scene OUT WHO SCENE [--seeds ...] [--monster]
                                                    -> OUT/<seed>.png (M15: a new story's scene, for scripts/studio; with
                                                       --monster a little monster sits in it, for `grumble`)
  story-art.py grumble SRC ID DEST                  -> DEST: SRC with its little monster swapped for the Grumble ID
  story-art.py webp SRC DEST                        -> DEST, SRC cropped to 960x540 as the published set
  story-art.py look WHO                             -> prints the regular's fixed look
Existing renders are skipped, so a changed prompt needs new seeds (or the old renders deleted).
"""
import argparse, json, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

COMFY = "http://127.0.0.1:8188"
ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "art" / "story" / "clay-renders"
OUT = ROOT / "art" / "story" / "clay"  # the published folder (lmu-art/story-clay); a changed set gets a new one
GRUMBLE_STILLS = ROOT / "apps" / "mobile" / "assets" / "grumbles"  # the app's Grumbles: <id>-idle.webp
W, H = 1344, 768  # cropped to 960x540 on pick, like the quest art
FONT = "C\\:/Windows/Fonts/arial.ttf"  # ffmpeg's drawtext needs a font file on Windows

# The Grumbles' clay (scripts/art/grumble-art.py LOOKS["clay"]), as a little diorama, so the stories sit beside Monster Week.
STYLE = ("a tiny cozy 3D clay diorama, glossy soft vinyl and smooth clay, soft subsurface glow, gentle rim light, miniature toy "
         "photography; the person is a cute chibi clay figurine with a big head and small body, a real human, no animal ears; "
         "no text, no letters, no numbers, no logo, no watermark")
MONSTER = "and beside them a small cute round clay monster"
GRUMBLE_EDIT = ("Replace the small monster with the cute monster from image 2, exactly as it looks in image 2 (its shape, colours "
                "and accessories), in the same place at the same small size. Keep everything else in image 1 exactly the same.")

# The regulars (packages/content/src/cast.ts): face, hair and build never change; clothes come with the scene.
CAST = {
    "priya": "an Indian woman of 24 with warm brown skin, a long black braid over one shoulder, round wire glasses and a slim build",
    "jonah": "a Black man of 41 with close-cropped hair greying at the temples, a short grey-flecked beard and broad shoulders",
    "mika": "an East Asian woman of 29 with a short black bob with straight bangs and a slim build, no cap or hat",
    "tomas": "a Latino man of 34 with wavy dark hair, dark stubble and kind tired eyes, medium build",
    "amara": "a Black woman of 19 with curly hair tied up in a high puff and small gold hoop earrings",
    "lena": "a white woman of 52 with grey-blonde hair pinned up in a loose bun and laugh lines around her eyes",
}
CAST_LOOK = {  # the clothes each regular wears for their reference picture
    "priya": "wearing a loose cardigan over a t-shirt",
    "jonah": "wearing a plain running t-shirt",
    "mika": "wearing navy nurse scrubs",
    "tomas": "wearing a grey hoodie",
    "amara": "wearing an oversized hoodie",
    "lena": "wearing a linen apron over a plain shirt",
}

# The Grumble in each stored story, when the story is about the habit it stands for (packages/content/src/grumbles.ts).
STORY_GRUMBLES: dict[str, str | None] = {
    "article-9": "laterpillar", "article-20": "grabbit", "article-21": "nightowlet", "article-22": "snoozle", "article-23": "forgetto",
    "article-24": None, "article-25": "knowitowl", "article-27": "mehbit", "article-28": None, "article-29": None,
    "article-30": "scrollo", "article-31": "skimmy", "article-32": "zonkle", "article-33": None, "article-34": "tabbit",
    "article-35": "shyling", "article-36": "rushkin", "article-37": "fizzbit", "article-55": "excusaurus", "article-56": "blurb",
    "article-122": "liftle", "article-140": "snoozle", "article-141": "pingle", "article-142": "comfortoise",
    "article-143": "juggles", "article-144": "excusaurus",
}

# One scene per story lesson: the regular in the story's turning moment (the decks stored 2026-10-19; the studio's since,
# from their jobs' scene.json, and article-144's, which had none, from its deck).
SCENES = {
    "article-9": ("priya", "sitting at a small desk at night under a warm lamp, laptop closed beside her, writing one short line in a small notebook, a calm small smile, wearing a loose cardigan"),
    "article-20": ("jonah", "sitting on a gym bench between sets of squats, breathing slowly, a phone propped on the squat rack beside a loaded barbell, a water bottle in his hand, wearing a running t-shirt"),
    "article-21": ("tomas", "standing in a small kitchen in early morning light, writing on a sticky note stuck by the kettle, a baby monitor on the counter, wearing a grey hoodie"),
    "article-22": ("priya", "sitting up in bed in the morning stretching her arms, an old wind-up alarm clock on the bedside table, no phone anywhere near the bed, soft daylight through the curtains"),
    "article-23": ("amara", "at a library table quizzing herself with a small stack of handwritten index cards, holding one card face down while thinking, a notebook open beside her, wearing an oversized hoodie"),
    "article-24": ("lena", "behind the counter of her small bakery after closing, drawing a line down the middle of an order slip with a pencil, bread baskets behind her, the lit window of a busy cafe across the street at dusk with plain awnings and no signs or lettering anywhere, wearing a linen apron"),
    "article-25": ("lena", "shaping a round loaf of rye dough with both hands on a floured wooden table in the early morning, focused and curious, bakery shelves behind her, wearing a linen apron"),
    "article-27": ("tomas", "walking along a tree-lined street at lunchtime pushing a baby pram, earbuds in, relaxed, a sticky note on the front door of a house behind him, wearing a grey hoodie"),
    "article-28": ("jonah", "sitting at a kitchen table on a quiet Sunday writing a plan in a small training notebook, a mug of tea beside it, a gym bag by the door, wearing a plain t-shirt"),
    "article-29": ("mika", "standing on a small balcony in the morning holding a mug of coffee, under a grey cloudy sky above city rooftops, eyes half closed in the daylight, wearing a cardigan over a t-shirt"),
    "article-30": ("amara", "at a desk in a small dorm room reading an open book, her phone lying face down at the far edge of the desk, resisting it, wearing an oversized hoodie"),
    "article-31": ("priya", "at an office desk in the evening with a closed guidebook beside her, writing from memory on a blank sheet of paper, a red pen nearby, wearing a loose cardigan"),
    "article-32": ("tomas", "on a sofa late at night writing three short lines in a small notebook by lamplight, a baby asleep in a bassinet beside him, wearing a grey hoodie"),
    "article-33": ("lena", "sitting down for lunch at a small table in a bakery back room, a plate and a cup in front of her, a hand-drawn grid of dots pinned to the pantry door behind her, wearing a linen apron"),
    "article-34": ("tomas", "on a quiet Sunday evening at a desk by a window, writing a short list on one sheet of paper beside a lamp, a book set aside, calm, wearing a grey hoodie"),
    "article-35": ("amara", "in a university library with a statistics problem sheet and a pencil, looking at it with quiet determination, a friend studying across the table, wearing an oversized hoodie"),
    "article-36": ("mika", "riding a stationary bike in a small gym in the afternoon at an easy steady pace, a gym bag on the floor, wearing a sports t-shirt and leggings"),
    "article-37": ("mika", "in a quiet hospital break room at night choosing a cup of tea beside a coffee machine, wearing navy nurse scrubs"),
    "article-55": ("jonah", "jogging slowly along a canal path at dusk toward a small stone bridge, tired but going, wearing running clothes"),
    "article-56": ("jonah", "sitting on a park bench on a Sunday morning taking a photo of his small running notebook with his phone, running shoes on, a few runners in the park behind him, wearing a running t-shirt"),
    "article-122": ("jonah", "walking a short loop around a quiet residential block after lunch in soft midday light, holding a phone to his ear while glancing at a plain fitness watch on his wrist, a bus depot visible far behind, wearing a navy bus driver's uniform shirt and comfortable sneakers"),
    "article-140": ("tomas", "lying back on a living room sofa just after lunch, setting a phone alarm with one hand, a laptop closed on the nearby kitchen table beside a half-finished coffee mug and a baby monitor, soft afternoon light through half-closed blinds, wearing a faded t-shirt and sweatpants"),
    "article-141": ("priya", "sitting at a studio desk in soft afternoon window light, sliding her phone into a canvas bag hanging off her chair with one hand, a blank sticky note and pen beside the keyboard, the monitor glowing softly, wearing a mustard cardigan"),
    "article-142": ("priya", "sitting at her desk on a quiet Sunday afternoon in soft window light, laying a sheet of hand-drawn icons beside a printed icon set she admires, a fine-liner pen in her hand, an open notebook and a small kitchen timer nearby, wearing an oversized cardigan"),
    "article-143": ("tomas", "sitting on a sofa late at night under a warm lamp, jotting faint pencil scribbles on the back of an envelope resting on his knee, a baby monitor and empty bottle on the side table, a leaning hall shelf beyond, wearing a soft grey t-shirt"),
    "article-144": ("jonah", "sitting at a kitchen table at night with a pen, writing one line at the bottom of a running plan sheet, a bus driver's jacket over the chair, a phone beside the sheet, wearing a navy uniform shirt"),
}
FRAME = "medium wide shot, one person, the face clearly visible, quiet everyday moment"

# Filled in after picking from the sheets: article -> seed.
PICKS: dict[str, int] = {
    "article-9": 22, "article-20": 11, "article-21": 11, "article-22": 11, "article-23": 22, "article-24": 22, "article-25": 11,
    "article-27": 22, "article-28": 11, "article-29": 11, "article-30": 11, "article-31": 11, "article-32": 22, "article-33": 11,
    "article-34": 22, "article-35": 11, "article-36": 11, "article-37": 11, "article-55": 11, "article-56": 11, "article-122": 11,
    "article-140": 11, "article-141": 11, "article-142": 11, "article-143": 22, "article-144": 11,
}  # picked 2026-10-26 from the sheets: the regular clear, the little monster whole and apart from them


def workflow(prompt: str, seed: int, prefix: str, size: tuple[int, int] = (W, H)) -> dict:
    """Z-Image Turbo, 8 steps (scripts/art/quest-art.py)."""
    return {
        "unet": {"class_type": "UNETLoader", "inputs": {"unet_name": "z_image_turbo_int8_convrot.safetensors", "weight_dtype": "default"}},
        "clip": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_3_4b_fp8_mixed.safetensors", "type": "lumina2", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "shift": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["unet", 0], "shift": 3.0}},
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["clip", 0], "text": prompt}},
        "neg": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["pos", 0]}},
        "latent": {"class_type": "EmptySD3LatentImage", "inputs": {"width": size[0], "height": size[1], "batch_size": 1}},
        "sample": {"class_type": "KSampler", "inputs": {
            "model": ["shift", 0], "positive": ["pos", 0], "negative": ["neg", 0], "latent_image": ["latent", 0],
            "seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "res_multistep", "scheduler": "simple", "denoise": 1.0}},
        "decode": {"class_type": "VAEDecode", "inputs": {"samples": ["sample", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["decode", 0], "filename_prefix": prefix}},
    }


def call(path: str, body: dict | None = None) -> bytes:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(COMFY + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def queue_and_fetch(wf: dict, dest: Path) -> Path:
    pid = json.loads(call("/prompt", {"prompt": wf}))["prompt_id"]
    while True:
        hist = json.loads(call("/history/" + pid))
        if pid in hist:
            h = hist[pid]
            if h["status"].get("status_str") == "error":
                raise RuntimeError(json.dumps(h["status"])[:1500])
            img = h["outputs"]["save"]["images"][0]
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(call("/view?" + q))
            return dest
        time.sleep(2)


def scene_prompt(who: str, scene: str, monster: bool = False) -> str:
    return f"{STYLE}. {FRAME}. {CAST[who]}, {scene}" + (f", {MONSTER}" if monster else "")


def render(article: str, seed: int) -> Path:
    dest = RENDERS / f"{article}-{seed}.png"
    if dest.exists():
        return dest
    who, scene = SCENES[article]
    return queue_and_fetch(workflow(scene_prompt(who, scene, STORY_GRUMBLES[article] is not None), seed, f"lmu/story-{dest.stem}"), dest)


def studio_scene(out: Path, who: str, scene: str, seed: int, monster: bool = False) -> Path:
    """M15: a new story's scene for the daily studio (scripts/studio), outside the committed set."""
    dest = out / f"{seed}.png"
    if dest.exists():
        return dest
    return queue_and_fetch(workflow(scene_prompt(who, scene, monster), seed, f"lmu/studio-{out.name}-{seed}"), dest)


def with_grumble(src: Path, grumble: str, dest: Path) -> Path:
    """SRC with its little monster swapped for the real Grumble: Qwen-Image-Edit with the Grumble's still (on a soft grey,
    since the edit reads no transparency) as the second image (scripts/art/grumble-art.py's helpers)."""
    if dest.exists():
        return dest
    import importlib.util
    from PIL import Image
    spec = importlib.util.spec_from_file_location("grumble_art", Path(__file__).with_name("grumble-art.py"))
    ga = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ga)
    still = Image.open(GRUMBLE_STILLS / f"{grumble}-idle.webp").convert("RGBA")
    ref = Image.new("RGBA", still.size, (232, 232, 238, 255))
    ref.alpha_composite(still)
    ref_png = dest.with_name(f"_ref-{grumble}.png")
    ref.convert("RGB").save(ref_png)
    wf = ga.qwen_edit(ga.upload(src), GRUMBLE_EDIT, 11, f"lmu/story-{dest.stem}")
    wf["load2"] = {"class_type": "LoadImage", "inputs": {"image": ga.upload(ref_png)}}
    wf["pos"]["inputs"]["image2"] = ["load2", 0]
    wf["neg"]["inputs"]["image2"] = ["load2", 0]
    ga.fetch(ga.run(wf)[0], dest)
    return dest


def webp(src: Path, dest: Path) -> Path:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                    "scale=960:540:force_original_aspect_ratio=increase,crop=960:540", "-quality", "80", str(dest)], check=True)
    if dest.stat().st_size > 200_000:
        print(f"warning: {dest.name} is {dest.stat().st_size // 1000} KB (over 200 KB)")
    return dest


def cast(who: str, seed: int) -> Path:
    dest = RENDERS / f"cast-{who}-{seed}.png"
    if dest.exists():
        return dest
    prompt = (f"{STYLE}. waist-up portrait of one adult facing the viewer, centered, looking at the viewer. "
              f"{CAST[who]}, {CAST_LOOK[who]}. plain warm cream paper background with light ink hatching")
    return queue_and_fetch(workflow(prompt, seed, f"lmu/story-{dest.stem}", (1024, 1072)), dest)


def contact(files: list[Path], out: Path, cell: tuple[int, int], cols: int) -> Path:
    inputs: list[str] = []
    for f in files:
        inputs += ["-i", str(f)]
    w, h = cell
    labelled = ";".join(
        f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black,"
        f"drawtext=fontfile='{FONT}':text='{f.stem}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6[v{i}]"
        for i, f in enumerate(files))
    layout = "|".join(f"{(i % cols) * w}_{(i // cols) * h}" for i in range(len(files)))
    stack = "".join(f"[v{i}]" for i in range(len(files)))
    graph = f"{labelled};{stack}xstack=inputs={len(files)}:layout={layout}:fill=black[out]" if len(files) > 1 else f"{labelled};[v0]copy[out]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-frames:v", "1", "-q:v", "4", str(out)], check=True)
    return out


def sheet(pattern: str = "article-*", per_page: int = 9) -> None:
    files = sorted(f for f in RENDERS.glob(f"{pattern}.png"))
    if not files:
        sys.exit("nothing rendered yet")
    for page, start in enumerate(range(0, len(files), per_page), 1):
        print(contact(files[start:start + per_page], RENDERS / f"_sheet-{pattern.replace('*', 'x')}-{page}.jpg", (448, 256), 3))


def picked(article: str) -> Path:
    """The picked render, with its Grumble when the story has one."""
    base = RENDERS / f"{article}-{PICKS[article]}.png"
    return base if STORY_GRUMBLES[article] is None else base.with_name(f"{base.stem}-g.png")


def grumbles() -> None:
    for article, grumble in STORY_GRUMBLES.items():
        if grumble is not None and article in PICKS:
            t = time.time()
            print(with_grumble(RENDERS / f"{article}-{PICKS[article]}.png", grumble, picked(article)), f"({time.time() - t:.0f} s)", flush=True)


def pick() -> None:
    missing_keys = [a for a in SCENES if a not in PICKS]
    if missing_keys:
        sys.exit(f"PICKS lacks: {', '.join(missing_keys)}")
    sources = {a: picked(a) for a in SCENES}
    missing = [p.name for p in sources.values() if not p.exists()]
    if missing:  # check before clearing anything: the committed set must survive a machine without the renders
        sys.exit(f"missing renders: {', '.join(missing)}")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.webp"):
        old.unlink()
    for article, src in sources.items():
        webp(src, OUT / f"{article}.webp")
    print(f"{len(sources)} pictures in {OUT}")


def final() -> None:
    files = [OUT / f"{a}.webp" for a in SCENES]
    print(contact(files, ROOT / "art" / "story" / "_set.jpg", (480, 270), 4))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["cast", "render", "sheet", "grumbles", "pick", "final", "scene", "grumble", "webp", "look"])
    p.add_argument("keys", nargs="*")
    p.add_argument("--seeds", nargs="+", type=int, default=[11, 22, 33])
    p.add_argument("--monster", action="store_true", help="scene: a little monster sits in it, for `grumble`")
    a = p.parse_args()
    if a.command == "cast":
        for who in a.keys or list(CAST):
            if who not in CAST:
                sys.exit(f"unknown regular {who}")
            for seed in a.seeds:
                print(cast(who, seed), flush=True)
    elif a.command == "render":
        for article in a.keys or list(SCENES):
            if article not in SCENES:
                sys.exit(f"unknown article {article}")
            for seed in a.seeds:
                print(render(article, seed), flush=True)
    elif a.command == "sheet":
        sheet(*(a.keys[:1] or []))
    elif a.command == "grumbles":
        grumbles()
    elif a.command == "pick":
        pick()
    elif a.command == "scene":
        out, who, scene = (a.keys + ["", "", ""])[:3]
        if who not in CAST or not out or not scene:
            sys.exit("usage: scene OUT WHO SCENE")
        for seed in a.seeds:
            print(studio_scene(Path(out), who, scene, seed, a.monster), flush=True)
    elif a.command == "grumble":
        if len(a.keys) != 3 or not (GRUMBLE_STILLS / f"{a.keys[1]}-idle.webp").exists():
            sys.exit("usage: grumble SRC ID DEST (ID a painted Grumble)")
        print(with_grumble(Path(a.keys[0]), a.keys[1], Path(a.keys[2])))
    elif a.command == "webp":
        if len(a.keys) != 2:
            sys.exit("usage: webp SRC DEST")
        print(webp(Path(a.keys[0]), Path(a.keys[1])))
    elif a.command == "look":
        if not a.keys or a.keys[0] not in CAST:
            sys.exit("usage: look WHO")
        print(CAST[a.keys[0]])
    else:
        final()


if __name__ == "__main__":
    main()
