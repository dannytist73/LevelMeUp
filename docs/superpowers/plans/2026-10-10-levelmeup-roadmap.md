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
| 2 | **Content and day building** | `packages/content`: about 10 ladders and 70 quest templates in three voices, achievements, Shadow lines, a banned-phrase lint. The day builder (spec §3.2), class abilities that shape a day, swap / hard day / rest limits, and the pacing check re-run with real generated days. The owner reviews the content. | later |
| 3 | **Database and server (local)** | Local Supabase in Docker (project id `levelmeup`, 55xxx ports); spike: Edge Functions importing the rules package; the `levelmeup` schema, RLS, `apply_outcome` and pgTAP tests; the `lmu_service` role with wedding-isolation tests; the `db:deploy` runner; `lmu-sync`, `lmu-onboarding` (Claude mocked, template fallback), `lmu-account-delete`; lazy day closing; idempotency and concurrency tests. | later |
| 4 | **App foundation** | The Expo SDK 57 app; spike: Metro (and Hermes `Intl`) with the rules package; the Ink Panel components (Latin-subset fonts, slanted panels, narration boxes, stamps, tab bar); navigation; SQLite cache and outbox; anonymous sign-in; the sync client; a development build on the Find X9 talking to the laptop's Supabase. | later |
| 5 | **Onboarding** | The 10 onboarding screens, the safety check, the reveal with its template fallback, the vow, "save your character" with Google (spike: linking a Google sign-in to the anonymous user). | later |
| 6 | **The daily loop** | Today, quest screens (tap, timer, rep log, one sentence), quest cleared, swap / hard day / rest, the pain flow, level-ups, Character, Chronicle, achievements. | later |
| 7 | **Missed days and accountability** | The check-in, recovery quest, Second Wind, the Shadow, the Accountability Pact, the Trial of Stillness, local notifications, Settings and account deletion. | later |
| 8 | **Articles** | The Batch API pipeline (`lmu-articles-tick` on Supabase Cron), the checks, the $25 cap, about 20 owner-reviewed evergreen articles, the reader and the takeaway quest; spike: the real cost of one article. | later |
| 9 | **Pilot release** | Deploy to the DNA Wedding project (each remote change confirmed with the owner), the note in `wedding-site/CLAUDE.md` (owner's OK first), class art, the EAS preview APK, the device checklist on the Find X9. | later |

## Carried forward from the M1 code review

Open items the M1 rules can't settle alone; each later plan picks up its own.

| Milestone | Item |
|---|---|
| M2 | Re-run the pacing check with real generated days. Step 32's margins are small (steady level 5 on day 5.77 against a minimum of 5.6; struggling level 10 on day 47.3 against a maximum of 48), and retuning the base (30) instead of the step needs the owner's OK. Add the rank target ("about rank C after 3 months of steady training in the main stat") to the simulation. |
| M3 | Recompute every day window on the server; never trust a provisional window from the phone. Confirm `Intl` time zones in the Supabase Edge Runtime (it isn't the Deno CLI). SQL closes days with `now() >= ends_at`. Apply closed days in order with `closedDayResolution`; hold later days while a check-in is pending (`resolveCheckin`). |
| M3 | Apply a ladder completion when its quest day closes, with the final rating and the rung its quest instance was built at, so `undo` and `rate` events never touch ladder state. A gap check-in is one resolution, with `missedDayStartsAt` = the first away day. Clamp timer segments to the quest day and to the time received. Canonicalise the phone's zone name once on the server (`canonicalTimeZone`; V8 gives ICU's names such as `Asia/Calcutta`, and Hermes may spell zones differently, so never compare raw names from the phone). |
| M3 | Spec question to settle before writing `undo`: can undoing a same-day mis-tap reverse a level-up it caused? (Recommendation: yes; it corrects an error, it isn't a penalty.) |
| M4 | Run the fixed DST and travel expectations from `packages/rules/test/time.test.ts` on Hermes on the Find X9. |
| M7 | Give the lighter-plan offer a cooldown (or remember a dismissal) so it isn't shown on every open. Confirm the consequence pause (now a rolling 7 days) is what the owner wants. |

## Spikes and where they run

| Spike (architecture §13) | Milestone |
|---|---|
| 1. Shared rules package in Deno and Metro | M1 enforces Deno-style imports and proves plain Node ESM; M3 proves Deno, M4 proves Metro and Hermes |
| 2. Anonymous → Google linking | M5 |
| 3. Real cost of one batch article with web search | M8 |
| 4. Phone reaching the laptop's Supabase over the LAN | M4 |
| 5. `db:deploy` leaves the wedding's migration history alone | M3 (locally), again before the M9 deploy |
| 6. `lmu_service` is refused on the wedding's tables | M3 |
