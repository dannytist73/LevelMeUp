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
- [ ] Ad research: natural local voice, free footage and music (agent, running)
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
- [ ] Ad: recordings, voice, footage, music, cut
- [x] APK 2 (09:48 to 10:00 from a348c3a): 178,179,837 bytes, sha256 `8d0cfcf5…f636`, 16 KB ok. Installed over APK 1
  (data kept). Me > Start over works. Found: the label fix did not hold; a button that turns from disabled to enabled
  still drew no label (setup's Next, Save targets). Reproduced on the emulator.
- [ ] APK 3 (10:08 from 45191ab: one border width for every button, the button redrawn when it turns on or off; plus
  the exercise page, warm-up sets, rest alert) built, installed, checked
- [x] `npm run check:bundle`: 539 files, no secrets, no developer code (09:48)

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

Also from the Kaizen research: warm-up sets for the big lifts (50/75/90%) and an exercise page with how-to steps,
the form cue, best set and a top-set chart.

## Decisions made in the loop

- **Local-first, no account:** the base app keeps everything on the phone and Grumble Camp's game store no longer
  starts (no sync, no game notifications; planned game reminders are cleared once). Testers' server data is untouched.
  Server sync for the new data waits for the owner's yes (B1 deploy).
- **Books ship inside the app** (27 stories in 5 books, with pictures), so Read works offline with no account. New
  books from the studio need the download step (B2).
- **The home-screen widget** still shows Grumble Camp's last snapshot (B4 clean-up).
- **Gym picks favour loaded lifts** (barbell, machine, dumbbells) over bodyweight versions; at home with nothing,
  push-up variations stand in for arms and shoulders.

## Log

- 08:50 loop planned; research and ad agents started.
- 09:07 rules + content committed (2a41216); 09:13 app B1 (96ac973); 09:21 polish (667cc99); 09:24 plan fix (5ae4f40).
- 09:22 studio's 9:00 run finished (article-169 published), ComfyUI stopped; APK 1 build started, emulator booting.
- 09:35 APK 1 built and installed; 09:36 setup recorded; 09:40 to 09:45 emulator check, fixes (44d89ec, 993db5a).
- 10:00 APK 2 built; 10:05 the label bug reproduced; 10:08 APK 3 started.
- 09:46 APK 2 build started; 09:48 stopped and restarted from a348c3a after the setup recording's contact sheet
  showed a real bug: a button that turned from disabled to enabled lost its label on Android (the same text-view reuse
  bug as "Add a set" on 2026-10-15). The label now gets a fresh view per state and fills the button.
