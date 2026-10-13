# M9a — Class Art — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The painted class portraits replace the ink emblem. There are four classes, two figures each, and three
tiers that change at levels 5 and 10. The Shadow gets its painted art on its scene (board F2). The portrait shows on
Character (board D4), on the reveal (board O08), and on the level-up when the tier changes. The player picks the figure
with "Switch portrait", and the choice is kept on the phone.

**Architecture:**
- **The pictures** are made locally, like the quest art, with the owner's ComfyUI:
  - each figure's first tier with Z-Image Turbo;
  - its tiers 2 and 3 edited from that picture with Qwen-Image-Edit 2511, so the same person grows.
- **The 25 files** go to the public `lmu-art` bucket in a new folder, `class-v1/`. They have fixed names
  (`<class>-<figure>-<tier>.webp`, `shadow.webp`) and no manifest.
- **The phone** builds each address from the class, the figure and the level (`src/art/portraits.ts`). A picture that
  can't load leaves the emblem in its frame, as it is today.
- **The figure** is a phone-only setting, `lmu.portrait`, kept like the vow.
- **Nothing changes on the server:** no migration, no function, no native module, so no EAS build.

**Tech Stack:**
- **App:** as M8b (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, expo-sqlite's key-value store, Jest 29 +
  RNTL 14), with React Native's own `Image`, which has Android's disk cache.
- **Art:** Python in the ComfyUI venv, with Z-Image Turbo and Qwen-Image-Edit 2511 plus its Lightning 4-step LoRA, as in
  the Inkbound pipeline. ffmpeg makes the contact sheets and the WebP files.

**Specs:**
- MVP spec §1.3: Character, "Portrait, level and XP".
- MVP spec §1.5: class art from the Inkbound manhwa pipeline.
- MVP spec §4.3: the Shadow's "creeping shadow mark on the character portrait".
- MVP spec, content tasks: class art.
- Visual spec §6: "Class portraits (four classes, changing with level) and the Shadow, from the Inkbound manhwa art
  pipeline".
- Visual spec §3, board D4: the portrait frame. Board O08: the reveal. Board F2: the Shadow's scene, and "the portrait's
  mark is a dark corner edged in ember".
- Roadmap row 9, and the rows carried to M9:
  - M5: "the class portrait on the reveal";
  - M6d: "the painted class portraits, changing with the level, replace the framed emblem (`src/ui/Portrait.tsx`)";
  - M7c: "the Shadow's painted art on its scene (board F2), and the mark on the painted portraits".

---

## Plain summary

When M9a is done:

- **Your character has a face.** Character shows a painted portrait of your class in the tilted paper frame of board D4:
  - a modern-day person in the quest art's ink-and-cream manhwa style;
  - the class in their clothes and what they carry (hand wraps for a Warrior, a book for a Mage, a hood for a Rogue,
    prayer beads for a Monk).
- **It grows with you.** There are three tiers:
  - **Levels 1–4:** plain clothes on a paper background.
  - **Levels 5–9:** the class's gear and red speed lines.
  - **Level 10 on:** a master's coat or robes and a red aura.

  It's the same person each time, edited from the first picture. The level-up at 5 and at 10 shows the new portrait and
  says "Your portrait has changed."
- **Two figures per class, a man and a woman.** "Switch portrait" on the reveal and on Character swaps them, and the
  choice is kept on the phone.
  - **Before you choose:** the Women's training program starts with the woman; anything else starts with the man.
- **The reveal shows your portrait** under your class name.
- **The Shadow gets its painted art** on its scene: a figure of black ink and smoke with two red eyes. The mark on your
  portrait (the dark corner edged in ember) now creeps over the painted picture.
- **Offline:** a portrait you've seen once stays on the phone. One you haven't seen yet shows the class emblem until the
  phone is online.
- **Your part:**
  - **Look at the set:** you get one contact sheet of all 25 pictures before anything is uploaded. Swap any you dislike
    (I render more).
  - **Say yes to the upload:** 25 files to the `lmu-art` bucket, in the dashboard, as with the quest art. Until then
    the app shows the emblem.
  - **What it costs and touches:** nothing (local rendering), and nothing of the wedding's.

## Decisions this plan makes

These are Claude's recommendations, under the owner's "use your recommendations" for this session's build loop. The
upload still waits for the owner's yes in chat.

1. **M9 splits in two**, as M6, M7 and M8 did:
   - **M9a, Class art** (this plan): the pictures and where the app shows them. Phone and art only.
   - **M9b, The pilot build:**
     - the release build without the developer screens;
     - `lmu-sync`'s speed (11–15 s a call in the live tests);
     - a minimum app version the server can ask for;
     - Settings → About and privacy;
     - the pacing re-run with experienced players modelled;
     - a pilot report (read-only);
     - the EAS preview APK, and one checklist for the Find X9.

   Art comes first, so the preview build carries it.
2. **The set is 24 portraits and the Shadow.**
   - **Portraits:** 4 classes × 2 figures × 3 tiers.
   - **Tiers:** levels 1–4, 5–9 and 10 on, the class path's unlocks (spec §2.5).
   - **Figures:** `a` is a man and `b` a woman, both adults in their twenties.
   - **One picture per class, figure and tier:** variants can come later.
3. **The same person grows.**
   - **Tier 1:** Z-Image Turbo, three seeds per figure; the best is picked.
   - **Tiers 2 and 3:** each is edited from the picked tier 1 with Qwen-Image-Edit 2511 (one seed first, a second
     where the face drifts). They are never chained 1 → 2 → 3, so the face moves at most once from the original.
4. **The style:**
   - the quest art's Ink Panel manhwa (bold ink, flat cel shading, cream paper, one vermilion accent, light halftone);
   - a waist-up figure facing the viewer;
   - the modern world of the quest art, with the class in clothes and props, and no words or letters.
   - **The tiers add gear, and red where it means reward:** speed lines at tier 2, an ember aura at tier 3 (the design
     system keeps red for reward and commitment).
   - **The Shadow** is the same ink on a dark ground: a smoky silhouette with two vermilion eyes, as the placeholder
     panel already suggests.
5. **The figure is the player's choice, kept on the phone:**
   - **Storage:** kv `lmu.portrait` = `a` | `b`, like the vow (M5 owner decision 3). Nothing goes to the server: it's
     cosmetic.
   - **Before a choice:** the program style decides. `women` shows `b`, `men` and `none` show `a`.
   - **Where to switch:** "Switch portrait" on the reveal and on Character.
   - **Clearing it:** deleting the character or starting over forgets it.
   - **A Google-saved character restored on a new phone** shows the default until switched.
6. **Hosting:**
   - **Where:** the public `lmu-art` bucket, folder `class-v1/`.
   - **File names:** `warrior-a-1.webp` … `monk-b-3.webp` and `shadow.webp`.
   - **No manifest:** the set is complete by construction. A later change is published as `class-v2`, so no phone
     keeps a stale copy (the quest art's rule).
   - **When a picture can't load** (before the upload, or offline before it was first seen), the frame keeps the
     class's ink emblem. The scene keeps its dark panel with two ember eyes.
   - **The phone doesn't prefetch:** the reveal shows tier 1 online, and a new tier first appears on a level-up that
     came from the server, so the natural first view caches each picture.
7. **Sizes:**
   - **Portraits:** rendered 1024×1072, published 768×804 (the D4 frame is 1:1.04 and at most 260 dp wide, so about
     780 px at 3×).
   - **The Shadow:** rendered 1344×768, published 960×540.
   - **All files:** WebP quality 80.
   - **The scene's art panel** becomes 16:9, like the quest art (it was a 150 dp strip).
8. **Where the portrait shows:**
   - **Character** (D4): the mark stays an SVG corner drawn over the picture.
   - **The reveal** (O08): under the class name.
   - **The level-up:** at levels 5 and 10 only.
   - **The Shadow's scene** (F2): its own art.
   - **Not on Today:** board D1 has no portrait.
   - **Screen readers:** the portrait's label stays "Warrior portrait, level 6"; the figure isn't described.
9. **The owner sees the set before it goes up:**
   - **Picking:** Claude picks from the contact sheets, as with the quest art, and sends one sheet of the final 25. The
     owner can swap any picture (more seeds are rendered).
   - **The upload:** the dashboard, in the owner's Brave, needs his yes. Each file is then checked byte for byte.
10. **A developer screen**, `/dev/portraits`, shows every class, figure and tier and the Shadow, so the set can be
    checked on a device before a test character reaches level 5 or 10.

## File structure

| File | Change |
|---|---|
| `scripts/art/class-art.py` | New: renders, edits, contact sheets, and the picked set in `art/class/v1/` |
| `docs/design/class-art.md` | New: the brief, the subjects, the tiers, the method, the lessons |
| `.gitignore` | `art/class/renders/` |
| `art/class/v1/*.webp` | New: the 25 published files (committed, as the quest art) |
| `packages/content/src/character.ts` | `CHARACTER_TEXT.switchPortrait` |
| `packages/content/src/play.ts` | `PLAY_TEXT.celebration.portrait` |
| `apps/mobile/src/art/portraits.ts` | New: tiers, addresses, the figure |
| `apps/mobile/src/state/store.ts` | `portrait`, `setPortrait`, `PORTRAIT_KEY` |
| `apps/mobile/src/ui/Portrait.tsx` | The painted picture over the emblem |
| `apps/mobile/src/screens/Character.tsx` | The figure, Switch portrait |
| `apps/mobile/src/screens/onboarding/Reveal.tsx` | The portrait and Switch portrait |
| `apps/mobile/src/screens/Celebration.tsx` | The new portrait at levels 5 and 10 |
| `apps/mobile/src/screens/ShadowScene.tsx` | The painted Shadow |
| `apps/mobile/app/dev/portraits.tsx`, `app/dev/index.tsx`, `app/dev/character.tsx` | The gallery; its link; the preview store's new fields |
| `apps/mobile/test/portraitArt.test.ts`, `test/portraits.test.tsx` | New tests |
| `apps/mobile/test/support/store.ts`, `test/store.test.ts`, `test/accountability.test.tsx` | The store fields; the store tests; the Portrait call |
| Docs | The roadmap (rows 9a and 9b), the visual spec §6, the MVP spec, the checklist, the As built |

---

### Task 0: Baseline

- [ ] **Step 1:** On branch `m9a-class-art` (from `m8b-reading` 42fb189), run:

```bash
npm test -w @levelmeup/content && npm test -w @levelmeup/mobile && npm run typecheck -w @levelmeup/mobile
```

Expected: everything passes. Note the counts for the As built.

---

### Task 1: The art script and the brief

**Files:**
- Create: `scripts/art/class-art.py`, `docs/design/class-art.md`
- Modify: `.gitignore`

- [ ] **Step 1: Write `scripts/art/class-art.py`**

```python
"""LevelMeUp class portraits and the Shadow (M9a), rendered in the owner's local ComfyUI.

Tier 1 of each figure comes from Z-Image Turbo; tiers 2 and 3 are edited from the picked tier 1 with Qwen-Image-Edit 2511
(Lightning 4-step LoRA), so the same person grows (M9a decision 3). The workflows follow the Inkbound pipeline.

Start ComfyUI first (Windows Application Control blocks torchaudio, so use the no-audio starter):
  Start-Process D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe run_noaudio.py -WorkingDirectory D:\\ai\\ComfyUI

usage (with D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe):
  class-art.py render [SUBJECT ...] [--seeds 11 22 33]  -> art/class/renders/<subject>-1-<seed>.png (shadow-<seed>.png)
  class-art.py grow [SUBJECT ...] [--seeds 1]           -> art/class/renders/<subject>-<2|3>-<seed>.png from PICKS' tier 1
  class-art.py sheet [PATTERN]                          -> art/class/renders/_sheet-<page>.jpg (renders matching PATTERN)
  class-art.py pick                                     -> art/class/v1/<subject>-<tier>.webp, shadow.webp (from PICKS)
  class-art.py final                                    -> art/class/_set.jpg (the picked set, for the owner)
Existing renders are skipped.
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
    "warrior-b": "an adult woman in her twenties with a high black ponytail and a determined look, athletic build, wearing a black sports top under an open zip jacket and white cloth hand wraps",
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
KEEP = ("Keep the same person: the same face, hair, skin tone and body, facing the viewer, waist-up. Keep the same bold "
        "black ink lineart, flat cel shading and cream paper palette with one vermilion red accent. {change} Keep the "
        "picture free of any text, letters or numbers.")

# Filled in after picking from the sheets: subject -> {tier: seed}; the Shadow is {"shadow": {1: seed}}.
PICKS: dict[str, dict[int, int]] = {}


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


def grow(subject: str, tier: int, seed: int) -> Path:
    dest = RENDERS / f"{subject}-{tier}-{seed}.png"
    if dest.exists():
        return dest
    picked = PICKS.get(subject, {}).get(1)
    if picked is None:
        sys.exit(f"pick {subject}'s tier 1 first (PICKS)")
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
    sources = {s: {t: RENDERS / (f"shadow-{PICKS[s][t]}.png" if s == "shadow" else f"{s}-{t}-{PICKS[s][t]}.png") for t in tiers}
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
    a = p.parse_args()
    if a.command == "render":
        for subject in a.subjects or [*SUBJECTS, "shadow"]:
            if subject != "shadow" and subject not in SUBJECTS:
                sys.exit(f"unknown subject {subject}")
            for seed in a.seeds or [11, 22, 33]:
                print(render(subject, seed), flush=True)
    elif a.command == "grow":
        for subject in a.subjects or list(SUBJECTS):
            for tier in (2, 3):
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
```

- [ ] **Step 2: Write `docs/design/class-art.md`**

```markdown
# Class portraits and the Shadow (M9a)

Four classes, two figures each, three tiers, and the Shadow: 25 files in the public `lmu-art` bucket's `class-v1/`
folder. The app builds each address from the class, the figure and the level (`apps/mobile/src/art/portraits.ts`); a
picture that can't load leaves the class's ink emblem in the frame.

**Style.** The quest art's Korean manhwa illustration in the Ink Panel palette: bold black ink lines, flat cel shading,
cream paper, one vermilion accent, light halftone. A modern-day adult, waist-up, facing the viewer; the class shows in
clothes and props. No words, letters, numbers or logos.

**Tiers** follow the class path's unlocks: levels 1–4 (plain clothes, paper background), 5–9 (the class's gear, red speed
lines), 10 on (a master's coat or robes, an ember aura). Red marks reward, as everywhere in the design system.

**Figures.** `a` is a man, `b` a woman, both in their twenties. The player switches on the reveal and on Character; before
a choice, the Women's program shows `b` and anything else `a` (kept on the phone, `lmu.portrait`).

**Made with** the owner's local ComfyUI (`scripts/art/class-art.py`): tier 1 with Z-Image Turbo (three seeds, the best
picked), tiers 2 and 3 each edited from the picked tier 1 with Qwen-Image-Edit 2511 and its Lightning 4-step LoRA, so the
same person grows and the face moves at most once from the original. Portraits are rendered 1024×1072 and published
768×804 (the D4 frame is 1:1.04); the Shadow 1344×768 → 960×540. WebP quality 80. A changed set is published as
`class-v2`, so no phone keeps a stale copy.

| Subject | Tier 1 |
|---|---|
| `warrior-a` | a man with short black hair, a determined look, a black t-shirt and white hand wraps |
| `warrior-b` | a woman with a high black ponytail, a black sports top under an open jacket, white hand wraps |
| `mage-a` | a man with tousled dark hair and round glasses, a knit sweater, a closed hardcover book |
| `mage-b` | a woman with shoulder-length dark hair, a long cardigan over a turtleneck, a closed hardcover book |
| `rogue-a` | a man with messy dark hair and sharp eyes, a dark hooded jacket (hood down) and a scarf |
| `rogue-b` | a woman with a short dark bob and sharp eyes, a dark hooded jacket (hood down), fingerless gloves |
| `monk-a` | a man with a shaved head and a serene look, a loose linen shirt, wooden prayer beads |
| `monk-b` | a woman with a long low braid and a serene look, a loose linen top, wooden prayer beads |
| `shadow` | a looming figure of black ink and smoke with two narrow vermilion eyes, ember sparks, a dark empty space |

| Class | Tier 2 (levels 5–9) | Tier 3 (levels 10 on) |
|---|---|---|
| Warrior | a training jacket with a vermilion stripe, a vermilion headband, speed lines | a long black coat, a raised fist, an ember aura, a burst of ink |
| Mage | a long dark coat, the book open with small glowing circles and lines, speed lines | a high-collared coat, rings of light rising from the open book, an aura |
| Rogue | the hood up (face visible), a scarf, a vermilion glint in the eyes, speed lines | a long hooded coat, a thin smoky aura, a burst of ink |
| Monk | a wrap-style training top with a cloth belt, a glow around the hands, soft rays | flowing robes, palms together, a serene aura, a vermilion sun circle |
```

- [ ] **Step 3: `.gitignore`.** After the quest-art lines, add:

```
# Class art renders (M9a): only the picked set in art/class/v1 is kept
art/class/renders/
art/class/_set.jpg
```

- [ ] **Step 4: Check the script parses, then commit**

```bash
python -c "import ast,sys; ast.parse(open('scripts/art/class-art.py',encoding='utf-8').read()); print('ok')"
git add scripts/art/class-art.py docs/design/class-art.md .gitignore
git commit -m "M9a: the class-art script and brief (Z-Image tier 1, Qwen-Image-Edit tiers 2 and 3, contact sheets, the picked set)"
```

---

### Task 2: Render and pick (local, runs while the app tasks are built)

No remote change and no cost. ComfyUI runs on the laptop's RTX 4070 (8 GB). The Qwen edit model is offloaded to RAM,
so an edit takes minutes. Run this task in the background and continue with Task 3. Come back at each step.

- [ ] **Step 1: Start ComfyUI** (if it isn't answering on http://127.0.0.1:8188/system_stats):

```powershell
Start-Process D:\ai\ComfyUI\venv\Scripts\python.exe run_noaudio.py -WorkingDirectory D:\ai\ComfyUI
```

- [ ] **Step 2: Tier 1 and the Shadow** (27 renders):

```bash
/d/ai/ComfyUI/venv/Scripts/python.exe scripts/art/class-art.py render
/d/ai/ComfyUI/venv/Scripts/python.exe scripts/art/class-art.py sheet
```

Look at every sheet, `art/class/renders/_sheet-*.jpg` (Read shows them). For each subject, pick the seed with:
- one clear adult facing the viewer, waist-up;
- the class props right (hand wraps, a book, the hood down, beads);
- no letters or marks;
- hands drawn whole;
- the face readable at 260 dp.

For the Shadow: two eyes, a silhouette, no face. When none of a subject's three seeds works, render `--seeds 44 55 66`
for it. When a subject fails twice, reword it as the quest art's lessons say (name the body position plainly; say what
is there, never what isn't). Fill `PICKS` with `{subject: {1: seed}}` and `"shadow": {1: seed}`.

- [ ] **Step 3: Tiers 2 and 3** (16 edits, one seed each):

```bash
/d/ai/ComfyUI/venv/Scripts/python.exe scripts/art/class-art.py grow
/d/ai/ComfyUI/venv/Scripts/python.exe scripts/art/class-art.py sheet "*-[23]-*"
```

Compare each edit with its tier 1. Keep it when it's recognisably the same person (face, hair, skin tone), facing the
viewer, the tier's gear present, and no letters. Where one drifts, run `grow <subject> --seeds 2` (and 3). Fill
`PICKS[subject][2]` and `[3]`.

- [ ] **Step 4: The set**

```bash
/d/ai/ComfyUI/venv/Scripts/python.exe scripts/art/class-art.py pick
/d/ai/ComfyUI/venv/Scripts/python.exe scripts/art/class-art.py final
```

Expected: "25 files in …/art/class/v1"; no file over 200 KB (a warning names any); `art/class/_set.jpg`.

- [ ] **Step 5: Commit the set and the picks**

```bash
git add scripts/art/class-art.py art/class/v1
git commit -m "M9a: the class portraits and the Shadow (art/class/v1, 25 files; picks in class-art.py)"
```

Stop ComfyUI afterwards (it holds the GPU): close its window, or `Stop-Process` the python process that runs
`run_noaudio.py`.

---

### Task 3: Content text

**Files:**
- Modify: `packages/content/src/character.ts`, `packages/content/src/play.ts`
- Test: `packages/content/test/character.test.ts`

- [ ] **Step 1: Write the failing test.** In `packages/content/test/character.test.ts`, add inside the first `describe`:

```ts
  it('names the portrait switch and the new portrait (M9a)', () => {
    expect(CHARACTER_TEXT.switchPortrait).toBe('Switch portrait');
    expect(PLAY_TEXT.celebration.portrait).toBe('Your portrait has changed.');
  });
```

and add `import { PLAY_TEXT } from '../src/play.ts';` below the file's existing imports.

- [ ] **Step 2: Run it.** `npm test -w @levelmeup/content -- character` → FAIL (`switchPortrait` is undefined).

- [ ] **Step 3: Add the words.** In `packages/content/src/character.ts`, after `portrait: '{className} portrait, level {level}',`:

```ts
  /** M9a decision 5: the reveal's and Character's button that swaps the portrait's figure. */
  switchPortrait: 'Switch portrait',
```

In `packages/content/src/play.ts`, in `celebration`, after `titleEarned: 'Title earned: {title}',`:

```ts
    /** M9a decision 8: a level-up that changes the portrait's tier (levels 5 and 10). */
    portrait: 'Your portrait has changed.',
```

- [ ] **Step 4: Run.** `npm test -w @levelmeup/content` → PASS (the lint covers the new lines).

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/character.ts packages/content/src/play.ts packages/content/test/character.test.ts
git commit -m "M9a content: Switch portrait, and the level-up's portrait line"
```

---

### Task 4: Where the pictures are

**Files:**
- Create: `apps/mobile/src/art/portraits.ts`
- Test: `apps/mobile/test/portraitArt.test.ts`

- [ ] **Step 1: Write the failing test** `apps/mobile/test/portraitArt.test.ts`:

```ts
/** @jest-environment node */
import {
  FIGURES, PORTRAIT_BASE, SHADOW_ART_URL, figureFor, otherFigure, portraitChanges, portraitTier, portraitUrl, readFigure,
} from '../src/art/portraits.ts';

describe('the class portraits (M9a)', () => {
  it('reads the class-v1 folder of the public lmu-art bucket', () => {
    expect(PORTRAIT_BASE).toBe('https://knlgpcwoaaygncmlnbsm.supabase.co/storage/v1/object/public/lmu-art/class-v1');
    expect(SHADOW_ART_URL).toBe(`${PORTRAIT_BASE}/shadow.webp`);
  });

  it('changes with the class path: levels 1–4, 5–9, 10 on (decision 2)', () => {
    expect([1, 4, 5, 9, 10, 30].map(portraitTier)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(portraitUrl('warrior', 'a', 1)).toBe(`${PORTRAIT_BASE}/warrior-a-1.webp`);
    expect(portraitUrl('mage', 'b', 7)).toBe(`${PORTRAIT_BASE}/mage-b-2.webp`);
    expect(portraitUrl('monk', 'b', 10)).toBe(`${PORTRAIT_BASE}/monk-b-3.webp`);
    expect([1, 2, 4, 5, 6, 9, 10, 11].filter(portraitChanges)).toEqual([5, 10]);
  });

  it("is the player's figure, or the program style's default (decision 5)", () => {
    expect(FIGURES).toEqual(['a', 'b']);
    expect(figureFor(null, 'women')).toBe('b');
    expect(figureFor(null, 'men')).toBe('a');
    expect(figureFor(null, 'none')).toBe('a');
    expect(figureFor('b', 'men')).toBe('b');
    expect(figureFor(undefined, 'women')).toBe('b'); // a store without the field (the developer previews)
    expect([otherFigure('a'), otherFigure('b')]).toEqual(['b', 'a']);
    expect([readFigure('a'), readFigure('b'), readFigure('c'), readFigure(''), readFigure(null)]).toEqual(['a', 'b', null, null, null]);
  });
});
```

- [ ] **Step 2: Run it.** `npm test -w @levelmeup/mobile -- portraitArt` → FAIL (module not found).

- [ ] **Step 3: Write `apps/mobile/src/art/portraits.ts`**

```ts
// The class portraits (M9a decisions 2–7): four classes, two figures, three tiers by level, and the Shadow, in the public
// `lmu-art` bucket's `class-v1` folder. Fixed names and no manifest: the set is complete. A picture that can't load
// (before the upload, or offline before it was first seen) leaves the class's ink emblem in its frame (src/ui/Portrait.tsx).
import type { ClassId, ProgramStyle } from '@levelmeup/rules';
import { SUPABASE_URL } from '../config.ts';

/** `a` a man, `b` a woman (decision 2). */
export type Figure = 'a' | 'b';
export type Tier = 1 | 2 | 3;

export const FIGURES: readonly Figure[] = ['a', 'b'];
export const PORTRAIT_BASE = `${SUPABASE_URL}/storage/v1/object/public/lmu-art/class-v1`;
export const SHADOW_ART_URL = `${PORTRAIT_BASE}/shadow.webp`;

/** Levels 1–4, 5–9 and 10 on: the class path's unlocks (spec §2.5). */
export function portraitTier(level: number): Tier {
  return level >= 10 ? 3 : level >= 5 ? 2 : 1;
}

export function portraitUrl(classId: ClassId, figure: Figure, level: number): string {
  return `${PORTRAIT_BASE}/${classId}-${figure}-${portraitTier(level)}.webp`;
}

/** Reaching this level changes the portrait (levels 5 and 10; decision 8). */
export function portraitChanges(level: number): boolean {
  return level > 1 && portraitTier(level) !== portraitTier(level - 1);
}

/** The player's choice, or before one the program style's: the Women's program shows `b`, anything else `a` (decision 5). */
export function figureFor(chosen: Figure | null | undefined, programStyle: ProgramStyle): Figure {
  return chosen ?? (programStyle === 'women' ? 'b' : 'a');
}

export const otherFigure = (figure: Figure): Figure => (figure === 'a' ? 'b' : 'a');

/** The kept choice (`lmu.portrait`); anything else counts as none. */
export function readFigure(text: string | null): Figure | null {
  return text === 'a' || text === 'b' ? text : null;
}
```

- [ ] **Step 4: Run.** `npm test -w @levelmeup/mobile -- portraitArt` → PASS. If `ProgramStyle` isn't exported from
  `@levelmeup/rules`, export it from `packages/rules/src/index.ts` next to `PROGRAM_STYLES`. Check with
  `grep -n "ProgramStyle" packages/rules/src/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/art/portraits.ts apps/mobile/test/portraitArt.test.ts
git commit -m "M9a: where the portraits are (tiers by level, the figure, the class-v1 folder)"
```

---

### Task 5: The store keeps the figure

**Files:**
- Modify: `apps/mobile/src/state/store.ts`, `apps/mobile/test/support/store.ts`, `apps/mobile/app/dev/character.tsx`
- Test: `apps/mobile/test/store.test.ts`

- [ ] **Step 1: Write the failing tests.** In `apps/mobile/test/store.test.ts`:
  - add `PORTRAIT_KEY` to the import from `'../src/state/store.ts'` (alphabetically, after `DRAFT_KEY`);
  - add these after the test "reads the vow at boot and shows a new one at once (M6d)":

```ts
  it('keeps the portrait figure on the phone and reads it at boot (M9a decision 5)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(PORTRAIT_KEY, 'b');
    expect(store.getState().portrait).toBeNull();
    await store.getState().boot();
    expect(store.getState().portrait).toBe('b');
    await store.getState().setPortrait('a');
    expect(store.getState().portrait).toBe('a');
    expect(kv.get(PORTRAIT_KEY)).toBe('a');
    store.getState().stop();
  });

  it('reads an unreadable figure as no choice (M9a)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(PORTRAIT_KEY, 'zz');
    await store.getState().boot();
    expect(store.getState().portrait).toBeNull();
    store.getState().stop();
  });

  it('forgets the figure with the character (M9a decision 5)', async () => {
    const { store, local, kv } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().setPortrait('b');
    await store.getState().startOver();
    expect(kv.has(PORTRAIT_KEY)).toBe(false);
    expect(store.getState().portrait).toBeNull();
    store.getState().stop();
  });
```

- [ ] **Step 2: Run.** `npm test -w @levelmeup/mobile -- store.test` → FAIL (`PORTRAIT_KEY` isn't exported; then
  `setPortrait` isn't a function).

- [ ] **Step 3: The store.** In `apps/mobile/src/state/store.ts`:
  - Imports: add `import { readFigure } from '../art/portraits.ts';` and `import type { Figure } from '../art/portraits.ts';`
    beside the other `../art/` import.
  - After `export const TRIAL_KEY = 'lmu.trial';` add:

```ts
/** M9a: the portrait's figure the player chose (decision 5). */
export const PORTRAIT_KEY = 'lmu.portrait';
```

  - In `GameState`, after the `planned` field:

```ts
  /** M9a: the portrait's figure the player chose, kept on this phone (decision 5); null before a choice. */
  portrait: Figure | null;
```

  - In `GameState`, after `saveVow: (text: string) => Promise<void>;`:

```ts
  /** M9a: keeps the portrait's figure on this phone; shown at once, even if the phone can't store it. */
  setPortrait: (figure: Figure) => Promise<void>;
```

  - In `forget`, after `await deps.kv.removeItem(NOTIFY_KEY);` add `await deps.kv.removeItem(PORTRAIT_KEY);`. In its
    `set({ … })`, after `planned: [],` add `portrait: null,`.
  - In the initial state, after `planned: [],` add `portrait: null,`.
  - In `boot`:
    - change the destructuring to
      `const [saved, account, keptArt, vowText, notice, seen, shadow, notifyText, permission, portraitText] = await Promise.all([`;
    - after `deps.notes.permission().catch((): Permission => 'unknown'),` add
      `deps.kv.getItem(PORTRAIT_KEY).catch(() => null),`;
    - in the second `set({ … })`, after `shadowSeen: readSeen(shadow),` add `portrait: readFigure(portraitText),`.
  - After `saveVow`'s implementation, add:

```ts
      setPortrait: async (figure) => {
        set({ portrait: figure });
        await deps.kv.setItem(PORTRAIT_KEY, figure).catch(() => {});
      },
```

- [ ] **Step 4: The test store and the developer preview.** In `apps/mobile/test/support/store.ts`:
  - after `planned: [],` add `portrait: null,`;
  - after `saveVow: jest.fn(async () => {}),` add `setPortrait: jest.fn(async () => {}),`.

  In `apps/mobile/app/dev/character.tsx`, in the preview store's object, after `lastSyncedAt: null` add
  `, portrait: null, setPortrait: async () => {}`, so Switch portrait does nothing in the preview instead of throwing.

- [ ] **Step 5: Run.** `npm test -w @levelmeup/mobile -- store.test && npm run typecheck -w @levelmeup/mobile` → PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/state/store.ts apps/mobile/test/support/store.ts apps/mobile/test/store.test.ts apps/mobile/app/dev/character.tsx
git commit -m "M9a store: the portrait's figure, kept on the phone and forgotten with the character"
```

---

### Task 6: The painted portrait

**Files:**
- Modify: `apps/mobile/src/ui/Portrait.tsx`, `apps/mobile/test/accountability.test.tsx`
- Test: `apps/mobile/test/portraits.test.tsx`

- [ ] **Step 1: Write the failing test** `apps/mobile/test/portraits.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PORTRAIT_BASE } from '../src/art/portraits.ts';
import { Portrait } from '../src/ui/Portrait.tsx';

const hidden = { includeHiddenElements: true } as const;

describe('the painted portrait (M9a)', () => {
  it("shows the class's picture for the figure and the level's tier, over its emblem", async () => {
    await render(<Portrait classId="mage" level={6} figure="b" label="Mage portrait, level 6" />);
    expect(screen.getByLabelText('Mage portrait, level 6')).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/mage-b-2.webp` });
    expect(screen.getByTestId('portrait-emblem', hidden)).toBeTruthy();
  });

  it('keeps the emblem when the picture cannot load (offline before it was first seen)', async () => {
    await render(<Portrait classId="rogue" level={12} figure="a" label="Rogue portrait, level 12" />);
    await fireEvent(screen.getByTestId('portrait-art', hidden), 'error');
    expect(screen.queryByTestId('portrait-art', hidden)).toBeNull();
    expect(screen.getByTestId('portrait-emblem', hidden)).toBeTruthy();
    expect(screen.getByLabelText('Rogue portrait, level 12')).toBeTruthy();
  });

  it('tries the next tier even after a failed one', async () => {
    await render(<Portrait classId="monk" level={9} figure="a" label="Monk portrait, level 9" />);
    await fireEvent(screen.getByTestId('portrait-art', hidden), 'error');
    await screen.rerender(<Portrait classId="monk" level={10} figure="a" label="Monk portrait, level 10" />);
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/monk-a-3.webp` });
  });

  it("draws the Shadow's mark over the picture (M7c decision 9)", async () => {
    await render(<Portrait classId="warrior" level={3} figure="a" label="Warrior portrait, level 3" marked />);
    expect(screen.getByTestId('shadow-mark', hidden)).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run.** `npm test -w @levelmeup/mobile -- portraits` → FAIL (no `portrait-art`; `level` and `figure` aren't props).

- [ ] **Step 3: Rewrite `apps/mobile/src/ui/Portrait.tsx`**

```tsx
// The class portrait (board D4): a paper panel with ink hatching, tilted 2°. M9a: the painted portrait of the class, the
// player's figure and the level's tier (decisions 2, 5), over the class's ink emblem, which shows while it loads or when
// it can't (offline before it was first seen, decision 6). M7c: the Shadow's mark over a corner while the Shadow holds the day.
import type { ClassId } from '@levelmeup/rules';
import { useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';
import { portraitUrl } from '../art/portraits.ts';
import type { Figure } from '../art/portraits.ts';
import { colors, space } from '../theme/tokens.ts';

const EMBLEM: Record<ClassId, string[]> = {
  warrior: ['M6 18 18 6', 'M15 6h3v3', 'M8 13l3 3', 'M5 19l2-2', 'M4 17l3 3'],
  mage: ['M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z', 'M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z'],
  rogue: ['M12 2l2 11h-4z', 'M7 13h10', 'M12 13v6'],
  monk: ['M12 20c-4 0-8-3-8-7 3 0 6 2 8 5 2-3 5-5 8-5 0 4-4 7-8 7z', 'M12 18c-2-3-2-8 0-12 2 4 2 9 0 12z'],
};

/** The frame's ink edge (6 units, half of it inside): the picture sits inside it. */
const EDGE = 3;
const LAYER = { position: 'absolute', left: 0, top: 0 } as const;

export type PortraitProps = { classId: ClassId; level: number; figure: Figure; label: string; marked?: boolean };

export function Portrait({ classId, level, figure, label, marked = false }: PortraitProps) {
  const { width } = useWindowDimensions();
  const w = Math.min(260, width - 2 * space.gutter - 12);
  const h = Math.round(w * 1.04);
  const uri = portraitUrl(classId, figure, level);
  // The address that failed, so a new tier or figure is tried again.
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}
      style={{ alignSelf: 'center', transform: [{ rotate: '-2deg' }], borderWidth: 3, borderColor: colors.paper }}>
      <View style={{ width: w, height: h }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={w} height={h}>
          <Defs>
            <Pattern id="portrait-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Line x1="0" y1="0" x2="0" y2="10" stroke={colors.ink} strokeOpacity={0.1} strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill={colors.paper} />
          <Rect x={EDGE} y={EDGE} width={w - 2 * EDGE} height={h - 2 * EDGE} fill="url(#portrait-hatch)" />
          {/* A group scaled from the 24-unit icon grid: Android drew a nested <Svg> small, in the corner (device check). */}
          <G testID="portrait-emblem" transform={`translate(${w * 0.25} ${h * 0.22}) scale(${(w * 0.5) / 24})`} fill="none"
            stroke={colors.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            {EMBLEM[classId].map((d) => <Path key={d} d={d} />)}
            {classId === 'rogue' && <Circle cx="12" cy="20.5" r="1.5" />}
          </G>
        </Svg>
        {failed !== uri && (
          <Image testID="portrait-art" source={{ uri }} onError={() => setFailed(uri)} resizeMode="cover"
            style={{ position: 'absolute', left: EDGE, top: EDGE, width: w - 2 * EDGE, height: h - 2 * EDGE }} />
        )}
        <Svg width={w} height={h} style={LAYER}>
          {marked && (
            // M7c decision 9: the Shadow's mark, a dark corner creeping in, edged in ember, until the recovery quest is cleared.
            <G testID="shadow-mark">
              <Path d={`M0 ${h} L0 ${h * 0.42} C${w * 0.16} ${h * 0.5} ${w * 0.32} ${h * 0.68} ${w * 0.64} ${h} Z`} fill={colors.void} fillOpacity={0.9} />
              <Path d={`M0 ${h * 0.42} C${w * 0.16} ${h * 0.5} ${w * 0.32} ${h * 0.68} ${w * 0.64} ${h}`} fill="none" stroke={colors.ember} strokeWidth={2.5} />
            </G>
          )}
          <Rect x={0} y={0} width={w} height={h} fill="none" stroke={colors.ink} strokeWidth={6} />
        </Svg>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: The old call.** In `apps/mobile/test/accountability.test.tsx`, the test "marks the header and the portrait…":
  replace both `<Portrait classId="warrior" label="Warrior, level 3"` with
  `<Portrait classId="warrior" level={3} figure="a" label="Warrior, level 3"`.

- [ ] **Step 5: Run.** `npm test -w @levelmeup/mobile -- portraits accountability` → PASS. Typecheck shows the remaining
  callers (Character) until Task 7: `npm run typecheck -w @levelmeup/mobile` lists `Character.tsx` only.

- [ ] **Step 6: Commit** (together with Task 7 if the typecheck must stay green between commits; otherwise now):

```bash
git add apps/mobile/src/ui/Portrait.tsx apps/mobile/test/portraits.test.tsx apps/mobile/test/accountability.test.tsx
git commit -m "M9a: the painted portrait over the emblem (fallback on a failed load, the mark and the frame on top)"
```

---

### Task 7: Character and the reveal

**Files:**
- Modify: `apps/mobile/src/screens/Character.tsx`, `apps/mobile/src/screens/onboarding/Reveal.tsx`
- Test: `apps/mobile/test/portraits.test.tsx`

- [ ] **Step 1: Write the failing tests.** Append to `apps/mobile/test/portraits.test.tsx`. Merge its imports into one
  block at the top:

```tsx
import { CHARACTER_TEXT } from '@levelmeup/content';
import { project } from '../src/game/project.ts';
import { Character } from '../src/screens/Character.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { READY_DRAFT, REVEAL, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';
```

```tsx
describe('Character and the reveal show the portrait (M9a decisions 5, 8)', () => {
  const SERVER = serverState();
  const women = () => {
    const s = serverState();
    return { ...s, profile: { ...s.profile, programStyle: 'women' as const } };
  };

  it('Character shows the painted portrait of the level, and Switch portrait swaps the figure', async () => {
    const store = testStore({ view: project(SERVER, []) });
    await render(withStore(store, <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByLabelText('Warrior portrait, level 1')).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-a-1.webp` });
    await fireEvent.press(screen.getByRole('button', { name: CHARACTER_TEXT.switchPortrait }));
    expect(store.getState().setPortrait).toHaveBeenCalledWith('b');
  });

  it("shows the player's choice, and before one the Women's program shows figure b", async () => {
    await render(withStore(testStore({ view: project(SERVER, []), portrait: 'b' }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-b-1.webp` });
    await render(withStore(testStore({ view: project(women(), []) }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-b-1.webp` });
  });

  it('the reveal shows the class portrait under the class name, with Switch portrait', async () => {
    const store = testStore({ phase: 'not_started', draft: READY_DRAFT, reveal: REVEAL, view: project(SERVER, []) });
    await render(withStore(store, <Reveal onAccept={() => {}} onFix={() => {}} />));
    expect(screen.getByLabelText('Warrior portrait, level 1')).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-a-1.webp` });
    await fireEvent.press(screen.getByRole('button', { name: CHARACTER_TEXT.switchPortrait }));
    expect(store.getState().setPortrait).toHaveBeenCalledWith('b');
  });
});
```

(If `serverState().profile` has no `programStyle` field, read the `Shown` type in `src/game/project.ts` and set the
field it uses.)

- [ ] **Step 2: Run.** `npm test -w @levelmeup/mobile -- portraits` → FAIL (no Switch portrait button).

- [ ] **Step 3: Character.** In `apps/mobile/src/screens/Character.tsx`:
  - Add `import { figureFor, otherFigure } from '../art/portraits.ts';` after the content import.
  - After `const lastSyncedAt = useGame((s) => s.lastSyncedAt);` add:

```tsx
  const chosen = useGame((s) => s.portrait);
  const setPortrait = useGame((s) => s.setPortrait);
```

  - After `const mark = marked(shadowHold(view, now()));` add
    `const figure = figureFor(chosen, view.profile.programStyle);`.
  - Replace the `<Portrait classId={classId} marked={mark}` element with:

```tsx
        <Portrait classId={classId} level={level} figure={figure} marked={mark}
          label={`${fillText(T.portrait, { className, level })}${mark ? ` ${SHADOW_TEXT.markLabel}` : ''}`} />
        <Button label={T.switchPortrait} variant="secondary" onPress={() => void setPortrait(otherFigure(figure))}
          style={{ alignSelf: 'center' }} />
```

- [ ] **Step 4: The reveal.** In `apps/mobile/src/screens/onboarding/Reveal.tsx`:
  - Extend the header comment's last line: `… "Fix an assumption" run the analysis again (the server allows it until the
    first action). M9a: the class portrait, and Switch portrait (decisions 5, 8).` Replace "the class portrait waits for
    M9's art (M5 plan, decision 15)".
  - Add `CHARACTER_TEXT,` to the `@levelmeup/content` import, and these imports:

```tsx
import { figureFor, otherFigure } from '../../art/portraits.ts';
import { Portrait } from '../../ui/Portrait.tsx';
```

  - After `const startCharacter = useGame((s) => s.startCharacter);` add:

```tsx
  const chosen = useGame((s) => s.portrait);
  const setPortrait = useGame((s) => s.setPortrait);
```

  - After `const { profile, character } = view;` add `const figure = figureFor(chosen, profile.programStyle);`.
  - In the `else` branch, right after the `<View style={{ gap: 4 }}>…</View>` that shows the class name, add:

```tsx
        <Portrait classId={profile.classId} level={character.level} figure={figure}
          label={fillText(CHARACTER_TEXT.portrait, { className: CLASS_NAMES[profile.classId], level: character.level })} />
        <Button label={CHARACTER_TEXT.switchPortrait} variant="secondary" onPress={() => void setPortrait(otherFigure(figure))}
          style={{ alignSelf: 'center' }} />
```

- [ ] **Step 5: Run.** `npm test -w @levelmeup/mobile -- portraits onboarding screens accountability && npm run typecheck -w @levelmeup/mobile`
  → PASS. The existing Character test "shows the portrait frame…" still finds "Warrior portrait, level 1".

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/Character.tsx apps/mobile/src/screens/onboarding/Reveal.tsx apps/mobile/test/portraits.test.tsx
git commit -m "M9a: the portrait on Character and the reveal, with Switch portrait"
```

---

### Task 8: The level-up and the Shadow's scene

**Files:**
- Modify: `apps/mobile/src/screens/Celebration.tsx`, `apps/mobile/src/screens/ShadowScene.tsx`
- Test: `apps/mobile/test/portraits.test.tsx`

- [ ] **Step 1: Write the failing tests.** Append to `apps/mobile/test/portraits.test.tsx`. Add `PLAY_TEXT, SHADOW_TEXT` to
  its `@levelmeup/content` import, and these imports:

```tsx
import { SHADOW_ART_URL } from '../src/art/portraits.ts';
import { Celebration } from '../src/screens/Celebration.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { DAY_TWO_NOW, claimedState } from './support/fixtures.ts';
```

(merge them into the existing import lines of the same modules)

```tsx
describe('the level-up shows a new portrait at levels 5 and 10 (M9a decision 8)', () => {
  const SERVER = serverState();

  it('at level 5: the tier-2 portrait and its line', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), celebrations: [{ kind: 'level', level: 5 }] }), <Celebration />));
    expect(screen.getByLabelText('Warrior portrait, level 5')).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-a-2.webp` });
    expect(screen.getByText(PLAY_TEXT.celebration.portrait)).toBeTruthy();
  });

  it('at level 10, with the chosen figure', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), portrait: 'b', celebrations: [{ kind: 'level', level: 10 }] }), <Celebration />));
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-b-3.webp` });
  });

  it('other levels show no portrait', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), celebrations: [{ kind: 'level', level: 6 }] }), <Celebration />));
    expect(screen.queryByTestId('portrait-art', hidden)).toBeNull();
    expect(screen.queryByText(PLAY_TEXT.celebration.portrait)).toBeNull();
  });
});

describe("the Shadow's painted art (M9a decisions 4, 7)", () => {
  it('shows the painted Shadow on its scene, and the dark panel when it cannot load', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    const art = screen.getByTestId('shadow-art', hidden);
    expect(art.props.source).toEqual({ uri: SHADOW_ART_URL });
    expect(screen.getByLabelText(SHADOW_TEXT.art)).toBeTruthy();
    await fireEvent(art, 'error');
    expect(screen.queryByTestId('shadow-art', hidden)).toBeNull();
    expect(screen.getByLabelText(SHADOW_TEXT.art)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run.** `npm test -w @levelmeup/mobile -- portraits` → FAIL (no portrait on the level-up; no `shadow-art`).

- [ ] **Step 3: The level-up.** In `apps/mobile/src/screens/Celebration.tsx`:
  - Header comment: append "M9a: at levels 5 and 10 the new portrait (decision 8)."
  - Imports: `ACHIEVEMENTS, CHARACTER_TEXT, CLASS_NAMES, PLAY_TEXT, fillText` from `@levelmeup/content`, and:

```tsx
import { figureFor, portraitChanges } from '../art/portraits.ts';
import { Portrait } from '../ui/Portrait.tsx';
```

  - After `const dismiss = useGame((s) => s.dismissCelebration);` add:

```tsx
  const view = useGame((s) => s.view);
  const chosen = useGame((s) => s.portrait);
```

  - Replace the level branch's body with:

```tsx
  if (next.kind === 'level') {
    const shown = view !== null && portraitChanges(next.level) ? view.profile : null;
    body = (
      <>
        <Label tone="ember">{T.levelLabel}</Label>
        <Display>{`LV ${next.level}`}</Display>
        {shown !== null && (
          <Portrait classId={shown.classId} level={next.level} figure={figureFor(chosen, shown.programStyle)}
            label={fillText(CHARACTER_TEXT.portrait, { className: CLASS_NAMES[shown.classId], level: next.level })} />
        )}
        <NarrationBox>{fillText(T.level, { level: next.level })}</NarrationBox>
        {shown !== null && <Small>{T.portrait}</Small>}
      </>
    );
  } else {
```

- [ ] **Step 4: The Shadow's scene.** In `apps/mobile/src/screens/ShadowScene.tsx`:
  - Header comment: replace "The painted Shadow arrives with M9; a dark panel holds its place." with "M9a: the painted
    Shadow, over the dark panel that shows while it loads or when it can't."
  - Imports: `import { Image, View } from 'react-native';` and `import { SHADOW_ART_URL } from '../art/portraits.ts';`.
    `useState` is already imported.
  - Replace `function ShadowArt()` with:

```tsx
/** Board F2's art panel (M9a decision 7): the painted Shadow, 16:9 like the quest art, over the dark and two ember eyes that
 * show while it loads, or when it can't (offline before it was first seen). */
function ShadowArt() {
  const [failed, setFailed] = useState(false);
  const eye = { width: 34, height: 7, backgroundColor: colors.vermilion };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={T.art}
      style={{ width: '100%', aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: colors.line, backgroundColor: colors.halftone }}>
      <View style={{ flexDirection: 'row', gap: 22 }}>
        <View style={[eye, { transform: [{ rotate: '10deg' }] }]} />
        <View style={[eye, { transform: [{ rotate: '-10deg' }] }]} />
      </View>
      {!failed && (
        <Image testID="shadow-art" source={{ uri: SHADOW_ART_URL }} onError={() => setFailed(true)} resizeMode="cover"
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
      )}
    </View>
  );
}
```

- [ ] **Step 5: Run.** `npm test -w @levelmeup/mobile && npm run typecheck -w @levelmeup/mobile` → PASS (the whole app suite).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/Celebration.tsx apps/mobile/src/screens/ShadowScene.tsx apps/mobile/test/portraits.test.tsx
git commit -m "M9a: the new portrait on the level-up at 5 and 10, and the painted Shadow on its scene"
```

---

### Task 9: The developer gallery

**Files:**
- Create: `apps/mobile/app/dev/portraits.tsx`
- Modify: `apps/mobile/app/dev/index.tsx`

- [ ] **Step 1: Write `apps/mobile/app/dev/portraits.tsx`**

```tsx
// Development only (M9a decision 10): every class portrait (both figures, each tier) and the painted Shadow, to check the
// set on a device before a test character reaches level 5 or 10.
import { CLASS_NAMES } from '@levelmeup/content';
import { CLASSES } from '@levelmeup/rules';
import type { ClassId } from '@levelmeup/rules';
import { router } from 'expo-router';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIGURES, SHADOW_ART_URL } from '../../src/art/portraits.ts';
import { space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { Portrait } from '../../src/ui/Portrait.tsx';
import { ScreenScroll } from '../../src/ui/ScreenScroll.tsx';
import { SectionTitle } from '../../src/ui/SectionTitle.tsx';
import { Title } from '../../src/ui/Text.tsx';

const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
const LEVELS = [1, 5, 10] as const;

export default function Portraits() {
  const insets = useSafeAreaInsets();
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
      <Title>Portraits</Title>
      {CLASS_IDS.flatMap((c) => FIGURES.map((f) => (
        <View key={`${c}-${f}`} style={{ gap: 16 }}>
          <SectionTitle title={`${CLASS_NAMES[c]} · figure ${f}`} />
          {LEVELS.map((level) => <Portrait key={level} classId={c} level={level} figure={f} label={`${CLASS_NAMES[c]} ${f}, level ${level}`} />)}
        </View>
      )))}
      <SectionTitle title="The Shadow" />
      <Image accessibilityLabel="The Shadow" source={{ uri: SHADOW_ART_URL }} resizeMode="cover" style={{ width: '100%', aspectRatio: 16 / 9 }} />
    </ScreenScroll>
  );
}
```

- [ ] **Step 2: The link.** In `apps/mobile/app/dev/index.tsx`, after the "Shadow preview" button add:

```tsx
      <Button label="Portraits" variant="secondary" onPress={() => router.push('/dev/portraits')} />
```

- [ ] **Step 3: Run.** `npm run typecheck -w @levelmeup/mobile && npm test -w @levelmeup/mobile` → PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/dev/portraits.tsx apps/mobile/app/dev/index.tsx
git commit -m "M9a: the developer gallery of every portrait and the Shadow"
```

---

### Task 10: Checks and an independent review

- [ ] **Step 1: Everything**

```bash
npm test -w @levelmeup/content && npm test -w @levelmeup/rules && npm test -w @levelmeup/mobile && npm run typecheck && npm run check:bundle
```

Expected: all pass; the bundle scan finds no secret.

- [ ] **Step 2: Review.** Dispatch a code-review subagent (superpowers:requesting-code-review) on `42fb189..HEAD`. Give it
  this plan's decisions 2–10 and these points to check:
  - the fallback on a failed load, and that a new tier is retried;
  - the store's boot order (the destructuring matches the `Promise.all` order);
  - that the figure is forgotten with the character;
  - accessibility (one label, no duplicate stops);
  - the mark over the picture;
  - that nothing new reaches the server;
  - the art script's `pick` safety (checks before it clears anything).

  Fix every Critical and Important finding test-first. Record the minor ones.

- [ ] **Step 3: Commit the fixes**, one commit per finding group.

---

### Task 11: The owner's look, the upload (needs the owner's yes), and the switch to the live set

- [ ] **Step 1:** Send `art/class/_set.jpg` with SendUserFile and ask in chat:

  > "Here are the 25 pictures: four classes, a man and a woman each, three tiers (levels 1–4, 5–9, 10 on), and the
  > Shadow. Swap any you don't like (I render more). May I upload them to the `lmu-art` bucket, folder `class-v1`, in
  > the dashboard as with the quest art? It costs nothing and touches nothing of the wedding's."

  Wait for a clear yes. Re-render and re-pick any swaps first (Task 2 Steps 2–5).

- [ ] **Step 2: Upload.** In the owner's Brave with Claude in Chrome:
  - open the Supabase dashboard → Storage → `lmu-art`;
  - create the folder `class-v1`;
  - upload the 25 files of `art/class/v1/`.

  Never touch `v1`, `v2` or `v3`. Brave asks where to pick files: use the scratchpad's `save-dialog.ps1` pattern (paste a
  path) if typing long paths loses characters.

- [ ] **Step 3: Verify byte for byte.** For each local file, download
  `https://knlgpcwoaaygncmlnbsm.supabase.co/storage/v1/object/public/lmu-art/class-v1/<file>` into the scratchpad. Compare
  SHA-256 with the local copy (a short Node script).

  Expected: 25 of 25 identical, each answered 200.

---

### Task 12: Emulator check

The M7d development build (998b72c0) through Metro on port 8082 (`--localhost`, `adb reverse`), as in M8b. No new build.

- [ ] **Step 1: Write the rows** into `docs/device-verification-checklist.md` as a new section "M9a — Class art", after
  M8b's:

```markdown
## M9a — Class art

Emulator unless marked. The M7d development build (998b72c0) through Metro, no new build. Art: `lmu-art/class-v1`.

| # | Check | Result |
|---|---|---|
| 1 | Developer → Portraits: all 24 portraits (each class, both figures, levels 1, 5, 10) and the Shadow load in their frames; at the largest font nothing overlaps. | |
| 2 | Character: the painted portrait of the test character's class and tier in the tilted frame; Switch portrait swaps the figure at once, and the choice is still there after the app restarts. | |
| 3 | Airplane mode after row 2: Character still shows the painted portrait (the phone's cache). | |
| 4 | Developer → Shadow preview: the painted Shadow in the scene's 16:9 panel, the mark stamp and the Shadow's words below. | |
| 5 | A new test character: the reveal shows the class portrait under the class name; Switch portrait there carries to Character. | |
| 6 | A level-up to 5 (or 10): the new portrait and "Your portrait has changed." | |
| 7 | A pact holding the day (the Shadow's mark): the dark corner over the painted portrait. | |
```

- [ ] **Step 2: Run rows 1–4 and 7.** Use the current test character, and a developer preview where one exists. For row 7,
  if no character is under a pact, check it with the developer Character preview: it shows the mark when the real view
  has one; otherwise mark the row as covered by the unit test. Take a screenshot of each (`scratchpad/m9a/`), send the
  Character and gallery shots to the owner, and record the results.
- [ ] **Step 3:** Rows 5–6 wait for the next test character (with Uma's deletion, M8b row 4, after 2026-10-14 08:00
  UTC) and for natural play. Mark them "Pending" with that reason.

---

### Task 13: Docs and As built

- [ ] **Step 1: The roadmap** (`docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`). Replace row 9 with:

```markdown
| 9a | **Class art** | The painted class portraits (4 classes × a man and a woman × 3 tiers at levels 1–4, 5–9, 10 on; the same person edited forward with Qwen-Image-Edit) and the Shadow, in `lmu-art/class-v1`; Character, the reveal, the level-up at 5 and 10, and the Shadow's scene; "Switch portrait", kept on the phone. M9 split in two (M9a decision 1). | `2026-10-13-m9a-class-art.md` |
| 9b | **The pilot build** | The release build without the developer screens; `lmu-sync`'s speed; a minimum app version; Settings → About and privacy; the pacing re-run (experienced players modelled); a pilot report; the EAS preview APK and one Find X9 checklist. The backend is already live since M3. | later |
```

  - In "Carried forward from M5": mark the class-portrait part of the M9 row "*(Done in M9a: the reveal's portrait.)*".
  - In "Carried forward from M6d": the M9 row "*(Done in M9a.)*".
  - In "Carried forward from M7c": the Shadow's painted art row "*(Done in M9a.)*".
  - Change every other `M9` milestone cell in the carried tables to `M9b`.
  - Add a section "Carried forward from M9a" with:
    - | Later | More variants per class and tier, and a title-based look (spec §2.6), once the pilot shows which classes players choose. |
    - | Later | A Google-saved character restored on a new phone shows the default figure until switched (the choice is kept on the phone, decision 5). |
    - | Emulator | M9a rows 5–6 with the next test character. |
    - plus the review's minor findings, if any.

- [ ] **Step 2: The specs.**
  - Visual spec §6: change its first sentence to: "Class portraits (four classes, a man and a woman each, three tiers by
    level) and the Shadow: made in M9a (`docs/design/class-art.md`, `lmu-art/class-v1`)."
  - Visual spec rows O08 and Character: "*M9a: the painted portrait.*"
  - MVP spec line "the painted Shadow with the class art (M9)": "(M9a)".
  - MVP spec §1.3's built note: "the painted portraits come with M9" → "the painted portraits since M9a".

- [ ] **Step 3: As built.** Append a section "## As built (date)" to this plan with:
  - the commits;
  - the test counts;
  - the render counts and the seeds picked;
  - which edits needed a second seed;
  - the file sizes;
  - the review's findings and fixes;
  - the upload time and the sha check;
  - the emulator rows.

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "M9a docs: roadmap rows 9a and 9b, the specs, the checklist, as built"
```

M9a merges after M8b (merge order M5 → … → M8b → M9a), once the owner's Find X9 checks allow the earlier merges.

---

## Self-review (done while writing)

- **Spec coverage:**
  - Visual spec §6, portraits changing with level and the Shadow: Tasks 1, 2, 4, 6, 8.
  - Board D4: Tasks 6–7. Board O08: Task 7. Board F2's painted Shadow and the mark on the painted portrait: Tasks 6, 8.
  - The roadmap's M5, M6d and M7c rows carried to M9: Tasks 7, 6 and 8.
  - The owner's review of the art and the upload: Task 11. Offline behaviour: decision 6, Tasks 6, 8, 12.
  - Nothing in the specs asks for portraits on Today (D1 has none).
- **Placeholders:**
  - `PICKS` is empty by design: it's filled from the sheets in Task 2, as the quest art's was.
  - The checklist results and the As built come from real runs.
- **Types:**
  - `Figure`, `Tier`, `portraitTier`, `portraitUrl`, `portraitChanges`, `figureFor`, `otherFigure`, `readFigure`,
    `FIGURES`, `PORTRAIT_BASE` and `SHADOW_ART_URL` are defined in Task 4.
  - They are used under the same names in Tasks 5 (`readFigure`, `Figure`), 6 (`portraitUrl`, `Figure`), 7 and 8
    (`figureFor`, `otherFigure`, `portraitChanges`), and 9 (`FIGURES`, `SHADOW_ART_URL`).
  - The store's `portrait` and `setPortrait` (Task 5) are what Tasks 7 and 8 read, and what the test store and the
    developer preview provide.
  - `PortraitProps` gains `level` and `figure`. Every caller (Character, Reveal, Celebration, the gallery, the tests) passes
    both.

## As built

- **Built 2026-10-13 (09:00–10:20 UTC)** on `m9a-class-art`: 6c3bc46 the script and brief, 468b61b content, aeacb3c
  `portraits.ts`, 0343195 the store, 011d009 the portrait on Character and the reveal (Tasks 6 and 7 in one commit, so
  the typecheck stays green), 4991a3a the level-up and the scene, 837e150 the gallery, then the review fixes (3e4a4fa,
  bc967d0), the set (90b6125) and the gallery's marked portrait (0dc1e9b). Tests: content 1,099 (from 1,098), rules 449,
  app 790 (from 771); typecheck and `check:bundle` clean.
- **Renders:**
  - **Z-Image:** 30 renders (24 tier-1 portraits, 3 Shadows, and 3 more for `warrior-b` after it was reworded: "a black
    sports top" drew a crop top with the hand wraps out of frame).
  - **Qwen-Image-Edit:** 22 edits (16 at seed 1, then 6 re-rolls at seed 2). Re-rolled: `mage-a` tier 2 (aged),
    `rogue-a` tier 2 (the jacket turned tan), `rogue-b` tiers 2 and 3 (the face changed), `monk-b` tier 2 (aged),
    `warrior-b` tier 2 (aged, the wraps turned black). Each re-roll went right after the keep-instruction gained "the
    same young adult face and age" and "the same dark clothes".
  - **Picks (tier 1 seed; tiers 2 and 3 edit seeds):** warrior-a 11 (1, 1), warrior-b 44 (2, 1), mage-a 11 (2, 1),
    mage-b 11 (1, 1), rogue-a 22 (2, 1), rogue-b 22 (2, 2), monk-a 11 (1, 1), monk-b 11 (2, 1); the Shadow 22.
  - **Files:** 25 WebP, 21–100 KB each, 1,210 KB in all.
- **Deviations from the plan text:**
  - `CHARACTER_TEXT`'s test imports `PLAY_TEXT` into the existing `play.ts` import instead of a second line.
  - `warrior-b`'s subject was reworded (above), and the keep-instruction gained the age and the dark clothes.
  - `class-art.py`: edits are named `<subject>-<tier>-from<pick>-<seed>.png`, `grow` takes `--tiers` and refuses unknown
    subjects (review).
  - `portraitChanges(from, to)` and the level celebration's `from` (review, below).
  - The gallery shows one marked portrait, for checklist row 7.
- **Review (one reviewer, no Critical).** Fixed:
  - A sync that crossed level 5 or 10 on the way to a higher level (4 → 6 after offline days) showed no new portrait: the
    level celebration carries the level it came from, and the portrait shows when the tier changed.
  - A changed tier-1 pick could reuse edits grown from the old face: edits name their source seed.
  - A figure switched back to after a failed load wasn't tried again: the picture is its own component, keyed by its
    address.
  - Tests that the picture is hidden from screen readers and that Switch portrait sends nothing; the import order in
    Character.
  - Carried to the roadmap: a failed first load keeps the emblem until the screen remounts; the developer preview's Switch
    portrait does nothing.
- **Upload (the owner's yes, 2026-10-13 about 10:12 UTC):** the dashboard in the owner's Brave (Claude in Chrome): the
  folder `class-v1` in `lmu-art`, the 25 files through the page's file input. Every public file answered 200 and matched
  its local SHA-256 (25 of 25). `v1`, `v2` and `v3` untouched.
- **Emulator (the M7d development build through Metro, Uma):** rows 1–4 and 7 pass (row 7 in the gallery), rows 5–6
  pending the next test character. Before the upload, Character kept the emblem with Switch portrait under it.
