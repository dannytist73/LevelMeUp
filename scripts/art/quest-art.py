"""LevelMeUp quest art (M6a decision 11), rendered with Z-Image Turbo in the owner's local ComfyUI.

Start ComfyUI first:  Start-Process D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe main.py -WorkingDirectory D:\\ai\\ComfyUI

usage (with D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe):
  quest-art.py render [KEY ...] [--seeds 11 22 33]   -> art/quest/renders/<key>-<seed>.png (every key when none given)
  quest-art.py sheet                                  -> art/quest/renders/_sheet-<page>.jpg (4 keys a page, labelled)
  quest-art.py pick                                   -> art/quest/v1/<key>-<n>.webp and manifest.json from PICKS
Existing renders are skipped. The keys must match packages/content/src/art.ts (its test checks this file).
"""
import argparse, json, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

COMFY = "http://127.0.0.1:8188"
ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "art" / "quest" / "renders"
OUT = ROOT / "art" / "quest" / "v1"
W, H = 1344, 768  # 16:9-ish; cropped to 960x540 on pick
FONT = "C\\:/Windows/Fonts/arial.ttf"  # ffmpeg's drawtext needs a font file on Windows

STYLE = ("korean manhwa illustration, bold black ink lineart, flat cel shading, limited palette of ink black, warm cream "
         "paper and one vermilion red accent, subtle halftone dots, dynamic composition, clean background, no text, "
         "no letters, no numbers, no logo, no watermark")

SUBJECTS = {
    "ladder-push": "an adult man in his twenties doing push-ups on a wooden dojo floor at dawn",
    "ladder-squat": "an adult woman in her twenties doing bodyweight squats in a city park, morning light",
    "ladder-core": "an adult holding a forearm plank on a rooftop at sunset",
    "ladder-own-program": "an adult woman training with dumbbells in a small gym",
    "ladder-walk": "an adult man walking along a riverside path, city skyline behind him",
    "ladder-mobility": "an adult woman stretching on a yoga mat in a sunlit room",
    "ladder-sleep": "a quiet bedroom at night, moonlight through the window, a phone face down on the side table",
    "ladder-breathing": "an adult sitting cross-legged on a grassy hill at dawn, eyes closed, breathing calmly",
    "ladder-reading": "an adult man reading a book by a rainy window with a cup of tea",
    "ladder-insight": "an adult woman writing in a notebook at a desk under a warm lamp",
    "ladder-focus": "an adult at a desk wearing headphones, deep in work, a small kitchen timer beside the laptop",
    "ladder-phone-free": "a smartphone left in an open drawer while its adult owner walks out of the door into the sunlight",
    "micro-strength": "an adult doing wall push-ups in a small kitchen",
    "micro-vitality": "an adult woman drinking a glass of water at a sunny window",
    "micro-wisdom": "an open book being read on a commuter train, two pages visible",
    "micro-focus": "a hand writing on a single small blank card at a tidy desk",
    "recovery": "an adult standing back up on a wet path as sunlight breaks through the clouds",
    "stillness": "a calm lake at dusk, an adult sitting quietly at the end of a wooden jetty",
    "dawn-ritual": "an adult opening curtains onto a sunrise over city rooftops",
    "article": "an open book glowing softly on a wooden desk at night",
}

# Filled in after picking from the sheets: key -> the seeds to publish, in order (n = 1, 2, …).
PICKS: dict[str, list[int]] = {}


def workflow(prompt: str, seed: int, prefix: str) -> dict:
    return {
        "unet": {"class_type": "UNETLoader", "inputs": {"unet_name": "z_image_turbo_int8_convrot.safetensors", "weight_dtype": "default"}},
        "clip": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_3_4b_fp8_mixed.safetensors", "type": "lumina2", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "shift": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["unet", 0], "shift": 3.0}},
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["clip", 0], "text": prompt}},
        "neg": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["pos", 0]}},
        "latent": {"class_type": "EmptySD3LatentImage", "inputs": {"width": W, "height": H, "batch_size": 1}},
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


def render(key: str, seed: int) -> Path:
    dest = RENDERS / f"{key}-{seed}.png"
    if dest.exists():
        return dest
    pid = json.loads(call("/prompt", {"prompt": workflow(f"{STYLE}. {SUBJECTS[key]}", seed, f"lmu/{key}-{seed}")}))["prompt_id"]
    while True:
        hist = json.loads(call("/history/" + pid))
        if pid in hist:
            status = hist[pid]["status"]
            if status.get("status_str") == "error":
                raise RuntimeError(json.dumps(status)[:1500])
            img = hist[pid]["outputs"]["save"]["images"][0]
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(call("/view?" + q))
            return dest
        time.sleep(2)


def sheet(per_page: int = 12) -> list[Path]:
    files = sorted(RENDERS.glob("*.png"))
    if not files:
        sys.exit("nothing rendered yet")
    pages = []
    for page, start in enumerate(range(0, len(files), per_page), 1):
        chunk = files[start:start + per_page]
        out = RENDERS / f"_sheet-{page}.jpg"
        inputs = []
        for f in chunk:
            inputs += ["-i", str(f)]
        labelled = ";".join(
            f"[{i}:v]scale=448:256,drawtext=fontfile='{FONT}':text='{f.stem}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[v{i}]"
            for i, f in enumerate(chunk))
        cols = 3
        layout = "|".join(f"{(i % cols) * 448}_{(i // cols) * 256}" for i in range(len(chunk)))
        stack = "".join(f"[v{i}]" for i in range(len(chunk)))
        graph = f"{labelled};{stack}xstack=inputs={len(chunk)}:layout={layout}:fill=black[out]" if len(chunk) > 1 else f"{labelled};[v0]copy[out]"
        subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-frames:v", "1", "-q:v", "4", str(out)], check=True)
        pages.append(out)
    print(f"{len(files)} renders on {len(pages)} sheets in {RENDERS}")
    return pages


def pick() -> None:
    if not PICKS:
        sys.exit("PICKS is empty: fill it in from the sheets first")
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "art": {}}
    for key, seeds in PICKS.items():
        if key not in SUBJECTS:
            sys.exit(f"unknown key {key}")
        for n, seed in enumerate(seeds, 1):
            src = RENDERS / f"{key}-{seed}.png"
            dest = OUT / f"{key}-{n}.webp"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                            "scale=960:540:force_original_aspect_ratio=increase,crop=960:540", "-quality", "80", str(dest)], check=True)
            if dest.stat().st_size > 200_000:
                print(f"warning: {dest.name} is {dest.stat().st_size // 1000} KB (over 200 KB)")
        manifest["art"][key] = len(seeds)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"{sum(manifest['art'].values())} pictures for {len(manifest['art'])} keys in {OUT}")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["render", "sheet", "pick"])
    p.add_argument("keys", nargs="*")
    p.add_argument("--seeds", nargs="+", type=int, default=[11, 22, 33])
    a = p.parse_args()
    if a.command == "render":
        for key in a.keys or list(SUBJECTS):
            for seed in a.seeds:
                print(render(key, seed), flush=True)
    elif a.command == "sheet":
        sheet()
    else:
        pick()


if __name__ == "__main__":
    main()
