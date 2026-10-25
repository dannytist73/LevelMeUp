"""Monster Week's Grumbles (docs/2026-10-25-monster-week.md, art pipeline), painted in the owner's local ComfyUI.

Each Grumble is a few stills the app brings to life (apps/mobile/src/ui/GrumbleArt.tsx): idle, blink, hit, happy and sleep,
on a flat green screen that is keyed out to transparency. Z-Image Turbo paints the idle still; Qwen-Image-Edit 2511 makes
the other poses from it, so the Grumble stays on-model; Wan 2.2 (image to video, 4-step) animates the big moments.

Start ComfyUI first (as scripts/art/story-art.py says), and run with its Python (PIL and numpy):
  D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe scripts/art/grumble-art.py style [--seeds 11 22]
    -> art/grumbles/renders/style-<look>-<seed>.png   (the style test: Snoozle in each look)
  grumble-art.py poses LOOK SEED                     -> style-<look>-<seed>-<pose>.png (blink, hit, happy, sleep)
  grumble-art.py clip LOOK SEED [--motion idle]      -> style-<look>-<seed>-clip-<motion>/ (frames) + .webp
  grumble-art.py key SRC DEST                        -> DEST, the green screen keyed out, trimmed, square, 512 px
  grumble-art.py sheet                               -> art/grumbles/renders/_style.jpg (every style render)
Existing renders are skipped, so a changed prompt needs new seeds (or the old renders deleted).
"""
import argparse, json, random, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

COMFY = "http://127.0.0.1:8188"
ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "art" / "grumbles" / "renders"
SIZE = 1024
GREEN = (0, 177, 64)  # the green screen the prompts ask for
FONT = "C\\:/Windows/Fonts/arial.ttf"

BACKDROP = ("full body, centered, the whole character in frame with space around it, isolated on a perfectly flat solid "
            "chroma key green background, no ground, no shadow on the background, no text, no letters, no logo, no watermark")

# The style test's three looks (the owner picks one; the other 23 Grumbles follow it).
LOOKS = {
    "plush": ("an adorable plush toy photographed in a soft studio light, soft felt and minky fabric texture, visible tiny "
              "stitched seams, embroidered eyes, chubby chibi proportions, a premium collectible plushie"),
    "clay": ("an adorable 3D figure like a glossy soft vinyl collectible toy, smooth rounded clay-like shapes, soft subsurface "
             "glow, gentle rim light, cute chibi proportions, like a cozy creature-collecting game"),
    "sticker": ("an adorable storybook character painted in soft gouache with gentle watercolor texture and a clean thin "
                "white outline like a die-cut sticker, warm soft shading, cute chibi proportions"),
}

# The Grumbles' looks, by id (packages/content/src/grumbles.ts): one fixed description each, so every pose stays on-model.
GRUMBLES = {
    "snoozle": ("a small round sleepy monster shaped like a soft pillow bean, pale lilac-blue fur, droopy half-closed sleepy "
                "eyes, rosy cheeks, a tiny floppy nightcap with a pom-pom, tiny stubby arms hugging a small round alarm clock, "
                "two little feet"),
}

POSES = {
    "blink": "Make its eyes fully closed in a calm blink. Keep everything else exactly the same: the same character, the same pose, the same colours, the same green background.",
    "hit": ("Make it flinch as if bonked by a soft sparkle: eyes squeezed shut, cheeks puffed, leaning back a little, a tiny "
            "surprised mouth. The same character, colours, accessories and the same flat green background."),
    "happy": ("Make it beam with joy: eyes closed in happy arcs, a big open smile, both little arms raised in cheer. The same "
              "character, colours, accessories and the same flat green background."),
    "sleep": ("Make it fast asleep, curled up cozily with its eyes closed and a peaceful smile. The same character, colours, "
              "accessories and the same flat green background."),
}

MOTIONS = {
    "idle": ("the cute little monster breathes slowly, sways sleepily from side to side, blinks its droopy eyes once, then "
             "gives a big cute yawn; the camera does not move; the plain flat green background stays exactly the same"),
    "befriend": ("the cute little monster hops happily twice, waves one little arm and smiles; the camera does not move; "
                 "the plain flat green background stays exactly the same"),
}
WAN_NEG = (ROOT / "scripts" / "art" / "wan-negative.txt")


def zimage(prompt: str, seed: int, prefix: str) -> dict:
    """Z-Image Turbo, 8 steps (scripts/art/quest-art.py)."""
    return {
        "unet": {"class_type": "UNETLoader", "inputs": {"unet_name": "z_image_turbo_int8_convrot.safetensors", "weight_dtype": "default"}},
        "clip": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_3_4b_fp8_mixed.safetensors", "type": "lumina2", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "shift": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["unet", 0], "shift": 3.0}},
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["clip", 0], "text": prompt}},
        "neg": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["pos", 0]}},
        "latent": {"class_type": "EmptySD3LatentImage", "inputs": {"width": SIZE, "height": SIZE, "batch_size": 1}},
        "sample": {"class_type": "KSampler", "inputs": {
            "model": ["shift", 0], "positive": ["pos", 0], "negative": ["neg", 0], "latent_image": ["latent", 0],
            "seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "res_multistep", "scheduler": "simple", "denoise": 1.0}},
        "decode": {"class_type": "VAEDecode", "inputs": {"samples": ["sample", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["decode", 0], "filename_prefix": prefix}},
    }


def qwen_edit(image_name: str, instruction: str, seed: int, prefix: str) -> dict:
    """Qwen-Image-Edit 2511 + Lightning 4-step LoRA (scripts/art/class-art.py)."""
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


def wan_i2v(image_name: str, motion: str, seed: int, prefix: str, size: int = 640, frames: int = 81) -> dict:
    """Wan 2.2 image to video, 14B fp8 with the lightx2v 4-step LoRAs (ComfyUI's "Image to Video (Wan 2.2)" blueprint):
    the high-noise expert takes steps 0-2, the low-noise one 2-4. The frames are saved as PNGs to key one by one."""
    model = lambda unet, lora: {
        f"{unet}": {"class_type": "UNETLoader", "inputs": {"unet_name": f"wan2.2_i2v_{unet}_14B_fp8_scaled.safetensors", "weight_dtype": "default"}},
        f"{unet}_lora": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": [unet, 0], "lora_name": f"wan2.2_i2v_lightx2v_4steps_lora_v1_{lora}.safetensors", "strength_model": 1.0}},
        f"{unet}_shift": {"class_type": "ModelSamplingSD3", "inputs": {"model": [f"{unet}_lora", 0], "shift": 5.0}},
    }
    return {
        **model("high_noise", "high_noise"), **model("low_noise", "low_noise"),
        "clip": {"class_type": "CLIPLoader", "inputs": {"clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "type": "wan", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "wan_2.1_vae.safetensors"}},
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["clip", 0], "text": motion}},
        "neg": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["clip", 0], "text": WAN_NEG.read_text(encoding="utf-8")}},
        "load": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "i2v": {"class_type": "WanImageToVideo", "inputs": {
            "positive": ["pos", 0], "negative": ["neg", 0], "vae": ["vae", 0], "start_image": ["load", 0],
            "width": size, "height": size, "length": frames, "batch_size": 1}},
        "k1": {"class_type": "KSamplerAdvanced", "inputs": {
            "model": ["high_noise_shift", 0], "add_noise": "enable", "noise_seed": seed, "steps": 4, "cfg": 1.0, "sampler_name": "euler",
            "scheduler": "simple", "positive": ["i2v", 0], "negative": ["i2v", 1], "latent_image": ["i2v", 2],
            "start_at_step": 0, "end_at_step": 2, "return_with_leftover_noise": "enable"}},
        "k2": {"class_type": "KSamplerAdvanced", "inputs": {
            "model": ["low_noise_shift", 0], "add_noise": "disable", "noise_seed": seed, "steps": 4, "cfg": 1.0, "sampler_name": "euler",
            "scheduler": "simple", "positive": ["i2v", 0], "negative": ["i2v", 1], "latent_image": ["k1", 0],
            "start_at_step": 2, "end_at_step": 4, "return_with_leftover_noise": "disable"}},
        "decode": {"class_type": "VAEDecode", "inputs": {"samples": ["k2", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["decode", 0], "filename_prefix": prefix}},
    }


def call(path: str, body: dict | None = None, raw: bytes | None = None, headers: dict | None = None, timeout: int = 120) -> bytes:
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(COMFY + path, data=data, headers=headers or {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def run(wf: dict) -> list[dict]:
    """Queues a workflow and waits for it; its saved images."""
    pid = json.loads(call("/prompt", {"prompt": wf}))["prompt_id"]
    while True:
        hist = json.loads(call("/history/" + pid))
        if pid in hist:
            h = hist[pid]
            if h["status"].get("status_str") == "error":
                raise RuntimeError(json.dumps(h["status"])[:1500])
            return h["outputs"]["save"]["images"]
        time.sleep(3)


def fetch(img: dict, dest: Path) -> Path:
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(call("/view?" + q))
    return dest


def upload(src: Path) -> str:
    boundary = "----lmu%d" % random.randrange(10**9)
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{src.name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + src.read_bytes() + \
           f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    return json.loads(call("/upload/image", raw=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}))["name"]


def key(src: Path, dest: Path, size: int = 512, trim: tuple[int, int, int, int] | None = None) -> Path:
    """The green screen keyed out: alpha from how much greener a pixel is than its red and blue, the green spill pulled
    back to them on the edges, trimmed to the character (or to `trim`, so a clip's frames share one box) and squared."""
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    excess = g - np.maximum(r, b)
    alpha = np.clip(1.0 - (excess - 18.0) / 60.0, 0.0, 1.0)  # under 18 kept whole, over 78 gone
    spill = np.minimum(g, np.maximum(r, b) + 12.0)
    out = np.dstack([r, np.where(excess > 0, spill, g), b, alpha * 255.0]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    box = trim or img.getbbox() or (0, 0, img.width, img.height)
    img = img.crop(box)
    side = int(max(img.width, img.height) * 1.08)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - img.width) // 2, side - img.height - int(side * 0.04)))
    square = square.resize((size, size), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    square.save(dest, **({"quality": 86, "method": 6} if dest.suffix == ".webp" else {}))
    return dest


def style(seeds: list[int], grumble: str = "snoozle") -> None:
    for look, words in LOOKS.items():
        for seed in seeds:
            dest = RENDERS / f"style-{look}-{seed}.png"
            if dest.exists():
                continue
            prompt = f"{words}. {GRUMBLES[grumble]}. {BACKDROP}"
            t = time.time()
            fetch(run(zimage(prompt, seed, f"lmu/grumble-{dest.stem}"))[0], dest)
            print(f"{dest.name} ({time.time() - t:.0f} s)", flush=True)


def poses(look: str, seed: int) -> None:
    src = RENDERS / f"style-{look}-{seed}.png"
    name = upload(src)
    for pose, instruction in POSES.items():
        dest = RENDERS / f"style-{look}-{seed}-{pose}.png"
        if dest.exists():
            continue
        t = time.time()
        fetch(run(qwen_edit(name, instruction, seed, f"lmu/grumble-{dest.stem}"))[0], dest)
        print(f"{dest.name} ({time.time() - t:.0f} s)", flush=True)


def clip(look: str, seed: int, motion: str) -> None:
    src = RENDERS / f"style-{look}-{seed}.png"
    frames_dir = RENDERS / f"style-{look}-{seed}-clip-{motion}"
    if not frames_dir.exists():
        t = time.time()
        images = run(wan_i2v(upload(src), MOTIONS[motion], seed, f"lmu/grumble-{frames_dir.name}"))
        for i, img in enumerate(images):
            fetch(img, frames_dir / f"{i:03d}.png")
        print(f"{frames_dir.name}: {len(images)} frames ({time.time() - t:.0f} s)", flush=True)
    # One box for every frame (the union of their characters), so the keyed clip doesn't jitter.
    boxes = []
    for f in sorted(frames_dir.glob("*.png")):
        rgb = np.asarray(Image.open(f).convert("RGB")).astype(np.int16)
        mask = (rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])) < 40
        ys, xs = np.nonzero(mask)
        if len(xs):
            boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    keyed = RENDERS / f"{frames_dir.name}-keyed"
    for f in sorted(frames_dir.glob("*.png")):
        key(f, keyed / f.name, 320, box)
    frames = [Image.open(f) for f in sorted(keyed.glob("*.png"))]
    out = RENDERS / f"{frames_dir.name}.webp"
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=62, loop=0, quality=80, method=6)
    print(f"{out.name}: {len(frames)} frames, {out.stat().st_size // 1000} KB")


def sheet() -> None:
    files = sorted(f for f in RENDERS.glob("style-*.png"))
    if not files:
        sys.exit("nothing rendered yet")
    inputs: list[str] = []
    for f in files:
        inputs += ["-i", str(f)]
    w = h = 320
    cols = 5
    labelled = ";".join(
        f"[{i}:v]scale={w}:{h},drawtext=fontfile='{FONT}':text='{f.stem}':x=6:y=6:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6[v{i}]"
        for i, f in enumerate(files))
    layout = "|".join(f"{(i % cols) * w}_{(i // cols) * h}" for i in range(len(files)))
    stack = "".join(f"[v{i}]" for i in range(len(files)))
    graph = f"{labelled};{stack}xstack=inputs={len(files)}:layout={layout}:fill=black[out]" if len(files) > 1 else f"{labelled};[v0]copy[out]"
    out = RENDERS / "_style.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-frames:v", "1", "-q:v", "4", str(out)], check=True)
    print(out)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("style")
    s.add_argument("--seeds", type=int, nargs="+", default=[11, 22])
    s = sub.add_parser("poses")
    s.add_argument("look", choices=LOOKS)
    s.add_argument("seed", type=int)
    s = sub.add_parser("clip")
    s.add_argument("look", choices=LOOKS)
    s.add_argument("seed", type=int)
    s.add_argument("--motion", choices=MOTIONS, default="idle")
    s = sub.add_parser("key")
    s.add_argument("src", type=Path)
    s.add_argument("dest", type=Path)
    sub.add_parser("sheet")
    a = p.parse_args()
    if a.cmd == "style":
        style(a.seeds)
    elif a.cmd == "poses":
        poses(a.look, a.seed)
    elif a.cmd == "clip":
        clip(a.look, a.seed, a.motion)
    elif a.cmd == "key":
        print(key(a.src, a.dest))
    else:
        sheet()


if __name__ == "__main__":
    main()
