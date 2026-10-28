# Ralph loop, 2026-10-28: the base app in Graphite, an ad, an APK by 3 PM

The owner's ask (08:50 Manila): go with **Graphite**; run a loop until 3 PM that builds the app, researches ways to make
it interactive but simple, and keeps improving and fixing; by 3 PM also a **promo video ad** made from free
commercial-use resources with the app shown in use and the most natural voice a local model can give (research first),
and a **working, tested and verified APK**.

Branch `base-app`. Plan: `docs/2026-10-28-base-app.md`.

## Rules for this loop

- Every pass: `Get-Date`, read this doc, work, update this doc before the pass ends.
- No server deploys, no live DB writes, no API spend: the base app is **local-first** today (plan, workouts, food and
  reading progress on the phone). Sending them to the server waits for the owner's yes (B1 deploy).
- The 9:00 studio run comes first: emulator, WSL and ComfyUI stay off until its log says it is done.
- Vera (emulator) is look-only on the server: the base app writes only to the phone, never game events.
- Downloads: free commercial-use stock footage, music and a local voice model are the owner's ask for the ad. No new npm
  packages in the app. Geist comes from a local copy (portfolio `node_modules/geist` 1.7.0, SIL OFL), not a download.
- **APK build starts no later than 12:30** (last time the loop stalled and missed its deadline). A second build with
  later fixes starts no later than 14:00.

## Timeline

| By | What |
|---|---|
| 09:15 | Loop doc, research and ad agents started |
| 12:15 | Base app B1 core on the phone: Graphite + Geist, tabs Today / Train / Read / Eat, plan setup, workout log, books, food log |
| 12:30 | APK build 1 started (WSL lmu-build) |
| 13:15 | APK 1 on the emulator, checked; screen recordings for the ad |
| 14:00 | APK build 2 started with fixes |
| 14:30 | Ad cut |
| 14:55 | This doc, memory, report |

## Status

- [x] Research: simple, interactive workout / reading / food logging (agent): `docs/research/2026-10-28-simple-logging-ux.md`
- [x] Ad research: natural local voice, free footage and music (agent; `D:\App Projects\LevelMeUp ad 2026-10-28/research/voice.md`): Chatterbox (Resemble AI, MIT) picked over Kokoro; 14 Pexels/Mixkit clips; 3 Mixkit tracks; every licence recorded
- [x] Graphite palette + Geist font (subset from the local copy, `scripts/subset-geist.mts`), new icon (rising bars), name
  "LevelMeUp", 0.15.0 / versionCode 18
- [x] Base store (local, `expo-sqlite/kv-store` key `base.v1`) + plan engine (`packages/rules/src/base.ts`: lengths
  incl. Custom and No end date, 2x to 5x days, gym/home picks with fallbacks, Kaizen fixed targets, advice, bests)
- [x] Plan setup (welcome, Men's/Women's, experience, plan length/days/place, home equipment, what hurts, summary,
  first book)
- [x] Today (next workout, chapter, food against targets; "read on N days this week", no streaks)
- [x] Train: workout log with weight × reps, advised weight prefilled so a tick logs it, rest bar (−15 s / +15 s /
  Skip), Gym/Home switch, swap (just today / keep for this block), pain (skip, gentler, stop), next-time tips, finish
  summary with next-time lines, history, best sets, screen kept awake
- [x] Read: 5 books from our 27 stories, bundled with their clay pictures (4.1 MB), chapter cards with the quick check
- [x] Eat: quick add (calories or protein is enough), meals, recent foods one tap, "same as yesterday" per meal, targets
  from weight and goal, Plus card (coming soon)
- [x] Tests + typecheck: rules 518, content 1215, app 1343 + base tests, all green
- [x] APK 1 built (09:22 to 09:35 from 667cc99): 178,173,581 bytes, sha256 `a2d7c1cd…3a39`, 16 KB pages ok (26 arm64
  libraries). Installed over 0.14.1 on the emulator (Success, 0.15.0 / vc18). The whole plan setup ran through (recorded
  for the ad) and landed on Today; Read, Eat, Train, the chapter reader and the workout log open. Found on the emulator:
  story pictures overflowed the screen (fixed: sized from the window), the workout clock redrew the whole log every
  second (fixed: the clock and rest bar redraw alone), "A chapter takes about 3 minutes" under "2 min" (fixed)
- [x] Ad (11:12): `D:\App Projects\LevelMeUp ad 2026-10-28\levelmeup-ad.mp4`, 32.7 s, 1080 × 1920, -14.4 LUFS, plus
  a voice-only cut and a cover. The real app (0.15.0 on the emulator) on a phone held in a hand (green screen keyed with
  perspective) and in a floating phone; captions in Geist; Chatterbox-Turbo voice; "Raising Me Higher" (Mixkit).
  Whisper heard every line over the music. Faceless shots only (Pexels' endorsement rule).
- [x] APK 2 (09:48 to 10:00 from a348c3a): 178,179,837 bytes, sha256 `8d0cfcf5…f636`, 16 KB ok. Installed over APK 1
  (data kept). Me > Start over works. Found: the label fix did not hold; a button that turns from disabled to enabled
  still drew no label (setup's Next, Save targets). Reproduced on the emulator.
- [x] APK 3 (10:08 to 10:20 from 45191ab): 178,186,873 bytes, 16 KB ok. Buttons keep their labels (checked on Save
  targets and the setup's Next). Recorded the ad's footage on it. Found while recording: Swap did nothing for the
  neighbouring-slot picks it offers, and a weight cell could show "..". Both fixed.
- [x] **APK 4 (10:50 to 11:02 from 94960e4), the current one:** `apps/mobile/dist/levelmeup-0.15.0-preview.apk`,
  178,189,861 bytes, sha256 `08bc128c5cda4272d13903821f2d6cbce8b7938b7440adbbc8eeb48daef447cf`, 26 arm64 libraries all
  16 KB aligned. Installed over APK 3 (data kept). Checked on the emulator: Swap replaces the exercise (barbell back
  squat to dumbbell split squats), the exercise page, Eat's earlier day, a chapter reopening at its card, warm-up sets.
- [x] `npm run check:bundle`: 539 files, no secrets, no developer code (09:48, again 11:32)
- [x] APK 5 (11:22 to 11:33 from 6367e84): 178,249,570 bytes, 16 KB ok; light look checked (it keeps you on Me)
- [x] APK 6 (11:34 to 11:43 from 85e8445, the review fixes): 178,247,854 bytes, sha256 `45368bb2…ae91`, 16 KB ok.
  Checked: the light look on every tab, Change plan prefilled past the welcome, kg to lb converting the history
  (60 kg to 132.5 lb) and back
- [x] Research pass 2: `docs/research/2026-10-28-micro-interactions.md`. Applied: a ticked set fills in 200 ms, the
  calorie and protein bars grow to new values (both still with reduced motion), and haptics follow one map
- [x] APK 7 (11:46 to 11:56 from 09f0c83): 178,255,014 bytes, sha256 `b000b72c…5605`, 16 KB ok. Checked in the light
  look (the emulator's own setting): the tester note on the welcome after Start over, a new 4-day plan, a ticked set's
  fill caught mid-animation, haptics in the vibrator log, Pain saving "Knees" as an area that hurts, history and bests
- [x] **APK 8 (12:08 to 12:18 from 0012556), the current one:** `apps/mobile/dist/levelmeup-0.15.0-preview.apk`,
  178,258,514 bytes, sha256 `963a0ce352fadf4113fbdc2cc78ae4fb01b14969ea624c71d46e320e8f11f88d`, 26 arm64 libraries all
  16 KB aligned, bundle scan clean. Installed over APK 7. Checked in the dark look: "Done today" on Today, a typed 40 kg
  carrying to set 2, All sets + to 42.5 on both, the summary's next-time line, Remove with Undo in Train's history,
  Eat's yesterday. Found: "1 sets in 1 min." (fixed after, 5902361)
- [x] APK 9 (12:30 to 12:40 from ab80ee0): checked "Done today", Today's chapter picture, Train's workout preview, "1 set
  in 1 min.". Found: scrolled text ran under the transparent status bar (fixed, 049af95)
- [x] **APK 10 (12:42 to 12:52 from 049af95), the current one:** `apps/mobile/dist/levelmeup-0.15.0-preview.apk`,
  178,261,518 bytes, sha256 `f56fd66d6c8fa0231b17ddaf9a9796926d339e22dc29b522fa8366f4ca9d0cc9`, 26 arm64 libraries all
  16 KB aligned. Installed over APK 9 (data kept). Checked: the status-bar band on a scrolled Today, a history row
  opening its exercise page, finishing "A Calm Mind" offering "Start Habits That Hold"
- [x] Third review: 8 findings fixed (22531e3, eed6ad0)
- [x] **APK 11 (13:03 to 13:13 from eed6ad0), the final one:** `apps/mobile/dist/levelmeup-0.15.0-preview.apk`,
  178,264,158 bytes, sha256 `913ea785d1ac82d6f2ea591d40afb9fc52784b5e1350b1600f3ce60c9c15c082`, 26 arm64 libraries all
  16 KB aligned, bundle scan clean, tests green (rules 520, content 1216, app 1364). Installed over APK 10 (data kept).
  Checked: "3 of 4 done in week 1", Train's "Week 1", Android Back stepping back through setup, Discard with Undo, a
  read chapter labelled "read". Emulator powered off and WSL stopped afterwards (13:17)

## Research applied (docs/research/2026-10-28-simple-logging-ux.md, ranked list)

| # | Idea | Status |
|---|---|---|
| 1 | Tick = done at the shown numbers (advised weight and last reps prefilled) | Done |
| 2 | Quick add on Eat (calories or protein is enough; no name needed) | Done |
| 3 | Rest bar with −15 s / +15 s / Skip, started by the tick, timed per exercise | Done (plus an opt-in alert while the phone is locked) |
| 4 | Recent foods as one-tap chips | Done |
| 5 | Finish screen: sets, time, total, new bests, next time per exercise | Done (no Keep/Change yet) |
| 6 | Weight − / + steppers | Not yet (the number pad opens on tap) |
| 7 | Quiet "new best" with one haptic | Done (a note, no confetti) |
| 8 | Swap sheet with each option's last numbers | Done |
| 9 | "Same as yesterday" per meal | Done |
| 10 | Neutral numbers on Eat ("left" / "over", no red) | Done |
| 11 | Log any day | Done (Eat: earlier days, no missed mark) |
| 12 | Chapter time and resume at the exact card | Done |
| 13 | End of chapter: next chapter or done | Done |
| 14 | A daily nudge that steps back after a week away, permission asked when switched on | Done (Me > Daily reminder) |
| 15 | Weeks, not streaks ("2 of 3 workouts this week", "Read on 4 days this week") | Done |

Also checked at the largest text size (2x): nothing truncates; the workout's "Set" header broke mid-word (fixed).
The home-screen widget now shows the base app (next workout, next chapter, today's food) in Graphite.
Graphite now has its light partner (follows the phone; Me > Look: As the phone, Dark, Light); both pass the contrast
test. Changing the look redraws the app from Today.

Also from the Kaizen research: warm-up sets for the big lifts (50/75/90%) and an exercise page with how-to steps,
the form cue, best set and a top-set chart.

## Independent review (11:21, a fresh agent reading the base-app code)

Twelve findings, all fixed in 82172d8 and 85e8445 with tests:

1. The week after every easy week advised a lighter weight (it judged half-rep sets against full targets): advice and
   prefill now look past easy weeks.
2. Changing days a week mid-plan shifted the week: the new count starts at the week you were on (`weekOffset`).
3. kg/lb only changed the label: stored weights (history, the open workout, body weight) are converted.
4. A redraw after finishing (e.g. the phone switching dark/light) could start a new workout: only Start buttons start one.
5. An unreadable saved record could be overwritten by the next save: it is kept aside first (or saving stops).
6. A new weight prefilled last time's top reps: it starts at the range's bottom.
7. "Swap to a gentler one" could pick a harder neighbouring-slot move: it stays in the movement, closest easier first.
8. Edits in Me wiped kept swaps: they stay; the button now says "Keep it in my plan" (it never expired by block).
9. A finished plan showed "Week 7 of 6" and un-finished after 14 days: Train shows it done; a long break restarts the
   block you were in, and a finished plan stays finished.
10. A swap with done sets then Gym/Home could show the same exercise twice: no duplicates, unique keys.
11. Notification plans could race on fast app switches: they run one at a time.
12. The rest bar could squeeze at large text: it wraps.

Also: read days are the last 7 calendar days; Eat steps back by the calendar (daylight-saving safe). Pain now also
asks where it hurts and leaves exercises that load that area out of future workouts (a867077).

## Second review (12:02, a fresh agent on everything after 85e8445)

Five findings plus one note, all fixed in 0012556 with tests: clearing a weight left an old digit in the sets that
followed it; "All sets" showed 0 kg and gave empty sets a weight; a double Undo could restore a workout twice; the first
quiz answer might not be announced (now spoken via `announceForAccessibility`); removing a workout that leaves a 14-day
gap restarts the plan (the note now says so). The note: a phone's scheduled dark/light switch redrew the app mid-use and
lost screen-only state; the phone's switch is now taken when the app comes to the front.

## Third review (12:55, a fresh agent on the whole base app, as a user meets it)

Eight findings, all fixed in 22531e3 and eed6ad0 with tests: screens kept yesterday after a night in the background
(and "Again" could log into yesterday) - a clock now follows the app coming to the front and midnight; "0 of 3 this
week" right after "Done today" - the count names its plan week; a workout finished the next morning was dated then -
it takes the last ticked set's time when open over 3 hours; an empty swap list gave no reason - it says what to do;
Discard had no Undo - it has; Android Back left the setup - it steps back; read chapters were shown by colour only -
they say "read" and show a check; "week 2 of 5" contradicted "4 weeks building up" - it counts 1 to 4. Also: the
targets screen says Save waits for body weight.

## Decisions made in the loop

- **Local-first, no account:** the base app keeps everything on the phone and Grumble Camp's game store no longer
  starts (no sync, no game notifications; planned game reminders are cleared once). Testers' server data is untouched.
  Server sync for the new data waits for the owner's yes (B1 deploy).
- **Books ship inside the app** (27 stories in 5 books, with pictures), so Read works offline with no account. New
  books from the studio need the download step (B2).
- **The home-screen widget** still shows Grumble Camp's last snapshot (B4 clean-up).
- **Gym picks favour loaded lifts** (barbell, machine, dumbbells) over bodyweight versions; at home with nothing,
  push-up variations stand in for arms and shoulders.

## Needs the owner (nothing here was done without a yes)

- **Merge `base-app` into `main`** (the APKs are built from `base-app`).
- **B1 deploy:** server tables and sync for plans, workouts, reading and food, so data survives a new phone; then
  copying testers' workout history and reading progress. Proposal: `docs/2026-10-28-base-sync-design.md`. Today everything lives on the phone only, and "Start over" or
  uninstalling removes it.
- **B2:** book downloads from the 9 AM studio (needs `expo-file-system`); today the 5 books ship inside the app.
- **B3:** AI food logging for Plus (photo, voice, sentence): model, cost per log and Plus price.
  Rough cost per log, worked out from Anthropic's price list (dated 2026-10-06), not measured: a phone photo is about
  1,400 tokens, plus about 600 for our instructions, and about 800 back (the answer plus the model's thinking).

  | Model | Photo | Sentence | 5 photos a day, a month |
  |---|---|---|---|
  | Haiku 5.5 ($0.10 / $0.50 per million tokens) | ~$0.0006 | ~$0.0005 | ~$0.09 |
  | Sonnet 5.5 ($2 / $10) | ~$0.012 | ~$0.009 | ~$1.80 |
  | Opus 5.5 ($4 / $20) | ~$0.024 | ~$0.019 | ~$3.60 |

  Voice would first become a sentence through the phone's own speech-to-text (not checked yet). A real test of the
  accuracy and cost on 20 meal photos would cost well under $1, and it waits for a yes (API spend).
  Research: `docs/research/2026-10-28-ai-food-logging.md` (8 competitors all put AI logging inside their normal paid
  tier; photo estimates run about a third low; recommends keeping Plus at $4.99 a month / $29.99 a year, a review
  screen before anything saves, and 10 AI logs a day; lifetime Plus is the owner's call).
- **The ad:** play it once before posting; the voice was checked by transcript only.
- **Disk:** the ad folder's `tools/` holds 22 GB of local voice models; delete it when the voice is final.
- **Clean-up (B4):** Grumble Camp's screens and server code are still in the repo, unreachable.

## After the loop: new story pictures (owner, 13:50: "the clay and monster images don't fit the app")

- Five styles tried on the same three covers (pencil, gouache, ink, risograph, photo); **flat gouache** picked and all
  171 story pictures redrawn without monsters (935786e; `docs/2026-10-28-base-app.md`, Read).
- **APK 0.15.1 (15:36 to 15:47 from 935786e):** `apps/mobile/dist/levelmeup-0.15.1-preview.apk`, 176,523,626 bytes,
  sha256 `6206c731fee728dffb4858059a829688f4fca53f991cee374cc76f0ad7efbe18`, 26 arm64 libraries all 16 KB aligned,
  bundle scan clean, app tests 1364 and typecheck green. Installed over 0.15.0 (data kept). Checked in dark and light:
  Read's book covers, a chapter's story cards, Today's chapter picture, a chapter reopening where it was left.
  Emulator powered off, WSL stopped, ComfyUI stopped (15:51).

## After the loop: any day, any order (owner, 2026-10-29: "are we able to workout anytime? Switch workout days around?")

- Already true: no fixed weekdays, the week moves on by workouts done, missed days wait. New (caae48e): pick any
  workout not done this week in Train (Today links there); a days-a-week change keeps the week's workouts; a second
  workout on the same day asks first ("You already trained today"), never blocks.
- **APK 0.15.2 (03:18 to 03:25 from caae48e):** `apps/mobile/dist/levelmeup-0.15.2-preview.apk`, 176,532,918 bytes,
  sha256 `f87941f68ae57191b4e585789b3858661ea00dccc6d99c4c286b36e2a838bfeb`, 26 arm64 libraries all 16 KB aligned,
  bundle scan clean (539 files), app tests 1369, rules/content/server tests and typecheck green. The first try ran out
  of Java heap (a stale WSL VM held 11 GB); `wsl --shutdown` and a rebuild fixed it. Installed over 0.15.1 (data
  kept) and checked (`apps/mobile/dist/0.15.2-check.png`): Workout C picked and started out of order, the question on
  Train and on Today, "Not now", the link to Train; the test workouts removed after. Emulator off, WSL stopped (03:31).

## Log

- 08:50 loop planned; research and ad agents started.
- 09:07 rules + content committed (2a41216); 09:13 app B1 (96ac973); 09:21 polish (667cc99); 09:24 plan fix (5ae4f40).
- 09:22 studio's 9:00 run finished (article-169 published), ComfyUI stopped; APK 1 build started, emulator booting.
- 09:35 APK 1 built and installed; 09:36 setup recorded; 09:40 to 09:45 emulator check, fixes (44d89ec, 993db5a).
- 12:28 a second cut of the ad with the male Chatterbox voice (`levelmeup-ad-male.mp4`, 31.6 s, Whisper-checked).
- 13:13 APK 11 built; 13:16 checked; emulator off, WSL stopped.
- 13:03 third review fixed; last APK 11 started.
- 12:52 APK 10 built and checked.
- 12:40 APK 9 checked; 12:42 final APK 10 started with the book-finished moment, history links and the status-bar band.
- 12:30 APK 9 build started (Train preview, Today picture, "1 set").
- 12:18 APK 8 built and checked (dark look); "1 set" copy fixed after.
- 12:08 second review fixed (0012556); final APK build started; bundle scan clean again.
- 11:56 APK 7 built and checked (light look); after it: workout removal with Undo, All sets only with a weight, Start over stops the rest timer.
- 11:43 APK 6 built and checked.
- 11:34 APK 5 built (widget, light look, done-today, plan changes); light look checked; APK 6 started with the review fixes.
- 11:21 to 11:30 review (12 findings) fixed.
- 11:12 ad cut v2 rendered and checked; sent to the owner. 11:05 APK 4 installed and checked.
- 10:50 APK 4 build started (swap fix, number cells, day switcher, chapter resume, welcome back).
- 10:22 to 10:48 footage recorded on APK 3 (setup, three warm-up workouts, workout, reading, food, tabs).
- 10:00 APK 2 built; 10:05 the label bug reproduced; 10:08 APK 3 started.
- 09:46 APK 2 build started; 09:48 stopped and restarted from a348c3a after the setup recording's contact sheet
  showed a real bug: a button that turned from disabled to enabled lost its label on Android (the same text-view reuse
  bug as "Add a set" on 2026-10-15). The label now gets a fresh view per state and fills the button.
