# Monster Week (2026-10-25)

**In short.** Every three quest days a small monster, a Grumble, arrives. Each one stands for something that gets in
the way (Snoozle is the snooze button, Scrollo the endless feed). The day's quests charge power; a quest that hits the
Grumble's weakness counts double. When the third day ends, the battle plays by itself: with enough power the Grumble
becomes a friend in your camp, and without it the Grumble stays for a rematch and needs a little less next time.
Nothing is ever taken away. Levels, stats, ladders, the Pact and the readings all stay; the streak and the XP bar move
from Today to Me. The whole app takes the cute Monster Week look.

Picked by the owner from the cute-redesign canvas (https://claude.ai/artifact/WPt3muajoHVsMbd1vRi4XF, direction 3) on
2026-10-25. Branch `monster-week`, from `premium-pass` (d2f770b), which is what the server runs today.

## The owner's choices (2026-10-25)

| Question | Answer |
| --- | --- |
| How much of the app changes look | The whole app. Moonlight stays as a Plus look. |
| Fonts | Lilita One for titles (one download, yes). Text keeps M PLUS Rounded. |
| The Shadow | Stays the Pact's figure, recoloured only. It is not a Grumble. |
| Monster art | A mix: monsters painted on this PC (ComfyUI) and animated live in the app, plus AI-animated clips (Wan 2.2) for arrivals, battles and befriending. Not flat vectors. |
| Before making all 24 | A style test: Snoozle in three painted looks, each moving both ways, on one page. |
| Effects | React Native Skia (one download, yes): power shots, sparkle trails, bursts, frame-by-frame clips. |

## The rules (packages/rules `battle.ts`, test-first)

Deterministic and derived from what the server already stores (quest days and their quests), so there is **no new
table**: the same facts always give the same camp. The server decides; the phone only redraws today's power from its
own unsent completions until the next sync.

- **Battle windows.** Battle *n* covers quest days 3n−2, 3n−1 and 3n. Day numbers count away days too, so the clock
  moves on its own.
- **Power.** Each cleared quest of a day in the window gives 1 power, 2 when its stat is the Grumble's weakness. The
  weaknesses are the four trainable stats; recovery quests count like any other.
- **Need.** Each day of the window adds `min(3, quests that day)`; a protected day (planned rest, pain, outage, no
  quests, or a check-in that protected it) and an away day add 0; a day not built yet adds 3. Then
  `need = max(2, total − 1 − min(rematch, 3))`. Three normal days: 9 − 1 = **8**. Need only ever falls as the days
  are built: resting lowers it, it never rises.
- **Decided.** When the window's last day has closed, or a later day exists. A window with no day rows at all (all away)
  is skipped: no battle, no rematch.
- **Won** when power ≥ need. The opponent is the roster Grumble befriended the fewest times, ties in roster order, so a
  loss keeps the same Grumble (a rematch) and the book fills in order; once all 24 are friends the cycle starts again
  (each friend then shows how many times it joined).
- **Rematch** = losses in a row against the current Grumble; each makes it 1 friendlier, at most 3.
- **Late completions** (the 7-day late window) can still raise a decided battle's power: being derived, a lost battle
  that later reaches its need becomes won, and the phone shows the joining then.
- **When it ends.** The window's last day's end, from the rules' own day windows (time zone and day boundary), so the
  clock is exact: battles end at the day boundary (4:00 by default), and the result is waiting in the morning.

## Server (`supabase/functions/_shared`)

- `loadHistory` adds one aggregate read, as the player: every day's number, status, whether it is protected, how many
  quests it had, and its cleared quests counted by stat.
- `stateView` adds `battle` (the current one: Grumble, rematch, days with their power and need, need, power, ends at) and
  `camp` (times each Grumble was befriended, and the latest decided battle with its power by stat) from `monsterWeek`.
- No migration. `MIN_APP_VERSION` stays (older apps ignore the new fields). Functions deploy needs the owner's yes.

## The app

- **Look**: a new default palette, Monster Night (night #191B33, panel #24274A, lime #B6F04A as the accent, candy
  #FF6FB5 for battle highlights, glow #4FD8FF); Lilita One for display, title and heading; chunkier buttons with a
  pressed-down lip, rounder cards, a new tab bar. The Shadow's red stays its own. Every pairing keeps the contrast tests.
- **Tabs**: Today, Camp, Lessons (the Library), Me (Character, with the streak, the XP bar and the Chronicle).
- **Today**: the arena on top (the Grumble, its line, its weakness, the battle clock, the power bar to its need); every
  quest shows the power it gives. Clearing one fires a power shot at the Grumble. Everything else on Today stays.
- **Battle result**: shown once when a battle is decided: the replay, then "joined your camp" or "stays for a rematch".
- **Camp**: the campfire with the friends, the Grumble here now, and the Grumble book (24 slots, unknown ones dark).
- **First days**: a one-time card explains the week on day 1.

## Art pipeline (after the style test)

1. Style test (this PC, free): Snoozle painted in three looks (plush toy, clay figure, soft painted sticker), each as a
   live puppet (parts animated in code) and as a Wan 2.2 clip, on one page. The owner picks.
2. The 24: a still per pose (idle, hit, happy, sleep) on-model with Qwen image edit, parts split, plus clips for the
   big moments. Clips download from the art bucket when needed (upload needs the owner's yes); stills ship in the app.

## Order of work and checks

1. Rules `battle.ts` with tests -> content roster and copy with lint tests -> server history + state with unit tests ->
   phone `game/battle.ts` with tests. (No art needed.)
2. Style test after the 09:00 studio run (ComfyUI, about 8 GB free needed).
3. Look and kit, Skia, the Grumble component, Today, result, Camp, Me. Tests, typecheck, check:bundle, check:functions.
4. Independent reviews. Then, each with the owner's yes: functions deploy, test:live, a local dev build (versionCode 13)
   for the emulator rows (a new test character, never Vera), the 0.11.0 preview APK.
