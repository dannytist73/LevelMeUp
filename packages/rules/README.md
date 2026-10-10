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
| `simulation.ts` | §2.3 | Pacing simulation that tunes the level curve |

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

1. Level step 32 instead of the spec's 20, found by the pacing simulation (`npm run pacing`). It is the only step
   from 20 to 40 that meets every target: 31 reaches level 5 slightly too early for steady players, 33 reaches
   level 10 too late for struggling players.
2. Day 1 runs from the end of onboarding to the first boundary at least 6 h away.
3. After travel, a day ends at the first boundary at least 20 h after it starts, capped at 28 h.
4. Lighter-plan offers count check-in-protected days only (not planned rest or outages); 3 or more in 14 days.
5. Ladder windows use quest-day start times.
6. A quest day covers `[startsAt, endsAt)`: it is closed from `endsAt` on, the instant the next day starts.
7. Ladder completions are kept sorted by quest day and only those inside the 14-day window are stored; the window
   is measured from the latest quest day, so a late-synced completion can't stretch it.
8. XP splits round away floating-point noise before rounding up (100 × 0.07 is 7, not 8).
