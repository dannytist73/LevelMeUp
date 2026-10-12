# LevelMeUp — Build Roadmap

**Date:** 2026-10-10 · **Specs:** `../specs/2026-10-10-levelmeup-mvp-design.md` (what), `…-architecture.md` (how),
`…-visual-design.md` (look)

## Plain summary

The MVP is built in nine milestones. Each one ends with something that runs and is tested on its own, and each gets
its own detailed plan, written when the milestone before it is done (so every plan starts from the real code, not
guesses). Only milestone 1's plan exists today.

## Milestones

| # | Milestone | Ends with | Plan |
|---|---|---|---|
| 1 | **Rules core** | The pure TypeScript rulebook: levels, stats and ranks, XP, quest-day windows and time zones, streaks and shields, the check-in, ladders, consequence eligibility, timers, and the pacing simulation that tunes the level curve. About 165 unit tests. | `2026-10-10-m1-rules-core.md` |
| 2 | **Content and day building** | `packages/content`: about 10 ladders and 70 quest templates in three voices, achievements, Shadow lines, a banned-phrase lint. The day builder (spec §3.2), class abilities that shape a day, swap / hard day / rest limits, and the pacing check re-run with real generated days. The owner reviews the content. | `2026-10-10-m2-content-day-builder.md` |
| 3 | **Database and server (live)** | Built live on the DNA Wedding project (owner's decision, no Docker): the `levelmeup` schema at migration 0005 (incl. the code review's `lmu_player` role), RLS, the write functions and pgTAP tests (run in rolled-back transactions); `lmu_service` with wedding-isolation tests; the CLI guard and the `db:deploy` / `db:test` runners; `lmu-sync` (complete, undo, rate; lazy day closing), `lmu-onboarding` (Claude writes the reveal since 2026-10-11; template fallback), `lmu-account-delete`; live tests incl. concurrency. **Done 2026-10-10.** | `2026-10-10-m3-database-server.md` |
| 4 | **App foundation** | `apps/mobile` (Expo SDK 57): Metro and Hermes load the shared packages (spike passed; the device self-check runs the time cases on Hermes); the Ink Panel kit (Latin-subset fonts, slanted panels, narration boxes, stamps, tab bar); tabs and Settings; SQLite cache and outbox with the rules projecting unsent actions; anonymous sign-in with a sealed session; the sync client with retries; a read-only Today; a developer screen; the bundle scan; an EAS development build on the Find X9 talking to the live project. Offline-built days (`provisional_day`) moved to M6 (owner, 2026-10-11). **Done 2026-10-11** (device check on an emulator and the Find X9). | `2026-10-11-m4-app-foundation.md` |
| 5 | **Onboarding** | The 10 onboarding screens, the safety check, the reveal with its template fallback, the vow, "save your character" with Google (spike: linking a Google sign-in to the anonymous user). Owner decisions 2026-10-11: Google through the browser page, "own plan" instead of equipment, the vow kept on the phone. | `2026-10-11-m5-onboarding.md` |
| 6a | **Quest play** | Every quest opens its screen (picture, words in the player's voice, why, steps, safety) and is logged by its panel: check-off, a timer kept as timestamps (counts with the screen off, claim at 80 %), a rep log, one sentence; "Quest cleared" (board D2) with rating and undo; level-ups and achievements once the server confirms them; the quest art set (20 pictures, the public `lmu-art` bucket, migration 0007). M6 split in four (owner, 2026-10-11). **Built 2026-10-11** (emulator check passed; Find X9 rows pending); merges after M5. | `2026-10-11-m6a-quest-play.md` |
| 6b | **Adjusting the day** | Swap, hard day, a rest day, "I felt pain" (gentle movement or rest, a doctor or physiotherapist when it keeps coming back), resume, step down after "Too hard", class change, Stillness and Dawn Ritual, Vanish (phone only); eight adjustment events through one planner and `levelmeup.adjust` (migration 0008); the offers travel with the state. Reaches players together with M6a (the pain flow). **Built 2026-10-11**; merges after M6a. | `2026-10-11-m6b-adjusting-the-day.md` |
| 6c | **Kaizen training** | Equipment and program style (Men's / Women's / No preference) on a new onboarding Training step and in Settings → Training (the `training` event, migration 0009); a 53-exercise library and three programs from `docs/research/kaizen-training.md` and the coaching videos (facts kept, words our own); strength days lead with a workout of 3–4 exercises planned for the player's equipment, limits and program day, logged set by set, on a 6-rung `workout` ladder; titles without numbers; per-exercise art keys (the `v3` set, 33 pictures); the pacing re-run (all targets met). **Built 2026-10-12**; deployed 2026-10-12 (migration 0009, the functions, the v3 art); merges after M6b. | `2026-10-12-m6c-kaizen-training.md` |
| 6d | **Character and Chronicle** | Character as board D4 (a framed class emblem until M9's portraits, the title, stats with bars to the next point, the class path, achievements, the vow, the class change) and Chronicle as D5 (streak tiles, a month calendar of the last 92 days with real dates, growth since day 1); Scholar's Path (a Mage at level 10 sets a book, reading quests track it, finished books are kept; the `book` event, migration 0010); a one-time training note for players from before M6c; a Character preview on the developer screen. Offline-built days moved to M6e. **Built 2026-10-12**; deployed 2026-10-12 (migration 0010 and the functions); merges after M6c. | `2026-10-12-m6d-character-chronicle.md` |
| 6e | **Offline-built days** | The `provisional_day` event with `checkProvisionalDay` (with M6c's `keptOutBy` and the rest after a workout); the phone caches the ladder states, the last 7 days' templates and `workoutsDone`; completions on a provisional day target `{ dayNumber, slot }` until the server gives instance ids. Moved from M4, then from M6d (M6d decision 1). **Built 2026-10-12**; deployed 2026-10-12 (the functions, v9); merges after M6d. One offline day at a time; the day's closing moves to the rules (`closing.ts`) so phone and server close a day alike; the server applies the day as of when the phone built it and keeps it when the rules allow, else builds its own and counts the work by slot; no database change. | `2026-10-12-m6e-offline-days.md` |
| 7a | **The check-in** | "The day closed. What happened?" after a missed day: the five answers with their outcomes (a paused streak, a light tomorrow, a rested or eased exercise, fewer minutes, or the 5-minute recovery quest), Second Wind and Unbreakable, *Rise Again*; the `checkin` and `lighter_plan` events (migration 0011); the days queued behind a check-in (`streak_applied = false`) applied in order once it is answered; the lighter-plan offer at most once every 14 days, and over the rest limit. M7 split in three (M7a decision 1). **Built 2026-10-12**; merges after M6e. | `2026-10-12-m7a-the-checkin.md` |
| 7b | **Settings and notifications** | Settings: voice, day boundary, minutes a day, notifications, account deletion (a Google-linked account keeps its shared sign-in, and the screen says so), "start again as a new guest", the sign-in guard; local notifications (morning briefing, evening reminder, timer alerts; a new EAS build for `expo-notifications`); planning rest days ahead with the briefing. | later |
| 7c | **Accountability** | The Accountability Pact (levels 0–2, from Settings and the reveal's "Read the pact"), `accountability_set`; the Shadow (scene, mark on the portrait, the private note), the Trial of Stillness (side quests sealed until a 10-minute focus session), consequences only after "I just didn't", at most one a day, paused after 3 in 7 days; the sterner evening reminder. | later |
| 8 | **Articles** | The Batch API pipeline (`lmu-articles-tick` on Supabase Cron), the checks, the $25 cap, about 20 owner-reviewed evergreen articles, the reader and the takeaway quest; spike: the real cost of one article. | later |
| 9 | **Pilot release** | Class art, the EAS preview APK, the device checklist on the Find X9. The backend is already live since M3. | later |

## Carried forward from the M1 code review

Open items the M1 rules can't settle alone; each later plan picks up its own.

| Milestone | Item |
|---|---|
| M2 | Re-run the pacing check with real generated days. Step 32's margins are small (steady level 5 on day 5.77 against a minimum of 5.6; struggling level 10 on day 47.3 against a maximum of 48), and retuning the base (30) instead of the step needs the owner's OK. Add the rank target ("about rank C after 3 months of steady training in the main stat") to the simulation. |
| M3 | Recompute every day window on the server; never trust a provisional window from the phone. Confirm `Intl` time zones in the Supabase Edge Runtime (it isn't the Deno CLI). SQL closes days with `now() >= ends_at`. Apply closed days in order with `closedDayResolution`; hold later days while a check-in is pending (`resolveCheckin`). |
| M3 | Apply a ladder completion when its quest day closes, with the final rating and the rung its quest instance was built at, so `undo` and `rate` events never touch ladder state. A gap check-in is one resolution, with `missedDayStartsAt` = the first away day. Clamp timer segments to the quest day and to the time received. Canonicalise the phone's zone name once on the server (`canonicalTimeZone`; V8 gives ICU's names such as `Asia/Calcutta`, and Hermes may spell zones differently, so never compare raw names from the phone). |
| M3 | Spec question to settle before writing `undo`: can undoing a same-day mis-tap reverse a level-up it caused? (Recommendation: yes; it corrects an error, it isn't a penalty.) |
| M4 | Run the fixed DST and travel expectations from `packages/rules/test/time.test.ts` on Hermes on the Find X9. *(M4: they are `packages/rules/test/hermes-cases.ts`, run by the developer self-check; device result in the checklist.)* |
| M7a, M7c | *(Done in M7a: the offer waits 14 days after any answer.)* Confirm the consequence pause (now a rolling 7 days) is what the owner wants (M7c). |

## Carried forward from M2

| Milestone | Item |
|---|---|
| Owner | Review the words on the content review page; a fitness professional skims the strength, walking and mobility ladders before the pilot (spec §3.1). |
| M3 | Accept an offline-built day with `checkProvisionalDay`, then re-draft every quest from the server's tables (`draftQuest`) *(done in M6e)*. Compute `dayNumber` (every quest day since day 1, away days included). Keep each ability's last-use day and the achievement counters. Record ladder completions and misses only for quests built at the ladder's current rung (`recordMiss` takes the rung). Decide whether a Second Wind redo counts for its ladder. Store `CONTENT_VERSION` on each quest instance. |
| M3 | Pacing passes only just: a struggling Mage reaches level 10 on day 47.8 against a maximum of 48 (400 runs). Re-run `npm run pacing` whenever quests, tiers or ladder rules change; a content change can tip it, and the fix is then the level base (owner's OK) or the content, not the step. Retune from real data once the M9 pilot is running. |
| M5 | Onboarding sets starting rungs from the training answer (until then everyone starts at the first rung, so early days are short), requires 1–2 goals, and decides whether equipment changes anything (no template uses equipment yet). A player on their own program who picks 10 or 15 minutes gets no strength work (the own-program session is 20 minutes and the other strength ladders are closed to them): say so on that screen and suggest 25 minutes, or add a shorter own-program rung. |
| M6b | *(Why-lines and quest summaries: done in M4 and M6a. Scholar's Path progress: done in M6d.)* M6b: Vanish; hide the swap button when `swapOptions` is empty. On a hard day the card's numbers come from `questSummary`; voice lines quote the full version (for example "ten rises"), so keep numbers out of the hard-day card's line or accept it. |
| M7a, M7c | *(Done in M7a: Unbreakable, the recovery quest, `secondWindRedo`; history already stored each slot's final template.)* M7c: the Shadow's lines (`shadowLine`). If the owner wants "Five minutes." back in the approved mark line, show that line only with the plain recovery quest. |
| M8 | Reuse `lintText` for articles; the shaming list may need an article variant (an article can discuss failure). Insight. |

## Carried forward from M3

| Milestone | Item |
|---|---|
| Owner | Decided 2026-10-11 (M3 plan questions): undo may take back a level-up it caused (built that way); deleting a Google-linked account deletes all LevelMeUp data and keeps the shared sign-in, and the delete screen says so (M7); two missed days in a row share one check-in and one recovery quest, and spec §3.7's "delaying the answer changes nothing" is reworded in M7 to exclude that case. `LMU_ANTHROPIC_API_KEY` added 2026-10-11 (a project secret; the live test now requires a Claude-written reveal). Still to do: a monthly spend limit in the Anthropic Console (not checked from here). |
| M4 | *(Done in M4; `provisional_day` done in M6e.)* The phone sends events, then reads `state` from `lmu-sync`; ids are numbers, times are ISO strings in responses and epoch milliseconds in events. Add the `provisional_day` event with `checkProvisionalDay`. Errors the client must handle: `session_ended` (401: the sign-in is gone; only then sign out), `auth_unavailable` and `busy` (503: retry later), per-event codes such as `event_reused`, `bad_payload`, `timer_short`, `day_closed` (show, then drop the event from the outbox). |
| M6b | *(Level-ups a moment after a completion and `newAchievements`: done in M6a.)* Ladder changes (and the step-down offer after "too hard") arrive when the day closes: M6b shows the step-down offer. |
| M7a | *(Done in M7a: `planAdvance` replays the queue; spec §3.7 reworded.)* Answering a check-in must replay the closed days queued behind it (`streak_applied = false`) in day order with `applyDay`, including away days (from jumps in day numbers): a missed day or away run in the queue then opens its own check-in, exactly as if the first answer had come at once. |
| M8 | `ai_generations.cost_usd` is not filled yet; add the model's prices when the article budget is built. |
| Before launch | Per-player request rate limits for the functions (events per sync are capped at 50 today). |

## Carried forward from M4

| Milestone | Item |
|---|---|
| M5 | Replace the developer screen's test character with the real onboarding (`not_started` → onboarding). The phone's character state already arrives with `stateView`; the reveal words are in `profile.reveal`. |
| M6e | *(Done in M6e.)* `provisional_day`: the phone needs the ladder states and the last 7 days' templates in its cache (today `stateView` sends neither), and completions on a provisional day must target `{ dayNumber, slot }` until the server gives instance ids. *(`newAchievements` and replacing the sample completions: done in M6a.)* |
| M6d | *(Done in M6d.)* Character and Chronicle are minimal in M4 (stats list, recent days list); the boards' portrait, class path, calendar and growth arrive with M6d. |
| M7b | When the phone's guest sign-in is gone for good, Today explains it and offers "Start again as a new guest" behind a second, explicit tap (M4 re-review); the old character stays orphaned on the server. M7's Settings should offer the same, and saving to Google (M5) makes it rare. |
| M7b | A guard behind the sign-in: if a new guest's session can't be read back from storage, stop and show it instead of signing in again on the next run. The emulator found exactly that loop (expo-crypto on Android, M4 device check); its cause is fixed, but nothing stops a different storage failure from repeating it. |
| M9 | The developer routes (`app/dev/`) are unreachable in release builds but still bundled, with the self-check's test cases; exclude them from the pilot build. `OutlinedTitle` draws one SVG line that shrinks to fit a narrow screen: keep it to short words (it's only in the kit today). Run M4 checklist rows 6–7 (offline) on the Find X9 with the preview build: a development build loads its code through the tunnel, so it can't open offline (they passed on the emulator). |
| Owner | *(Done 2026-10-11, owner's yes.)* Empty anonymous sign-ins from the M4 device check (before the sign-in fix): 21 deleted by exact id, all or nothing, after a backup to `.backups/2026-10-11-orphan-guests.json` (gitignored). Kept: the Find X9's current guest and one older browser sign-in that isn't LevelMeUp's. |
| Before launch | `npm audit` (2026-10-11): 67 advisories, all in Expo SDK 57's toolchain (Jest, Metro, the Expo CLI, ngrok, config plugins); none fixable without a Jest 30 that jest-expo 57 doesn't support. Only `decode-uri-component` (via expo-router's query-string, moderate: slow parsing of malformed percent-encoded links) ships in the app. Re-run on the next Expo SDK. |

## Carried forward from M5

| Milestone | Item |
|---|---|
| M6b | *(M6d: the vow on Character, done.)* M6b: class change after onboarding (the analysis's "locked" message points there); check the lock before any Claude call (the M5 review saw a refused redo spend one of the player's three reveal calls; the app only sends a redo from the reveal, before the first action). |
| M7b, M7c | The reveal's "Read the pact" link once the Pact screen exists. Settings changes the voice, as the Voice screen promises. Deleting a Google-linked account deletes all LevelMeUp data and keeps the shared sign-in (M3 decision); the delete screen says so. |
| M9 | The class portrait on the reveal (the board's frame waits for the class art). Re-run `npm run pacing` (experienced players included) before the pilot; the experienced players' rank day isn't modelled yet ("most weeks" gives an estimate of 6, so the main stat starts at 8 and reaches rank C roughly 23 % sooner): model it, or accept it as intended. |
| Accepted (M5 review) | Android back from the first reveal returns to the last question; Continue there re-runs the analysis as a redo, the same as "Fix an assumption". A 30-minute sleep (e.g. 3:30–4:00) rounds the day boundary onto the wake time. |
| Before launch | Google's sign-in page shows the shared project's address (`knlgpcwoaaygncmlnbsm.supabase.co`); a custom domain or LevelMeUp's own project changes that (decide with the move question, architecture §12). |

## Carried forward from M6a

| Milestone | Item |
|---|---|
| M6b | M6a and M6b reach players together: exercise quests show their safety lines, but "I felt pain" (rest or a scaled-down option, no penalty) arrives with M6b. `STREAK_SLOTS` moved to `packages/rules` and `_shared/events.ts` exports the payload limits: refactors with no change in behaviour, deployed with M6b's functions. |
| M6c | Quest art per exercise: a ladder's picture shows where the ladder leads (floor push-ups on "Wall push-ups", a plank on "Dead bugs"). With the Kaizen exercise library, give each exercise family or rung its own picture (more keys or variants, published as a new folder, `v3`). |
| M7a | *(Done in M7a.)* The phone sends the check-in. Until then, after a missed day the server holds closed days behind it, and "Quest cleared" shows no streak line (by design, from the M6a review). |
| Owner | Run the Find X9 rows of the M6a checklist (1–9 and 12). The superseded `lmu-art/v1` files can be deleted in the dashboard whenever convenient (the app reads `v2`). |
| Laptop | Windows Application Control blocks `libtorchaudio.pyd` (and PyAV): start ComfyUI with `D:\ai\ComfyUI\run_noaudio.py`, which stands in an empty torchaudio for the image models. |
| Accepted (M6a) | Undoing and re-logging a quest that crossed a level shows LEVEL UP again (the server confirmed the level again). The first sync after a completion can take about 10 s while the function starts. |

## Carried forward from M6b

| Milestone | Item |
|---|---|
| M7b | Plan rest days ahead with the morning briefing (M6b: today only). *(Done in M7a: the lighter plan over the rest limit, with the offer's 14-day wait.)* |
| M7b | A rest day (planned, or after pain) chosen offline and synced after the day ended can't protect that day any more: the exercise still rests, and the day goes to the check-in, which never penalises (M6b review). A tap time on `plan_rest` and `pain`, accepted inside the day like completions, would close this. |
| Owner | "Rest today" after pain is a protected day outside the 2-in-7 limit (wellbeing first); the advice to see a professional from the second report is the only brake. Confirm this is what you want. |
| M7b | A late "Rest today" after pain is applied only in part (the exercise rests; the day can't) and the result says `ok`: add a notice that the day had already ended. Dropping the pre-M6b cache means a phone whose sign-in is gone at the update, with nothing unsent, starts as a new player instead of showing "sign-in lost" (rare; check with M7's Settings). |
| Later | Hardening from the M6b review: `levelmeup.adjust` could check that a change's parts match its event type (only the planner calls it today); the swap sheet's "Which quest?" list reads as radio buttons, where plain buttons would describe it better. |
| M6c | On a hard day, a quest title that names minutes ("Walk 5 minutes") keeps the full version's number while its target says 3 minutes (M2's voice-line item, now seen in titles): give hard-day versions their own title or keep numbers out of titles. |
| Later | The hard-day and rest confirms open at the bottom of Today, below the buttons; scroll them into view when they open. |
| Later | Screens keep what they show only after they send (`useLeavingView`); freezing every screen on `beforeRemove` would also cover a sync landing while a screen closes (e.g. Quest → Continue). Device-test it before relying on it (M6b device check, review). |
| Owner | Row 10 (step down after "Too hard") needs a quest above its ladder's first rung, which day 1 never has: check it on a later day. Run the Find X9 rows of the M6b checklist (1–12) after M5's and M6a's. Stillness, Dawn Ritual and Vanish on a device once a test character reaches a Monk's level 5 or 10 or a Rogue's level 10 (unit tests cover them; the development build already contains `expo-keep-awake`). |

## Carried forward from M6c

| Milestone | Item |
|---|---|
| Later | Decision 16's list: logging the load (weight, band) and per-exercise history; planned deload weeks (the coaching videos say every 5–8 weeks for beginners; readiness-only steps, hard days and step-downs cover it for now); a warm-up quest; a steps quest (+1,000 at a time); an evening fatigue check-in; choosing days a week; rest timers between sets; exercise demo videos. |
| Owner | Run the Find X9 rows of the M6c checklist (1–12) after M6b's. After the M6c deploy, a bundle from before M6c can't show a workout (its content has no workout templates): run phone checks from the M6c branch, or with characters on day 1 or 2. |
| Later | A quest stores its plan (the `session` condition), so a content change to a move's range or steps applies to new days only; a renamed or removed move id would leave stored sessions naming it (keep move ids stable, as template ids). |
| M6d | *(Done in M6d: the training note on Today.)* Players onboarded before M6c were never asked the Training question: they train bodyweight with No preference until they open Settings → Training. Show a one-time "Set up your training" notice on Today (or the Character screen). |
| Later | The Training and Rhythm notes say when workouts don't fit the minutes, a gentle start or an own plan, but not when the player's limits leave too few exercises (with all four limits and no equipment, no workout plans): check `planWorkout` at rung 0 and say so. Settings → Training's save guard is state only (a double tap could send two identical events, harmless), as M6b's Swap. |
| M6e | *(Done in M6e.)* Offline-built days (`checkProvisionalDay`) must also check M6c's rule that a workout day trains no movement twice (`keptOutBy`), and the decision-7 rest after a workout. |
| Later | Settings → Training's re-plan (`_shared/adjust.ts`) doesn't apply `keptOutBy`: a new plan could add a movement another quest of the day trains (rare: only when equipment or limits skip early program slots). Keep today's plan in that case, as when too few exercises fit. While a training change waits to sync, the workout can't be logged (the server re-plans first); re-planning on the phone would need `workoutsDone` in the state. |
| M9 | Pacing after M6c (400 runs): every level target met (tightest: the Mage's struggling level 10 on day 47.8, maximum 48). The Warrior's steady pace reaches Strength rank C on day 151, a day past the 150 target, since a workout keeps the movements it trains out of its day (review); recorded, not tuned (the campaign test accepts that line). Check both against the pilot data. |

## Carried forward from M6d

| Milestone | Item |
|---|---|
| Owner | Deploy order: M6c (migration 0009 and its functions) before M6d (0010 and the functions again); 0010 replaces the `adjust` function 0009 defines. Run the M6d app only after the M6d deploy: it reads the state's `calendar`, `growth` and `abilityLastUsed`, which an older server doesn't send. Then the Find X9 rows of the M6d checklist (1–11) after M6c's. |
| Later | The calendar reads the last 92 days; older months wait for the pilot to need them. The server still sends `recentDays` for app bundles from before M6d; drop it once none are in use. |
| Later | A title picker (Character shows the latest earned title; titles earned in one sync tie-break by id). |
| Later | Scholar's Path: the book's start is the server's time at sync, so a reading quest cleared offline right after a book set offline may not count toward it; a player who leaves Mage keeps a book they can't change until they return (quests stop showing it). |
| M8 | *(Second Wind and Unbreakable: done in M7a.)* Insight (M8) says "Unlocked · it arrives in a later update" on the class path until its screen exists (`ABILITIES_LATER`, content). |
| M9 | The painted class portraits, changing with the level, replace the framed emblem (`src/ui/Portrait.tsx`). |

## Carried forward from M6e

| Milestone | Item |
|---|---|
| M7a | *(Answered in M7a: no.)* A day closed on the phone offline may need a check-in (core not done): the phone shows it only after the sync. Days after the one offline day become away days; the check-in's "Emergency, travel, a brutal day" pauses them. A phone that was open but offline does not protect such days automatically: it could be used to skip days (decision 11). |
| Later | Chains of offline days (decision 1), and swaps, a hard day, rest, abilities and gentle movement on an offline day (decision 8). |
| M9 | How often the server rebuilt an offline day (`lmu-sync: an offline day was rebuilt` in the function logs) and why. |
| Later | The offline day appears only once the failed sync gives up (about 30 seconds with no network on the emulator); Today says "preparing" meanwhile. Building it when the day ends with no connection known (before the sync) would be quicker. |
| Later | After a refused offline day (`clock_ahead`), each completion sent for it comes back `not_found` too: fold those notices into the one. If the outbox is split across batches between a `provisional_day` and its completions and that day has already ended, they arrive `day_closed` (rare). |
| Later | A completion counted for another quest still counts toward Scholar's Path sessions when the quest in that slot is a reading quest (the finished-book count and the Character card). |
| Owner | Find X9: M6e rows 2–3 (a real day boundary) unless the emulator ran them; the M6c rows 2 and 8–11 and the M6d row 9 (a character from before M6c sees the training note). |

## Carried forward from M7a

| Milestone | Item |
|---|---|
| M7b | The late-rest notice (a "Rest today" synced after its day ended) and a tap time on `plan_rest` and `pain`, as carried from M6b. Settings raises the daily minutes again after a lighter plan. |
| M7c | Consequences on an unrecovered "I just didn't" (`decideConsequence`, the opted-in levels), the "what got in the way?" note and the Shadow. |
| M9 | The check-in in the pilot: which answers players choose, how often the recovery quest is cleared, and how often the lighter plan is offered and taken. |
| Later | The lighter-plan offer counts a day check-in as one protected day, even when missed days right after it shared it (M7a review). |
| Later | A check-in answered offline whose day ends before the sync takes effect a day later: the server applies it after closing that day (an injury's rest, a light day and fewer minutes then start with the day after). |
| Later | Notices name a quest for `not_found` and an ability for `already_applied`; for a check-in answer (a check-in answered on another phone more than 14 days ago, or a recovery quest already added) the words don't fit. Board F3 lists the recovery quest first and board F1 heads the check-in with "DAY · date / STREAK n · PAUSED"; Today keeps slot order and the check-in screen starts with the question (M7a review). |
| Later | "Injured" rests the missed day's exercise from the next day built; a quest of that exercise already on today's list stays, with its "I felt pain" button (rest or gentle movement) (M7a review). |

## Spikes and where they run

| Spike (architecture §13) | Milestone |
|---|---|
| 1. Shared rules package in Deno and Metro | M1 enforces Deno-style imports and proves plain Node ESM; M3 proved the Edge Runtime; M4 proved Metro and the Hermes compiler (the Hermes runtime: device self-check) |
| 2. Anonymous → Google linking | M5 |
| 3. Real cost of one batch article with web search | M8 |
| 4. Phone reaching the laptop's Supabase over the LAN | Dropped: development uses the live project (M3) |
| 5. `db:deploy` leaves the wedding's migration history alone | Passed in M3 (checked on every deploy) |
| 6. `lmu_service` is refused on the wedding's tables | Passed in M3 (DB test) |
