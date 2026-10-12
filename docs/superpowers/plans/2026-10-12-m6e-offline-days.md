# M6e — Offline-built days — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the day on screen has ended and the phone can't reach the server, the phone builds the next quest day
itself with the rules the server uses; the player plays it; at the next sync the server checks it and keeps it, or
builds its own and still counts the work.

**Architecture:** The server's day closing (each ladder's session, the next day's window, the comeback step-down)
moves into the shared rules package (`closing.ts`), so the phone and the server close a day the same way. The state
gains what the phone needs to build the next day: every ladder's state, each recent day's quests, and the workouts
done. Offline, the phone closes the ended day with its own projected completions and calls `buildDay`; the day travels
as a `provisional_day` event and lives in the outbox until the server's state replaces it. `lmu-sync` applies that
event as of the time the phone built it (`planAdvance` with the clock at `builtAt`), keeps the phone's quests when
`checkProvisionalDay` passes, and otherwise stores its own. Until the server gives ids, events about the offline day's
quests name them by day and slot (`ref`). No database change.

**Tech Stack:** as M6d (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14, Vitest, Deno 2.9,
TypeScript 6). No new dependencies, native modules, migrations, EAS build or monthly cost.

**Specs:** architecture §4.3 (days and lazy closing) and §6 ("Offline on a new day"); MVP spec §3.2 step 5 ("A new day
opened offline is built on the phone with the same package, marked provisional, and checked by the server on sync")
and §3.6 (offline completions); roadmap M6e row and the "Carried forward" rows for M6e (M2: re-draft every quest from
the server's tables; M4: the `provisional_day` event, completions by day and slot; M6c: `keptOutBy` and the rest after
a workout).

---

## Plain summary

When M6e is done:

- If the phone has no connection when a new quest day starts, Today no longer waits on "The System is preparing your
  trials". The phone builds the day itself, with the rules the server uses, and says so in one line: "No connection,
  so this phone built today's quests. The System checks them when it's back online."
- The player plays those quests as usual: timers, logs, undo, ratings, and "I felt pain" (rest, or pause the
  exercise). Swaps, a hard day, a rest day and the Monk's abilities wait until the day reaches the System; Today says
  so in one line.
- At the next sync the System checks the day. When every quest is one the rules allow, it keeps the day exactly as the
  phone built it. When not, it builds its own day, and anything the player finished still counts for the quest now in
  that slot; a short notice says so.
- One offline day at a time: if that day also ends before the phone gets a connection, Today shows "preparing" again
  until it syncs.

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop.

1. **One offline day at a time.** The phone builds a day only from a day the server sent. If the offline day also ends
   before a sync, Today shows "preparing" as it does now; those later days become away days, which the M7 check-in
   covers ("Emergency, travel, a brutal day" pauses the streak). Chains of offline days would mostly be lost anyway:
   completions are accepted until 48 hours after their day ends (spec §3.6). Carried forward: chains, and whether a
   phone that was open but offline should protect such days automatically (M7, owner's call: it could also be used to
   skip days).
2. **The phone closes the ended day the way the server does.** The pure core of `planAdvance` moves to the rules
   package: `closeLadders` (each ladder quest records its completion with its final rating at the rung it was built at,
   or a missed session; a protected day records no miss), `reenterLadders` (the comeback step-down) and `followingDay`
   (the next window, away days, comeback). `planAdvance` calls them; its tests stay as they are. The phone closes the
   ended day with its projected completions and ratings, adds the Discipline for a cleared core and the rung bonuses to
   its stats (streak milestones are left out: they only add Discipline, which no quest choice reads), and calls
   `buildDay`. With the same inputs it builds the same day the server would.
3. **The state carries what that needs:** `ladders` (every ladder's state, by id), `history` (each recent day's final
   template per slot, oldest first: the snapshot's 8 days) and `workoutsDone`. About 1–2 KB. A cached state without
   them (from an M6d app or server) builds no offline day until the first sync; there is no cache migration, because
   dropping the cache would leave an offline phone with nothing to show.
4. **The `provisional_day` event:** `{ dayNumber, builtAt, timeZone, window: { startsAt, endsAt }, budget, light,
   quests: [{ slot, templateId, why, moves, book }] }`. The server reads the day number, `builtAt`, the time zone and
   each quest's slot, template, why-line and exercises. The window, budget, light flag and books are what the phone
   showed: parsed and kept with the event, never trusted (the server recomputes them all, architecture §4.3).
5. **The server applies it as of when the phone built it.** Events apply in order, so the ended day's offline
   completions land first. Then `provisional_day` runs the same closing and building as the sync's own step, with the
   clock at `builtAt` (never later than now; a phone up to 5 minutes behind the previous day's end counts as that end),
   so a day the player opened isn't skipped as an away day when the sync comes after it ended. When the next day's
   number is the phone's and `provisionalDay` (rules) accepts it, the day is stored with the phone's quests, re-drafted
   from the server's tables (XP, minutes, conditions, the book; the why-line is the phone's, checked by
   `isWhyReason`). Otherwise the server stores its own build. A day that already exists (an earlier sync's answer was
   lost on the way back) stays as it is. Built after now plus 5 minutes, or while the server's previous day was still
   running: refused (`clock_ahead`).
6. **`checkProvisionalDay` gains two rules:** a workout's exercises are the ones the server plans (`movesFor`), so its
   logged sets fit; and no movement twice (M6c review): a workout and a strength quest it keeps out never share the
   day. That second check looks both ways (each keeps the other out), because the builder keeps out by slot order and
   a swap by the rest of the day; a strength quest whose movement the workout doesn't train may still share it. The
   rest after a workout (M6c decision 7) is already checked: the day after a workout, every strength ladder counts as
   trained yesterday (`dayContext`); Task 2 adds a test for it.
7. **Offline-day quests are named by day and slot** (`ref: { dayNumber, slot, templateId }`) in `complete`, `undo`,
   `rate` and `pain` until the server gives ids. The server finds the quest in that slot of that day. When its template
   is the one the phone showed, everything is checked as usual. When it isn't (the server's day won), a completion
   still counts for the quest now in that slot, without the timer or rep check (those were for the phone's quest): the
   player did the work the System gave them, and a sync problem must not cost them (owner's brief). A pain report on a
   changed quest is refused (`quest_changed`) so it never rests an exercise the player didn't do; the notice asks them
   to report it again.
8. **What the phone offers on an offline day:** the quests, their timers and logs, undo, ratings, "I felt pain" (rest or
   pause: gentle movement is computed by the server, so it isn't offered) and Vanish. Swaps, a hard day, a rest day,
   Stillness, Dawn Ritual and step-downs wait for the sync. Today shows the narration line from the summary and, in place
   of the day's actions, "Swaps, a hard day and rest open once this day reaches the System."
9. **The offline day lives in the outbox** as its event: no new table and no cache migration. `project` turns it into
   today, with quest ids −1 (core), −2 (side1), −3 (side2) and −4 (article), and marks the view `offline`. `enqueue`
   turns an event on those ids into a `ref` event. The Quest and Pain screens find a quest by its slot once the server's
   day replaced the offline one, and a timer running on an offline quest moves to the server's quest in its slot.
10. **When the phone builds one:** after a sync ends `offline` or `retry`, when the day on screen has ended by the
    phone's clock, the view isn't already an offline day, and the cached state has the fields from decision 3. It
    queues the event without asking for another sync (the scheduler's back-off keeps trying). If `buildDay` throws, no
    offline day: "preparing" as now.
11. **No database change.** The day is written by `levelmeup.advance` like any other. A repeat is safe without recording
    the event: the second time, the day exists and the answer is the same. Rebuilt days are logged (`console.info`, with
    the reasons), so the pilot shows how often the phone and the server disagree. The deploy is the functions only.
12. **Older apps are unaffected:** they never send the event or `ref`, and ignore the state's new fields. The M6e app
    against an older server builds no offline day (decision 3), so it never sends what that server would refuse.
13. **Notices:** `day_rebuilt` ("The System rebuilt the day this phone made offline. Anything you finished there counts
    for the quest now in its place."), `quest_changed` and `clock_ahead`. A `provisional_day` the server stored with its
    own quests answers `ok: false, code: 'day_rebuilt'`, so the phone shows the notice and drops the event; the day is
    still written.
14. **A developer preview** (`/dev/offline`) shows the day the phone would build from its cached state if today had just
    ended. Nothing is sent. It runs the builder on Hermes in the emulator check; the full round trip needs a real day
    boundary, so it is a device-checklist row.
15. **Accepted risks** (stated, not built against): a phone can claim to have opened a day it didn't (a made-up
    `builtAt`), within the 48 hours completions already allow, and a completion on a rebuilt day skips the timer and rep
    checks. Both only let someone fool themselves: the server still checks every quest, pays only its own rewards, and
    counts each quest once. *As built (review):* a completion named by slot is checked against the quest the phone
    says the player did, so a modified phone that names a check-off quest (or one this content doesn't know) still
    completes the quest in that slot without its timer or rep check, on any day; it earns that quest's XP and streak
    credit once, moves no ladder and counts as no workout. A modified phone can also send any day the rules allow, with
    any why-line. A day built more than 48 hours plus a day ago is applied as of now.

## Remote steps (each needs the owner's yes)

- Task 9: `npm run deploy:functions` and `npm run test:live` (10 players). Only after M6c's and M6d's deploys
  (migrations 0009 and 0010): these functions include M6c's and M6d's code. Simplest: one batch for all three
  milestones: `npm run db:deploy` (0009, 0010), `npm run db:test`, `npm run deploy:functions` once from this branch,
  `npm run test:live`.

## File map

| File | Change |
|---|---|
| `packages/rules/src/closing.ts` | **New.** `closeLadders`, `reenterLadders`, `followingDay`. |
| `packages/rules/src/constants.ts` | `MAX_AWAY_DAYS` (from `advance.ts`). |
| `packages/rules/src/day.ts` | `StoredQuest`, `storedQuest` (from `_shared/drafts.ts`), `isWhyReason`. |
| `packages/rules/src/workout.ts` | `sameMoves`. |
| `packages/rules/src/adjust.ts` | `ProvisionalQuest`, `provisionalDay`; `checkProvisionalDay` checks the exercises and "no movement twice". |
| `packages/rules/src/index.ts` | Export `closing.ts`. |
| `packages/content/src/offline.ts` | **New.** `OFFLINE_TEXT`. |
| `supabase/functions/_shared/advance.ts` | Uses the closing helpers; the `provisional` input and `offline` outcome. |
| `supabase/functions/_shared/drafts.ts` | `toDraft` is `storedQuest`. |
| `supabase/functions/_shared/state.ts` | The state's `ladders`, `history`, `workoutsDone`. |
| `supabase/functions/_shared/events.ts` | `ProvisionalDayEvent`, `SlotRef`, `ref` on `complete`, `undo`, `rate`, `pain`. |
| `supabase/functions/_shared/offline.ts` | **New.** `provisionalClock`, `sameQuests`. |
| `supabase/functions/lmu-sync/index.ts` | Applies `provisional_day`; finds quests by `ref`. |
| `supabase/tests/unit/*` | advance, state, events, offline tests. |
| `supabase/tests/live/live.test.ts`, `helpers.ts` | The state's new fields, `ref` events, `clock_ahead`; 10 players. |
| `apps/mobile/src/game/offline.ts` | **New.** `OFFLINE_IDS`, `offlineToday`, `findQuest`, `withRef`, `carriedTimers`. |
| `apps/mobile/src/game/offlineDay.ts` | **New.** `offlineDay`: the next day, built on the phone. |
| `apps/mobile/src/game/project.ts` | The `provisional_day` event, `ref` events, `offline`. |
| `apps/mobile/src/game/types.ts` | Export `ProvisionalDayEvent`, `SlotRef`. |
| `apps/mobile/src/game/notices.ts` | `day_rebuilt`, `quest_changed`, `clock_ahead`. |
| `apps/mobile/src/state/store.ts` | Builds the offline day; `ref` events; moves timers. |
| `apps/mobile/src/screens/Today.tsx`, `Quest.tsx`, `Pain.tsx` | The offline line; quests found by slot. |
| `apps/mobile/app/dev/offline.tsx`, `app/dev/index.tsx` | **New** preview, and its link. |
| `apps/mobile/test/*` | offline, offlineDay, project, store, screens, notices tests. |
| Docs | Architecture §4.3, §6; MVP §3.2, §3.6; roadmap; READMEs; device checklist; this plan's "As built". |

## Task 1: Rules — closing a day, shared by the server and the phone

**Files:**
- Create: `packages/rules/src/closing.ts`, `packages/rules/test/closing.test.ts`
- Modify: `packages/rules/src/constants.ts`, `packages/rules/src/index.ts`, `packages/rules/test/index.test.ts`

- [ ] **Step 1: Write the failing tests** (`packages/rules/test/closing.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { closeLadders, followingDay, reenterLadders } from '../src/closing.ts';
import { DAY_MS, HOUR_MS, MAX_AWAY_DAYS, REENTRY_AWAY_MS } from '../src/constants.ts';
import { newLadder } from '../src/ladder.ts';
import type { LadderState } from '../src/ladder.ts';
import { nextDayWindow } from '../src/time.ts';
import { FIXTURE, PROFILE } from './fixtures/library.ts';

const AT = Date.UTC(2026, 9, 11, 20); // a quest day's start

describe("closing a day's ladders (M6e: the server and the phone share it)", () => {
  it('records each ladder quest: a completion with its rating ("right" when unrated), or a missed session', () => {
    const out = closeLadders(FIXTURE, { push: newLadder(1) }, {
      startsAt: AT,
      protected: false,
      quests: [
        { ladder: 'push', rung: 1, done: true, rating: null },
        { ladder: 'walk', rung: 0, done: false, rating: null },
        { ladder: null, rung: null, done: true, rating: 'easy' },
      ],
    }, PROFILE);
    expect(out.changed.push!.atRung).toEqual([{ at: AT, rating: 'right' }]);
    expect(out.changed.walk!.misses).toEqual([AT]);
    expect(Object.keys(out.changed).sort()).toEqual(['push', 'walk']);
    expect(out.newRungs).toEqual([]);
  });

  it('a protected day records no missed session, and a ladder this content lacks is skipped', () => {
    const out = closeLadders(FIXTURE, {}, {
      startsAt: AT,
      protected: true,
      quests: [{ ladder: 'walk', rung: 0, done: false, rating: null }, { ladder: 'retired', rung: 0, done: true, rating: null }],
    }, PROFILE);
    expect(out).toEqual({ changed: {}, newRungs: [] });
  });

  it('names a rung reached for the first time (the caller pays its bonus)', () => {
    // Steady: 3 completions at the rung within 14 days step it up; two are there already.
    const walk: LadderState = { ...newLadder(0), atRung: [{ at: AT - 2 * DAY_MS, rating: 'right' }, { at: AT - DAY_MS, rating: 'right' }] };
    const out = closeLadders(FIXTURE, { walk }, { startsAt: AT, protected: false, quests: [{ ladder: 'walk', rung: 0, done: true, rating: 'right' }] }, PROFILE);
    expect(out.changed.walk!.rung).toBe(1);
    expect(out.newRungs).toEqual([{ ladder: 'walk', rung: 1 }]);
  });
});

describe('the first day back (spec §3.3)', () => {
  it('steps down every ladder that is not resting after pain', () => {
    const out = reenterLadders({ push: newLadder(2), walk: { ...newLadder(1), paused: true } }, AT + REENTRY_AWAY_MS, AT);
    expect(out).toEqual({ push: { ...newLadder(2), rung: 1 } });
    expect(reenterLadders({ push: newLadder(2) }, AT + REENTRY_AWAY_MS - 1, AT)).toEqual({});
  });
});

describe('the next quest day (architecture §4.3)', () => {
  // 04:00 to 04:00 in Manila.
  const last = { startsAt: Date.UTC(2026, 9, 10, 20), endsAt: Date.UTC(2026, 9, 11, 20), timeZone: 'Asia/Manila' };
  const BOUNDARY = 240;

  it('is the window after the last day while it runs', () => {
    expect(followingDay(last, 3, 'Asia/Manila', BOUNDARY, last.endsAt + HOUR_MS)).toEqual({
      window: nextDayWindow(last, 'Asia/Manila', BOUNDARY), dayNumber: 4, away: 0, comeback: false,
    });
  });

  it('counts the days that ended meanwhile as away days', () => {
    const out = followingDay(last, 3, 'Asia/Manila', BOUNDARY, last.endsAt + 2 * DAY_MS + HOUR_MS);
    expect(out).toMatchObject({ dayNumber: 6, away: 2, comeback: false });
    expect(out.window.startsAt).toBe(last.endsAt + 2 * DAY_MS);
  });

  it('a day starting 5 or more days after the last one ended is a comeback', () => {
    expect(followingDay(last, 3, 'Asia/Manila', BOUNDARY, last.endsAt + 5 * DAY_MS + HOUR_MS)).toMatchObject({ away: 5, comeback: true });
  });

  it(`after more than ${MAX_AWAY_DAYS} away days, starts a fresh day from now`, () => {
    const now = last.endsAt + (MAX_AWAY_DAYS + 10) * DAY_MS + HOUR_MS;
    const out = followingDay(last, 3, 'Asia/Manila', BOUNDARY, now);
    expect(out).toMatchObject({ away: MAX_AWAY_DAYS + 10, dayNumber: 3 + 1 + MAX_AWAY_DAYS + 10, comeback: true });
    expect(out.window.startsAt).toBe(now);
    expect(out.window.endsAt).toBeGreaterThan(now);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd packages/rules && npx vitest run test/closing.test.ts`
Expected: FAIL (`../src/closing.ts` doesn't exist).

- [ ] **Step 3: Add `MAX_AWAY_DAYS`** (`packages/rules/src/constants.ts`, after `LATE_SYNC_MS`)

```ts
/** Away days counted one by one when a player comes back; a longer absence starts a fresh day from now. */
export const MAX_AWAY_DAYS = 400;
```

- [ ] **Step 4: Write `packages/rules/src/closing.ts`**

```ts
// What happens to a player's ladders and calendar when a quest day ends (architecture §4.3). The server's advance and
// the phone's offline day (M6e) share it, so both close a day the same way.
import { DAY_MS, MAX_AWAY_DAYS, REENTRY_AWAY_MS } from './constants.ts';
import { newLadder, recordCompletion, recordMiss, recordReentry } from './ladder.ts';
import type { LadderState, Rating } from './ladder.ts';
import { maxRungFor } from './library.ts';
import type { PlayerProfile, QuestLibrary } from './library.ts';
import { firstDayWindow, nextDayWindow } from './time.ts';
import type { DayWindow } from './time.ts';

/** A quest of a closing day, as far as its ladder cares. */
export type ClosingQuest = { ladder: string | null; rung: number | null; done: boolean; rating: Rating | null };

export type ClosedLadders = {
  /** The ladders that changed, by id. */
  changed: Record<string, LadderState>;
  /** Rungs reached for the first time: each pays RUNG_BONUS_XP to its ladder's stat. */
  newRungs: { ladder: string; rung: number }[];
};

/**
 * A closing day's ladder sessions (M1 review): each ladder quest records its completion with its final rating ("right"
 * when unrated) at the rung it was built at, or a missed session; a protected day (planned rest, pain, no quests) never
 * counts as missed. Ladders this content doesn't know are skipped.
 */
export function closeLadders(
  library: QuestLibrary,
  ladders: Readonly<Record<string, LadderState>>,
  day: { startsAt: number; protected: boolean; quests: readonly ClosingQuest[] },
  profile: PlayerProfile,
): ClosedLadders {
  const known = new Set(library.ladders.map((l) => l.id));
  const current: Record<string, LadderState> = { ...ladders };
  const changed: Record<string, LadderState> = {};
  const newRungs: ClosedLadders['newRungs'] = [];
  for (const q of day.quests) {
    if (q.ladder === null || q.rung === null || !known.has(q.ladder)) continue;
    const state = current[q.ladder] ?? newLadder();
    if (q.done) {
      const maxRung = maxRungFor(library, q.ladder, profile);
      const change = recordCompletion(state, { at: day.startsAt, rung: q.rung, rating: q.rating ?? 'right', difficulty: profile.difficulty, maxRung });
      current[q.ladder] = changed[q.ladder] = change.state;
      if (change.newHighestRung) newRungs.push({ ladder: q.ladder, rung: change.state.rung });
    } else if (!day.protected) {
      current[q.ladder] = changed[q.ladder] = recordMiss(state, { at: day.startsAt, rung: q.rung }).state;
    }
  }
  return { changed, newRungs };
}

/** The first day back after REENTRY_AWAY_MS or more away (spec §3.3): the ladders that step down. */
export function reenterLadders(ladders: Readonly<Record<string, LadderState>>, startsAt: number, lastEndsAt: number): Record<string, LadderState> {
  const changed: Record<string, LadderState> = {};
  for (const [id, state] of Object.entries(ladders)) {
    const change = recordReentry(state, startsAt, lastEndsAt);
    if (change.steppedDown) changed[id] = change.state;
  }
  return changed;
}

export type NextDay = { window: DayWindow; dayNumber: number; away: number; comeback: boolean };

/**
 * The quest day after `last` that is still running at `nowMs` (architecture §4.3): the days that ended meanwhile are
 * away days, counted one by one up to MAX_AWAY_DAYS; a longer absence starts a fresh day from now. A comeback day starts
 * REENTRY_AWAY_MS or more after the last one ended: it is light, and the rungs step down.
 */
export function followingDay(last: DayWindow, lastDayNumber: number, timeZone: string, boundaryMinutes: number, nowMs: number): NextDay {
  let window = nextDayWindow(last, timeZone, boundaryMinutes);
  let away = 0;
  while (window.endsAt <= nowMs && away < MAX_AWAY_DAYS) {
    away++;
    window = nextDayWindow(window, timeZone, boundaryMinutes);
  }
  if (window.endsAt <= nowMs) {
    window = firstDayWindow(nowMs, timeZone, boundaryMinutes);
    away = Math.max(away, Math.floor((nowMs - last.endsAt) / DAY_MS));
  }
  return { window, dayNumber: lastDayNumber + 1 + away, away, comeback: window.startsAt - last.endsAt >= REENTRY_AWAY_MS };
}
```

- [ ] **Step 5: Export it** (`packages/rules/src/index.ts`, after `export * from './day.ts';`)

```ts
export * from './closing.ts';
```

In `packages/rules/test/index.test.ts`, add `'closeLadders', 'reenterLadders', 'followingDay',` after `'addRecovery', 'checkProvisionalDay',`.

- [ ] **Step 6: Run the rules tests**

Run: `cd packages/rules && npx vitest run`
Expected: PASS (all, including the new file and the portability checks).

- [ ] **Step 7: Commit**

```bash
git add packages/rules
git commit -m "M6e T1: closing a day in the rules (closeLadders, reenterLadders, followingDay), for the server and the phone"
```

## Task 2: Rules — the stored quest, why-lines, and keeping a phone's day

**Files:**
- Modify: `packages/rules/src/day.ts`, `packages/rules/src/workout.ts`, `packages/rules/src/adjust.ts`
- Test: `packages/rules/test/day.test.ts`, `packages/rules/test/workout.test.ts`, `packages/rules/test/adjust.test.ts`, `packages/rules/test/index.test.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/rules/test/day.test.ts`, add `isWhyReason, storedQuest` to the import from `'../src/day.ts'`, add
`sessionCondition` to the import from `'../src/workout.ts'` (add that import line if the file has none:
`import { planWorkout, sessionCondition } from '../src/workout.ts';`, keeping any names already imported), and
`PROFILE` to the fixtures import. Then append:

```ts
describe('a built quest as it is stored and shown (M6e)', () => {
  it('snapshots the completion type and the condition of the version in use', () => {
    const day = buildDay(FIXTURE, dayInput());
    const stored = storedQuest(FIXTURE, day.quests[0]!);
    const template = templateById(FIXTURE, stored.templateId);
    expect(stored).toMatchObject({ slot: 'core', completion: template.completion, condition: template.condition, xp: day.quests[0]!.xp });
    expect('moves' in stored).toBe(false);
  });

  it("a workout stores its exercises and sets; a hard day the lighter version's condition", () => {
    const workout = workoutTemplate(0, 1);
    const moves = planWorkout(TRAINING, workout, PROFILE, 0)!;
    const drafted = draftQuest(workout, 'core', { code: 'balance', stat: 'strength' }, { moves });
    expect(storedQuest(WORKOUT_FIXTURE, drafted).condition).toEqual(sessionCondition(workout, moves, false));
    const walk = templateById(FIXTURE, 'walk-0');
    expect(storedQuest(FIXTURE, draftQuest(walk, 'core', { code: 'light_day' }, { hardDay: true })).condition).toEqual(walk.hardDay.condition);
  });
});

describe('a why-line sent by a phone (M6e)', () => {
  it('accepts every reason the builder gives', () => {
    for (const q of buildDay(FIXTURE, dayInput()).quests) expect(isWhyReason(q.why)).toBe(true);
    for (const why of [
      { code: 'goal', goal: 'body' }, { code: 'unlocked', previous: 'push-0' }, { code: 'short_on_time', minutes: 10 }, { code: 'second_wind' },
    ]) expect(isWhyReason(why)).toBe(true);
  });

  it('refuses anything else', () => {
    for (const why of [
      null, 'goal', {}, { code: 'nope' }, { code: 'goal', goal: 'fame' }, { code: 'balance', stat: 'discipline' },
      { code: 'article', extra: 1 }, { code: 'unlocked', previous: 'Push 0' }, { code: 'short_on_time', minutes: 0 },
      { code: 'short_on_time', minutes: 1.5 },
    ]) expect(isWhyReason(why)).toBe(false);
  });
});
```

(`buildDay`, `draftQuest`, `templateById`, `FIXTURE`, `TRAINING`, `WORKOUT_FIXTURE`, `dayInput`, `workoutTemplate` and
`planWorkout` are already imported there; add whichever is missing.)

In `packages/rules/test/workout.test.ts`, add `sameMoves` to the import from `'../src/workout.ts'` and append:

```ts
describe('the same exercises (M6e)', () => {
  it('compares each planned exercise, in order', () => {
    const a = [{ move: 'bridge', unit: 'reps' as const, min: 8, max: 12, perSide: false }];
    expect(sameMoves(a, [{ ...a[0]! }])).toBe(true);
    expect(sameMoves(null, null)).toBe(true);
    expect(sameMoves(a, null)).toBe(false);
    expect(sameMoves(a, [{ ...a[0]!, max: 15 }])).toBe(false);
    expect(sameMoves(a, [...a, ...a])).toBe(false);
  });
});
```

In `packages/rules/test/adjust.test.ts`, add `provisionalDay` to the import from `'../src/adjust.ts'`, the type
`ProvisionalQuest` (`import type { ProvisionalQuest } from '../src/adjust.ts';`), and append inside
`describe('checking a day built offline (architecture §6)', …)`:

```ts
  const sent = (day: BuiltDay): ProvisionalQuest[] => day.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: q.moves }));

  it('keeps the day the phone built, re-drafted from the tables (M6e)', () => {
    expect(provisionalDay(FIXTURE, dayInput(), 2, sent(DAY_TWO))).toEqual({ day: DAY_TWO, problems: [] });
  });

  it("names what it can't keep: an unknown template, a workout without its exercises, a broken rule (M6e)", () => {
    const unknown = [...sent(DAY_TWO).slice(1), { slot: 'core' as const, templateId: 'nope-0', why: { code: 'article' as const }, moves: null }];
    expect(provisionalDay(FIXTURE, dayInput(), 2, unknown)).toEqual({ day: null, problems: ['unknown template nope-0'] });
    const input = dayInput({ dayNumber: 3 });
    const noMoves = sent(buildDay(WORKOUT_FIXTURE, input)).map((q) => ({ ...q, moves: null }));
    expect(provisionalDay(WORKOUT_FIXTURE, input, 3, noMoves).problems[0]).toMatch(/needs its planned exercises/);
    expect(has(provisionalDay(FIXTURE, dayInput(), 3, sent(DAY_TWO)).problems, 'day number')).toBe(true);
  });

  it("a workout's exercises must be the ones planned for the player (M6e)", () => {
    const input = dayInput({ dayNumber: 3 });
    const day = buildDay(WORKOUT_FIXTURE, input); // core: workout-0
    expect(checkProvisionalDay(WORKOUT_FIXTURE, input, day)).toEqual([]);
    const later = day.quests.map((q) => (q.moves === null ? q : { ...q, moves: planWorkout(TRAINING, templateById(WORKOUT_FIXTURE, q.templateId), input.profile, 1) }));
    expect(checkProvisionalDay(WORKOUT_FIXTURE, input, { ...day, quests: later })).toContain("workout-0's exercises are not the ones planned");
  });

  it('the day after a workout rests every strength ladder (M6c decision 7)', () => {
    const input = dayInput({ dayNumber: 4, history: [{ dayNumber: 3, quests: { core: 'workout-0' } }] });
    const day = buildDay(WORKOUT_FIXTURE, input);
    const withPush = day.quests.map((q) => (q.slot === 'side1' ? draftQuest(templateById(WORKOUT_FIXTURE, 'push-0'), 'side1', q.why) : q));
    expect(checkProvisionalDay(WORKOUT_FIXTURE, input, { ...day, quests: withPush })).toContain('push was trained yesterday');
  });

  it('no movement twice: a workout and a strength quest it trains never share the day (M6e, M6c review)', () => {
    const input = dayInput({ dayNumber: 3 });
    const day = buildDay(WORKOUT_FIXTURE, input); // the workout trains squat, push and hinge
    const withPush = day.quests.map((q) => (q.slot === 'side1' ? draftQuest(templateById(WORKOUT_FIXTURE, 'push-0'), 'side1', q.why) : q));
    expect(checkProvisionalDay(WORKOUT_FIXTURE, input, { ...day, quests: withPush })).toContain('workout and push train the same movement');
  });
```

In `packages/rules/test/index.test.ts`, add `'storedQuest', 'isWhyReason', 'sameMoves', 'provisionalDay',` after
`'closeLadders', 'reenterLadders', 'followingDay',`.

- [ ] **Step 2: Run them to see them fail**

Run: `cd packages/rules && npx vitest run test/day.test.ts test/workout.test.ts test/adjust.test.ts test/index.test.ts`
Expected: FAIL (`storedQuest`, `isWhyReason`, `sameMoves`, `provisionalDay` don't exist).

- [ ] **Step 3: `storedQuest` and `isWhyReason`** (`packages/rules/src/day.ts`)

Change the constants import to also take `GOALS`:

```ts
import { CLASSES, CORE_MIX, DISCIPLINE_PER_RECOVERY, GOALS, LIGHT_DAY_MINUTES, MIN_SIDE_MINUTES, TRAINABLE_STATS } from './constants.ts';
```

the library import to also take `templateById` and the types `CompletionType` and `Condition` (keep the names already
there):

```ts
import {
  allowedTopRung, coreAllowance, effectiveRung, findTemplate, ladderAllowed, ladderById, ladderExercise, ladderRungs,
  specialTemplate, templateAllowed, templateById, validateProfile,
} from './library.ts';
import type { CompletionType, Condition, Ladder, PlayerProfile, QuestLibrary, QuestTemplate } from './library.ts';
```

and the workout import to also take `sessionCondition`:

```ts
import { isWorkout, planWorkout, sessionCondition, sessionMinutes } from './workout.ts';
```

(If `CompletionType` or `Condition` is exported from another module than `library.ts`, import it from there; `git grep
"export type CompletionType\|export type Condition" packages/rules/src` shows where.)

After `WHY_CODES`, add:

```ts
/** A why-line sent by a phone (M6e): one of the builder's reasons, with valid details and nothing else. */
export function isWhyReason(value: unknown): value is WhyReason {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v).sort().join();
  switch (v.code) {
    case 'class_main':
    case 'class_second':
    case 'balance':
      return keys === 'code,stat' && TRAINABLE_STATS.includes(v.stat as TrainableStat);
    case 'goal':
      return keys === 'code,goal' && GOALS.includes(v.goal as Goal);
    case 'unlocked':
      return keys === 'code,previous' && typeof v.previous === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(v.previous);
    case 'short_on_time':
      return keys === 'code,minutes' && Number.isInteger(v.minutes) && (v.minutes as number) >= 1 && (v.minutes as number) <= 60;
    default:
      return keys === 'code' && WHY_CODES.includes(v.code as WhyCode);
  }
}
```

After `draftQuest`, add:

```ts
/** A built quest as it is stored and shown: the completion type and the condition of the version in use, no plan list. */
export type StoredQuest = Omit<QuestDraft, 'moves'> & { completion: CompletionType; condition: Condition };

/**
 * A built quest as the database stores it (a later content change never rewrites a day) and as the phone shows a day it
 * built offline (M6e). A workout stores its planned exercises and their sets (M6c).
 */
export function storedQuest(library: QuestLibrary, q: QuestDraft): StoredQuest {
  const template = templateById(library, q.templateId);
  return {
    slot: q.slot,
    templateId: q.templateId,
    ladder: q.ladder,
    rung: q.rung,
    stat: q.stat,
    tier: q.tier,
    minutes: q.minutes,
    completion: template.completion,
    condition: q.moves !== null ? sessionCondition(template, q.moves, q.hardDay) : q.hardDay ? template.hardDay.condition : template.condition,
    hardDay: q.hardDay,
    xp: q.xp,
    why: q.why,
    book: q.book,
  };
}
```

- [ ] **Step 4: `sameMoves`** (`packages/rules/src/workout.ts`, after the `SessionMove` type)

```ts
/** The same planned exercises, in the same order (M6e: a phone's offline workout against the server's plan). */
export function sameMoves(a: readonly PlannedMove[] | null, b: readonly PlannedMove[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((m, i) => {
    const n = b[i]!;
    return m.move === n.move && m.unit === n.unit && m.min === n.min && m.max === n.max && m.perSide === n.perSide;
  });
}
```

- [ ] **Step 5: Keeping a phone's day** (`packages/rules/src/adjust.ts`)

Change the imports to:

```ts
import {
  balanceChoice, bookFor, dayBudget, dayContext, draftQuest, keptOutBy, ladderCandidates, microCandidates, movesFor, useKey,
} from './day.ts';
import type { BuiltDay, DayInput, QuestDraft, WhyReason } from './day.ts';
```

and

```ts
import { isWorkout, planWorkout, sameMoves } from './workout.ts';
import type { PlannedMove } from './workout.ts';
```

In `checkProvisionalDay`, after the `if (template.role !== 'ladder' && template.role !== 'micro') { … continue; }` block,
add:

```ts
    // A workout's exercises are the ones the server plans, so the sets the player logs fit it (M6e).
    if (!sameMoves(movesFor(ctx, template), quest.moves)) problems.push(`${template.id}'s exercises are not the ones planned`);
```

and before `const budget = dayBudget(input);`, add:

```ts
  // No movement twice in a day (M6c review): a workout and a strength quest it keeps out never share it. Both ways, since
  // the builder keeps out by slot order and a swap by the rest of the day (M6e).
  const kept = day.quests.filter((q) => QUEST_SLOTS.includes(q.slot)).flatMap((q) => {
    const template = findTemplate(library, q.templateId);
    return template === undefined ? [] : [{ key: useKey(template), out: keptOutBy(library, template, q.moves) }];
  });
  kept.forEach((a, i) => {
    for (const b of kept.slice(i + 1)) if (a.out.includes(b.key) && b.out.includes(a.key)) problems.push(`${a.key} and ${b.key} train the same movement`);
  });
```

After `checkProvisionalDay`, add:

```ts
/** A quest of a day the phone built offline, as the server reads it (M6e): it re-drafts the rest from its own tables. */
export type ProvisionalQuest = { slot: Slot; templateId: string; why: WhyReason; moves: readonly PlannedMove[] | null };

/**
 * The day the phone built offline, re-drafted from the server's tables (rewards, minutes, the book), or why it can't be
 * kept: a template this content doesn't know, a workout without its exercises, or what `checkProvisionalDay` finds.
 */
export function provisionalDay(
  library: QuestLibrary,
  input: DayInput,
  dayNumber: number,
  quests: readonly ProvisionalQuest[],
): { day: BuiltDay; problems: [] } | { day: null; problems: string[] } {
  const ctx = dayContext(library, input);
  const drafts: QuestDraft[] = [];
  for (const q of quests) {
    const template = findTemplate(library, q.templateId);
    if (template === undefined) return { day: null, problems: [`unknown template ${q.templateId}`] };
    try {
      drafts.push(draftQuest(template, q.slot, q.why, { book: bookFor(ctx, template), moves: q.moves }));
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return { day: null, problems: [error.message] };
    }
  }
  const day: BuiltDay = {
    dayNumber, budget: dayBudget(input), light: input.light || input.dayNumber === 1, hardDay: false, articleId: input.articleId, quests: drafts,
  };
  const problems = checkProvisionalDay(library, input, day);
  return problems.length === 0 ? { day, problems: [] } : { day: null, problems };
}
```

- [ ] **Step 6: Run the rules tests and typecheck**

Run: `cd packages/rules && npx vitest run && npm run typecheck`
Expected: PASS. Then the content package's fuzz test, which checks every built and swapped day against
`checkProvisionalDay`: `cd packages/content && npx vitest run test/fuzz.test.ts` — PASS (no "offline check rejects").

- [ ] **Step 7: Commit**

```bash
git add packages/rules
git commit -m "M6e T2: storedQuest, isWhyReason, sameMoves, provisionalDay; the offline check knows workouts' exercises and no movement twice"
```

## Task 3: Server — `planAdvance` closes days with the shared rules (no change in behaviour)

**Files:**
- Modify: `supabase/functions/_shared/advance.ts`, `supabase/functions/_shared/drafts.ts`
- Test: `supabase/tests/unit/advance.test.ts` (unchanged: it must still pass)

- [ ] **Step 1: Run the advance tests first, to know they pass before the change**

Run: `cd supabase && npx vitest run --project unit tests/unit/advance.test.ts`
Expected: PASS (20 tests). Never run a bare `npx vitest run` in `supabase/`: it also runs the live project.

- [ ] **Step 2: `toDraft` becomes the rules' `storedQuest`** (`supabase/functions/_shared/drafts.ts`, whole file)

```ts
// A built quest (rules: QuestDraft) as the database stores it: the template's completion type and the condition of
// the version in use are snapshotted with the XP, so a later content change never rewrites a day. A workout stores its
// planned exercises and their sets (M6c). The rules' `storedQuest` does it, so the phone shows a day it built offline the
// same way (M6e).
import { storedQuest } from '../../../packages/rules/src/index.ts';
import type { QuestDraft, QuestLibrary } from '../../../packages/rules/src/index.ts';
import type { InstanceDraft } from './state.ts';

export function toDraft(library: QuestLibrary, q: QuestDraft): InstanceDraft {
  return storedQuest(library, q);
}
```

- [ ] **Step 3: `planAdvance` calls the closing helpers** (`supabase/functions/_shared/advance.ts`)

Replace the imports with:

```ts
import {
  DISCIPLINE_PER_CORE_DAY, LIGHT_DAY_MINUTES, RUNG_BONUS_XP, STREAK_SLOTS, applyDay, buildDay, closeLadders, closedDayResolution,
  followingDay, ladderById, reenterLadders,
} from '../../../packages/rules/src/index.ts';
import type { LadderState, QuestLibrary, Stat, StreakState } from '../../../packages/rules/src/index.ts';
import { toDraft } from './drafts.ts';
import { dayWindow, ladderMap, pastDays, startPoints, statXp, streakState, toProfile } from './state.ts';
import type { CharacterRow, DayDraft, DayRow, InstanceDraft, InstanceRow, LadderRow, ProfileRow } from './state.ts';
```

Delete the `MAX_AWAY_DAYS` constant and its comment (it is the rules' constant now).

In `planAdvance`, replace

```ts
  const knownLadders = new Set(library.ladders.map((l) => l.id));
  const ladders = ladderMap(input.ladders);
  const changed: Record<string, LadderState> = {};
  const setLadder = (id: string, change: LadderChange): void => {
    ladders[id] = change.state;
    changed[id] = change.state;
  };
```

with

```ts
  const ladders = ladderMap(input.ladders);
  const changed: Record<string, LadderState> = {};
  const setLadders = (states: Readonly<Record<string, LadderState>>): void => {
    Object.assign(ladders, states);
    Object.assign(changed, states);
  };
```

Replace the block from `// Ladders move only now, with each quest's final rating …` through the end of its
`for (const q of quests) { … }` loop with

```ts
    // Ladders move only now, with each quest's final rating and the rung it was built at (M1 review). A protected
    // day (planned rest, no quests) never counts as a missed session. The phone closes a day it holds the same way (M6e).
    const closed = closeLadders(library, ladders, {
      startsAt: day.starts_at.getTime(),
      protected: day.protection !== null,
      quests: quests.map((q) => ({ ladder: q.ladder_id, rung: q.rung, done: q.completed_at !== null, rating: q.rating })),
    }, rulesProfile());
    setLadders(closed.changed);
    for (const { ladder, rung } of closed.newRungs) {
      pay({ sourceType: 'rung', sourceId: `rung:${ladder}:${rung}`, stat: ladderById(library, ladder).stat, amount: RUNG_BONUS_XP });
    }
```

Replace the start of the `if (!running) { … }` block, from `const last = days[days.length - 1]!;` through the comeback
loop, with

```ts
    const last = days[days.length - 1]!;
    const { window, dayNumber, away, comeback } = followingDay(dayWindow(last), last.day_number, input.timeZone, profile.boundary_minutes, nowMs);

    // Away days are one gap check-in; a pending check-in covers them; behind a waiting day they wait too (M7 replays
    // them from the jump in day numbers).
    if (away > 0 && !streak.awaitingCheckin && !queued) {
      streak = applyDay(streak, { kind: 'awaiting_checkin' }).state;
      gap = { from: last.day_number + 1, to: dayNumber - 1 };
    }
    // Measured in time, like recordReentry, so a light comeback day and the rung step-down always come together.
    if (comeback) setLadders(reenterLadders(ladders, window.startsAt, last.ends_at.getTime()));
```

(The rest — `history`, `buildDay`, `newDay` — stays as it is.)

- [ ] **Step 4: Run the server unit tests, the typecheck and the Deno check**

Run: `cd supabase && npx vitest run --project unit && cd .. && npm run typecheck && npm run check:functions`
Expected: PASS, the advance tests unchanged.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared
git commit -m "M6e T3: planAdvance closes days with the rules' closing helpers; toDraft is storedQuest (no change in behaviour)"
```

## Task 4: Server — `planAdvance` keeps a day the phone built offline

**Files:**
- Modify: `supabase/functions/_shared/advance.ts`
- Test: `supabase/tests/unit/advance.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `supabase/tests/unit/advance.test.ts`; add `plannedMoves` to the rules
  import)

```ts
describe('a day the phone built offline (M6e)', () => {
  const end = day1End + 5 * HOUR;
  const built = planAdvance(afterDay1(['core'], end))!.newDay!;
  const phone = built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: plannedMoves(q.condition) }));

  it('without one, says nothing about it', () => {
    expect(planAdvance(afterDay1(['core'], end))!.offline).toBeNull();
  });

  it("keeps the phone's quests when the rules allow them, even where the server would have chosen others", () => {
    const side2 = built.quests.find((q) => q.slot === 'side2')!;
    const used = new Set(built.quests.map((q) => q.ladder ?? q.templateId));
    const other = LIBRARY.templates.find((t) => t.role === 'micro' && t.exercise === null && t.minutes <= side2.minutes && !used.has(t.id))!;
    const mine = phone.map((q) => (q.slot === 'side2' ? { ...q, templateId: other.id, why: { code: 'swap' as const } } : q));
    const out = planAdvance({ ...afterDay1(['core'], end), provisional: { dayNumber: 2, quests: mine } })!;
    expect(out.offline).toEqual({ kept: 'phone', problems: [] });
    expect(out.newDay!.quests.find((q) => q.slot === 'side2')).toMatchObject({ templateId: other.id, why: { code: 'swap' } });
    expect(out.newDay!.quests.filter((q) => q.slot !== 'side2')).toEqual(built.quests.filter((q) => q.slot !== 'side2'));
  });

  it("builds its own day when the phone's breaks a rule, and says why", () => {
    const core = built.quests.find((q) => q.slot === 'core')!;
    const higher = LIBRARY.templates.find((t) => t.ladder === core.ladder && t.rung === (core.rung ?? 0) + 1)!;
    const mine = phone.map((q) => (q.slot === 'core' ? { ...q, templateId: higher.id } : q));
    const out = planAdvance({ ...afterDay1(['core'], end), provisional: { dayNumber: 2, quests: mine } })!;
    expect(out.offline).toEqual({ kept: 'server', problems: [`${higher.id} is above the player's rung`] });
    expect(out.newDay!.quests).toEqual(built.quests);
  });

  it('keeps the phone\'s quests only for the day it built', () => {
    const out = planAdvance({ ...afterDay1(['core'], end), provisional: { dayNumber: 3, quests: phone } })!;
    expect(out.offline!.kept).toBe('server');
    expect(out.offline!.problems.some((p) => p.includes('day number'))).toBe(true);
    expect(out.newDay!.dayNumber).toBe(2);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd supabase && npx vitest run --project unit tests/unit/advance.test.ts`
Expected: FAIL (`offline` is undefined; `provisional` is not in `AdvanceInput`).

- [ ] **Step 3: The `provisional` input and the `offline` outcome** (`supabase/functions/_shared/advance.ts`)

Add `provisionalDay` to the rules import, and the types `DayInput` and `ProvisionalQuest`:

```ts
import {
  DISCIPLINE_PER_CORE_DAY, LIGHT_DAY_MINUTES, RUNG_BONUS_XP, STREAK_SLOTS, applyDay, buildDay, closeLadders, closedDayResolution,
  followingDay, ladderById, provisionalDay, reenterLadders,
} from '../../../packages/rules/src/index.ts';
import type { DayInput, LadderState, ProvisionalQuest, QuestLibrary, Stat, StreakState } from '../../../packages/rules/src/index.ts';
```

In `AdvanceInput`, after `contentVersion: number;`, add:

```ts
  /** M6e: a day the phone built offline (its number and quests), kept when the rules allow it. */
  provisional?: { dayNumber: number; quests: readonly ProvisionalQuest[] };
```

In `Outcome`, after `buildError: string | null;`, add:

```ts
  /** M6e: whose quests the new day has when the phone sent a day it built offline (null without one), and why not its own. */
  offline: { kept: 'phone' | 'server'; problems: string[] } | null;
```

In `planAdvance`, change

```ts
  let buildError: string | null = null;
```

to

```ts
  let buildError: string | null = null;
  let offline: Outcome['offline'] = null;
```

and replace the build:

```ts
    const history = pastDays(days, input.instances).slice(-7);
    let quests: InstanceDraft[] = [];
    let budget = comeback ? LIGHT_DAY_MINUTES : profile.minutes_per_day;
    let protection: DayDraft['protection'] = null;
    try {
      const built = buildDay(library, { dayNumber, profile: rulesProfile(), ladders, history, light: comeback, workoutsDone: input.workoutsDone, articleId: null });
      quests = built.quests.map((q) => toDraft(library, q));
      budget = built.budget;
    } catch (error) {
      // A day that can't be built is protected automatically (spec §3.7): never a miss the player didn't cause.
      protection = 'no_quests';
      buildError = error instanceof Error ? error.message : String(error);
    }
```

with

```ts
    const history = pastDays(days, input.instances).slice(-7);
    const dayInput: DayInput = {
      dayNumber, profile: rulesProfile(), ladders, history, light: comeback, workoutsDone: input.workoutsDone, articleId: null,
    };
    let quests: InstanceDraft[] = [];
    let budget = comeback ? LIGHT_DAY_MINUTES : profile.minutes_per_day;
    let protection: DayDraft['protection'] = null;
    // The phone's day when the rules allow it (M6e decision 5), re-drafted from the server's tables.
    const phone = input.provisional === undefined
      ? null
      : provisionalDay(library, dayInput, input.provisional.dayNumber, input.provisional.quests);
    if (phone !== null) offline = { kept: phone.day === null ? 'server' : 'phone', problems: phone.problems };
    if (phone !== null && phone.day !== null) {
      quests = phone.day.quests.map((q) => toDraft(library, q));
      budget = phone.day.budget;
    } else {
      try {
        const built = buildDay(library, dayInput);
        quests = built.quests.map((q) => toDraft(library, q));
        budget = built.budget;
      } catch (error) {
        // A day that can't be built is protected automatically (spec §3.7): never a miss the player didn't cause.
        protection = 'no_quests';
        buildError = error instanceof Error ? error.message : String(error);
      }
    }
```

and the return:

```ts
  return { close, gap, ladders: changed, ledger, streak, counters, newDay, buildError, offline };
```

- [ ] **Step 4: Run the server unit tests, the typecheck and the Deno check**

Run: `cd supabase && npx vitest run --project unit && cd .. && npm run typecheck && npm run check:functions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase
git commit -m "M6e T4: planAdvance keeps a day the phone built offline when the rules allow it (provisional input, offline outcome)"
```

## Task 5: Server — the state carries what the phone needs to build a day

**Files:**
- Modify: `supabase/functions/_shared/state.ts`
- Test: `supabase/tests/unit/state.test.ts`

- [ ] **Step 1: Write the failing test** (append to `supabase/tests/unit/state.test.ts`; import `newLadder` from the rules,
  and `DAY_TWO_SLOTS`, `ladderRows` from `./fixtures.ts`)

```ts
describe('what the phone needs to build a day offline (M6e decision 3)', () => {
  it("sends every ladder's state, each recent day's final quests, and the workouts done", () => {
    const s = dayTwoSnapshot(DAY_TWO_SLOTS, { ladders: ladderRows({ push: newLadder(1) }), workoutsDone: 3 });
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.ladders).toEqual({ push: newLadder(1) });
    expect(view.history.map((d) => d.dayNumber)).toEqual([1, 2]);
    expect(view.history[1]!.quests).toMatchObject({ core: 'push-1', side1: 'walk-1', side2: 'reading-0', article: 'article' });
    expect(view.workoutsDone).toBe(3);
  });
});
```

(If the article template's id isn't `article` in the content, use `expect.any(String)` for it; `git grep "role: 'article'"
packages/content/src` shows it.)

- [ ] **Step 2: Run it to see it fail**

Run: `cd supabase && npx vitest run --project unit tests/unit/state.test.ts`
Expected: FAIL (`view.ladders` is undefined).

- [ ] **Step 3: Add the fields** (`supabase/functions/_shared/state.ts`, in `stateView`'s returned object, after `reading`)

```ts
    /** M6e: what the phone needs to build the next day offline (rules: buildDay) — every ladder's state by id, each recent
     * day's final template per slot (oldest first) and the workouts done. */
    ladders: ladderMap(s.ladders),
    history: pastDays(s.days, s.instances),
    workoutsDone: s.workoutsDone,
```

- [ ] **Step 4: Run the server unit tests and the typecheck**

Run: `cd supabase && npx vitest run --project unit && cd .. && npm run typecheck`
Expected: PASS (the app's tests build their states with `stateView`, so they get the fields too).

- [ ] **Step 5: Commit**

```bash
git add supabase
git commit -m "M6e T5: the state carries the ladders, the recent days' quests and the workouts done"
```

## Task 6: Server — the `provisional_day` event and quests named by day and slot

**Files:**
- Modify: `supabase/functions/_shared/events.ts`
- Test: `supabase/tests/unit/events.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `supabase/tests/unit/events.test.ts`; import the type
  `SyncRequest` from `'../../functions/_shared/events.ts'`)

```ts
describe('offline-built days (M6e)', () => {
  const quest = { slot: 'core', templateId: 'push-1', why: { code: 'class_main', stat: 'strength' }, moves: null, book: null };
  const workout = {
    slot: 'side1', templateId: 'workout-0', why: { code: 'goal', goal: 'body' }, book: null,
    moves: [{ move: 'bridge', unit: 'reps', min: 8, max: 12, perSide: false }],
  };
  const day = {
    id: id(40), type: 'provisional_day', dayNumber: 2, builtAt: start + MIN, timeZone: 'Asia/Manila',
    window: { startsAt: start, endsAt: start + 24 * 60 * MIN }, budget: 25, light: false, quests: [quest, workout],
  };
  const parse = (events: unknown[]) => parseSyncBody({ timeZone: 'UTC', events }) as SyncRequest;

  it('reads the day, the zone and each quest, and drops anything else', () => {
    expect(parse([{ ...day, extra: 1, quests: [{ ...quest, extra: 2 }, workout] }])).toEqual({ timeZone: 'UTC', events: [day], rejected: [] });
  });

  it('refuses a malformed day', () => {
    for (const bad of [
      { dayNumber: 1 }, { dayNumber: 2.5 }, { builtAt: 5 }, { timeZone: 'Mars/Base' }, { window: { startsAt: start, endsAt: start } },
      { budget: 0 }, { light: 'no' }, { quests: [] }, { quests: [quest, quest] }, { quests: [{ ...quest, slot: 'nope' }] },
      { quests: [{ ...quest, why: { code: 'nope' } }] }, { quests: [{ ...quest, templateId: 'Push 1' }] },
      { quests: [{ ...workout, moves: [{ move: 'Bridge', unit: 'reps', min: 8, max: 12, perSide: false }] }] },
      { quests: [{ ...workout, moves: [{ move: 'bridge', unit: 'laps', min: 8, max: 12, perSide: false }] }] },
      { quests: [{ ...quest, book: 'Dune\nMessiah' }] },
    ]) {
      expect(parse([{ ...day, ...bad }]), JSON.stringify(bad)).toMatchObject({ events: [], rejected: [{ id: id(40), code: 'bad_event' }] });
    }
  });

  it('names a quest by its day and slot instead of its id: complete, undo, rate and pain', () => {
    const ref = { dayNumber: 2, slot: 'core', templateId: 'push-1' };
    const body = parse([
      { id: id(50), type: 'complete', ref, completedAt: start + MIN, payload: {} },
      { id: id(51), type: 'undo', ref },
      { id: id(52), type: 'rate', ref, rating: 'easy' },
      { id: id(53), type: 'pain', ref, choice: 'rest' },
      { id: id(54), type: 'complete', instanceId: 5, ref, completedAt: start + MIN },
      { id: id(55), type: 'undo', ref: { ...ref, slot: 'nope' } },
      { id: id(56), type: 'undo', ref: { ...ref, dayNumber: 0 } },
      { id: id(57), type: 'swap', ref, templateId: 'walk-1' },
    ]);
    expect(body.events).toEqual([
      { id: id(50), type: 'complete', instanceId: null, ref, completedAt: start + MIN, rating: null, payload: {} },
      { id: id(51), type: 'undo', instanceId: null, ref },
      { id: id(52), type: 'rate', instanceId: null, ref, rating: 'easy' },
      { id: id(53), type: 'pain', instanceId: null, ref, choice: 'rest' },
    ]);
    expect(body.rejected.map((r) => [r.id, r.code])).toEqual([[id(54), 'bad_event'], [id(55), 'bad_event'], [id(56), 'bad_event'], [id(57), 'bad_event']]);
  });

  it('an event with an id is read as before (no ref)', () => {
    expect(parse([{ id: id(60), type: 'undo', instanceId: 7 }]).events).toEqual([{ id: id(60), type: 'undo', instanceId: 7 }]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd supabase && npx vitest run --project unit tests/unit/events.test.ts`
Expected: FAIL (`provisional_day` is `unsupported_event`; `ref` events are `bad_event`).

- [ ] **Step 3: Parse them** (`supabase/functions/_shared/events.ts`)

Update the header comment's first sentence to also say "M6e the offline-built day and quests named by day and slot".
Change the rules imports to:

```ts
import {
  CLASSES, CLOCK_SKEW_MS, EQUIPMENT, PROGRAM_STYLES, canonicalTimeZone, elapsedMs, isValidTimeZone, isWhyReason, questTimerDone,
  sessionSets,
} from '../../../packages/rules/src/index.ts';
import type {
  ClassId, Equipment, PlannedMove, ProgramStyle, ProvisionalQuest, Rating, Segment, Slot,
} from '../../../packages/rules/src/index.ts';
```

Replace the four quest event types with:

```ts
/** M6e: a quest of a day the phone built offline, named by its day and slot until the server gives it an id. */
export type SlotRef = { dayNumber: number; slot: Slot; templateId: string };
/** Which quest an event is about: its id, or (M6e) its day and slot. */
export type QuestTarget = { instanceId: number; ref?: undefined } | { instanceId: null; ref: SlotRef };

export type CompleteEvent = { id: string; type: 'complete'; completedAt: number; rating: Rating | null; payload: unknown } & QuestTarget;
export type UndoEvent = { id: string; type: 'undo' } & QuestTarget;
export type RateEvent = { id: string; type: 'rate'; rating: Rating } & QuestTarget;
```

and the pain event with:

```ts
export type PainEvent = { id: string; type: 'pain'; choice: PainChoice } & QuestTarget;
```

After `BookEvent` and `MAX_BOOK_TITLE`, add:

```ts
/**
 * M6e: a day the phone built offline (decision 4). The server reads the day number, when it was built, the zone and each
 * quest's slot, template, why-line and exercises. The window, budget, light flag and books are what the phone showed:
 * kept with the event, never trusted (the server recomputes them).
 */
export type ProvisionalDayEvent = {
  id: string;
  type: 'provisional_day';
  dayNumber: number;
  builtAt: number;
  timeZone: string;
  window: { startsAt: number; endsAt: number };
  budget: number;
  light: boolean;
  quests: (ProvisionalQuest & { book: string | null })[];
};
```

and change `PhoneEvent`:

```ts
export type PhoneEvent = CompleteEvent | UndoEvent | RateEvent | AdjustEvent | ProvisionalDayEvent;
```

After `const DAY_ABILITIES …`, add:

```ts
const SLOTS: readonly Slot[] = ['core', 'side1', 'side2', 'article', 'recovery'];
const MAX_DAY_NUMBER = 100_000;
const MAX_MOVES = 12;
const isDayNumber = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= MAX_DAY_NUMBER;
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_REPS;

/** The quest an event names: an id, or (M6e) a day and slot — one of the two. */
function parseTarget(raw: Record<string, unknown>): QuestTarget | null {
  if (raw.ref === undefined || raw.ref === null) return isId(raw.instanceId) ? { instanceId: raw.instanceId } : null;
  if (raw.instanceId !== undefined && raw.instanceId !== null) return null;
  const ref = raw.ref;
  if (!isObject(ref) || !isDayNumber(ref.dayNumber) || !SLOTS.includes(ref.slot as Slot) || !isKey(ref.templateId)) return null;
  return { instanceId: null, ref: { dayNumber: ref.dayNumber, slot: ref.slot as Slot, templateId: ref.templateId } };
}

function parseMoves(raw: unknown): PlannedMove[] | null | undefined {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_MOVES) return undefined;
  const moves: PlannedMove[] = [];
  for (const m of raw) {
    if (!isObject(m) || !isKey(m.move) || (m.unit !== 'reps' && m.unit !== 'seconds')) return undefined;
    if (!isCount(m.min) || !isCount(m.max) || typeof m.perSide !== 'boolean') return undefined;
    moves.push({ move: m.move, unit: m.unit, min: m.min, max: m.max, perSide: m.perSide });
  }
  return moves;
}

function parseProvisionalQuest(raw: unknown): ProvisionalDayEvent['quests'][number] | null {
  if (!isObject(raw) || !SLOTS.includes(raw.slot as Slot) || !isKey(raw.templateId) || !isWhyReason(raw.why)) return null;
  const book = raw.book ?? null;
  if (book !== null && (typeof book !== 'string' || book.length > MAX_BOOK_TITLE || CONTROL.test(book))) return null;
  const moves = parseMoves(raw.moves);
  if (moves === undefined) return null;
  return { slot: raw.slot as Slot, templateId: raw.templateId, why: { ...raw.why }, moves, book };
}
```

In `parseEvent`, replace the `complete`, `undo` and `rate` cases with:

```ts
    case 'complete': {
      const target = parseTarget(raw);
      if (target === null || !isTime(raw.completedAt)) return bad;
      const rating = raw.rating ?? null;
      if (rating !== null && !RATINGS.includes(rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'complete', ...target, completedAt: raw.completedAt, rating: rating as Rating | null, payload: raw.payload ?? {} };
    }
    case 'undo': {
      const target = parseTarget(raw);
      return target === null ? bad : { id, type: 'undo', ...target };
    }
    case 'rate': {
      const target = parseTarget(raw);
      if (target === null) return bad;
      if (!RATINGS.includes(raw.rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'rate', ...target, rating: raw.rating as Rating };
    }
```

the `pain` case with:

```ts
    case 'pain': {
      const target = parseTarget(raw);
      return target !== null && PAIN_CHOICES.includes(raw.choice as PainChoice)
        ? { id, type: 'pain', ...target, choice: raw.choice as PainChoice }
        : bad;
    }
```

and, before `default:`, add:

```ts
    case 'provisional_day': {
      if (!isDayNumber(raw.dayNumber) || raw.dayNumber < 2 || !isTime(raw.builtAt)) return bad;
      if (typeof raw.timeZone !== 'string' || !isValidTimeZone(raw.timeZone)) return bad;
      const w = raw.window;
      if (!isObject(w) || !isTime(w.startsAt) || !isTime(w.endsAt) || w.endsAt <= w.startsAt) return bad;
      if (!Number.isInteger(raw.budget) || (raw.budget as number) < 1 || (raw.budget as number) > 60 || typeof raw.light !== 'boolean') return bad;
      if (!Array.isArray(raw.quests) || raw.quests.length < 1 || raw.quests.length > SLOTS.length) return bad;
      const quests: ProvisionalDayEvent['quests'] = [];
      for (const q of raw.quests) {
        const parsed = parseProvisionalQuest(q);
        if (parsed === null) return bad;
        quests.push(parsed);
      }
      if (new Set(quests.map((q) => q.slot)).size !== quests.length) return bad;
      return {
        id, type: 'provisional_day', dayNumber: raw.dayNumber, builtAt: raw.builtAt, timeZone: canonicalTimeZone(raw.timeZone),
        window: { startsAt: w.startsAt, endsAt: w.endsAt }, budget: raw.budget as number, light: raw.light, quests,
      };
    }
```

The spread `...target` puts `instanceId` (and `ref` when given) where the old cases had `instanceId`; an event with an id
keeps exactly its old shape (no `ref` key), so `adjustPayload` and `levelmeup.adjust`'s "same id, same payload" check
see no change for events sent before M6e.

- [ ] **Step 4: Run the server unit tests, the typecheck and the Deno check**

Run: `cd supabase && npx vitest run --project unit && cd .. && npm run typecheck && npm run check:functions`
Expected: the events tests PASS. The typecheck fails where `instanceId` may now be null (lmu-sync, `_shared/adjust.ts`,
the phone's `project.ts`): Task 7 fixes the server and Task 12 the phone. If the typecheck stops on them now, add the
smallest guard that keeps behaviour (`if (event.instanceId === null) continue;` in `project.ts`; in lmu-sync, Task 7's
change) and note it in "As built".

- [ ] **Step 5: Commit**

```bash
git add supabase
git commit -m "M6e T6: the provisional_day event; complete, undo, rate and pain can name a quest by day and slot"
```

## Task 7: Server — `lmu-sync` applies offline days and finds quests by slot

**Files:**
- Create: `supabase/functions/_shared/offline.ts`, `supabase/tests/unit/offline.test.ts`
- Modify: `supabase/functions/lmu-sync/index.ts`

- [ ] **Step 1: Write the failing tests** (`supabase/tests/unit/offline.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { CLOCK_SKEW_MS, plannedMoves } from '../../../packages/rules/src/index.ts';
import { provisionalClock, sameQuests } from '../../functions/_shared/offline.ts';
import { DAY1, instanceRows } from './fixtures.ts';

const NOW = Date.UTC(2026, 9, 12, 2);
const LAST_END = Date.UTC(2026, 9, 11, 20);

describe('the clock an offline day is applied at (M6e decision 5)', () => {
  it('is when the phone built it, never later than now', () => {
    expect(provisionalClock(LAST_END + 1000, NOW, LAST_END)).toBe(LAST_END + 1000);
    expect(provisionalClock(NOW + 1000, NOW, LAST_END)).toBe(NOW);
  });

  it("a phone up to 5 minutes behind the last day's end counts as that end", () => {
    expect(provisionalClock(LAST_END - CLOCK_SKEW_MS, NOW, LAST_END)).toBe(LAST_END);
    expect(provisionalClock(LAST_END - CLOCK_SKEW_MS - 1, NOW, LAST_END)).toBe(LAST_END - CLOCK_SKEW_MS - 1);
  });

  it('a day built more than 5 minutes ahead of now: the phone clock is ahead', () => {
    expect(provisionalClock(NOW + CLOCK_SKEW_MS + 1, NOW, LAST_END)).toBeNull();
  });
});

describe('a stored day is the one the phone showed', () => {
  const rows = instanceRows(DAY1, 1);
  const phone = DAY1.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: plannedMoves(q.condition) }));

  it('when every slot has the same template (and a workout the same exercises)', () => {
    expect(sameQuests(rows, phone)).toBe(true);
    expect(sameQuests(rows, phone.slice(1))).toBe(false);
    expect(sameQuests(rows, phone.map((q, i) => (i === 0 ? { ...q, templateId: 'other-0' } : q)))).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd supabase && npx vitest run --project unit tests/unit/offline.test.ts`
Expected: FAIL (the module doesn't exist).

- [ ] **Step 3: Write `supabase/functions/_shared/offline.ts`**

```ts
// Offline-built days (M6e): the clock the server applies a `provisional_day` at, and whether a stored day is the one the
// phone showed. Pure.
import { CLOCK_SKEW_MS, plannedMoves, sameMoves } from '../../../packages/rules/src/index.ts';
import type { ProvisionalQuest } from '../../../packages/rules/src/index.ts';
import type { InstanceRow } from './state.ts';

/**
 * The time a `provisional_day` is applied at (decision 5): when the phone built it, never later than now. A phone clock up
 * to CLOCK_SKEW_MS behind the previous day's end counts as that end (the day had ended for the phone). Null when it was
 * built more than CLOCK_SKEW_MS after now: the phone's clock is ahead.
 */
export function provisionalClock(builtAt: number, nowMs: number, lastEndsAt: number): number | null {
  if (builtAt > nowMs + CLOCK_SKEW_MS) return null;
  const at = Math.min(builtAt, nowMs);
  return at < lastEndsAt && lastEndsAt <= nowMs && lastEndsAt - at <= CLOCK_SKEW_MS ? lastEndsAt : at;
}

/** The stored quests are the ones the phone showed: the same template in every slot, and a workout's same exercises. */
export function sameQuests(
  stored: readonly Pick<InstanceRow, 'slot' | 'template_id' | 'condition'>[],
  phone: readonly Pick<ProvisionalQuest, 'slot' | 'templateId' | 'moves'>[],
): boolean {
  return stored.length === phone.length && phone.every((p) => {
    const q = stored.find((s) => s.slot === p.slot);
    return q !== undefined && q.template_id === p.templateId && sameMoves(plannedMoves(q.condition), p.moves);
  });
}
```

- [ ] **Step 4: `lmu-sync` applies them** (`supabase/functions/lmu-sync/index.ts`)

Update the header comment to add: "M6e: a day the phone built offline is applied as of when it was built, and quests of
that day are found by day and slot until the phone has their ids."

Change the imports:

```ts
import { adjustPayload, checkCompletionPayload, isAdjust, parseSyncBody } from '../_shared/events.ts';
import type { AdjustEvent, PainEvent, PhoneEvent, ProvisionalDayEvent, Rejected, SlotRef } from '../_shared/events.ts';
import { isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { provisionalClock, sameQuests } from '../_shared/offline.ts';
```

Replace `type PlayEvent = Exclude<PhoneEvent, AdjustEvent>;` with:

```ts
type PlayEvent = Exclude<PhoneEvent, AdjustEvent | ProvisionalDayEvent>;

type QuestRow = Pick<InstanceRow, 'id' | 'template_id' | 'completion' | 'condition' | 'minutes'> & Pick<DayRow, 'starts_at' | 'ends_at'>;

/** The quest an event names, read as the player: by id, or (M6e) by its day and slot on a day the phone built offline. */
async function questRow(tx: Tx, userId: string, target: { instanceId: number | null; ref?: SlotRef }): Promise<QuestRow | null> {
  await asPlayer(tx, userId);
  try {
    const rows = target.ref === undefined
      ? await tx<QuestRow[]>`
          select q.id, q.template_id, q.completion, q.condition, q.minutes, d.starts_at, d.ends_at
          from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id
          where q.id = ${target.instanceId}::bigint and q.user_id = ${userId}::uuid`
      : await tx<QuestRow[]>`
          select q.id, q.template_id, q.completion, q.condition, q.minutes, d.starts_at, d.ends_at
          from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id
          where d.user_id = ${userId}::uuid and d.day_number = ${target.ref.dayNumber}::int and q.slot = ${target.ref.slot}`;
    return rows[0] ?? null;
  } finally {
    await asService(tx);
  }
}
```

In `applyEvent`, replace the first line of the `try` with:

```ts
    if (event.type === 'provisional_day') {
      const kept = await provisional(userId, event);
      // Stored with the server's own quests: the phone shows a notice and drops its day (decision 13).
      if (kept.kept === 'server') return { id: event.id, ok: false, code: 'day_rebuilt' };
      return { id: event.id, ok: true, result: kept };
    }
    const result = isAdjust(event) ? await adjust(userId, event) : await play(userId, event);
```

Replace `play` with:

```ts
/** A completion, undo or rating (M3); M6e: of a quest named by its day and slot. */
function play(userId: string, event: PlayEvent): Promise<unknown> {
  return db().begin(async (tx) => {
    if (event.type === 'complete') {
      const row = await questRow(tx, userId, event);
      if (row === null) throw new Error('lmu:not_found');
      // Named by its slot (M6e) but not the quest the phone showed: the server's day won. The work still counts for the
      // quest now in that slot, without the timer or rep check, which was for the phone's quest (decision 7).
      const ref = event.ref;
      const checked = ref !== undefined && row.template_id !== ref.templateId
        ? { payload: { offlineQuest: ref.templateId } }
        : checkCompletionPayload(row, row, event.payload, Date.now());
      if ('code' in checked) throw new Error(`lmu:${checked.code}`);
      return one(await tx<{ r: unknown }[]>`select levelmeup.complete_quest(${userId}::uuid, ${event.id}::uuid, ${row.id}::bigint,
        ${new Date(event.completedAt)}::timestamptz, ${event.rating}::text, ${jsonParam(tx, checked.payload)}::jsonb) as r`).r;
    }
    const instanceId = event.instanceId ?? (await questRow(tx, userId, event))?.id;
    if (instanceId === undefined) throw new Error('lmu:not_found');
    if (event.type === 'undo') {
      return one(await tx<{ r: unknown }[]>`select levelmeup.undo_quest(${userId}::uuid, ${event.id}::uuid, ${instanceId}::bigint) as r`).r;
    }
    return one(await tx<{ r: unknown }[]>`
      select levelmeup.rate_quest(${userId}::uuid, ${event.id}::uuid, ${instanceId}::bigint, ${event.rating}::text) as r`).r;
  });
}
```

In `adjust`, after `if (snapshot === null) throw new Error('lmu:not_started');`, add:

```ts
        // A pain report about a quest named by its slot (M6e): the quest there now, never an exercise the player didn't do.
        const planned = event.type === 'pain' && event.ref !== undefined ? await slotPain(tx, userId, event) : event;
```

and plan with it: `const plan = planAdjust(snapshot, planned, { nowMs: now.getTime(), library: LIBRARY });`. Add, after
`adjust`:

```ts
/** "I felt pain" about a quest named by its slot (M6e decision 7): refused when the quest there isn't the one the phone showed. */
async function slotPain(tx: Tx, userId: string, event: PainEvent & { ref: SlotRef }): Promise<PainEvent> {
  const row = await questRow(tx, userId, event);
  if (row === null) throw new Error('lmu:not_found');
  if (row.template_id !== event.ref.templateId) throw new Error('lmu:quest_changed');
  return { id: event.id, type: 'pain', instanceId: Number(row.id), choice: event.choice };
}

type Kept = { dayNumber: number; kept: 'phone' | 'existing' | 'server' };

/**
 * A day the phone built offline (M6e decision 5): closes what had ended and builds the next day as of when the phone
 * built it, so a day the player opened isn't skipped as an away day, keeping the phone's quests when the rules allow
 * them. A day that already exists stays as it is. Nothing is recorded: a repeat finds the day and answers the same.
 */
async function provisional(userId: string, event: ProvisionalDayEvent): Promise<Kept> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db().begin(async (tx): Promise<Kept> => {
        const snapshot = await loadSnapshot(tx, userId);
        if (snapshot === null) throw new Error('lmu:not_started');
        const stored = snapshot.days.find((d) => d.day_number === event.dayNumber);
        if (stored !== undefined) {
          const quests = snapshot.instances.filter((q) => String(q.day_id) === String(stored.id));
          return { dayNumber: event.dayNumber, kept: sameQuests(quests, event.quests) ? 'existing' : 'server' };
        }
        if (snapshot.days.some((d) => d.day_number > event.dayNumber)) return { dayNumber: event.dayNumber, kept: 'server' };
        const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
        const lastEndsAt = Math.max(...snapshot.days.map((d) => d.ends_at.getTime()));
        const asOf = provisionalClock(event.builtAt, now.getTime(), lastEndsAt);
        if (asOf === null) throw new Error('lmu:clock_ahead');
        const outcome = planAdvance({
          ...snapshot, timeZone: event.timeZone, nowMs: asOf, library: LIBRARY, contentVersion: CONTENT_VERSION,
          provisional: { dayNumber: event.dayNumber, quests: event.quests },
        });
        // The server's last day was still running when the phone built the next one: the phone's clock is ahead.
        if (outcome === null || outcome.newDay === null) throw new Error('lmu:clock_ahead');
        if (outcome.buildError !== null) console.error('lmu-sync: a day was built without quests', userId, outcome.buildError);
        if (outcome.offline?.kept === 'server') console.info('lmu-sync: an offline day was rebuilt', userId, outcome.offline.problems);
        await tx`select levelmeup.advance(${userId}::uuid, ${snapshot.character.version}::int, ${jsonParam(tx, outcome)}::jsonb)`;
        return { dayNumber: outcome.newDay.dayNumber, kept: outcome.offline?.kept ?? 'server' };
      });
    } catch (error) {
      if (lmuCode(error) !== 'conflict' || attempt >= MAX_TRIES) throw error;
    }
  }
}
```

- [ ] **Step 5: Fix `_shared/adjust.ts`'s use of `instanceId`** if the typecheck flags it

`planAdjust` only sees events whose `instanceId` is a number (lmu-sync resolves a pain `ref` first, and `swap` and
`step_down` have no `ref`). Where TypeScript now sees `number | null` (for example `questOf(s, event.instanceId, nowMs)`
for `pain`), keep the code and widen the helper's parameter to `number | null` (a null id finds no quest: `not_found`).

- [ ] **Step 6: Run the server unit tests, the typecheck and the Deno check**

Run: `cd supabase && npx vitest run --project unit && cd .. && npm run typecheck && npm run check:functions`
Expected: PASS for the server (the phone's `project.ts` may still fail the typecheck until Task 12; if it does, the
Task 6 guard keeps it green).

- [ ] **Step 7: Commit**

```bash
git add supabase
git commit -m "M6e T7: lmu-sync applies a day built offline as of when it was built, and finds its quests by day and slot"
```

## Task 8: Live tests

**Files:**
- Modify: `supabase/tests/live/live.test.ts`, `supabase/tests/live/helpers.ts`

- [ ] **Step 1: Allow one more player** (`helpers.ts`): `const MAX_PLAYERS = 10;`

- [ ] **Step 2: Append the block** (`live.test.ts`)

```ts
describe('offline-built days (M6e)', () => {
  let d: Player;
  let state: any;

  it('the state carries what the phone needs to build the next day', async () => {
    d = await newPlayer();
    const res = await call('lmu-onboarding', d.token, ONBOARDING);
    expect(res.status).toBe(201);
    state = res.body.state;
    expect(typeof state.ladders).toBe('object');
    expect(state.history).toEqual([{ dayNumber: 1, quests: expect.objectContaining({ core: quest(state, 'core').templateId }) }]);
    expect(state.workoutsDone).toBe(0);
  });

  it('a quest named by its day and slot is the one completed and undone', async () => {
    const core = quest(state, 'core');
    const ref = { dayNumber: 1, slot: 'core', templateId: core.templateId };
    const done = await sync(d, [{ id: eventId(), type: 'complete', ref, completedAt: now(), payload: { sets: [6, 5] } }]);
    expect(done.body.results[0]).toMatchObject({ ok: true });
    expect(quest(done.body.state, 'core').completedAt).not.toBeNull();
    const undone = await sync(d, [{ id: eventId(), type: 'undo', ref }]);
    expect(undone.body.results[0]).toMatchObject({ ok: true });
    expect(undone.body.state.character.totalXp).toBe(0);
  });

  it("another quest in that slot still counts the work; a pain report about it is refused; an unknown day isn't found", async () => {
    const ref = { dayNumber: 1, slot: 'core', templateId: 'not-this-0' };
    const res = await sync(d, [
      { id: eventId(), type: 'complete', ref, completedAt: now(), payload: {} },
      { id: eventId(), type: 'pain', ref, choice: 'pause' },
      { id: eventId(), type: 'undo', ref: { ...ref, dayNumber: 9 } },
    ]);
    expect(res.body.results.map((r: any) => r.ok ? 'ok' : r.code)).toEqual(['ok', 'quest_changed', 'not_found']);
    expect(quest(res.body.state, 'core').completedAt).not.toBeNull();
    expect(res.body.state.paused).toEqual([]);
  });

  it("a day built while the server's day still runs is refused (clock_ahead); a malformed one is rejected", async () => {
    const day = {
      type: 'provisional_day', dayNumber: 2, builtAt: now(), timeZone: 'Asia/Manila', window: { startsAt: now(), endsAt: now() + 86_400_000 },
      budget: 25, light: false, quests: [{ slot: 'core', templateId: quest(state, 'core').templateId, why: { code: 'light_day' }, moves: null, book: null }],
    };
    const res = await sync(d, [{ id: eventId(), ...day }, { id: eventId(), ...day, dayNumber: 1 }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'clock_ahead' });
    expect(res.body.rejected).toEqual([expect.objectContaining({ code: 'bad_event' })]);
    expect(res.body.state.today.dayNumber).toBe(1);
  });
});
```

(`quest(state, slot)` and `now()` are the helpers the file's earlier blocks use; if they are local to another
`describe`, move them to the top of the file.)

- [ ] **Step 3: Typecheck** — `npm run typecheck`. Expected: PASS. The live run itself is Task 9.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/live
git commit -m "M6e T8: live tests for the state's new fields, quests by slot and the refused offline day"
```

## Task 9: DEPLOY (needs the owner's yes)

Only after M6c's and M6d's deploys (migrations 0009 and 0010 applied): these functions include their code.

- [ ] **Step 1:** `npm run deploy:functions` (lmu-onboarding, lmu-sync, lmu-account-delete).
- [ ] **Step 2:** `npm run test:live` — expected: every live test passes (M3 to M6e; 10 temporary players, deleted at
  the end), then the leftovers check finds none.
- [ ] **Step 3:** Record the result in "As built".

## Task 10: Content and notices — the offline day's words

**Files:**
- Create: `packages/content/src/offline.ts`, `packages/content/test/offline.test.ts`
- Modify: `packages/content/src/index.ts`, `apps/mobile/src/game/notices.ts`, `apps/mobile/test/notices.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/content/test/offline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintText } from '../src/lint.ts';
import { OFFLINE_TEXT } from '../src/offline.ts';

describe("the offline day's words (M6e)", () => {
  it('are plain and clean', () => {
    for (const text of Object.values(OFFLINE_TEXT)) expect(lintText(text), text).toEqual([]);
  });
});
```

In `apps/mobile/test/notices.test.ts`, add `'clock_ahead'` after `'class_locked'`, `'day_rebuilt'` after `'day_closed'`
and `'quest_changed'` after `'outside_day'` in the expected list.

- [ ] **Step 2: Run them to see them fail**

Run: `cd packages/content && npx vitest run test/offline.test.ts` and `cd apps/mobile && npx jest test/notices.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `packages/content/src/offline.ts`**

```ts
// What the phone says about a day it built offline (M6e decisions 8 and 14).
export const OFFLINE_TEXT = {
  built: "No connection, so this phone built today's quests. The System checks them when it's back online.",
  later: 'Swaps, a hard day and rest open once this day reaches the System.',
  previewLead: 'The day this phone would build if today had just ended. Nothing is sent.',
  previewNone: "This phone can't build a day from what it holds yet. Sync once with a server that has M6e.",
} as const;
```

In `packages/content/src/index.ts`, after `export * from './character.ts';`, add `export * from './offline.ts';`.

- [ ] **Step 4: The notices** (`apps/mobile/src/game/notices.ts`, in `TEXT`, after `same_book`)

```ts
  day_rebuilt: 'The System rebuilt the day this phone made offline. Anything you finished there counts for the quest now in its place.',
  quest_changed: "That quest had changed by the time the day reached the System, so the pain report wasn't saved. If it still hurts, report it again.",
  clock_ahead: "This phone's clock is ahead of the System's, so the day it built offline wasn't used. Check the phone's time.",
```

- [ ] **Step 5: Run the tests**

Run: `cd packages/content && npx vitest run` and `cd apps/mobile && npx jest test/notices.test.ts`
Expected: PASS (if `lintText` flags a word, reword it plainly and keep the meaning).

- [ ] **Step 6: Commit**

```bash
git add packages/content apps/mobile/src/game/notices.ts apps/mobile/test/notices.test.ts
git commit -m "M6e T10: the offline day's words and the notices day_rebuilt, quest_changed, clock_ahead"
```

## Task 11: Phone — showing an offline day (`offline.ts`, `project`)

**Files:**
- Create: `apps/mobile/src/game/offline.ts`, `apps/mobile/test/offline.test.ts`
- Modify: `apps/mobile/src/game/project.ts`, `apps/mobile/src/game/types.ts`, `apps/mobile/src/quest/timer.ts`,
  `apps/mobile/test/support/fixtures.ts`, `apps/mobile/test/project.test.ts`, `apps/mobile/test/payload.test.ts`

- [ ] **Step 1: A fixture for the offline day** (`apps/mobile/test/support/fixtures.ts`)

Add `plannedMoves` to the `@levelmeup/rules` import, and append:

```ts
/**
 * A `provisional_day` for day 2 with the quests of `from`'s today (by default `adjustState`'s push-1, walk-1, reading-0 and
 * the article), as if this phone had built them offline.
 */
export function offlineEvent(from: ServerState = adjustState(), over: Partial<Extract<PhoneEvent, { type: 'provisional_day' }>> = {}): Extract<PhoneEvent, { type: 'provisional_day' }> {
  const w = manilaDay(2);
  return {
    id: id(), type: 'provisional_day', dayNumber: 2, builtAt: w.startsAt + HOUR, timeZone: 'Asia/Manila',
    window: { startsAt: w.startsAt, endsAt: w.endsAt }, budget: 25, light: false,
    quests: from.today!.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: plannedMoves(q.condition), book: q.book })),
    ...over,
  };
}
```

(`id()` is the file's event-id counter; `adjustState` is defined above in the same file.)

- [ ] **Step 2: Write the failing tests**

`apps/mobile/test/offline.test.ts`:

```ts
import { carriedTimers, findQuest, offlineToday, withRef } from '../src/game/offline.ts';
import { project } from '../src/game/project.ts';
import { adjustState, offlineEvent, serverState } from './support/fixtures.ts';

const DAY2 = adjustState(); // the server's day 2: ids 200 to 203
const OFFLINE = project(serverState(), [offlineEvent()]); // day 1 from the server, then this phone's day 2
const RUNNING = { segments: [{ start: 1_000, end: 2_000 }], runningSince: null };

describe('an offline day as the screens show it (M6e)', () => {
  it('has the quests as the server would store them, ids −1 to −4, and nothing to swap or offer', () => {
    const today = offlineToday(offlineEvent());
    expect(today.quests.map((q) => q.id)).toEqual([-1, -2, -3, -4]);
    const strip = ({ id: _i, swaps: _s, gentle: _g, canStepDown: _c, ...rest }: (typeof today.quests)[number]) => rest;
    expect(today.quests.map(strip)).toEqual(DAY2.today!.quests.map(strip));
    expect(today).toMatchObject({ dayNumber: 2, swapsLeft: 0, restAllowed: false, abilities: [], hardDay: false, protection: null });
  });

  it('finds a quest by id, and an offline id by its slot once the server's day replaced it', () => {
    expect(findQuest(OFFLINE.today, -2)?.slot).toBe('side1');
    expect(findQuest(DAY2.today, -1)?.id).toBe(200);
    expect(findQuest(DAY2.today, 201)?.slot).toBe('side1');
    expect(findQuest(DAY2.today, -9)).toBeNull();
    expect(findQuest(null, 200)).toBeNull();
  });

  it('names a quest of the offline day by day and slot; anything else is sent as it is', () => {
    const complete = { type: 'complete' as const, instanceId: -1, completedAt: 5, rating: null, payload: {} };
    expect(withRef(complete, OFFLINE)).toEqual({ ...complete, instanceId: null, ref: { dayNumber: 2, slot: 'core', templateId: 'push-1' } });
    expect(withRef({ type: 'pain', instanceId: -2, choice: 'rest' }, OFFLINE)).toMatchObject({ instanceId: null, ref: { slot: 'side1' } });
    expect(withRef({ ...complete, instanceId: 200 }, project(DAY2, []))).toEqual({ ...complete, instanceId: 200 });
    expect(withRef({ type: 'resume', ladderId: 'push' }, OFFLINE)).toEqual({ type: 'resume', ladderId: 'push' });
  });

  it("moves a timer from an offline quest to the server's quest in its slot, with the same template only", () => {
    const after = project(DAY2, []);
    expect(carriedTimers({ [-1]: RUNNING, 7: RUNNING }, OFFLINE, after)).toEqual({ 200: RUNNING, 7: RUNNING });
    const otherCore = { ...after, today: { ...after.today!, quests: after.today!.quests.map((q) => (q.slot === 'core' ? { ...q, templateId: 'walk-0' } : q)) } };
    expect(carriedTimers({ [-1]: RUNNING }, OFFLINE, otherCore)).toEqual({});
    expect(carriedTimers({ 7: RUNNING }, OFFLINE, after)).toBeNull();
    expect(carriedTimers({ [-1]: RUNNING }, after, after)).toBeNull();
  });
});
```

In `apps/mobile/test/project.test.ts` (import `adjustState`, `offlineEvent`, `serverState` from `./support/fixtures.ts`
if missing), append:

```ts
describe('a day this phone built offline (M6e)', () => {
  const event = offlineEvent();
  const ref = { dayNumber: 2, slot: 'core' as const, templateId: 'push-1' };
  const complete = { id: '00000000-0000-4000-8000-0000000000e2', type: 'complete' as const, instanceId: null, ref, completedAt: event.builtAt + 60_000, rating: null, payload: {} };

  it("is today until the server's state has that day", () => {
    const shown = project(serverState(), [event]);
    expect(shown.offline).toBe(true);
    expect(shown.today).toMatchObject({ dayNumber: 2, swapsLeft: 0, abilities: [] });
    expect(shown.today!.quests.map((q) => q.id)).toEqual([-1, -2, -3, -4]);
    const synced = project(adjustState(), [event]);
    expect(synced.offline).toBe(false);
    expect(synced.today!.quests[0]!.id).toBe(200);
  });

  it('completions, undos and ratings named by day and slot apply to its quests', () => {
    const before = serverState();
    const shown = project(before, [event, complete]);
    const core = shown.today!.quests[0]!;
    expect(core.completedAt).not.toBeNull();
    expect(shown.waiting.has(-1)).toBe(true);
    const gained = Object.values(core.xp).reduce((sum, xp) => sum + (xp ?? 0), 0);
    expect(shown.character.totalXp).toBe(before.character.totalXp + gained);
    const undone = project(before, [event, complete, { id: '00000000-0000-4000-8000-0000000000e3', type: 'undo', instanceId: null, ref }]);
    expect(undone.today!.quests[0]!.completedAt).toBeNull();
  });

  it("an event named by day and slot still finds its quest once the server's day replaced the offline one", () => {
    const shown = project(adjustState(), [complete]);
    expect(shown.today!.quests.find((q) => q.id === 200)!.completedAt).not.toBeNull();
    expect(project(adjustState(), [{ ...complete, ref: { ...ref, dayNumber: 3 } }]).today!.quests[0]!.completedAt).toBeNull();
  });
});
```

In `apps/mobile/test/payload.test.ts`, after the `parseTimers` expectation that drops bad entries, add:

```ts
    // M6e: a quest of a day built offline has a negative id, and its timer is kept.
    expect(parseTimers(JSON.stringify({ [-1]: t, 0: t }))).toEqual({ [-1]: t });
```

- [ ] **Step 3: Run them to see them fail**

Run: `cd apps/mobile && npx jest test/offline.test.ts test/project.test.ts test/payload.test.ts`
Expected: FAIL (`offline.ts` doesn't exist; `project` doesn't know the event; negative timer ids are dropped).

- [ ] **Step 4: Export the event types** (`apps/mobile/src/game/types.ts`)

Change the events import and the re-export:

```ts
import type { PhoneEvent, ProvisionalDayEvent, SlotRef } from '../../../../supabase/functions/_shared/events.ts';
```

```ts
export type { OnboardingBody, PhoneEvent, ProvisionalDayEvent, Rating, Reveal, SlotRef };
```

- [ ] **Step 5: Keep offline quests' timers** (`apps/mobile/src/quest/timer.ts`, in `parseTimers`)

```ts
    // Quest ids are positive; a quest of a day built offline is negative until the server's day arrives (M6e).
    if (Number.isSafeInteger(id) && id !== 0 && timer !== null) timers[id] = timer;
```

- [ ] **Step 6: Write `apps/mobile/src/game/offline.ts`**

```ts
// A day this phone built offline (M6e), as the screens show it until the server's state replaces it: its quests have ids
// −1 to −4 by slot, events about them name them by day and slot, and a timer started on one moves to the server's quest
// in its slot.
import { LIBRARY } from '@levelmeup/content';
import { draftQuest, findTemplate, storedQuest } from '@levelmeup/rules';
import type { Slot } from '@levelmeup/rules';
import type { TimerState } from '../quest/timer.ts';
import type { NewEvent } from '../state/store.ts';
import type { Shown } from './project.ts';
import type { ProvisionalDayEvent, QuestView, TodayView } from './types.ts';

/** Quest ids on a day the phone built: never a server id (those are positive). */
export const OFFLINE_IDS: Readonly<Record<Slot, number>> = { core: -1, side1: -2, side2: -3, article: -4, recovery: -5 };
const SLOT_OF_ID = new Map(Object.entries(OFFLINE_IDS).map(([slot, id]) => [id, slot as Slot]));

/** Today from the phone's `provisional_day`: the quests as the server would store them, nothing to swap or offer. */
export function offlineToday(event: Omit<ProvisionalDayEvent, 'id'>): TodayView {
  return {
    id: 0,
    dayNumber: event.dayNumber,
    startsAt: new Date(event.window.startsAt).toISOString(),
    endsAt: new Date(event.window.endsAt).toISOString(),
    timeZone: event.timeZone,
    budget: event.budget,
    light: event.light,
    hardDay: false,
    protection: null,
    status: 'open',
    swapsLeft: 0,
    restAllowed: false,
    abilities: [],
    quests: event.quests.flatMap((q): QuestView[] => {
      const template = findTemplate(LIBRARY, q.templateId);
      if (template === undefined) return [];
      try {
        const stored = storedQuest(LIBRARY, draftQuest(template, q.slot, q.why, { moves: q.moves, book: q.book }));
        return [{ id: OFFLINE_IDS[q.slot], ...stored, completedAt: null, rating: null, swaps: [], gentle: null, canStepDown: false }];
      } catch {
        return []; // this app can't draft it (another content version): the server's day will show it
      }
    }),
  };
}

/** A quest of today by id; an offline id finds the quest now in its slot once the server's day replaced the phone's. */
export function findQuest(today: TodayView | null, id: number): QuestView | null {
  if (today === null) return null;
  const exact = today.quests.find((q) => q.id === id);
  if (exact !== undefined) return exact;
  const slot = SLOT_OF_ID.get(id);
  return slot === undefined ? null : (today.quests.find((q) => q.slot === slot) ?? null);
}

/** An event about a quest of the offline day names it by day and slot: the server has no id for it yet (decision 7). */
export function withRef(event: NewEvent, view: Shown | null): NewEvent {
  if (event.type !== 'complete' && event.type !== 'undo' && event.type !== 'rate' && event.type !== 'pain') return event;
  const today = view?.today ?? null;
  if (event.instanceId === null || event.instanceId >= 0 || today === null) return event;
  const quest = today.quests.find((q) => q.id === event.instanceId);
  if (quest === undefined) return event;
  return { ...event, instanceId: null, ref: { dayNumber: today.dayNumber, slot: quest.slot, templateId: quest.templateId } };
}

/**
 * Timers of the offline day's quests once the server's state has that day: each moves to the server's quest in its slot
 * when that is the same template, and is dropped otherwise. Null when nothing changes.
 */
export function carriedTimers(
  timers: Readonly<Record<number, TimerState>>,
  before: Shown | null,
  after: Shown | null,
): Record<number, TimerState> | null {
  const old = before?.offline === true ? before.today : null;
  const now = after !== null && !after.offline ? after.today : null;
  if (old === null || now === null || now.dayNumber !== old.dayNumber) return null;
  const next: Record<number, TimerState> = { ...timers };
  let moved = false;
  for (const q of old.quests) {
    const state = timers[q.id];
    if (state === undefined) continue;
    delete next[q.id];
    moved = true;
    const real = now.quests.find((r) => r.slot === q.slot && r.templateId === q.templateId);
    if (real !== undefined && next[real.id] === undefined) next[real.id] = state;
  }
  return moved ? next : null;
}
```

(If TypeScript can't see the spread in `withRef` as a `NewEvent`, write the four cases out, or end with `as NewEvent`
after checking the shape.)

- [ ] **Step 7: `project` shows it** (`apps/mobile/src/game/project.ts`)

Add the imports:

```ts
import { offlineToday } from './offline.ts';
import type { CharacterView, PhoneEvent, QuestView, ServerState, SlotRef, TodayView } from './types.ts';
```

(replacing the existing `./types.ts` import). Add to `Shown`:

```ts
  /** Today is a day this phone built offline (M6e): its quests have no server ids yet. */
  offline: boolean;
```

Add, before `project`:

```ts
/** Where the quest an event names is in `today`: by id, or (M6e) by day and slot for a quest of a day built offline. */
function questIndex(today: TodayView, event: { instanceId: number | null; ref?: SlotRef }): number {
  const { ref } = event;
  if (ref !== undefined) return today.dayNumber === ref.dayNumber ? today.quests.findIndex((q) => q.slot === ref.slot) : -1;
  return today.quests.findIndex((q) => q.id === event.instanceId);
}
```

In `project`, replace

```ts
  const today = server.today === null ? null : { ...server.today, quests: server.today.quests.map((q) => ({ ...q })) };
  const quests = today?.quests ?? [];
  const waiting = new Set<number>();
  for (const event of pending) {
```

with

```ts
  let today: TodayView | null = server.today === null ? null : { ...server.today, quests: server.today.quests.map((q) => ({ ...q })) };
  let quests = today?.quests ?? [];
  let offline = false;
  const waiting = new Set<number>();
  for (const event of pending) {
    if (event.type === 'provisional_day') {
      // M6e: a day this phone built offline is today until the server's state has that day (or a later one).
      if (today === null || today.dayNumber < event.dayNumber) {
        today = offlineToday(event);
        quests = today.quests;
        offline = true;
      }
      continue;
    }
```

replace `const i = quests.findIndex((q) => q.id === event.instanceId);` with `const i = questIndex(today, event);`, and
add `offline` to the returned object:

```ts
  return { ...server, profile, paused, character, today, reading, waiting, changingClass, changingBook, offline };
```

Update the header comment: "M6e: a `provisional_day` in the outbox is today until the server's state has that day;
events name its quests by day and slot."

- [ ] **Step 8: Run the app tests and the typecheck**

Run: `cd apps/mobile && npx jest && cd ../.. && npm run typecheck`
Expected: PASS. Fix any other `Shown` built by hand in tests or `app/dev/character.tsx` by adding `offline: false`
(the typecheck lists them).

- [ ] **Step 9: Commit**

```bash
git add apps/mobile
git commit -m "M6e T11: the phone shows a day it built offline (project, offlineToday, findQuest, withRef, carriedTimers)"
```

## Task 12: Phone — building the next day offline (`offlineDay`)

**Files:**
- Create: `apps/mobile/src/game/offlineDay.ts`, `apps/mobile/test/offlineDay.test.ts`

- [ ] **Step 1: Write the failing tests** (`apps/mobile/test/offlineDay.test.ts`)

```ts
import { STATS } from '@levelmeup/rules';
import { planAdvance } from '../../../supabase/functions/_shared/advance.ts';
import { DAY1, afterDay1, characterRow } from '../../../supabase/tests/unit/fixtures.ts';
import type { CharacterRow } from '../../../supabase/functions/_shared/state.ts';
import { offlineDay } from '../src/game/offlineDay.ts';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { completeEvent, serverState } from './support/fixtures.ts';

const END = Date.parse(DAY1.endsAt);
const HOUR = 3_600_000;
const quests = (event: { quests: readonly { slot: string; templateId: string }[] }) => event.quests.map((q) => [q.slot, q.templateId]);

describe('the day the phone builds offline (M6e decision 2)', () => {
  it('waits until the day on screen has ended', () => {
    const s = serverState();
    expect(offlineDay(s, project(s, []), END - 1, 'Asia/Manila')).toBeNull();
  });

  it('is the day the server builds from the same state (nothing done)', () => {
    const s = serverState();
    const event = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const server = planAdvance(afterDay1([], END + HOUR))!.newDay!;
    expect(event).toMatchObject({
      type: 'provisional_day', dayNumber: 2, builtAt: END + HOUR, timeZone: 'Asia/Manila', budget: server.budget, light: server.light,
      window: { startsAt: Date.parse(server.startsAt), endsAt: Date.parse(server.endsAt) },
    });
    expect(event.quests.map((q) => [q.slot, q.templateId, q.why])).toEqual(server.quests.map((q) => [q.slot, q.templateId, q.why]));
  });

  it('…and with the core cleared offline: its XP, the Discipline and the ladder session count as on the server', () => {
    const s = serverState();
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    const event = offlineDay(s, project(s, [completeEvent(core.id)]), END + HOUR, 'Asia/Manila')!;
    const xp: Partial<CharacterRow> = {};
    for (const stat of STATS) if (core.xp[stat] !== undefined) xp[`xp_${stat}`] = core.xp[stat];
    const server = planAdvance(afterDay1(['core'], END + HOUR, { character: characterRow(xp) }))!.newDay!;
    expect(quests(event)).toEqual(quests(server));
  });

  it('builds nothing while an offline day is shown, or from a state without the M6e fields', () => {
    const s = serverState();
    const first = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const shown = project(s, [{ ...first, id: '00000000-0000-4000-8000-000000000999' } as PhoneEvent]);
    expect(offlineDay(s, shown, Date.parse(shown.today!.endsAt!) + HOUR, 'Asia/Manila')).toBeNull();
    const { ladders: _ladders, ...older } = s;
    expect(offlineDay(older as ServerState, project(older as ServerState, []), END + HOUR, 'Asia/Manila')).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd apps/mobile && npx jest test/offlineDay.test.ts`
Expected: FAIL (the module doesn't exist).

- [ ] **Step 3: Write `apps/mobile/src/game/offlineDay.ts`**

```ts
// The next quest day, built on the phone when the day on screen has ended and the server can't be reached (M6e,
// architecture §6). It closes the ended day the way the server does (rules: closing.ts) with what the phone shows, then
// builds with the same rules (`buildDay`); the server checks it when it syncs (`checkProvisionalDay`).
import { LIBRARY } from '@levelmeup/content';
import {
  DISCIPLINE_PER_CORE_DAY, RUNG_BONUS_XP, TRAINABLE_STATS, buildDay, closeLadders, followingDay, ladderById, reenterLadders,
} from '@levelmeup/rules';
import type { LadderState, PastDay, PlayerProfile, TrainableStat, XpByStat } from '@levelmeup/rules';
import { addStatXp } from './project.ts';
import type { Shown } from './project.ts';
import type { CharacterView, ProvisionalDayEvent, ServerState, TodayView } from './types.ts';

/** The rules' view of the player, from what the phone shows. */
export function rulesProfile(profile: ServerState['profile'], character: CharacterView): PlayerProfile {
  return {
    classId: profile.classId,
    level: character.level,
    goals: profile.goals,
    minutesPerDay: profile.minutesPerDay,
    difficulty: profile.difficulty,
    limitations: profile.limitations,
    gentleStart: profile.gentleStart,
    ownProgram: profile.ownProgram,
    equipment: profile.equipment,
    programStyle: profile.programStyle,
    stats: Object.fromEntries(TRAINABLE_STATS.map((s) => [s, character.stats[s].points])) as Record<TrainableStat, number>,
    book: profile.book,
  };
}

const sessionsDone = (today: TodayView | null): number =>
  (today?.quests ?? []).filter((q) => q.condition.kind === 'session' && q.completedAt !== null).length;

/**
 * The `provisional_day` for the day after the one on screen, or null: it hasn't ended, an offline day is already shown
 * (one at a time, decision 1), the cached state is from before M6e (decision 3), or the rules can't build a day.
 */
export function offlineDay(server: ServerState, shown: Shown, nowMs: number, timeZone: string): Omit<ProvisionalDayEvent, 'id'> | null {
  const today = shown.today;
  if (shown.offline || today === null || today.startsAt === null || today.endsAt === null) return null;
  const last = { startsAt: Date.parse(today.startsAt), endsAt: Date.parse(today.endsAt), timeZone: today.timeZone };
  if (last.endsAt > nowMs) return null;
  const held = server as Partial<Pick<ServerState, 'ladders' | 'history' | 'workoutsDone'>>;
  if (held.ladders === undefined || held.history === undefined || held.workoutsDone === undefined) return null;
  try {
    const next = followingDay(last, today.dayNumber, timeZone, shown.profile.boundaryMinutes, nowMs);
    // The ended day closes as the server will close it: the ladder sessions, then the XP the close pays.
    const closed = closeLadders(LIBRARY, held.ladders, {
      startsAt: last.startsAt,
      protected: today.protection !== null,
      quests: today.quests.map((q) => ({ ladder: q.ladder, rung: q.rung, done: q.completedAt !== null, rating: q.rating })),
    }, rulesProfile(shown.profile, shown.character));
    let ladders: Record<string, LadderState> = { ...held.ladders, ...closed.changed };
    if (next.comeback) ladders = { ...ladders, ...reenterLadders(ladders, next.window.startsAt, last.endsAt) };
    let character = shown.character;
    if (today.quests.some((q) => q.slot === 'core' && q.completedAt !== null)) {
      character = addStatXp(character, { discipline: DISCIPLINE_PER_CORE_DAY }, 1);
    }
    for (const { ladder } of closed.newRungs) {
      const bonus: XpByStat = {};
      bonus[ladderById(LIBRARY, ladder).stat] = RUNG_BONUS_XP;
      character = addStatXp(character, bonus, 1);
    }
    const ended: PastDay = { dayNumber: today.dayNumber, quests: Object.fromEntries(today.quests.map((q) => [q.slot, q.templateId])) };
    const history = [...held.history.filter((d) => d.dayNumber !== today.dayNumber), ended]
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .slice(-7);
    const workoutsDone = Math.max(0, held.workoutsDone + sessionsDone(today) - sessionsDone(server.today));
    const built = buildDay(LIBRARY, {
      dayNumber: next.dayNumber, profile: rulesProfile(shown.profile, character), ladders, history, light: next.comeback, workoutsDone,
      articleId: null,
    });
    return {
      type: 'provisional_day',
      dayNumber: built.dayNumber,
      builtAt: nowMs,
      timeZone: next.window.timeZone,
      window: { startsAt: next.window.startsAt, endsAt: next.window.endsAt },
      budget: built.budget,
      light: built.light,
      quests: built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: q.moves, book: q.book })),
    };
  } catch {
    return null; // the rules can't build it from what the phone holds: "preparing", as before M6e
  }
}
```

(`XpByStat` is the rules' type `addStatXp` takes; if it's named differently, use that name.)

- [ ] **Step 4: Run the app tests and the typecheck**

Run: `cd apps/mobile && npx jest && cd ../.. && npm run typecheck`
Expected: PASS. If the two "same as the server" tests differ, compare the inputs (ladders, stats, history,
`workoutsDone`) of `planAdvance` and `offlineDay` before changing either: the point is that they match.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile
git commit -m "M6e T12: the phone builds the next day offline the way the server does (offlineDay)"
```

## Task 13: Phone — the store builds it, sends `ref` events, and moves timers

**Files:**
- Modify: `apps/mobile/src/state/store.ts`
- Test: `apps/mobile/test/store.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `apps/mobile/test/store.test.ts`; import `LIBRARY` from
  `@levelmeup/content`, `stateView` from `'../../../supabase/functions/_shared/state.ts'`, `dayOffers` from
  `'../../../supabase/functions/_shared/today.ts'`, `dayTwoSnapshot`, `historyOf` from
  `'../../../supabase/tests/unit/fixtures.ts'`, and the type `PhoneEvent` from `'../src/game/types.ts'`)

```ts
describe('a day built offline (M6e)', () => {
  const END = Date.parse(SERVER.today!.endsAt!);
  const HOUR = 3_600_000;
  const offline = { ok: false as const, status: 0, code: 'network' };

  it("when today has ended and the server can't be reached, builds the next day and shows it", async () => {
    const { store, local } = await setup([ok(SERVER), offline], { now: () => END + HOUR });
    await store.getState().boot();
    await store.getState().syncNow();
    const { view, pending } = store.getState();
    expect(view!.offline).toBe(true);
    expect(view!.today!.dayNumber).toBe(2);
    expect(pending.map((e) => e.type)).toEqual(['provisional_day']);
    expect(await local.pending(10)).toHaveLength(1);
    // Another failed sync builds nothing more: one offline day at a time.
    await store.getState().syncNow();
    expect(store.getState().pending).toHaveLength(1);
  });

  it('builds nothing while the day still runs', async () => {
    const { store } = await setup([ok(SERVER), offline]);
    await store.getState().boot();
    await store.getState().syncNow();
    expect(store.getState().pending).toEqual([]);
    expect(store.getState().view!.offline).toBe(false);
  });

  it('a completion on the offline day names its quest by day and slot', async () => {
    const { store } = await setup([ok(SERVER), offline], { now: () => END + HOUR });
    await store.getState().boot();
    await store.getState().syncNow();
    const core = store.getState().view!.today!.quests[0]!;
    await store.getState().enqueue({ type: 'complete', instanceId: core.id, completedAt: END + 2 * HOUR, rating: null, payload: {} });
    expect(store.getState().pending.at(-1)).toMatchObject({
      type: 'complete', instanceId: null, ref: { dayNumber: 2, slot: 'core', templateId: core.templateId },
    });
    expect(store.getState().view!.today!.quests[0]!.completedAt).not.toBeNull();
  });

  it("a timer started on an offline quest moves to the server's quest in its slot after the sync", async () => {
    const replies: Parameters<typeof setup>[0] = [ok(SERVER), offline];
    const { store, kv } = await setup(replies, { now: () => END + HOUR });
    await store.getState().boot();
    await store.getState().syncNow();
    const built = store.getState().pending[0] as Extract<PhoneEvent, { type: 'provisional_day' }>;
    const timer = { segments: [{ start: END + HOUR, end: END + HOUR + 60_000 }], runningSince: null };
    await store.getState().saveTimer(-1, timer);
    const slots = Object.fromEntries(built.quests.map((q) => [q.slot, q.templateId])) as { core: string; side1: string; side2: string };
    const snapshot = dayTwoSnapshot(slots);
    replies.length = 0;
    replies.push(ok(stateView(snapshot, dayOffers(snapshot, LIBRARY), historyOf(snapshot))));
    await store.getState().syncNow();
    await settle();
    expect(store.getState().view!.offline).toBe(false);
    expect(JSON.parse(kv.get(TIMERS_KEY)!)).toEqual({ 200: timer });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd apps/mobile && npx jest test/store.test.ts`
Expected: FAIL (no offline day is built; the event keeps its negative id; the timer stays under −1).

- [ ] **Step 3: The store** (`apps/mobile/src/state/store.ts`)

Add to the header comment: "M6e: when today has ended and the server can't be reached, the store builds the next day
(`offlineDay`) and queues it; events on its quests name them by day and slot; their timers move to the server's quests."

Add the imports:

```ts
import { carriedTimers, withRef } from '../game/offline.ts';
import { offlineDay } from '../game/offlineDay.ts';
```

After `refresh`, add:

```ts
    /**
     * M6e: the day on screen has ended and the server can't be reached: build the next one here and queue it. No new sync
     * is asked for; the scheduler's back-off keeps trying (decision 10).
     */
    const buildOffline = async (): Promise<void> => {
      const { cached, view } = get();
      if (cached === null || view === null) return;
      const event = offlineDay(cached.state, view, deps.now(), deps.timeZone());
      if (event === null) return;
      await deps.local.enqueue({ ...event, id: deps.newId() }, deps.now());
      await refresh();
    };
```

After `let timerWrites: Promise<void> = Promise.resolve();`, add:

```ts
    /** M6e: a timer running on an offline quest moves to the server's quest in its slot once that day arrives. */
    const moveTimers = (before: Shown | null): Promise<void> => {
      const write = async (): Promise<void> => {
        const next = carriedTimers(parseTimers(await deps.kv.getItem(TIMERS_KEY).catch(() => null)), before, get().view);
        if (next !== null) await deps.kv.setItem(TIMERS_KEY, JSON.stringify(next));
      };
      const done = timerWrites.then(write);
      timerWrites = done.catch(() => {});
      return done;
    };
```

In `handle`, change the `synced` case's start to:

```ts
        case 'synced': {
          const before = confirmedLevel;
          const shownBefore = get().view;
          await refresh({ phase: 'ready', status: 'idle', error: null });
          void moveTimers(shownBefore);
```

and the `offline` and `retry` cases to:

```ts
        case 'offline':
          set({ status: 'offline' });
          await buildOffline();
          return;
        case 'retry':
          set({ status: 'retrying' });
          await buildOffline();
          return;
```

In `enqueue`, replace the first two lines with:

```ts
        const view = get().view;
        const replaced = replacedQuest(event, view);
        // A quest of the offline day is named by day and slot (M6e decision 7).
        await deps.local.enqueue({ ...withRef(event, view), id: deps.newId() } as PhoneEvent, deps.now());
```

- [ ] **Step 4: Run the app tests and the typecheck**

Run: `cd apps/mobile && npx jest && cd ../.. && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile
git commit -m "M6e T13: the store builds an offline day when the server can't be reached; ref events; timers follow"
```

## Task 14: Phone — the screens, and a developer preview

**Files:**
- Modify: `apps/mobile/src/screens/Today.tsx`, `apps/mobile/src/screens/DayActions.tsx`, `apps/mobile/src/screens/Quest.tsx`,
  `apps/mobile/src/screens/Pain.tsx`, `apps/mobile/app/dev/index.tsx`
- Create: `apps/mobile/app/dev/offline.tsx`
- Test: `apps/mobile/test/screens.test.tsx`, `apps/mobile/test/quest.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `apps/mobile/test/screens.test.tsx` (import `OFFLINE_TEXT` from `@levelmeup/content`, and `offlineEvent`,
`serverState` from `./support/fixtures.ts` if missing), append:

```ts
describe('a day this phone built offline (M6e decision 8)', () => {
  it("says so, and keeps the day's adjustments for after the sync", async () => {
    await renderToday({ view: project(serverState(), [offlineEvent()]) });
    expect(screen.getByText(OFFLINE_TEXT.built)).toBeTruthy();
    expect(screen.getByText(OFFLINE_TEXT.later)).toBeTruthy();
    expect(screen.queryByRole('button', { name: ADJUST_TEXT.day.hardDay })).toBeNull();
    expect(screen.queryByRole('button', { name: ADJUST_TEXT.day.rest })).toBeNull();
    expect(screen.getAllByRole('button').filter((b) => b.props.accessibilityHint === 'Opens the quest').length).toBe(4);
  });

  it('shows none of it on a day from the server', async () => {
    await renderToday();
    expect(screen.queryByText(OFFLINE_TEXT.built)).toBeNull();
    expect(screen.queryByText(OFFLINE_TEXT.later)).toBeNull();
  });
});
```

In `apps/mobile/test/quest.test.tsx`, append (the file's `renderQuest(server, questId, over, now)` helper):

```ts
it("an offline quest's screen follows its slot once the server's day replaced the offline one (M6e)", async () => {
  const server = adjustState();
  await renderQuest(server, -1, {}, () => DAY_TWO_NOW);
  expect(screen.queryByText(PLAY_TEXT.quest.gone)).toBeNull();
  expect(screen.getByText(questSummary(server.today!.quests[0]!))).toBeTruthy(); // push-1, the core quest (id 200)
});
```

(If the quest screen shows the summary inside a longer line, match it with a `RegExp` of the summary instead.)

- [ ] **Step 2: Run them to see them fail**

Run: `cd apps/mobile && npx jest test/screens.test.tsx test/quest.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Today** (`apps/mobile/src/screens/Today.tsx`)

Import `OFFLINE_TEXT` with the other content names. In the `else` branch's body, before `<DayBanners today={today!} />`,
add:

```tsx
        {view!.offline && <NarrationBox>{OFFLINE_TEXT.built}</NarrationBox>}
```

- [ ] **Step 4: DayActions** (`apps/mobile/src/screens/DayActions.tsx`)

Import `OFFLINE_TEXT` from `@levelmeup/content` and `Small` from `'../ui/Text.tsx'` (with `Body`). Change:

```ts
  const canHardDay = !today.hardDay && open.length > 0;
  const canRest = today.protection === null;
```

to

```ts
  // A day this phone built offline gets only what the phone decides alone (M6e decision 8).
  const canHardDay = !view.offline && !today.hardDay && open.length > 0;
  const canRest = !view.offline && today.protection === null;
  const later = view.offline ? <Small tone="chalk">{OFFLINE_TEXT.later}</Small> : null;
```

and the end of the component:

```tsx
  if (!canSwap && !canHardDay && !canRest && today.abilities.length === 0 && !canVanish) return later;
  const buttons = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {canSwap && <Button label={fillText(T.day.swap, { left: today.swapsLeft })} variant="secondary" onPress={onSwap} />}
      {canHardDay && <Button label={T.day.hardDay} variant="secondary" onPress={() => setConfirm('hard_day')} />}
      {canRest && <Button label={T.day.rest} variant="secondary" onPress={() => setConfirm('plan_rest')} />}
      {today.abilities.map((a) => (
        <Button key={a.ability} label={ABILITY_NAMES[a.ability]} variant="secondary" onPress={() => setConfirm(a.ability)} />
      ))}
      {canVanish && <Button label={T.day.vanish} variant="secondary" onPress={onVanish} />}
    </View>
  );
  return later === null ? buttons : <View style={{ gap: 12 }}>{later}{buttons}</View>;
```

- [ ] **Step 5: Quest and Pain find a quest by slot** (`Quest.tsx`, `Pain.tsx`)

In both, import `findQuest` from `'../game/offline.ts'` and replace
`const quest = today?.quests.find((q) => q.id === questId) ?? null;` with
`const quest = findQuest(today, questId);`. In `Quest.tsx`, the stored timer follows the quest's own id (an offline id
becomes the server's when the day syncs, and the store moved the timer): replace the timer effect's `loadTimer(questId)`
and its dependency `questId` with `timerId`, defined right after `quest`:

```ts
  const timerId = quest?.id ?? questId;
```

- [ ] **Step 6: The developer preview** (`apps/mobile/app/dev/offline.tsx`)

```tsx
// Development only (M6e decision 14): the day this phone would build from its cached state if today had just ended,
// shown on the real Today screen in a small store of its own. Nothing is sent, so the builder (rules and time zones on
// Hermes) can be checked on a device without waiting for a day boundary offline.
import { OFFLINE_TEXT } from '@levelmeup/content';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { offlineDay } from '../../src/game/offlineDay.ts';
import { project } from '../../src/game/project.ts';
import { deviceZone } from '../../src/state/appStore.ts';
import { GameProvider, useGame } from '../../src/state/store.ts';
import type { GameState } from '../../src/state/store.ts';
import { space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { NarrationBox } from '../../src/ui/NarrationBox.tsx';
import { Today } from '../../src/screens/Today.tsx';

const noop = async () => {};

export default function OfflinePreview() {
  const insets = useSafeAreaInsets();
  const cached = useGame((s) => s.cached);
  const art = useGame((s) => s.art);
  const preview = useMemo(() => {
    if (cached === null) return null;
    const shown = project(cached.state, []);
    const endsAt = shown.today?.endsAt;
    if (endsAt == null) return null;
    const at = Date.parse(endsAt) + 60_000; // a minute after today ends
    const event = offlineDay(cached.state, shown, at, deviceZone());
    if (event === null) return null;
    const view = project(cached.state, [{ ...event, id: '00000000-0000-4000-8000-0000000000ff' }]);
    const store = createStore(() => ({
      phase: 'ready', view, art, status: 'offline', notices: [], signInLost: false, trainingNoticeSeen: true, lastSyncedAt: null,
      syncNow: noop, dismissNotice: noop, enqueue: noop, startOver: noop, dismissTrainingNotice: noop,
    })) as unknown as StoreApi<GameState>;
    return { store, at };
  }, [cached, art]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <NarrationBox>{preview === null ? OFFLINE_TEXT.previewNone : OFFLINE_TEXT.previewLead}</NarrationBox>
      </View>
      {preview !== null && (
        <GameProvider store={preview.store}>
          <Today onSettings={() => {}} onOpenQuest={() => {}} onSwap={() => {}} onPain={() => {}} onVanish={() => {}} onTraining={() => {}} now={() => preview.at} />
        </GameProvider>
      )}
    </View>
  );
}
```

(`deviceZone` is the zone function `app/dev/index.tsx` already imports from `src/state/appStore.ts`; if `Button` has no
`style` prop, drop it.) In `app/dev/index.tsx`, after the "Character preview" button, add:

```tsx
      <Button label="Offline day preview" variant="secondary" onPress={() => router.push('/dev/offline')} />
```

- [ ] **Step 7: Run the app tests, the typecheck and the bundle check**

Run: `cd apps/mobile && npx jest && cd ../.. && npm run typecheck && npm run check:bundle`
Expected: PASS; the bundle has no secrets.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile
git commit -m "M6e T14: Today says when the phone built the day; quest and pain screens follow a slot; offline day preview"
```

## Task 15: Docs

**Files:**
- Modify: `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md`, `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`,
  `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`, `apps/mobile/README.md`, `supabase/README.md`,
  `docs/device-verification-checklist.md`, this plan

- [ ] **Step 1: Architecture.** §4.1: after the events list, add "M6e: `complete`, `undo`, `rate` and `pain` can name a
  quest by `ref: { dayNumber, slot, templateId }` instead of `instanceId` (a quest of a day the phone built offline);
  `provisional_day` carries that day." §4.3: after "it never trusts a window from a provisional day built on the phone",
  add "; a `provisional_day` is applied as of when the phone built it (`builtAt`, never later than now), so a day the
  player opened offline isn't skipped as an away day". §6: replace the "Offline on a new day (M6e, moved from M4 …)"
  bullet with:

  "- Offline on a new day (M6e): when the day on screen has ended and a sync fails, the phone closes it the way the
    server does (rules: `closeLadders`, `reenterLadders`, `followingDay`) with its projected completions, builds the next
    day with `buildDay`, and queues it as a `provisional_day` (one at a time). The state carries what that needs: every
    ladder's state, each recent day's quests, and the workouts done. On sync the server applies the event as of
    `builtAt`: it keeps the phone's quests when `provisionalDay` / `checkProvisionalDay` accept them (re-drafted from its
    own tables) and otherwise stores its own day; events about that day's quests name them by day and slot, and a
    completion counts for the quest in that slot even when the server's day won (without the timer or rep check). Swaps,
    hard days, rest and abilities wait for the sync."

  In the M6d bullet, drop the last sentence ("Offline-built days (`provisional_day`) are M6e.").

- [ ] **Step 2: MVP spec.** §3.2 step 5: append "(M6e: one offline day at a time; the server keeps it when every quest
  is allowed, otherwise builds its own and counts the work by slot)". §3.6: after "Offline completions sync later …",
  add "On a day the phone built offline, a completion names its quest by day and slot until the server has the day
  (M6e)."

- [ ] **Step 3: Roadmap.** M6e row: "**Built 2026-10-12** (deploy waits for the owner's yes, after M6c's and M6d's);
  merges after M6d", plan link `2026-10-12-m6e-offline-days.md`. Mark done: the M2 carried row's "Accept an
  offline-built day with `checkProvisionalDay`, then re-draft every quest" (done in M6e), the M4 rows'
  `provisional_day` mentions, the M6e rows from M4 and M6c. Add a "Carried forward from M6e" table:

  | Milestone | Item |
  |---|---|
  | M7 | A day closed on the phone offline may need a check-in (core not done): the phone shows it only after the sync. Days after the one offline day (the phone was open but had no connection) become away days; the check-in's "Emergency, travel, a brutal day" pauses them. Owner's call: should a phone that was open but offline protect such days automatically (it could also be used to skip days)? |
  | Later | Chains of offline days (decision 1), and swaps, a hard day, rest, abilities and gentle movement on an offline day (decision 8). |
  | M9 | How often the server rebuilt an offline day (`lmu-sync: an offline day was rebuilt` in the function logs) and why. |

- [ ] **Step 4: READMEs.** `apps/mobile/README.md`: a paragraph on the offline day (when it's built, `ref` events, the
  `/dev/offline` preview, timers following the slot). `supabase/README.md`: `provisional_day` and `ref` in the event list,
  "no database change in M6e".

- [ ] **Step 5: Device checklist.** Add "M6e" rows:
  1. `/dev/offline` shows a built day on Today with the offline line, real dates and four quests (Hermes runs the builder).
  2. Real boundary (Find X9, or the emulator when a test day ends during the session): airplane mode before the day ends;
     open the app after the boundary → the offline line and the day's quests; clear one; airplane mode off → it syncs,
     no notice, the quest stays cleared with its XP, ids are the server's.
  3. A quest screen open during that sync stays on the same quest (its slot), and a running timer keeps its time.
  4. Clock ahead (emulator): airplane mode, set the clock a day ahead, open → an offline day; restore the clock, airplane
     mode off → the `clock_ahead` notice, then the server's day.
  5. "I felt pain" on an offline day offers rest and pause (no gentle option); after the sync the exercise is resting.

- [ ] **Step 6: Commit**

```bash
git add docs apps/mobile/README.md supabase/README.md
git commit -m "M6e docs: architecture, MVP spec, roadmap, READMEs and device checklist for offline-built days"
```

## Task 16: Emulator check (after Task 9)

**Gate:** M6c's, M6d's and this deploy are live.

- [ ] Run the app on the `LevelMeUp_Test` emulator (local Metro, `adb reverse`, as in M4–M6d), then the M6e checklist
  rows 1, 3 (if a day boundary falls in the session), 4 and 5; row 2 on the emulator only if a test day ends during the
  session, otherwise it stays for the owner's Find X9. Record each result in the checklist and in "As built".

## After the build

- Independent review (a subagent with this plan and the diff from M6d's head), then fixes and a re-review, as in M6a–M6d.
- `npm test` (never a bare `npx vitest run` in `supabase/`), `npm run typecheck`, `npm run check:functions`,
  `npm run check:portable`, `npm run check:bundle`, `npm run pacing` (M6e changes no rewards; the result must match M6c's).

## As built

Built 2026-10-12 on `m6e-offline-days`. M6c's and M6d's deploys ran first, from this branch before any M6e code, with
the owner's yes of 2026-10-12 (migrations 0009 and 0010, `db:test`, the functions v7, `test:live` 29 of 29, no test
player left; the v3 art set uploaded and verified 34 of 34, the app reads `lmu-art/v3`).

| Task | Commit |
|---|---|
| T1 closing in the rules | 62d8233 |
| T2 storedQuest, isWhyReason, sameMoves, provisionalDay | 8e1d387 |
| T3 planAdvance on the closing helpers | caa91ed |
| T4 the provisional input and offline outcome | b0f7f87 |
| T5 the state's ladders, history, workoutsDone | 849a2c1 |
| T6 the provisional_day event and refs | 1f31779 |
| T7 lmu-sync applies offline days | ffcefa1 |
| T8 live tests | 362c917 |
| T10 words and notices | 9d4bbbb |
| T11 showing an offline day | 93b068f |
| T12 offlineDay | 0821f39 |
| T13 the store | 58a45f0 |
| T14 the screens and the preview | d006984 |
| T15 docs | 3a70337 |

### Changes from the plan

- `closing.ts`: `followingDay`'s local variable is `next`, not `window` (the rules' portability test refuses `window.`
  as a browser global).
- Task 6's guard in `project.ts` (`provisional_day` skipped) held the phone's types until Task 11 replaced it; Task 7
  step 5 wasn't needed (`planAdjust` compiles with `instanceId: number | null`).
- Test fixes: a test name with an apostrophe (`offline.test.ts`); the "nothing pending" projection test blanks the new
  fields.
- Task 9 (the deploy) ran after the review, so only reviewed code went live.
- Not M6e: M6c's quest screen test still expected the v2 picture URL (fixed on M6c, 2736d57, merged forward).

### Code review (2026-10-12): fixes

Review "With fixes" (no cross-player access, XP bounded, replays idempotent, `levelmeup.advance` accepts the as-of
writes). Fixed in f7653ab (server), 1d34199 (phone) and 58d385a; the re-review confirmed them:
- **Critical:** the offline day ignored pain reports, Resumes and step-downs still on their way, so it could bring back
  an exercise just reported for pain. `project` now lists them (`ladderChanges`) and `offlineDay` applies them before
  closing the day, as the server does.
- A completion named by slot on a changed quest is checked against the quest the phone says the player did (its
  completion type and condition), stored with `offlineQuest`, and its rating dropped; such a completion moves no ladder
  (`remapped`, `planAdvance`) and isn't a workout done (`db.ts`). A rating sent by slot for a changed quest is refused
  (`quest_changed`, notice reworded).
- "I felt pain" by slot on a changed quest rests the exercise the player did (`planOfflinePain`); "rest" still protects
  the day while it runs.
- An offline day the rules can't read falls back to the server's own day; a day built more than 48 hours plus a day ago
  is applied now; every rebuild is logged; a tap racing the sync finds its quest by slot; timers move on any refresh.
- Decision 15 states the remaining risk exactly (a modified phone can name a check-off quest to skip a timer or rep
  check, earning that quest's XP once; no ladder, no workout).

### Deploy and device check (2026-10-12)

Functions v8 after the review, `test:live` 33 of 33, no test player left; v9 after the device check (below), `test:live`
33 of 33. Emulator rows 1, 4 and 5 pass (the checklist). Found and fixed: a pain report from an offline day the server
never stored now still rests the exercise (563b88f); the preview's background (cc278b3); a brand-new player's quest art
is fetched after onboarding (8557820, an M6a gap). Rows 2 and 3 need a real day boundary: test character Uma's day 1
ends 2026-10-12 08:00 UTC; run then if the session is still on, otherwise on the Find X9.

Checks: rules 439, content 1043, server 299, app 569 tests; `typecheck`, `check:functions`, `check:portable` (194/70
exports), `check:bundle` (33 files, no secrets) pass; `npm run pacing` unchanged from M6c (Warrior steady rank C on day
151, recorded in M6c).
