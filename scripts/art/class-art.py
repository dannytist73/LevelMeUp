"""LevelMeUp class portraits and the Shadow (M9a), rendered in the owner's local ComfyUI.

Tier 1 of each figure comes from Z-Image Turbo; tiers 2 and 3 are edited from the picked tier 1 with Qwen-Image-Edit 2511
(Lightning 4-step LoRA), so the same person grows (M9a decision 3). The workflows follow the Inkbound pipeline.

Start ComfyUI first (Windows Application Control blocks torchaudio, so use the no-audio starter):
  Start-Process D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe run_noaudio.py -WorkingDirectory D:\\ai\\ComfyUI

usage (with D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe):
  class-art.py render [SUBJECT ...] [--seeds 11 22 33]  -> art/class/renders/<subject>-1-<seed>.png (shadow-<seed>.png)
  class-art.py grow [SUBJECT ...] [--seeds 1] [--tiers 2 3] -> art/class/renders/<subject>-<2|3>-from<pick>-<seed>.png
                                                        (from PICKS' tier 1, whose seed is in the name)
  class-art.py sheet [PATTERN]                          -> art/class/renders/_sheet-<page>.jpg (renders matching PATTERN)
  class-art.py pick                                     -> art/class/v1/<subject>-<tier>.webp, shadow.webp (from PICKS)
  class-art.py final                                    -> art/class/_set.jpg (the picked set, for the owner)
Existing renders are skipped, so a changed prompt needs new seeds (or the old renders deleted).
"""
import argparse, json, random, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

COMFY = "http://127.0.0.1:8188"
ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "art" / "class" / "renders"
OUT = ROOT / "art" / "class" / "v1"  # the published folder (lmu-art/class-v1); a changed set gets a new one
FONT = "C\\:/Windows/Fonts/arial.ttf"  # ffmpeg's drawtext needs a font file on Windows
PORTRAIT = (1024, 1072)  # published 768x804, the D4 frame's 1:1.04
SHADOW = (1344, 768)  # published 960x540, 16:9 like the quest art

STYLE = ("korean manhwa illustration, bold black ink lineart, flat cel shading, limited palette of ink black, warm cream "
         "paper and one vermilion red accent, subtle halftone dots, no text, no letters, no numbers, no logo, no watermark")
FRAME = "waist-up portrait of one adult facing the viewer, centered, looking at the viewer"
PAPER = "plain warm cream paper background with light ink hatching"
DARK_STYLE = ("korean manhwa illustration, bold black ink, deep black and charcoal palette with one vermilion red accent, "
              "subtle halftone dots, no text, no letters, no numbers, no logo, no watermark")

SUBJECTS = {
    "warrior-a": "an adult man in his twenties with short black hair and a determined look, athletic build, wearing a plain black t-shirt and white cloth hand wraps",
    "warrior-b": "an adult woman in her twenties with a high black ponytail and a determined look, athletic build, wearing a fitted black athletic t-shirt under an open zip jacket, both hands wrapped in white cloth hand wraps and raised as loose fists in front of her chest",
    "mage-a": "an adult man in his twenties with tousled dark hair and round glasses, a calm clever look, wearing a dark knit sweater over a collared shirt, holding a closed hardcover book against his chest",
    "mage-b": "an adult woman in her twenties with shoulder-length dark hair tucked behind one ear, a calm clever look, wearing a long cardigan over a turtleneck, holding a closed hardcover book against her chest",
    "rogue-a": "an adult man in his twenties with messy dark hair and sharp focused eyes, wearing a dark hooded jacket with the hood down and a dark scarf",
    "rogue-b": "an adult woman in her twenties with a short dark bob and sharp focused eyes, wearing a dark hooded jacket with the hood down and fingerless gloves",
    "monk-a": "an adult man in his twenties with a shaved head and a serene look, wearing a loose dark linen shirt, wooden prayer beads around one wrist",
    "monk-b": "an adult woman in her twenties with long dark hair in a low braid and a serene look, wearing a loose dark linen top, wooden prayer beads around one wrist",
}
SHADOW_SUBJECT = ("a looming figure made of swirling black ink and smoke, the dark silhouette of a person from the waist up "
                  "with two narrow glowing vermilion eyes, ember sparks drifting from its edges, in a dark empty space, "
                  "ominous and quiet")

# What tiers 2 (levels 5-9) and 3 (levels 10 on) add (decision 4): gear, then red where it means reward.
TIERS = {
    "warrior": {
        2: "Make them a seasoned fighter: a fitted black training jacket with a vermilion stripe on the sleeves, a vermilion headband, a confident stance, and bold vermilion speed lines radiating behind them.",
        3: "Make them a master warrior: a long black coat over the training clothes, worn hand wraps, one fist raised, a strong vermilion ember aura around their body with sparks rising, and a burst of vermilion ink behind them.",
    },
    "mage": {
        2: "Make them a seasoned scholar mage: a long dark coat over the same clothes, the book held open, small glowing vermilion circles and lines floating around the book, and bold vermilion speed lines radiating behind them.",
        3: "Make them a master mage: a long dark coat with a high collar, the open book raised in one hand with rings of vermilion light rising from its pages, a strong vermilion aura with sparks, and a burst of vermilion ink behind them.",
    },
    "rogue": {
        2: "Make them a seasoned rogue: the hood pulled up over the hair with the face still clearly visible, a dark scarf, a sharp vermilion glint in the eyes, and bold vermilion speed lines radiating behind them.",
        3: "Make them a master rogue: a long dark hooded coat with the hood up and the face clearly visible, a calm sharp look, a thin vermilion aura flickering like smoke around them, and a burst of vermilion ink behind them.",
    },
    "monk": {
        2: "Make them a seasoned monk: a dark wrap-style training top tied with a cloth belt, the prayer beads around the wrist, a calm vermilion glow around the hands, and soft vermilion rays behind them.",
        3: "Make them a master monk: flowing dark robes, palms pressed together at the chest, a serene vermilion aura with rising sparks, and a large vermilion sun circle behind them.",
    },
}
# "the same young adult face and age" and "the same dark clothes" came after the first edits aged two faces and turned a
# jacket tan (seed 1); edits rendered before then keep their seed-1 names.
KEEP = ("Keep the same person: the same young adult face and age, hair, skin tone and body, facing the viewer, waist-up, "
        "in the same dark clothes unless told otherwise. Keep the same bold "
        "black ink lineart, flat cel shading and cream paper palette with one vermilion red accent. {change} Keep the "
        "picture free of any text, letters or numbers.")

# Filled in after picking from the sheets: subject -> {tier: seed}; the Shadow is {"shadow": {1: seed}}.
PICKS: dict[str, dict[int, int]] = {
    "warrior-a": {1: 11, 2: 1, 3: 1},
    "warrior-b": {1: 44, 2: 2, 3: 1},
    "mage-a": {1: 11, 2: 2, 3: 1},
    "mage-b": {1: 11, 2: 1, 3: 1},
    "rogue-a": {1: 22, 2: 2, 3: 1},
    "rogue-b": {1: 22, 2: 2, 3: 2},
    "monk-a": {1: 11, 2: 1, 3: 1},
    "monk-b": {1: 11, 2: 2, 3: 1},
    "shadow": {1: 22},
}


def zimage(prompt: str, size: tuple[int, int], seed: int, prefix: str) -> dict:
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


def qwen_edit(image_name: str, instruction: str, seed: int, prefix: str) -> dict:
    """Qwen-Image-Edit 2511 + Lightning 4-step LoRA (ComfyUI's image_qwen_image_edit_2511 template, as Inkbound)."""
    return {
        "unet": {"class_type": "UNETLoader", "inputs": {"unet_name": "qwen_image_edit_2511_fp8mixed.safetensors", "weight_dtype": "default"}},
        "lora": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["unet", 0], "lora_name": "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors", "strength_model": 1.0}},
        "shift": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["lora", 0], "shift": 3.1}},
        "cfgnorm": {"class_type": "CFGNorm", "inputs": {"model": ["shift", 0], "strength": 1.0}},
        "clip": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        "load1": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "scale1": {"class_type": "FluxKontextImageScale", "inputs": {"image": ["load1", 0]}},
        "pos": {"class_type": "TextEncodeQwenImageEditPlus", "inputs": {"clip": ["clip", 0], "vae": ["vae", 0], "prompt": instruction, "image1": ["scale1", 0]}},
        "neg": {"class_type": "TextEncodeQwenImageEditPlus", "inputs": {"clip": ["clip", 0], "vae": ["vae", 0], "prompt": "", "image1": ["scale1", 0]}},
        "posref": {"class_type": "FluxKontextMultiReferenceLatentMethod", "inputs": {"conditioning": ["pos", 0], "reference_latents_method": "index_timestep_zero"}},
        "negref": {"class_type": "FluxKontextMultiReferenceLatentMethod", "inputs": {"conditioning": ["neg", 0], "reference_latents_method": "index_timestep_zero"}},
        "latent": {"class_type": "VAEEncode", "inputs": {"pixels": ["scale1", 0], "vae": ["vae", 0]}},
        "sample": {"class_type": "KSampler", "inputs": {
            "model": ["cfgnorm", 0], "positive": ["posref", 0], "negative": ["negref", 0], "latent_image": ["latent", 0],
            "seed": seed, "steps": 4, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "decode": {"class_type": "VAEDecode", "inputs": {"samples": ["sample", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["decode", 0], "filename_prefix": prefix}},
    }


def call(path: str, body: dict | None = None, raw: bytes | None = None, headers: dict | None = None) -> bytes:
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(COMFY + path, data=data, headers=headers or {"Content-Type": "application/json"})
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


def upload(src: Path) -> str:
    boundary = "----lmu%d" % random.randrange(10**9)
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{src.name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + src.read_bytes() + \
           f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    return json.loads(call("/upload/image", raw=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}))["name"]


def render(subject: str, seed: int) -> Path:
    if subject == "shadow":
        dest = RENDERS / f"shadow-{seed}.png"
        prompt, size = f"{DARK_STYLE}. {SHADOW_SUBJECT}", SHADOW
    else:
        dest = RENDERS / f"{subject}-1-{seed}.png"
        prompt, size = f"{STYLE}. {FRAME}. {SUBJECTS[subject]}. {PAPER}", PORTRAIT
    if dest.exists():
        return dest
    return queue_and_fetch(zimage(prompt, size, seed, f"lmu/class-{dest.stem}"), dest)


def grown(subject: str, tier: int, picked: int, seed: int) -> Path:
    """An edit names the tier-1 seed it grew from, so a changed pick never reuses an edit of another face (review)."""
    return RENDERS / f"{subject}-{tier}-from{picked}-{seed}.png"


def grow(subject: str, tier: int, seed: int) -> Path:
    picked = PICKS.get(subject, {}).get(1)
    if picked is None:
        sys.exit(f"pick {subject}'s tier 1 first (PICKS)")
    dest = grown(subject, tier, picked, seed)
    if dest.exists():
        return dest
    change = TIERS[subject.split("-")[0]][tier]
    return queue_and_fetch(qwen_edit(upload(RENDERS / f"{subject}-1-{picked}.png"), KEEP.format(change=change), seed, f"lmu/class-{dest.stem}"), dest)


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


def sheet(pattern: str = "*", per_page: int = 12) -> None:
    files = sorted(f for f in RENDERS.glob(f"{pattern}.png"))
    if not files:
        sys.exit("nothing rendered yet")
    for page, start in enumerate(range(0, len(files), per_page), 1):
        print(contact(files[start:start + per_page], RENDERS / f"_sheet-{page}.jpg", (300, 314), 4))


def pick() -> None:
    expected = {**{s: (1, 2, 3) for s in SUBJECTS}, "shadow": (1,)}
    missing_tiers = [f"{s} tier {t}" for s, tiers in expected.items() for t in tiers if t not in PICKS.get(s, {})]
    if missing_tiers:
        sys.exit(f"PICKS lacks: {', '.join(missing_tiers)}")
    sources = {s: {t: RENDERS / f"shadow-{PICKS[s][t]}.png" if s == "shadow"
                   else RENDERS / f"{s}-1-{PICKS[s][1]}.png" if t == 1 else grown(s, t, PICKS[s][1], PICKS[s][t]) for t in tiers}
               for s, tiers in expected.items()}
    missing = [p.name for tiers in sources.values() for p in tiers.values() if not p.exists()]
    if missing:  # check before clearing anything: the committed set must survive a machine without the renders
        sys.exit(f"missing renders: {', '.join(missing)}")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.webp"):
        old.unlink()
    for subject, tiers in sources.items():
        for tier, src in tiers.items():
            dest = OUT / ("shadow.webp" if subject == "shadow" else f"{subject}-{tier}.webp")
            w, h = (960, 540) if subject == "shadow" else (768, 804)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                            f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}", "-quality", "80", str(dest)], check=True)
            if dest.stat().st_size > 200_000:
                print(f"warning: {dest.name} is {dest.stat().st_size // 1000} KB (over 200 KB)")
    count = len(list(OUT.glob("*.webp")))
    if count != 25:
        sys.exit(f"expected 25 files in {OUT}, found {count}")
    print(f"{count} files in {OUT}")


def final() -> None:
    files = [OUT / f"{s}-{t}.webp" for s in SUBJECTS for t in (1, 2, 3)] + [OUT / "shadow.webp"]
    print(contact(files, ROOT / "art" / "class" / "_set.jpg", (256, 268), 6))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["render", "grow", "sheet", "pick", "final"])
    p.add_argument("subjects", nargs="*")
    p.add_argument("--seeds", nargs="+", type=int)
    p.add_argument("--tiers", nargs="+", type=int, choices=[2, 3])
    a = p.parse_args()
    if a.command == "render":
        for subject in a.subjects or [*SUBJECTS, "shadow"]:
            if subject != "shadow" and subject not in SUBJECTS:
                sys.exit(f"unknown subject {subject}")
            for seed in a.seeds or [11, 22, 33]:
                print(render(subject, seed), flush=True)
    elif a.command == "grow":
        for subject in a.subjects or list(SUBJECTS):
            if subject not in SUBJECTS:
                sys.exit(f"unknown subject {subject} (the Shadow has one tier)")
            for tier in a.tiers or [2, 3]:
                for seed in a.seeds or [1]:
                    print(grow(subject, tier, seed), flush=True)
    elif a.command == "sheet":
        sheet(a.subjects[0] if a.subjects else "*")
    elif a.command == "pick":
        pick()
    else:
        final()


if __name__ == "__main__":
    main()
