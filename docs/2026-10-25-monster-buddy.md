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
7. **Lesson pictures:** the studio paints clay scenes; the app shows a deck's picture again only from the clay folder.
   Done separately, because it changes the 9:00 job.
8. **Not now:** growing clips (Wan), arrival and befriending clips, renaming your buddy.

## Order

Buddy art (base, grow, poses) → content and app (BuddyArt, Portrait, Reveal, Celebration, BattleResult, Camp, class
change) → Grumble stills in (pick) → clay Shadow → quest pictures → tests, typecheck, bundle check, review → dev build and
emulator → the studio's clay pictures.
