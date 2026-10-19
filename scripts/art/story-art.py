"""LevelMeUp story pictures (M14): one picture per story lesson, of its regular in the story's turning moment, rendered
with Z-Image Turbo in the owner's local ComfyUI, in the quest art's style. Each regular has one fixed look (CAST), written
into every prompt, so the same person comes back from story to story.

Start ComfyUI first (Windows Application Control blocks torchaudio, so use the no-audio starter):
  Start-Process D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe run_noaudio.py -WorkingDirectory D:\\ai\\ComfyUI

usage (with D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe, or any Python 3.11+):
  story-art.py cast [ID ...] [--seeds 11 22]        -> art/story/renders/cast-<id>-<seed>.png (each regular's look)
  story-art.py render [ARTICLE ...] [--seeds ...]   -> art/story/renders/<article>-<seed>.png (every scene when none given)
  story-art.py sheet [PATTERN]                      -> art/story/renders/_sheet-<page>.jpg (renders matching PATTERN)
  story-art.py pick                                 -> art/story/v1/<article>.webp from PICKS (published to lmu-art/story-v1)
  story-art.py final                                -> art/story/_set.jpg (the picked set, for the owner)
Existing renders are skipped, so a changed prompt needs new seeds (or the old renders deleted).
"""
import argparse, json, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

COMFY = "http://127.0.0.1:8188"
ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "art" / "story" / "renders"
OUT = ROOT / "art" / "story" / "v1"  # the published folder (lmu-art/story-v1); a changed set gets a new one
W, H = 1344, 768  # cropped to 960x540 on pick, like the quest art
FONT = "C\\:/Windows/Fonts/arial.ttf"  # ffmpeg's drawtext needs a font file on Windows

# The quest art's style (scripts/art/quest-art.py), so the stories sit beside the quests.
STYLE = ("korean manhwa illustration, bold black ink lineart, flat cel shading, limited palette of ink black, warm cream "
         "paper and one vermilion red accent, subtle halftone dots, clean background, no text, no letters, no numbers, "
         "no logo, no watermark")

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

# One scene per story lesson: the regular in the story's turning moment (the decks stored 2026-10-19).
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
}
FRAME = "medium wide shot, one person, the face clearly visible, quiet everyday moment"

# Filled in after picking from the sheets: article -> seed.
PICKS: dict[str, int] = {
    "article-9": 11, "article-20": 22, "article-21": 22, "article-22": 22, "article-23": 22, "article-24": 66,
    "article-25": 22, "article-27": 22, "article-28": 33, "article-29": 33, "article-30": 11, "article-31": 22,
    "article-32": 11, "article-33": 22, "article-34": 22, "article-35": 11, "article-36": 11, "article-37": 33,
    "article-55": 22, "article-56": 11,
}  # picked 2026-10-20 from the sheets: no lettering in the picture, the regular looks like their reference


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


def scene_prompt(article: str) -> str:
    who, scene = SCENES[article]
    return f"{STYLE}. {FRAME}. {CAST[who]}, {scene}"


def render(article: str, seed: int) -> Path:
    dest = RENDERS / f"{article}-{seed}.png"
    if dest.exists():
        return dest
    return queue_and_fetch(workflow(scene_prompt(article), seed, f"lmu/story-{dest.stem}"), dest)


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


def pick() -> None:
    missing_keys = [a for a in SCENES if a not in PICKS]
    if missing_keys:
        sys.exit(f"PICKS lacks: {', '.join(missing_keys)}")
    sources = {a: RENDERS / f"{a}-{PICKS[a]}.png" for a in SCENES}
    missing = [p.name for p in sources.values() if not p.exists()]
    if missing:  # check before clearing anything: the committed set must survive a machine without the renders
        sys.exit(f"missing renders: {', '.join(missing)}")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.webp"):
        old.unlink()
    for article, src in sources.items():
        dest = OUT / f"{article}.webp"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                        "scale=960:540:force_original_aspect_ratio=increase,crop=960:540", "-quality", "80", str(dest)], check=True)
        if dest.stat().st_size > 200_000:
            print(f"warning: {dest.name} is {dest.stat().st_size // 1000} KB (over 200 KB)")
    print(f"{len(sources)} pictures in {OUT}")


def final() -> None:
    files = [OUT / f"{a}.webp" for a in SCENES]
    print(contact(files, ROOT / "art" / "story" / "_set.jpg", (480, 270), 4))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["cast", "render", "sheet", "pick", "final"])
    p.add_argument("keys", nargs="*")
    p.add_argument("--seeds", nargs="+", type=int, default=[11, 22, 33])
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
    elif a.command == "pick":
        pick()
    else:
        final()


if __name__ == "__main__":
    main()
