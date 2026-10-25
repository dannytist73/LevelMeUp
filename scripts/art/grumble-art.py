"""Monster Week's Grumbles (docs/2026-10-25-monster-week.md, art pipeline), painted in the owner's local ComfyUI.

Each Grumble is a few stills the app brings to life (apps/mobile/src/ui/GrumbleArt.tsx): idle, blink, hit, happy and sleep,
on a flat green screen that is keyed out to transparency. Z-Image Turbo paints the idle still; Qwen-Image-Edit 2511 makes
the other poses from it, so the Grumble stays on-model; Wan 2.2 (image to video, 4-step) animates the big moments.

Start ComfyUI first (as scripts/art/story-art.py says), and run with its Python (PIL, numpy and scipy):
  D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe scripts/art/grumble-art.py style [--seeds 11 22]
    -> art/grumbles/renders/style-<look>-<seed>.png   (the style test: Snoozle in each look)
  grumble-art.py paint ID LOOK [--seeds 11 22]      -> art/grumbles/renders/<id>-<look>-<seed>.png (any Grumble)
  grumble-art.py poses STEM                          -> <stem>-<pose>.png (blink, hit, happy, sleep), STEM a render's name
  grumble-art.py clip STEM [--motion idle]           -> <stem>-clip-<motion>/ (frames) + <stem>-clip-<motion>.webp
  grumble-art.py black STEM                          -> <id>-black-<seed>.png: the still on black, without the green light
                                                        (pale Grumbles catch it, and it keys out with the backdrop); then
                                                        `poses <id>-black-<seed>` and pick that stem
  grumble-art.py key SRC DEST                        -> DEST, the backdrop keyed out, trimmed, square, 512 px
  grumble-art.py sheet                               -> art/grumbles/renders/_style.jpg (every style render)
  grumble-art.py pick                                -> apps/mobile/assets/grumbles/<id>-<pose>.webp from PICKS, and
                                                        apps/mobile/src/art/grumbles.ts (the app's manifest)
Existing renders are skipped, so a changed prompt needs new seeds (or the old renders deleted).
"""
import argparse, json, random, shutil, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

COMFY = "http://127.0.0.1:8188"
ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "art" / "grumbles" / "renders"
SIZE = 1024
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
# Never green: the green screen is keyed out.
GRUMBLES = {
    "snoozle": ("a small round sleepy monster shaped like a soft pillow bean, pale lilac-blue fur, droopy half-closed sleepy "
                "eyes, rosy cheeks, a tiny floppy nightcap with a pom-pom, tiny stubby arms hugging a small round alarm clock, "
                "two little feet"),
    "scrollo": ("a small round monster with glowing sky-blue skin, big shiny dazzled eyes, a long curly tail that coils like a "
                "scrolling ribbon, a swirl-shaped antenna, holding a tiny glowing phone close to its face"),
    "laterpillar": ("a chubby little caterpillar monster with soft lavender segments dotted with pale pink spots, a sleepy "
                    "content smile, tiny round glasses pushed up on its head, holding a little hourglass"),
    "knowitowl": ("a round fluffy owl monster with cream and sky-blue feathers, oversized round glasses, a tiny graduation cap, "
                  "smug half-lidded eyes, a closed book tucked under one wing"),
    "fizzbit": ("a small bubbly soda-pop monster made of translucent pink jelly with little bubbles rising inside it, a bendy "
                "striped straw sticking up like an antenna, sparkly excited eyes"),
    "pingle": ("a tiny round bell-shaped monster in pale sky blue with a little silver bell on its head and a white speech "
               "bubble floating above it, wide alert eyes, little vibration lines around it"),
    "slumpkin": ("a squishy lavender-grey cushion monster slumped and half melted into a tiny soft sofa, droopy heavy eyelids, "
                 "holding a little TV remote, very comfy"),
    "skimmy": ("a small flat flying-fish monster with pale aqua scales and long fins, zooming over an open book with speed "
               "lines, eager wide eyes"),
    "nightowlet": ("a tiny dark indigo baby owl monster with huge glowing eyes, wrapped in a small blanket, holding a little "
                   "popcorn bucket, faint screen glow on its face"),
    "tabbit": ("a white bunny monster with far too many long ears, six of them, each tipped in a different pastel colour like "
               "browser tabs, frazzled swirly eyes"),
    "comfortoise": ("a little tortoise monster whose shell is a cozy blanket fort with a pillow on top, wearing fuzzy slippers, "
                    "a content sleepy smile, cream and lilac colours"),
    "blurb": ("a round speech-bubble shaped monster, white and puffy with a big open mouth, a tiny folded newspaper hat, "
              "excited eyes"),
    "stiffle": ("a stiff little monster made of folded beige paper with boxy limbs and tiny hinge joints, standing very straight "
                "and rigid, worried eyes, a few creak lines"),
    "grabbit": ("a pastel pink bunny monster with long stretchy grabby arms, always clutching a glowing phone in both paws, "
                "eager eyes"),
    "excusaurus": ("a tiny chubby baby dinosaur monster in pastel purple holding an umbrella, wearing sunglasses and a scarf all "
                   "at once, a sheepish grin"),
    "forgetto": ("a fluffy cloud-puff monster in dreamy pale blue with a little hat sliding off its head, a string tied in a bow "
                 "around one finger, a puzzled look"),
    "rushkin": ("a tiny round coral pink monster mid-run, out of breath with little sweat drops, wearing tiny sneakers, a "
                "stopwatch on a string around its neck"),
    "juggles": ("a cheerful little jester monster in purple and sky blue with four arms juggling a mug, a phone, a book and a "
                "ball at once, a tiny bell hat"),
    "shyling": ("a shy little ghost-like blob monster in white and pale pink peeking out from behind a small pillow, rosy "
                "blushing cheeks, big timid eyes"),
    "zonkle": ("a round pastel blue-violet monster with spiral swirl eyes and a little propeller beanie, a dazed happy smile"),
    "liftle": ("a small boxy lift-shaped monster in lilac and silver, sliding doors for a mouth, two round button cheeks with "
               "little arrows, a tiny bell on top, a lazy grin"),
    "cloudle": ("a fluffy white cloud monster floating a little above the ground, dreamy half-closed eyes, a tiny crescent moon "
                "and two little stars drifting around it"),
    "mehbit": ("a droopy grey-lilac bunny monster that looks like a half-deflated balloon, ears flopped down, mid-sigh with "
               "half-closed eyes"),
    "shrugget": ("a little buttery cream nugget-shaped monster with surprisingly big shoulders raised in a huge shrug, palms up, "
                 "a who-knows face"),
}

POSES = {
    "blink": "Make its eyes fully closed in a calm blink. Keep everything else exactly the same: the same character, the same pose, the same colours, the same plain background.",
    "hit": ("Make it flinch as if bonked by a soft sparkle: eyes squeezed shut, cheeks puffed, leaning back a little, a tiny "
            "surprised mouth. The same character, colours, accessories and the same plain background."),
    "happy": ("Make it beam with joy: eyes closed in happy arcs, a big open smile, both little arms raised in cheer. The same "
              "character, colours, accessories and the same plain background."),
    "sleep": ("Make it fast asleep, curled up cozily with its eyes closed and a peaceful smile. The same character, colours, "
              "accessories and the same plain background."),
}

MOTIONS = {
    "idle": ("the cute little monster breathes slowly, sways sleepily from side to side, blinks its droopy eyes once, then "
             "gives a big cute yawn; the camera does not move; the plain flat green background stays exactly the same"),
    "befriend": ("the cute little monster hops happily twice, waves one little arm and smiles; the camera does not move; "
                 "the plain flat green background stays exactly the same"),
}
WAN_NEG = (ROOT / "scripts" / "art" / "wan-negative.txt")

# A pale character's underside catches the green screen's light and keys out with it (holes under a white chin). Qwen puts
# it on black instead, lit neutrally, and the key reads brightness there.
BLACK = ("Replace the green background with a plain flat solid pure black background and remove all the green light from the "
         "character, so it is lit by soft neutral white studio light. Keep the character exactly the same: the same shape, pose, "
         "face, colours and accessories.")


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


def _edge(a: np.ndarray) -> np.ndarray:
    """A render's border, 12 px deep: only backdrop there."""
    return np.concatenate([a[:12].ravel(), a[-12:].ravel(), a[:, :12].ravel(), a[:, -12:].ravel()])


def on_green(rgb: np.ndarray) -> bool:
    """The green screen Z-Image paints on; otherwise the black `black` puts a still on."""
    return float(np.median(_edge(rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])))) >= 20.0


def alpha_of(rgb: np.ndarray) -> np.ndarray:
    """How much of each pixel is the character (see `key`).

    On the green screen, by how green it is, against the backdrop's own greenness sampled from the border: at least `gone`
    green is backdrop, at most `kept` is the character; then everything inside the outline is solid (a chin that caught the
    green light) except a gap that is fully backdrop.

    On black, by how bright it is, so a glow fades out as it does on black. Dark parts enclosed by the character (eyes, a
    dark mouth) are solid, but an enclosed gap the black shows through (inside a halo ring, between an arm and the body),
    as dark as the border, stays clear."""
    if on_green(rgb):
        excess = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
        backdrop = float(np.median(_edge(excess)))
        gone, kept = backdrop * 0.55, backdrop * 0.15
        alpha = np.clip((gone - excess) / (gone - kept), 0.0, 1.0)
        solid = ndimage.binary_fill_holes(alpha > 0.5) & (alpha > 0)
        return np.where(ndimage.binary_erosion(solid, iterations=3), 1.0, alpha)
    bright = rgb.max(axis=2)
    floor = float(np.percentile(_edge(bright), 99))
    alpha = np.clip((bright - floor - 4.0) / 40.0, 0.0, 1.0)
    holes, n = ndimage.label(ndimage.binary_fill_holes(alpha > 0.5) & (alpha <= 0.5))
    if n:
        # A gap is as dark as the border's middle (1-3 on Qwen's black); eyes and dark fur measure 13 and up.
        lit = np.asarray(ndimage.median(bright, holes, np.arange(1, n + 1))) > float(np.median(_edge(bright))) + 5.0
        alpha = np.where(np.concatenate([[False], lit])[holes], 1.0, alpha)
    return alpha


def union(boxes: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int]:
    return min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)


def box_of(src: Path) -> tuple[int, int, int, int]:
    """The character's box in a render."""
    a = alpha_of(np.asarray(Image.open(src).convert("RGB")).astype(np.float32))
    ys, xs = np.nonzero(a > 0.5)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def key(src: Path, dest: Path, size: int = 512, trim: tuple[int, int, int, int] | None = None) -> Path:
    """The backdrop keyed out (alpha_of: Z-Image paints a soft mint backdrop with a vignette and a floor shadow rather than
    a flat green, and no Grumble is ever green, so the green screen keys by greenness; a still on black, by brightness).
    Every pixel loses green above its red and blue. Then trimmed to the character (or to `trim`, so a clip's frames share
    one box) and squared."""
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    alpha = alpha_of(rgb)
    fg = rgb.copy()
    if on_green(rgb):
        # No Grumble is green, so green above red and blue anywhere is the backdrop's light on it (fur picks it up in clips).
        # It comes back as grey, so a green-lit crease keeps its brightness instead of turning dark.
        spill = np.clip(rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2]), 0.0, None)
        fg[..., 1] -= spill
        fg += spill[..., None] * 0.5
    else:
        # On black a half-clear pixel is its colour times its alpha: divided back out, a glow and a soft edge keep their colour.
        fg = np.where(alpha[..., None] > 0, rgb / np.maximum(alpha, 1e-3)[..., None], 0.0)
    out = np.dstack([fg, alpha[..., None] * 255.0]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    box = trim or Image.fromarray((alpha > 0.5).astype(np.uint8) * 255).getbbox() or (0, 0, img.width, img.height)
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


def paint(grumble: str, look: str, seeds: list[int]) -> None:
    for seed in seeds:
        dest = RENDERS / f"{grumble}-{look}-{seed}.png"
        if dest.exists():
            continue
        t = time.time()
        fetch(run(zimage(f"{LOOKS[look]}. {GRUMBLES[grumble]}. {BACKDROP}", seed, f"lmu/grumble-{dest.stem}"))[0], dest)
        print(f"{dest.name} ({time.time() - t:.0f} s)", flush=True)


def seed_of(stem: str) -> int:
    return int(stem.rsplit("-", 1)[1])


def black(stem: str) -> None:
    """The still `stem` on black, as a new stem `<id>-black-<seed>` to make poses from."""
    gid, seed = stem.split("-")[0], seed_of(stem)
    dest = RENDERS / f"{gid}-black-{seed}.png"
    if dest.exists():
        return
    t = time.time()
    fetch(run(qwen_edit(upload(RENDERS / f"{stem}.png"), BLACK, seed, f"lmu/grumble-{dest.stem}"))[0], dest)
    print(f"{dest.name} ({time.time() - t:.0f} s)", flush=True)


def poses(stem: str) -> None:
    src = RENDERS / f"{stem}.png"
    seed = seed_of(stem)
    name = upload(src)
    for pose, instruction in POSES.items():
        dest = RENDERS / f"{stem}-{pose}.png"
        if dest.exists():
            continue
        t = time.time()
        fetch(run(qwen_edit(name, instruction, seed, f"lmu/grumble-{dest.stem}"))[0], dest)
        print(f"{dest.name} ({time.time() - t:.0f} s)", flush=True)


def clip(stem: str, motion: str) -> None:
    src = RENDERS / f"{stem}.png"
    seed = seed_of(stem)
    frames_dir = RENDERS / f"{stem}-clip-{motion}"
    if not frames_dir.exists():
        t = time.time()
        images = run(wan_i2v(upload(src), MOTIONS[motion], seed, f"lmu/grumble-{frames_dir.name}"))
        for i, img in enumerate(images):
            fetch(img, frames_dir / f"{i:03d}.png")
        print(f"{frames_dir.name}: {len(images)} frames ({time.time() - t:.0f} s)", flush=True)
    # One box for every frame (the union of their characters), so the keyed clip doesn't jitter.
    box = union([box_of(f) for f in sorted(frames_dir.glob("*.png"))])
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


# Filled in after the owner picks: Grumble id -> the render stem whose stills ship. The picked clay renders, each put
# on black (`black`) with its poses made again from there.
PICKS: dict[str, str] = {
    "snoozle": "snoozle-black-11", "scrollo": "scrollo-black-11", "laterpillar": "laterpillar-black-22", "knowitowl": "knowitowl-black-22",
    "fizzbit": "fizzbit-black-11", "pingle": "pingle-black-22", "slumpkin": "slumpkin-black-22", "skimmy": "skimmy-black-11",
    "nightowlet": "nightowlet-black-11", "tabbit": "tabbit-black-22", "comfortoise": "comfortoise-black-22", "blurb": "blurb-black-11",
    "stiffle": "stiffle-black-11", "grabbit": "grabbit-black-22", "excusaurus": "excusaurus-black-22", "forgetto": "forgetto-black-11",
    "rushkin": "rushkin-black-22", "juggles": "juggles-black-22", "shyling": "shyling-black-22", "zonkle": "zonkle-black-22",
    "liftle": "liftle-black-11", "cloudle": "cloudle-black-11", "mehbit": "mehbit-black-22", "shrugget": "shrugget-black-11",
}
STILLS = ["idle", "blink", "hit", "happy", "sleep"]
ASSETS = ROOT / "apps" / "mobile" / "assets" / "grumbles"
MANIFEST = ROOT / "apps" / "mobile" / "src" / "art" / "grumbles.ts"


def pick() -> None:
    """Keys the picked stills to 384 px WebP in the app's assets and writes the manifest the app reads."""
    missing = [f"{stem}-{p}.png" if p != "idle" else f"{stem}.png" for stem in PICKS.values() for p in STILLS
               if not (RENDERS / (f"{stem}.png" if p == "idle" else f"{stem}-{p}.png")).exists()]
    if missing:  # check everything before writing anything
        sys.exit(f"missing renders: {', '.join(missing)}")
    # Keyed into a fresh folder that replaces the old one only when all of it is done: a failure halfway leaves the app's
    # pictures and its manifest as they were.
    new = ASSETS.with_name(ASSETS.name + ".new")
    shutil.rmtree(new, ignore_errors=True)
    new.mkdir(parents=True)
    lines = []
    for gid, stem in PICKS.items():
        # One box for all five, so the Grumble keeps its size and place as its pose changes.
        srcs = {p: RENDERS / (f"{stem}.png" if p == "idle" else f"{stem}-{p}.png") for p in STILLS}
        box = union([box_of(src) for src in srcs.values()])
        for p, src in srcs.items():
            key(src, new / f"{gid}-{p}.webp", 384, box)
        poses = ", ".join(f"{p}: require('../../assets/grumbles/{gid}-{p}.webp')" for p in STILLS)
        lines.append(f"  {gid}: {{ {poses} }},")
    shutil.rmtree(ASSETS, ignore_errors=True)
    new.rename(ASSETS)
    head = MANIFEST.read_text(encoding="utf-8").split("/** Filled by the art pipeline")[0]
    MANIFEST.write_text(head + "/** Filled by the art pipeline (scripts/art/grumble-art.py pick), one entry per painted Grumble. */\n"
                        "export const GRUMBLE_ART: Readonly<Record<string, GrumbleStills>> = {\n" + "\n".join(lines) + "\n};\n", encoding="utf-8")
    total = sum(f.stat().st_size for f in ASSETS.glob("*.webp"))
    print(f"{len(PICKS)} Grumbles, {len(PICKS) * len(STILLS)} stills, {total // 1024} KB in {ASSETS}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("style")
    s.add_argument("--seeds", type=int, nargs="+", default=[11, 22])
    s = sub.add_parser("paint")
    s.add_argument("grumble", choices=GRUMBLES)
    s.add_argument("look", choices=LOOKS)
    s.add_argument("--seeds", type=int, nargs="+", default=[11, 22])
    s = sub.add_parser("black")
    s.add_argument("stem")
    s = sub.add_parser("poses")
    s.add_argument("stem")
    s = sub.add_parser("clip")
    s.add_argument("stem")
    s.add_argument("--motion", choices=MOTIONS, default="idle")
    s = sub.add_parser("key")
    s.add_argument("src", type=Path)
    s.add_argument("dest", type=Path)
    sub.add_parser("sheet")
    sub.add_parser("pick")
    a = p.parse_args()
    if a.cmd == "style":
        style(a.seeds)
    elif a.cmd == "paint":
        paint(a.grumble, a.look, a.seeds)
    elif a.cmd == "black":
        black(a.stem)
    elif a.cmd == "poses":
        poses(a.stem)
    elif a.cmd == "clip":
        clip(a.stem, a.motion)
    elif a.cmd == "key":
        print(key(a.src, a.dest))
    elif a.cmd == "pick":
        pick()
    else:
        sheet()


if __name__ == "__main__":
    main()
