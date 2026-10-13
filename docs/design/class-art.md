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
| `warrior-b` | a woman with a high black ponytail, a fitted black t-shirt under an open jacket, wrapped fists raised (a "sports top" drew a crop top with the wraps out of frame) |
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

**Lessons (M9a, 2026-10-13).**

- Name the garment plainly and put the props inside the frame. "A black sports top" drew a crop top with the hand wraps
  below the edge in all three seeds; "a fitted black athletic t-shirt … wrapped fists raised in front of her chest" got
  both right at once.
- Qwen-Image-Edit ages faces and recolours clothes. Of the first 16 edits, three aged the face (one of them also turned
  the white hand wraps black), two changed it, and one turned a dark jacket tan. Saying "the same young adult face and
  age" and "the same dark clothes" in the keep-instruction fixed all six at the second seed.
- Each edit names the tier-1 seed it grew from (`warrior-a-2-from11-1.png`), so a changed pick never reuses another face's
  edit.
- The edit comes back square (1024×1024, `FluxKontextImageScale`); `pick` covers 768×804, trimming about 18 px a side.
- The women's figures render with finer lines and smaller in the frame than the men's, alike across the four classes. The
  set reads as one; a later set could even the style.
