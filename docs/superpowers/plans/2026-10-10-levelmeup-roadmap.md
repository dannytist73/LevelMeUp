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
| 5 | **Onboarding** | The 10 onboarding screens, the safety check, the reveal with its template fallback, the vow, "save your character" with Google (spike: linking a Google sign-in to the anonymous user). | later |
| 6 | **The daily loop** | Today, quest screens (tap, timer, rep log, one sentence), quest cleared, swap / hard day / rest, the pain flow, level-ups, Character, Chronicle, achievements; the `swap`, `hard_day`, `plan_rest`, `pain` and `class_change` events on the server; offline-built days (`provisional_day` with `checkProvisionalDay`, moved from M4). | later |
| 7 | **Missed days and accountability** | The check-in, recovery quest, Second Wind, the Shadow, the Accountability Pact, the Trial of Stillness, local notifications, Settings and account deletion; the `checkin` and `accountability_set` events, applying the streak days queued behind a check-in (`streak_applied = false`). | later |
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
| M7 | Give the lighter-plan offer a cooldown (or remember a dismissal) so it isn't shown on every open. Confirm the consequence pause (now a rolling 7 days) is what the owner wants. |

## Carried forward from M2

| Milestone | Item |
|---|---|
| Owner | Review the words on the content review page; a fitness professional skims the strength, walking and mobility ladders before the pilot (spec §3.1). |
| M3 | Accept an offline-built day with `checkProvisionalDay`, then re-draft every quest from the server's tables (`draftQuest`). Compute `dayNumber` (every quest day since day 1, away days included). Keep each ability's last-use day and the achievement counters. Record ladder completions and misses only for quests built at the ladder's current rung (`recordMiss` takes the rung). Decide whether a Second Wind redo counts for its ladder. Store `CONTENT_VERSION` on each quest instance. |
| M3 | Pacing passes only just: a struggling Mage reaches level 10 on day 47.8 against a maximum of 48 (400 runs). Re-run `npm run pacing` whenever quests, tiers or ladder rules change; a content change can tip it, and the fix is then the level base (owner's OK) or the content, not the step. Retune from real data once the M9 pilot is running. |
| M5 | Onboarding sets starting rungs from the training answer (until then everyone starts at the first rung, so early days are short), requires 1–2 goals, and decides whether equipment changes anything (no template uses equipment yet). A player on their own program who picks 10 or 15 minutes gets no strength work (the own-program session is 20 minutes and the other strength ladders are closed to them): say so on that screen and suggest 25 minutes, or add a shorter own-program rung. |
| M6 | Show why-lines (`renderWhy`) and quest summaries (`questSummary`); Scholar's Path progress to the end of the book; Vanish. Hide the swap button when `swapOptions` is empty. On a hard day the card's numbers come from `questSummary`; voice lines quote the full version (for example "ten rises"), so keep numbers out of the hard-day card's line or accept it. |
| M7 | Wire Unbreakable (`abilityReady('unbreakable', …)` → `shieldWaived`), the recovery quest (`addRecovery`) and the Shadow's lines (`shadowLine`). Add a `secondWindRedo` check (the redo, or null) so the app offers Second Wind only when `addRecovery` would accept it. History must store each slot's final template (after swaps, Stillness, Dawn Ritual). If the owner wants "Five minutes." back in the approved mark line, show that line only with the plain recovery quest. |
| M8 | Reuse `lintText` for articles; the shaming list may need an article variant (an article can discuss failure). Insight. |

## Carried forward from M3

| Milestone | Item |
|---|---|
| Owner | Decided 2026-10-11 (M3 plan questions): undo may take back a level-up it caused (built that way); deleting a Google-linked account deletes all LevelMeUp data and keeps the shared sign-in, and the delete screen says so (M7); two missed days in a row share one check-in and one recovery quest, and spec §3.7's "delaying the answer changes nothing" is reworded in M7 to exclude that case. `LMU_ANTHROPIC_API_KEY` added 2026-10-11 (a project secret; the live test now requires a Claude-written reveal). Still to do: a monthly spend limit in the Anthropic Console (not checked from here). |
| M4 | *(Done in M4, except `provisional_day`, now M6.)* The phone sends events, then reads `state` from `lmu-sync`; ids are numbers, times are ISO strings in responses and epoch milliseconds in events. Add the `provisional_day` event with `checkProvisionalDay`. Errors the client must handle: `session_ended` (401: the sign-in is gone; only then sign out), `auth_unavailable` and `busy` (503: retry later), per-event codes such as `event_reused`, `bad_payload`, `timer_short`, `day_closed` (show, then drop the event from the outbox). |
| M6 | Level-ups are shown a moment after a completion, because a same-day undo can take one back. Ladder changes (and the step-down offer after "too hard") arrive when the day closes. Show `newAchievements` from the sync reply. |
| M7 | Answering a check-in must replay the closed days queued behind it (`streak_applied = false`) in day order with `applyDay`, including away days (from jumps in day numbers): a missed day or away run in the queue then opens its own check-in, exactly as if the first answer had come at once. A pending check-in covers later unanswered days and away days only while nothing is queued behind it (code review fix, M3). |
| M8 | `ai_generations.cost_usd` is not filled yet; add the model's prices when the article budget is built. |
| Before launch | Per-player request rate limits for the functions (events per sync are capped at 50 today). |

## Carried forward from M4

| Milestone | Item |
|---|---|
| M5 | Replace the developer screen's test character with the real onboarding (`not_started` → onboarding). The phone's character state already arrives with `stateView`; the reveal words are in `profile.reveal`. |
| M6 | `provisional_day`: the phone needs the ladder states and the last 7 days' templates in its cache (today `stateView` sends neither), and completions on a provisional day must target `{ dayNumber, slot }` until the server gives instance ids. Show `newAchievements` (the sync engine already collects them). Replace the developer screen's sample completions with the quest screens. |
| M6 | Character and Chronicle are minimal in M4 (stats list, recent days list); the boards' portrait, class path, calendar and growth arrive with M6. |
| M7 | When the phone's guest sign-in is gone for good, Today explains it and offers "Start again as a new guest" behind a second, explicit tap (M4 re-review); the old character stays orphaned on the server. M7's Settings should offer the same, and saving to Google (M5) makes it rare. |
| M7 | A guard behind the sign-in: if a new guest's session can't be read back from storage, stop and show it instead of signing in again on the next run. The emulator found exactly that loop (expo-crypto on Android, M4 device check); its cause is fixed, but nothing stops a different storage failure from repeating it. |
| M9 | The developer routes (`app/dev/`) are unreachable in release builds but still bundled, with the self-check's test cases; exclude them from the pilot build. `OutlinedTitle` draws one SVG line that shrinks to fit a narrow screen: keep it to short words (it's only in the kit today). Run M4 checklist rows 6–7 (offline) on the Find X9 with the preview build: a development build loads its code through the tunnel, so it can't open offline (they passed on the emulator). |
| Owner | Empty anonymous sign-ins on the live project from the M4 device check (2026-10-11, before the sign-in fix): no LevelMeUp data, only `auth.users` rows. Removing them is a delete on the shared project, so it waits for the owner's yes. |
| Before launch | `npm audit` (2026-10-11): 67 advisories, all in Expo SDK 57's toolchain (Jest, Metro, the Expo CLI, ngrok, config plugins); none fixable without a Jest 30 that jest-expo 57 doesn't support. Only `decode-uri-component` (via expo-router's query-string, moderate: slow parsing of malformed percent-encoded links) ships in the app. Re-run on the next Expo SDK. |

## Spikes and where they run

| Spike (architecture §13) | Milestone |
|---|---|
| 1. Shared rules package in Deno and Metro | M1 enforces Deno-style imports and proves plain Node ESM; M3 proved the Edge Runtime; M4 proved Metro and the Hermes compiler (the Hermes runtime: device self-check) |
| 2. Anonymous → Google linking | M5 |
| 3. Real cost of one batch article with web search | M8 |
| 4. Phone reaching the laptop's Supabase over the LAN | Dropped: development uses the live project (M3) |
| 5. `db:deploy` leaves the wedding's migration history alone | Passed in M3 (checked on every deploy) |
| 6. `lmu_service` is refused on the wedding's tables | Passed in M3 (DB test) |
