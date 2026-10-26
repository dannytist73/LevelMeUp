# Monster Buddy (2026-10-25)

**In plain words:** your class hatches a little clay monster, your buddy. It is your character now: it stands on Me, it
grows at levels 5 and 10, it throws the shots when a battle plays, and it hosts your camp. The manhwa portraits are gone
(retired the same day). Classes, stats and abilities don't change, and neither does the server.

Owner's choice, 2026-10-25: "Let's go with your picks like Monster Buddy", on the canvas "Monster Week Characters"
(https://claude.ai/artifact/3eL3d1UgrQPaiVj1ezoehE). That takes my picks on its last board too: the Shadow repainted in
clay, quest pictures where your buddy does the quest, and the daily studio painting clay lesson pictures.

## Decisions

1. **One buddy per class**, named in `packages/content/src/buddies.ts`: Warrior Pummel (a pink baby dragon), Mage Starkit
   (a violet star fox), Rogue Whisk (a navy cat in a cyan mask), Monk Mochi (a white seal pup in a lilac robe). The buddy
   follows the class, so a class change brings the new class's buddy (the change screen says so).
2. **Three sizes** by level, as the portrait tiers were: little (1–4), grown (5–9), grand (10+). Growing is the level-up's
   moment at 5 and 10, in place of the old new-portrait moment.
3. **Five stills per size**, painted like the Grumbles (scripts/art/buddy-art.py): idle, blink, happy, throw and sleep,
   brought to life in the app (breathing, blinking). Never sad: a lost battle shows it idle.
4. **Where it shows:** the portrait frame on Me and in sign-up's reveal (Plus frames and the Shadow's mark stay on it); the
   level-up at 5 and 10; the battle replay, where the shots leave its paw; the camp, beside the fire.
5. **Quest pictures:** the buddy doing the quest, one per art key (33) per class, bundled in the app. The little buddy
   first; grown and grand versions later, each falling back to the little one until painted.
6. **The Shadow:** one clay painting (16:9, bundled), with the eyes' glow back on its painted eyes.
7. **Lesson pictures** (owner, 2026-10-26: "Clay people + their Grumble", "Repaint them in clay"): each story's regular as
   a little clay figure in the turning moment, and when the story is about a habit a Grumble stands for, that Grumble
   beside them. Painted with a little monster in its place, then swapped for the real Grumble by Qwen-Image-Edit with the
   Grumble's still as its second image, so it looks like itself (scripts/art/story-art.py `grumble`). The studio's scene
   step names the Grumble (or none). Pictures live in `lmu-art/story-clay/article-<n>.webp`; the phone shows a deck's
   picture from that folder only, so a deck still naming a flat `story-v1` picture shows its cover. The 26 stored stories
   are repainted and sent with `npm run studio -- pictures`: lmu-articles-studio's new `picture` action uploads each at
   its article's own path, then names it on the deck through `article_set_picture` (migration 0021; the service role
   could only set a deck that was still empty). New studio stories go to `story-clay` from the next run.
   Switched on after the 9:00 run of 2026-10-26, so that morning's article couldn't be caught halfway.
8. **Not now:** growing clips (Wan), arrival and befriending clips, renaming your buddy.
9. **A picture on every story card** (owner, 2026-10-26: "Story pictures + living buddy", "Paint all 26 straight away"):
   each story card gets its own clay picture of that card's moment, `story-clay/article-<n>-<card>.webp` (cards from 1),
   rendered like the cover in its clothes and with its Grumble, and swapped for the real Grumble the same way
   (scripts/art/story-art.py `beats`, `beatgrumbles`, `beatpick`). The card the cover already shows reuses the cover. A
   card without a usable picture reads as text, as before. The deck names them in `scenes` (one or null per card) and
   the story's Grumble in `grumble` (migration 0022, `article_set_scenes`; `npm run studio -- scenes` sends the stored
   set through lmu-articles-studio's `scenes` action). The daily studio paints a new story's cards after its cover
   (two takes each, Claude's pick), and sends them with the story. After the story, the cards are no longer painted:
   the story's Grumble shrinks and cheers up on why it works, your buddy thinks over the quick check (a sixth still,
   `think`) and cheers when you're right (a miss leaves it calm), and it is happy on the lesson. Older apps ignore the
   new fields. Live 2026-10-26 08:22 Manila (owner: "Go ahead with 0.13.0"), before that day's 9:00 run so it painted
   its own story in clay with its cards: 0021 and 0022 applied (decks.sql 52 assertions), lmu-articles-studio v7, the
   studio worktree fast-forwarded, the 26 stored stories' clay covers and 139 card pictures uploaded and named (165
   public links checked). The studio runs story-art.py with ComfyUI's Python, which has the swap's scipy.

## Order

Buddy art (base, grow, poses) → content and app (BuddyArt, Portrait, Reveal, Celebration, BattleResult, Camp, class
change) → Grumble stills in (pick) → clay Shadow → quest pictures → tests, typecheck, bundle check, review → dev build and
emulator → the studio's clay pictures.
