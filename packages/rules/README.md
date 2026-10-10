# @levelmeup/rules

The game's rulebook, as plain TypeScript functions. The server (Supabase Edge Functions, Deno) uses it as the
referee; the app (Expo, Hermes) uses it to show rewards instantly and to build a day offline. The server's answer
always wins.

## What's here

| Module | Spec | What it decides |
|---|---|---|
| `levels.ts` | §2.3 | Level curve, level from total XP, XP bar progress |
| `stats.ts` | §2.1 | Stat points, ranks E–S, starting stats |
| `xp.ts` | §2.2 | Quest XP, hard-day XP, XP splits |
| `time.ts` | §3.6, §3.8 | Time zones, quest-day windows (20–28 h), late completions |
| `streak.ts` | §2.4 | Streak days, shields, milestones, misses |
| `checkin.ts` | §3.7 | Check-in outcomes, lighter-plan offers |
| `ladder.ts` | §3.3 | Step up, step down, pain pause, rung bonus |
| `consequence.ts` | §4.3 | When the Pact applies, Trial of Stillness sealing |
| `timer.ts` | §3.6, §4.3 | Timer completion |
| `simulation.ts` | §2.3 | M1's simplified pacing model (kept as a record; `campaign.ts` decides the curve) |
| `library.ts` | §3.1, §3.4 | Quest template and ladder types, what a player may be given, allowed rungs, progression cap |
| `abilities.ts` | §2.5 | Class abilities: unlock levels, cooldowns in quest days, swap limit |
| `day.ts` | §3.2 | Building a day: class mix, recovery rules, minutes budget, side quests, why each quest was picked |
| `adjust.ts` | §3.5, §3.7 | Swap, hard day, planned-rest limit, Stillness, Dawn Ritual, recovery quest, checking an offline-built day |
| `achievements.ts` | §2.6 | Achievement criteria and which are newly earned |
| `campaign.ts` | §2.1, §2.3 | Pacing on real built days for one persona per class, and the rank target |

The quest library itself (templates, words, achievements, Shadow lines) is data in `packages/content`; the builder
takes it as an argument.

Every tunable number is in `constants.ts`.

## Portability rules (tested in `test/portable.test.ts`)

- No runtime dependencies, no Node/browser globals.
- Relative imports only, always with the `.ts` extension (Deno needs it).
- Erasable TypeScript only (`erasableSyntaxOnly`): no enums, namespaces or parameter properties, so Node, Deno and
  Hermes builds can strip types without a compiler. `npm run check:portable` loads the package with plain Node.
- Time zones come from `Intl.DateTimeFormat` only.

## Commands (from the repo root)

```bash
npm test                # all rules tests
npm run typecheck
npm run check:portable
npm run pacing          # pacing table and the level steps that meet every target
```

## Decisions made while building M1

1. Level step 32 instead of the spec's 20, found by the simplified pacing model. Superseded in M2 (decision 13): on
   real built days the step is back at 20.
2. Day 1 runs from the end of onboarding to the first boundary at least 6 h away.
3. After travel, a day ends at the first boundary at least 20 h after it starts, capped at 28 h.
4. Lighter-plan offers count check-in-protected days only (not planned rest or outages); 3 or more in 14 days.
5. Ladder windows use quest-day start times.
6. A quest day covers `[startsAt, endsAt)`: it is closed from `endsAt` on, the instant the next day starts.
7. Ladder completions are kept sorted by quest day and only those inside the 14-day window are stored; the window
   is measured from the latest quest day, so a late-synced completion can't stretch it.
8. XP splits round away floating-point noise before rounding up (100 × 0.07 is 7, not 8).

After the M1 code review:

9. Closed days apply to the streak in quest-day order. `closedDayResolution` decides each one (streak day,
   protected without asking, or check-in due); while a check-in is pending, later days wait and `resolveCheckin`
   answers it, so delaying the answer can't change the result. A miss can only come from `resolveCheckin`.
10. Ladders keep one record per quest day (a repeat replaces it, e.g. a changed rating), count a completion only
    if its quest was built at the current rung (so a late sync from before a step up or down can't count), and
    record nothing while paused for pain.
11. The Pact covers quest days from `appliesFrom`, the quest day after the one in progress when it was signed
    ("never today's"). A level 2 seal lasts only for the quest day the check-in was answered.
12. Unknown answers, ratings, tiers, classes and Pact levels throw instead of passing through; zone names are stored
    in their canonical spelling; `src` is type-checked without Node's types (`tsconfig.src.json`).

After M2 (content and day building, plan `docs/superpowers/plans/2026-10-10-m2-content-day-builder.md`):

13. **Level step back to 20.** The campaign plays real built days: new players start every ladder at its first rung
    (mostly minor quests) and missed sessions step ladders down, so real days earn less than M1's model. With step 32,
    15 targets were missed (struggling level 10 on day 66 against 48). Only steps 19 and 20 meet every target; 20 has
    the larger worst-case margin (steady level 10 on day 17.7 against a minimum of 16.8; struggling level 10 on day
    47.7 against a maximum of 48, 200 runs). The margins are under a day at both ends.
14. **Rank target: owner's decision pending.** No stat divisor puts every class's main stat at rank C within days
    60–120: with divisor 10 a steady Mage reaches it on day 25 (the daily article also trains Wisdom) and a Rogue on
    day 58. The campaign test checks the level targets only until the owner decides.
15. **Budget:** core and side quests fit the player's minutes (10/15/25/40); the article and the recovery quest sit
    outside it. Each side quest keeps 2 minutes free and the core gets the rest. Light days (day 1, re-entry, after a
    sick or injured check-in) have 10 minutes.
16. **Core mix:** a 7-day pattern (main, second, main, balance, main, second, main) by day number. The day after a
    strength core never has another strength core: where the pattern asks for strength, the core is walking or
    mobility. No strength ladder is built two days running in any slot.
17. **Choosing:** class-affinity ladders first for the core; the least recently built ladder wins; side 1 serves the
    goals (they take turns leading), side 2 is the weakest stat not already in the day; a micro quest only when no
    ladder fits.
18. **Safety:** a gentle start limits exercise to gentle walking and mobility rungs (reading, focus, breathing and
    sleep stay). A limitation closes a ladder from its first tagged rung up. Progression stops at the highest allowed
    rung that fits a normal day's core (`maxRungFor`).
19. **Misses count only at the current rung,** like completions (`recordMiss` takes the quest's rung), so a side
    quest built lower to fit the day can't step its ladder down.
20. **Limits in quest days:** Second Wind and Stillness every 7 quest days, Unbreakable every 30, at most 2 planned
    rest days in any 7. Planned rest only protects the streak; the day's quests stay as a bonus.
21. **Second Wind** puts the missed core quest in the recovery slot for its full XP plus the recovery's Discipline +5.
    A hard day changes only open core and side quests; the article and recovery quest keep their reward.
22. **Offline-built days** are accepted when every quest is one the builder could have chosen
    (`checkProvisionalDay`); the server always re-drafts rewards from its own tables.

