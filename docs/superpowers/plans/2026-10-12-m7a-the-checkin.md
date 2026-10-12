# M7a — The check-in — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a missed day the player answers "The day closed. What happened?"; each answer has the spec §3.7 outcome
(a paused streak, a lighter tomorrow, a rested or eased exercise, fewer minutes, or a 5-minute recovery quest that keeps
the streak), Second Wind and Unbreakable work, the days that waited behind the check-in are applied in order, and the
lighter-plan offer appears when the check-ins call for it, at most once every 14 days.

**Architecture:** The rules already decide every outcome (`checkinOutcome`, `resolveCheckin`, `addRecovery`,
`shouldOfferLighterPlan`); M7a wires them. The answer is a new `checkin` phone event planned like an adjustment
(`_shared/checkin.ts`, written by `levelmeup.adjust`): a protected answer resolves the check-in at once; "I just didn't"
adds the recovery quest to the running day and the check-in is settled when that day closes (`planAdvance`: recovered,
else Unbreakable, else a shield, else a reset). Whenever no check-in is pending, `planAdvance` replays the closed days
queued behind it (`streak_applied = false`) in day order, so a missed day or away days among them open their own
check-in, exactly as if the first answer had come at once. A `lighter_plan` event accepts or declines the offer.
Migration 0011 adds the check-in's resolution, the light-tomorrow flag and the offer's last answer. On the phone, Today
shows the check-in card, the held streak and the result once; a new Check-in screen asks the question.

**Tech Stack:** as M6e (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14, Vitest, Deno 2.9,
TypeScript 6, pgTAP). No new dependencies, native modules, EAS build or monthly cost. One migration (0011).

**Specs:** MVP spec §2.4 (streaks and shields), §2.5 (Second Wind, Unbreakable), §3.7 (the missed-day check-in);
architecture §4.3 (lazy closing, the queue behind a check-in); visual spec §4.1 ("Missed-day check-in" board F1,
"Today after a miss" board F3 without the Pact's parts); roadmap M7 row and the "Carried forward" rows for M7 (M2: wire
Unbreakable, the recovery quest, `secondWindRedo`; M3: replay the queued days; M6a: the phone sends the check-in; M6b:
the lighter plan when rest is refused, its cooldown; M6d: Second Wind and Unbreakable leave "arrives in a later update").

---

## Plain summary

When M7a is done:

- After a day whose core quest wasn't done (and that wasn't a streak day or protected), Today opens with "The day
  closed. What happened?" and a button to answer. "Later" hides it until the app is next opened; the streak shows as
  paused until the player answers.
- The check-in screen lists the five answers from the design board, each with what it does:
  - **I was sick or injured**: the streak pauses and tomorrow is a light day. "Injured" also rests the exercise from
    that day's core quest until the player brings it back.
  - **Emergency, travel or a brutal day**: the streak pauses.
  - **It was too hard**: the streak pauses, and that quest's ladder steps down a rung.
  - **I need a lighter load**: the streak pauses, and the daily minutes drop one step (40 → 25 → 15 → 10).
  - **I just didn't**: a 5-minute recovery quest joins today. Cleared by the end of today, the streak survives and the
    player earns Discipline (and the *Rise Again* achievement the first time). Not cleared: a shield is used, or with
    none left the streak starts again (the best is kept). A Warrior with *Unbreakable* ready loses nothing, once a
    month. A Warrior with *Second Wind* ready may instead redo yesterday's missed core quest for its full XP.
- Days the player finished while the check-in waited are counted in order once it is answered, so answering late
  changes nothing.
- When three or more days in two weeks were paused by check-in answers, or three recovery quests were needed, Today
  offers a lighter plan once ("Lighten the plan" / "Keep my plan"); either answer quiets the offer for 14 days. When the
  week's rest days are used up, the rest-day panel offers the lighter plan too.
- Character's class path shows Second Wind and Unbreakable as ready or cooling down, no longer "arrives in a later
  update".

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop.

1. **M7 is split in three**, like M6: **M7a the check-in** (this plan), **M7b Settings and notifications** (voice, day
   boundary, minutes, local notifications with a new EAS build, the delete-account screen with the Google note, "start
   again as a new guest", the sign-in guard, planning rest ahead with the morning briefing), **M7c Accountability**
   (the Pact, `accountability_set`, the Shadow scene, mark and note, the Trial of Stillness, consequences and their
   3-in-7 pause, the reveal's "Read the pact" link, the sterner evening reminder). Each ends with something that runs.
2. **The answer is a `checkin` event planned like an adjustment.** `{ checkinId, answer, secondWind }` goes through
   `planAdjust` → `planCheckin` (`_shared/checkin.ts`) → `levelmeup.adjust` (kind `checkin`), so idempotency, the
   version check and refusals work as for every M6b adjustment. `lmu-sync` closes ended days before applying a
   `checkin` event, so the answer always lands on the day that is running.
3. **One check-in at a time** (as M3 built it). The phone asks the five board questions; "sick or injured" then asks
   which (an injury rests that day's core exercise). A gap check-in (away days) has no quest, so it rests or eases
   nothing.
4. **A protected answer resolves at once; "I just didn't" resolves when its day ends.** The recovery quest is added to
   the running day (the check-in records it as `recovery_day_id`); when that day closes, `planAdvance` settles the
   miss before applying the day itself: recovered → nothing lost; else Unbreakable when ready → nothing lost (its use
   is recorded); else a shield; else a reset (the best stays). The streak shows "held today" meanwhile.
5. **The queue replays in `planAdvance`.** Whenever no check-in is pending, the closed days with
   `streak_applied = false` are applied in day order with `applyDay`; a missed day among them opens its own check-in,
   and a jump in day numbers (away days) opens one gap check-in; the days after it keep waiting. This is the M3 review
   rule ("exactly as if the first answer had come at once"). Spec §3.7's "delaying the answer changes nothing" is
   reworded: two missed days in a row share one check-in when the first is still unanswered (owner's M3 decision).
6. **The answers' effects** follow `checkinOutcome`: "injured" rests the missed core quest's exercise (as "I felt pain"
   does, `recordPain` on its pain key); "too hard" steps its ladder down one rung; "sick" and "injured" make the next
   day light (`character_state.next_day_light`, used and cleared when that day is built; the phone's offline day reads
   it too); "lighter load" drops the minutes one step and counts as answering the lighter-plan offer.
7. **Second Wind** is offered with "I just didn't" when the rules' new `secondWindRedo` (the non-throwing form of
   `addRecovery`) finds yesterday's core quest; the state carries the quest it would redo (`checkin.secondWind`), so
   the phone offers only what the server accepts. Using it starts its 7-quest-day wait.
8. **Unbreakable is automatic** when a "just didn't" miss isn't recovered and the ability is ready; it saves the streak
   whether or not a shield is left (`shieldWaived`), so the name holds. Spec §2.5 is reworded: "a plain miss doesn't
   cost a shield or the streak". *Rise Again* counts (`recoveries_cleared`) when a miss is settled as recovered, so its
   celebration comes with the result, when the recovery day closes.
9. **The lighter plan** is offered (state `lighterPlan.offered`) when `shouldOfferLighterPlan` holds over the check-in
   answers of the last 14 days (`checkinEvents`: "I just didn't" is a recovery quest, any other answer protects each day
   it covers) and the player hasn't answered the offer in the last 14 days (`profiles.lighter_plan_at`). Accepting drops
   the minutes one step from the next quest day; either answer starts the 14 days. A player already at 10 minutes is
   never offered it. Over the rest limit, the rest panel offers the same step directly. (Settings, M7b, raises the
   minutes again.)
10. **The phone** shows the check-in only after the server has it (a closed day is the server's). The answer queues like
    any event: the projection hides the card at once, shows "held today" for "I just didn't" and says the recovery quest
    arrives with the next sync. The result of a settled miss shows once (kept on the phone, `lmu.checkin-result`).
11. **Not in M7a:** consequences and the Pact (M7c: `decideConsequence` stays unused, the "what got in the way?" note
    comes with the Shadow), notifications (M7b), the late-rest notice and a tap time on `plan_rest`/`pain` (carried to
    M7b). The owner's M6e question, whether a phone that was open but offline should protect its days automatically:
    no (it could be used to skip days); the check-in's "Emergency, travel or a brutal day" covers them.
12. **Already true, closed:** history stores each slot's final template (swaps, Stillness and Dawn Ritual replace the
    instance in place, and `pastDays` reads instances), the M2 carried item.

## Remote steps (each needs the owner's yes)

- Task 8: `npm run db:deploy` (migration 0011), `npm run db:test`, `npm run deploy:functions`, `npm run test:live`
  (11 players). After the deploy, an app bundle from before M7a still works (it ignores the new state keys and sends no
  new events), and the M7a app needs the M7a server (it reads `checkin`, `lighterPlan`, `checkinResult`).
- Task 16: the emulator check needs a test character with a missed day, so a real day boundary (Uma, M6e rows 2–3, if
  her day 1 core quest stays undone; otherwise a new test character on the emulator).

## File map

| File | Change |
|---|---|
| `packages/rules/src/checkin.ts` | `AnsweredCheckin`, `checkinEvents`, `lighterMinutes`, `lighterPlanOffered`. |
| `packages/rules/src/adjust.ts` | `secondWindRedo`. |
| `packages/content/src/checkin.ts` | **New.** `CHECKIN_TEXT`, `LIGHTER_TEXT`. |
| `packages/content/src/character.ts` | `ABILITIES_LATER` is only Insight. |
| `packages/content/src/play.ts` | `PLAY_TEXT.cleared.recovered`. |
| `supabase/migrations/0011_checkin.sql` | **New.** Check-in resolution columns, `next_day_light`, `lighter_plan_at`; `adjust` (kinds `checkin`, `lighter_plan`) and `advance` (replay, settle) replaced. |
| `supabase/tests/db/adjust.sql`, `functions.sql` | The check-in, the lighter plan, the replay writes. |
| `supabase/functions/_shared/state.ts` | Snapshot `checkin`, `queue`, `answered`, `result`, `readAt`; the state's `checkin`, `checkinResult`, `lighterPlan`, `character.nextDayLight`; `DayOffers.secondWind`. |
| `supabase/functions/_shared/db.ts` | Loads them. |
| `supabase/functions/_shared/today.ts` | The Second Wind offer. |
| `supabase/functions/_shared/events.ts` | `CheckinEvent`, `LighterEvent`. |
| `supabase/functions/_shared/checkin.ts` | **New.** `planCheckin`. |
| `supabase/functions/_shared/adjust.ts` | The new change keys and codes; `lighter_plan`. |
| `supabase/functions/_shared/advance.ts` | The queue replay, the settled miss, the light next day. |
| `supabase/functions/lmu-sync/index.ts` | Closes ended days before a check-in answer; passes the queue and the pending check-in. |
| `supabase/tests/unit/*` | fixtures, state, events, checkin (new), adjust, advance tests. |
| `supabase/tests/live/live.test.ts`, `helpers.ts` | The M7a block; 11 players. |
| `apps/mobile/src/game/notices.ts` | `already_answered`, `no_lighter_plan`. |
| `apps/mobile/src/data/local.ts` | Cache migration 6. |
| `apps/mobile/src/game/project.ts` | The `checkin` and `lighter_plan` events; `answering`. |
| `apps/mobile/src/game/offlineDay.ts` | A light day after "sick" or "injured". |
| `apps/mobile/src/game/checkin.ts` | **New.** `checkinLead`, `answerLine`, `resultText`, `streakNote`. |
| `apps/mobile/src/state/store.ts` | `checkinLater`, `answerLater`, `reopen`, `checkinResultSeen`, `dismissCheckinResult`. |
| `apps/mobile/app/_layout.tsx` | `reopen` when the app comes back to the foreground. |
| `apps/mobile/src/screens/Checkin.tsx`, `app/checkin.tsx` | **New.** The check-in screen and its route. |
| `apps/mobile/src/screens/CheckinNotes.tsx` | **New.** Today's check-in card, held line, result and lighter-plan offer. |
| `apps/mobile/src/screens/Today.tsx`, `app/(tabs)/index.tsx` | The notes; the streak's "paused" / "held today". |
| `apps/mobile/src/screens/DayActions.tsx` | The lighter plan over the rest limit. |
| `apps/mobile/src/quest/cleared.ts`, `screens/quest/Cleared.tsx` | The recovery quest's line. |
| `apps/mobile/app/dev/checkin.tsx`, `app/dev/index.tsx` | **New** preview, and its link. |
| `apps/mobile/test/*` | project, offlineDay, notices, checkin (new), store, screens, character, cleared tests; fixtures. |
| Docs | MVP spec §2.5, §3.7; architecture §4.3; roadmap (M7 split, rows, carried forward); READMEs; device checklist M7a; this plan's "As built". |

## Task 0: Baseline

- [ ] **Step 1:** On branch `m7a-checkin` (from `m6e-offline-days` 55931c5), run and record the counts:

```bash
npm test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
```

Expected: all pass (M6e: content 1043, rules 439, server 299, app 569).

## Task 1: Rules — the lighter plan and Second Wind's redo

**Files:**
- Modify: `packages/rules/src/checkin.ts`, `packages/rules/src/adjust.ts`
- Test: `packages/rules/test/checkin.test.ts`, `packages/rules/test/adjust.test.ts`, `packages/rules/test/index.test.ts`

- [ ] **Step 1: Write the failing tests.** Append to `packages/rules/test/checkin.test.ts` (and import `checkinEvents`,
  `lighterMinutes`, `lighterPlanOffered` from `../src/checkin.ts`):

```ts
describe('the lighter plan (M7a decision 9)', () => {
  it('drops the daily minutes one step, never below the lowest', () => {
    expect([40, 25, 15, 10].map(lighterMinutes)).toEqual([25, 15, 10, null]);
  });

  it("counts \"I just didn't\" as a recovery quest and any other answer as each day it protected", () => {
    expect(checkinEvents([
      { answer: 'just_didnt', at: 5, days: 1 },
      { answer: 'emergency', at: 6, days: 3 },
      { answer: 'sick', at: 7, days: 1 },
    ])).toEqual([
      { at: 5, kind: 'recovery_quest' },
      { at: 6, kind: 'protected_day' }, { at: 6, kind: 'protected_day' }, { at: 6, kind: 'protected_day' },
      { at: 7, kind: 'protected_day' },
    ]);
  });

  it('is offered when the check-ins call for it, then waits 14 days after the player answers it', () => {
    const now = 30 * DAY_MS;
    const events = checkinEvents([{ answer: 'emergency', at: now - DAY_MS, days: 3 }]);
    expect(lighterPlanOffered(events, now, null)).toBe(true);
    expect(lighterPlanOffered(events, now, now - 13 * DAY_MS)).toBe(false);
    expect(lighterPlanOffered(events, now, now - 14 * DAY_MS)).toBe(true);
    expect(lighterPlanOffered([], now, null)).toBe(false);
  });
});
```

Append to `packages/rules/test/adjust.test.ts`, inside `describe('the recovery quest (spec §3.7)', …)` after the
"Second Wind redoes the missed core quest…" test (import `secondWindRedo` from `../src/adjust.ts`):

```ts
  it('secondWindRedo is the redo exactly when addRecovery accepts it, else null (M2 review)', () => {
    const input = missedPush();
    const day = buildDay(FIXTURE, input);
    expect(secondWindRedo(FIXTURE, input, day, 'push-1', null)).toMatchObject({ slot: 'recovery', templateId: 'push-1', why: { code: 'second_wind' } });
    expect(secondWindRedo(FIXTURE, input, day, 'push-1', 4)).toBeNull();
    const young = missedPush('push-1', {}, { level: 4 });
    expect(secondWindRedo(FIXTURE, young, buildDay(FIXTURE, young), 'push-1', null)).toBeNull();
    expect(secondWindRedo(FIXTURE, input, day, 'walk-1', null)).toBeNull();
  });
```

In `packages/rules/test/index.test.ts`, add `'checkinEvents', 'lighterMinutes', 'lighterPlanOffered',
'secondWindRedo'` to the `it.each([...])` list (after `'shouldOfferLighterPlan'`).

- [ ] **Step 2: Run them and see them fail.**

Run: `npm -w packages/rules test -- checkin adjust index`
Expected: FAIL (`lighterMinutes is not a function`, `secondWindRedo is not a function`).

- [ ] **Step 3: Implement.** In `packages/rules/src/checkin.ts`, change the import to
  `import { LIGHTER_PLAN_THRESHOLD, LIGHTER_PLAN_WINDOW_MS, MINUTES_OPTIONS } from './constants.ts';` and append:

```ts
/** A check-in the player answered: when, and how many days it covered (one missed day, or a run of away days). */
export type AnsweredCheckin = { answer: CheckinAnswer; at: number; days: number };

/**
 * What answered check-ins count towards the lighter-plan offer (spec §3.7): "I just didn't" is a recovery quest; any
 * other answer protects each day it covers.
 */
export function checkinEvents(answers: readonly AnsweredCheckin[]): LighterPlanEvent[] {
  return answers.flatMap((a): LighterPlanEvent[] =>
    a.answer === 'just_didnt'
      ? [{ at: a.at, kind: 'recovery_quest' }]
      : Array.from({ length: Math.max(1, a.days) }, (): LighterPlanEvent => ({ at: a.at, kind: 'protected_day' })));
}

/** The next lower daily minutes (spec §3.7: "daily minutes drop, plan lightens"), or null at the lowest. */
export function lighterMinutes(minutes: number): number | null {
  const lower = MINUTES_OPTIONS.filter((m) => m < minutes);
  return lower.length === 0 ? null : lower[lower.length - 1]!;
}

/**
 * The lighter-plan offer: shown when the check-ins call for it, and not again for LIGHTER_PLAN_WINDOW_MS after the
 * player last answered it (M7a decision 9), so it never shows on every open.
 */
export function lighterPlanOffered(events: readonly LighterPlanEvent[], nowMs: number, answeredAt: number | null): boolean {
  if (answeredAt !== null && nowMs - answeredAt < LIGHTER_PLAN_WINDOW_MS) return false;
  return shouldOfferLighterPlan(events, nowMs);
}
```

In `packages/rules/src/adjust.ts`, after `addRecovery`, add:

```ts
/**
 * The quest Second Wind would put in the recovery slot today, or null when `addRecovery` would refuse it (M2 review: the
 * app offers Second Wind only when the server will accept it).
 */
export function secondWindRedo(
  library: QuestLibrary, input: DayInput, day: BuiltDay, missedCore: string, lastUsedDay: number | null,
): QuestDraft | null {
  try {
    return addRecovery(library, input, day, { kind: 'second_wind', missedCore, lastUsedDay }).quests.find((q) => q.slot === 'recovery')!;
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}
```

(`QuestDraft` is already imported in `adjust.ts`; if not, add it to the `./day.ts` type import.)

- [ ] **Step 4: Run them and see them pass.**

Run: `npm -w packages/rules test`
Expected: PASS (439 + 4).

- [ ] **Step 5: Portability and commit.**

```bash
npm run check:portable
git add packages/rules
git commit -m "M7a T1: rules - lighter plan (minutes step, check-in events, 14-day wait) and secondWindRedo"
```

## Task 2: Content — the check-in's words

**Files:**
- Create: `packages/content/src/checkin.ts`
- Modify: `packages/content/src/index.ts`, `packages/content/src/character.ts`, `packages/content/src/play.ts`
- Test: `packages/content/test/checkin.test.ts` (new), `packages/content/test/character.test.ts`

- [ ] **Step 1: Write the failing test** `packages/content/test/checkin.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CHECKIN_TEXT, LIGHTER_TEXT } from '../src/checkin.ts';
import { lintText } from '../src/lint.ts';
import { PLAY_TEXT } from '../src/play.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('the check-in words (M7a)', () => {
  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of [...strings(CHECKIN_TEXT), ...strings(LIGHTER_TEXT), PLAY_TEXT.cleared.recovered]) {
      expect(lintText(text), text).toEqual([]);
    }
  });

  it('keep the board F1 lines', () => {
    expect(CHECKIN_TEXT.title).toBe('The day closed. What happened?');
    expect(CHECKIN_TEXT.answers.sick_or_injured.label).toBe('I was sick or injured');
    expect(CHECKIN_TEXT.answers.just_didnt.outcome).toBe('A 5-minute recovery quest today keeps your streak');
    expect(CHECKIN_TEXT.laterNote).toBe('Your streak stays paused until you answer.');
  });

  it('never call a day a failure', () => {
    for (const text of strings(CHECKIN_TEXT)) expect(text.toLowerCase()).not.toMatch(/\bfail|\bmissed\b/);
  });
});
```

In `packages/content/test/character.test.ts`, change the `ABILITIES_LATER` expectation to:

```ts
    expect(ABILITIES_LATER).toEqual(['insight']);
```

(and its test name to "Insight arrives with the articles (M8); Second Wind and Unbreakable work since M7a").

- [ ] **Step 2: Run and see it fail.**

Run: `npm -w packages/content test -- checkin character`
Expected: FAIL (cannot find `../src/checkin.ts`).

- [ ] **Step 3: Implement.** Create `packages/content/src/checkin.ts`:

```ts
// The missed-day check-in (spec §3.7, board F1) and the lighter-plan offer (M7a). Plain, never blaming: paused days earn
// nothing either way, so no answer is a wrong one.

export const CHECKIN_TEXT = {
  title: 'The day closed. What happened?',
  lead: "{day}'s core quest wasn't cleared. There's no wrong answer, and paused days earn nothing either way.",
  leadYesterday: "Yesterday's core quest wasn't cleared. There's no wrong answer, and paused days earn nothing either way.",
  leadGap: "You were away for {days} days. There's no wrong answer, and paused days earn nothing either way.",
  leadGapOne: "You were away for a day. There's no wrong answer, and paused days earn nothing either way.",
  answers: {
    sick_or_injured: { label: 'I was sick or injured', outcome: 'Streak paused · lighter tomorrow' },
    emergency: { label: 'Emergency, travel or a brutal day', outcome: 'Streak paused' },
    too_hard: { label: 'It was too hard', outcome: 'Streak paused · that quest steps down' },
    lighter_load: { label: 'I need a lighter load', outcome: 'Streak paused · fewer minutes a day' },
    just_didnt: { label: "I just didn't", outcome: 'A 5-minute recovery quest today keeps your streak' },
  },
  /** For a day whose quest has no ladder, or a player already at the fewest minutes. */
  pausedOnly: 'Streak paused',
  which: 'Which was it?',
  sick: 'Sick',
  injured: 'Injured',
  injuredNote: 'That exercise rests until you bring it back.',
  how: 'How do you want to take the day back?',
  recovery: 'Take back the day · 5 min',
  secondWind: 'Second Wind: redo {quest} for full XP',
  answer: 'Answer',
  later: 'Answer later',
  laterNote: 'Your streak stays paused until you answer.',
  open: 'Answer',
  openLater: 'Later',
  held: 'Clear the recovery quest today and your streak survives.',
  waiting: 'Your recovery quest appears once the System has your answer.',
  streakPaused: 'paused',
  streakHeld: 'held today',
  done: 'Got it',
  gone: 'Nothing is waiting for an answer.',
  result: {
    recovered: 'You took the day back. Your streak holds.',
    unbreakable: 'The recovery quest stayed open, but Unbreakable held your streak. It is ready again in 30 days.',
    shield: 'The recovery quest stayed open, so a shield kept your streak.',
    reset: 'The recovery quest stayed open and no shield was left, so your streak starts again. Your best stays {best}.',
  },
} as const;

export const LIGHTER_TEXT = {
  offer:
    'The last two weeks asked a lot of you. A lighter plan might fit better: {from} → {to} minutes a day, from your ' +
    'next quest day.',
  accept: 'Lighten the plan',
  decline: 'Keep my plan',
  restLimit: 'Lighten the plan: {from} → {to} minutes a day',
} as const;
```

In `packages/content/src/index.ts`, add `export * from './checkin.ts';` (beside the other `*_TEXT` modules).

In `packages/content/src/character.ts`, replace the `ABILITIES_LATER` doc and value:

```ts
/** Abilities that unlock now but whose screens arrive later: Insight (M8). Second Wind and Unbreakable work since M7a. */
export const ABILITIES_LATER: readonly AbilityId[] = ['insight'];
```

In `packages/content/src/play.ts`, add to `PLAY_TEXT.cleared` (after `streakDays`):

```ts
    recovered: 'You took the day back. Your streak holds when today ends.',
```

- [ ] **Step 4: Run and see it pass.**

Run: `npm -w packages/content test`
Expected: PASS (1043 + 3; the review page and the fuzz test unchanged).

- [ ] **Step 5: Commit.**

```bash
git add packages/content
git commit -m "M7a T2: content - the check-in's words, the lighter-plan offer, Second Wind and Unbreakable leave 'later'"
```

## Task 3: Migration 0011 and its database tests

**Files:**
- Create: `supabase/migrations/0011_checkin.sql`
- Test: `supabase/tests/db/adjust.sql`, `supabase/tests/db/functions.sql`

- [ ] **Step 1: Write the failing pgTAP tests.** Append to `supabase/tests/db/adjust.sql`:

```sql
-- M7a: the check-in's answer (decisions 2–6) and the lighter plan (decision 9).
create function lmu_test.test_adjust_checkin() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  today bigint := lmu_test.day_of(a);
  g bigint;
  c bigint;
  recovery jsonb := '{"templateId": "recovery-walk", "ladder": null, "rung": null, "stat": "discipline", "tier": "minor",
    "minutes": 5, "completion": "tap", "condition": {"kind": "habit"}, "hardDay": false, "xp": {"discipline": 5},
    "why": {"code": "recovery"}, "book": null}';
begin
  insert into levelmeup.checkins (user_id, gap_from, gap_to) values (a, 5, 6) returning id into g;
  insert into levelmeup.checkins (user_id, gap_from, gap_to) values (a, 7, 7) returning id into c;
  update levelmeup.character_state set awaiting_checkin = true, streak_current = 4, streak_best = 4 where user_id = a;

  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'checkin', jsonb_build_object('checkinId', g, 'answer', 'just_didnt', 'secondWind', false),
    jsonb_build_object('day', jsonb_build_object('id', today),
      'checkin', jsonb_build_object('id', g, 'answer', 'just_didnt', 'recoveryDayId', today, 'outcome', null),
      'recovery', recovery));
  return next is((select answer || '/' || (recovery_day_id = today) || '/' || (resolved_at is null) from levelmeup.checkins where id = g),
    'just_didnt/true/true', '"I just didn''t" is stored and waits for today to end');
  return next is((select template_id || '/' || (xp ->> 'discipline') from levelmeup.quest_instances where day_id = today and slot = 'recovery'),
    'recovery-walk/5', 'the recovery quest joins today');
  return next ok((select awaiting_checkin from levelmeup.character_state where user_id = a), 'the streak is held until then');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''checkin'', ''{}'', %L)', a, lmu_test.ev(2),
      jsonb_build_object('checkin', jsonb_build_object('id', g, 'answer', 'sick', 'recoveryDayId', null, 'outcome', 'protected'))),
    'P0001', 'lmu:already_answered', 'an answered check-in takes no other answer');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''checkin'', ''{}'', %L)', a, lmu_test.ev(3),
      jsonb_build_object('day', jsonb_build_object('id', today),
        'checkin', jsonb_build_object('id', c, 'answer', 'just_didnt', 'recoveryDayId', today + 1, 'outcome', null))),
    'P0001', 'lmu:bad_change', 'the recovery day is the day the change names');

  perform levelmeup.adjust(a, lmu_test.ev(4), 2, 'checkin', '{"answer": "lighter_load"}'::jsonb,
    jsonb_build_object('checkin', jsonb_build_object('id', c, 'answer', 'lighter_load', 'recoveryDayId', null, 'outcome', 'protected'),
      'streak', '{"current": 4, "best": 4, "shields": 0, "awaitingCheckin": false}'::jsonb,
      'minutes', 15, 'lighterPlanAt', true, 'lightNext', true));
  return next is((select outcome || '/' || (resolved_at is not null) from levelmeup.checkins where id = c), 'protected/true',
    'a protected answer is resolved at once');
  return next is((select awaiting_checkin::text || '/' || next_day_light from levelmeup.character_state where user_id = a), 'false/true',
    'the streak goes on and the next day will be light');
  return next is((select minutes_per_day || '/' || (lighter_plan_at is not null) from levelmeup.profiles where user_id = a), '15/true',
    'the daily minutes drop and the offer is answered');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 3, ''lighter_plan'', ''{"accept": true}'', ''{"minutes": 12}'')', a, lmu_test.ev(5)),
    '23514', null, 'the table refuses minutes that are not an option');
  perform levelmeup.adjust(a, lmu_test.ev(6), 3, 'lighter_plan', '{"accept": false}', '{"lighterPlanAt": true}');
  return next is((select minutes_per_day from levelmeup.profiles where user_id = a), 15, '"Keep my plan" keeps the minutes');
end $$;

create function lmu_test.test_adjust_second_wind() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'checkin', '{}',
    jsonb_build_object('day', jsonb_build_object('id', lmu_test.day_of(a)), 'ability', '{"id": "second_wind", "day": 1}'::jsonb));
  return next is((select ability_last_used from levelmeup.character_state where user_id = a), '{"second_wind": 1}'::jsonb,
    'Second Wind''s quest day is kept');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''checkin'', ''{}'', %L)', a, lmu_test.ev(2),
      '{"ability": {"id": "unbreakable", "day": 1}}'), 'P0001', 'lmu:bad_change', 'Unbreakable is never a player''s change');
end $$;
```

Append to `supabase/tests/db/functions.sql`:

```sql
-- M7a: the replay of waiting days, the settled "I just didn't", Unbreakable, Rise Again, the light day (decisions 4–8).
create function lmu_test.test_advance_replays_and_settles() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1, now() - interval '30 hours', now() - interval '6 hours');
  day1 bigint := (select id from levelmeup.quest_days where user_id = a);
  c bigint;
begin
  update levelmeup.quest_days set status = 'closed', resolution = 'streak_day', streak_applied = false, closed_at = now() where id = day1;
  insert into levelmeup.checkins (user_id, gap_from, gap_to, answer, answered_at, recovery_day_id)
  values (a, 1, 1, 'just_didnt', now(), day1) returning id into c;
  update levelmeup.character_state set next_day_light = true where user_id = a;
  perform levelmeup.advance(a, 1, jsonb_build_object(
    'applied', jsonb_build_array(day1),
    'opened', jsonb_build_array(jsonb_build_object('gapFrom', 2, 'gapTo', 3)),
    'resolved', jsonb_build_object('id', c, 'outcome', 'unbreakable'),
    'ability', '{"id": "unbreakable", "day": 2}'::jsonb,
    'counters', '{"hardDaysCleared": 0, "comebacks": 0, "recoveriesCleared": 1}'::jsonb,
    'lightUsed', true));
  return next ok((select streak_applied from levelmeup.quest_days where id = day1), 'a waiting day is applied');
  return next is((select gap_from || '-' || gap_to from levelmeup.checkins where user_id = a and answer is null), '2-3',
    'the replay opens the next check-in');
  return next is((select outcome || '/' || (resolved_at is not null) from levelmeup.checkins where id = c), 'unbreakable/true',
    '"I just didn''t" is settled when its day ends');
  return next is((select ability_last_used ->> 'unbreakable' from levelmeup.character_state where user_id = a), '2',
    'Unbreakable''s use is kept');
  return next is((select recoveries_cleared from levelmeup.character_state where user_id = a), 1, 'a recovered day counts for Rise Again');
  return next ok(not (select next_day_light from levelmeup.character_state where user_id = a), 'the light day is used up');
  return next throws_ok(format('select levelmeup.advance(%L, 2, %L)', a, jsonb_build_object('resolved', jsonb_build_object('id', c, 'outcome', 'reset'))),
    'P0001', 'lmu:not_found', 'a check-in is settled once');
  return next throws_ok(format('select levelmeup.advance(%L, 2, %L)', a, '{"ability": {"id": "stillness", "day": 2}}'),
    'P0001', 'lmu:bad_change', 'advance only ever uses Unbreakable');
  return next throws_ok(format('select levelmeup.advance(%L, 2, %L)', a,
      jsonb_build_object('opened', jsonb_build_array(jsonb_build_object('dayId', (select id from levelmeup.quest_days where user_id = lmu_test.start(2)))))),
    '23503', null, 'a check-in opens only on the player''s own day');
end $$;
```

- [ ] **Step 2: Write the migration** `supabase/migrations/0011_checkin.sql`:

```sql
-- M7a, the check-in (plan decisions 2–9): a check-in is answered, then resolved (at once, or when the recovery day of
-- "I just didn't" ends); a check-in answer can make the next day light; the lighter-plan offer remembers its last answer.
-- `adjust` takes the kinds `checkin` and `lighter_plan`; `advance` applies the days that waited behind a check-in,
-- opens the check-ins that replay finds, settles "I just didn't", and records Unbreakable (otherwise as 0010 and 0003).

alter table levelmeup.checkins
  add column recovery_day_id bigint,
  add column resolved_at timestamptz,
  add column outcome text check (outcome in ('protected', 'recovered', 'unbreakable', 'shield', 'reset')),
  add constraint checkins_resolved check ((outcome is null) = (resolved_at is null)),
  add constraint checkins_recovery_day foreign key (recovery_day_id, user_id)
    references levelmeup.quest_days (id, user_id) on delete cascade;

alter table levelmeup.character_state add column next_day_light boolean not null default false;
alter table levelmeup.profiles add column lighter_plan_at timestamptz;

create or replace function levelmeup.adjust(p_user uuid, p_event uuid, p_version int, p_type text, p_payload jsonb, p_change jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  v int;
  e levelmeup.events;
  d levelmeup.quest_days;
  q record;
  cur levelmeup.quest_instances;
  changed_at timestamptz;
  outcome jsonb;
  prof levelmeup.profiles;
  n_sessions int;
  n_minutes int;
begin
  v := levelmeup.lock_player(p_user);
  -- A repeat returns what it returned the first time, whatever has happened since; the same id for anything else is refused.
  select * into e from levelmeup.events where user_id = p_user and client_event_id = p_event;
  if found then
    if e.type <> p_type or e.payload <> p_payload then raise exception 'lmu:event_reused'; end if;
    return e.result;
  end if;
  if p_type not in ('swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training', 'book',
    'checkin', 'lighter_plan') then
    raise exception 'lmu:bad_change';
  end if;
  if v <> p_version then raise exception 'lmu:conflict'; end if;

  if jsonb_typeof(p_change -> 'day') = 'object' then
    select * into d from levelmeup.quest_days where id = (p_change -> 'day' ->> 'id')::bigint and user_id = p_user;
    if not found then raise exception 'lmu:not_found'; end if;
    if d.status <> 'open' or now() >= d.ends_at then raise exception 'lmu:day_closed'; end if;
    if (p_change -> 'day' ->> 'protection') not in ('planned_rest', 'pain') then
      raise exception 'lmu:bad_change';
    end if;
    update levelmeup.quest_days set
      hard_day = hard_day or coalesce((p_change -> 'day' ->> 'hardDay')::boolean, false),
      protection = coalesce(protection, p_change -> 'day' ->> 'protection'),
      swaps_used = swaps_used + coalesce((p_change -> 'day' ->> 'swaps')::int, 0)
    where id = d.id;
  elsif jsonb_array_length(coalesce(p_change -> 'quests', '[]')) > 0 or jsonb_typeof(p_change -> 'recovery') = 'object' then
    raise exception 'lmu:bad_change'; -- quests change only on a day the change names
  end if;

  for q in
    select * from jsonb_to_recordset(coalesce(p_change -> 'quests', '[]')) as x(id bigint, slot text, "templateId" text,
      ladder text, rung smallint, stat text, tier text, minutes smallint, completion text, condition jsonb, "hardDay" boolean,
      xp jsonb, why jsonb, book text)
  loop
    select * into cur from levelmeup.quest_instances where id = q.id and user_id = p_user and day_id = d.id;
    if not found then raise exception 'lmu:not_found'; end if;
    if cur.completed_at is not null then raise exception 'lmu:already_completed'; end if;
    if q.slot is distinct from cur.slot or cur.slot not in ('core', 'side1', 'side2') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.quest_instances set
      template_id = q."templateId", ladder_id = q.ladder, rung = q.rung, stat = q.stat, tier = q.tier, minutes = q.minutes,
      completion = q.completion, condition = q.condition, hard_day = coalesce(q."hardDay", false), xp = q.xp, why = q.why,
      book = q.book
    where id = cur.id;
  end loop;

  -- M7a: the recovery quest after "I just didn't" (decision 4), on the day the change names; one per day (unique slot).
  if jsonb_typeof(p_change -> 'recovery') = 'object' then
    insert into levelmeup.quest_instances (day_id, user_id, slot, template_id, ladder_id, rung, stat, tier, minutes, completion,
      condition, hard_day, xp, why, book)
    select d.id, p_user, 'recovery', r."templateId", r.ladder, r.rung, r.stat, r.tier, r.minutes, r.completion, r.condition,
      coalesce(r."hardDay", false), r.xp, r.why, r.book
    from jsonb_to_record(p_change -> 'recovery') as r("templateId" text, ladder text, rung smallint, stat text, tier text,
      minutes smallint, completion text, condition jsonb, "hardDay" boolean, xp jsonb, why jsonb, book text);
  end if;

  -- M7a: the check-in's answer. Only this player's unanswered check-in takes one; a recovery day is the changed day.
  if jsonb_typeof(p_change -> 'checkin') = 'object' then
    if (p_change -> 'checkin' ->> 'recoveryDayId') is not null
      and (d.id is null or (p_change -> 'checkin' ->> 'recoveryDayId')::bigint <> d.id) then
      raise exception 'lmu:bad_change';
    end if;
    update levelmeup.checkins set
      answer = p_change -> 'checkin' ->> 'answer',
      answered_at = now(),
      recovery_day_id = (p_change -> 'checkin' ->> 'recoveryDayId')::bigint,
      outcome = p_change -> 'checkin' ->> 'outcome',
      resolved_at = case when p_change -> 'checkin' ->> 'outcome' is null then null else now() end
    where id = (p_change -> 'checkin' ->> 'id')::bigint and user_id = p_user and answer is null;
    if not found then raise exception 'lmu:already_answered'; end if;
  end if;

  if jsonb_typeof(p_change -> 'streak') = 'object' then
    update levelmeup.character_state set
      streak_current = (p_change -> 'streak' ->> 'current')::int,
      streak_best = (p_change -> 'streak' ->> 'best')::int,
      shields = (p_change -> 'streak' ->> 'shields')::smallint,
      awaiting_checkin = (p_change -> 'streak' ->> 'awaitingCheckin')::boolean
    where user_id = p_user;
  end if;
  if p_change ? 'minutes' then
    update levelmeup.profiles set minutes_per_day = (p_change ->> 'minutes')::int where user_id = p_user;
  end if;
  if coalesce((p_change ->> 'lighterPlanAt')::boolean, false) then
    update levelmeup.profiles set lighter_plan_at = now() where user_id = p_user;
  end if;
  if coalesce((p_change ->> 'lightNext')::boolean, false) then
    update levelmeup.character_state set next_day_light = true where user_id = p_user;
  end if;

  insert into levelmeup.ladder_states (user_id, ladder_id, state, updated_at)
  select p_user, x.key, x.value, now() from jsonb_each(coalesce(p_change -> 'ladders', '{}')) x
  on conflict (user_id, ladder_id) do update set state = excluded.state, updated_at = excluded.updated_at;

  if p_change ->> 'classId' is not null then
    select class_changed_at into changed_at from levelmeup.profiles where user_id = p_user;
    if changed_at is not null and now() < changed_at + interval '14 days' then raise exception 'lmu:class_locked'; end if;
    update levelmeup.profiles set class_id = p_change ->> 'classId', class_changed_at = now() where user_id = p_user;
  end if;

  -- M6c: the training setup; the table's checks refuse unknown equipment or styles.
  if jsonb_typeof(p_change -> 'training') = 'object' then
    update levelmeup.profiles set
      equipment = array(select jsonb_array_elements_text(coalesce(p_change -> 'training' -> 'equipment', '[]'))),
      program_style = p_change -> 'training' ->> 'programStyle'
    where user_id = p_user;
  end if;

  -- M6d: Scholar's Path. Finishing records the current book with the quests read since it was set; then the next book
  -- (or none) is set. The table's check refuses a title over 120 characters.
  if jsonb_typeof(p_change -> 'book') = 'object' then
    select * into prof from levelmeup.profiles where user_id = p_user;
    if coalesce((p_change -> 'book' ->> 'finished')::boolean, false) then
      if prof.book is null then raise exception 'lmu:bad_change'; end if;
      select count(*)::int, coalesce(sum(minutes), 0)::int into n_sessions, n_minutes from levelmeup.quest_instances
      where user_id = p_user and book = prof.book and completed_at is not null
        and completed_at >= coalesce(prof.book_started_at, '-infinity'::timestamptz);
      update levelmeup.profiles set books_finished = (
          select coalesce(jsonb_agg(t.e order by t.i), '[]'::jsonb)
          from jsonb_array_elements(prof.books_finished) with ordinality as t(e, i)
          where t.i > jsonb_array_length(prof.books_finished) - 99
        ) || jsonb_build_array(jsonb_build_object(
          'title', prof.book,
          'startedAt', to_char(prof.book_started_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'finishedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'sessions', n_sessions, 'minutes', n_minutes))
      where user_id = p_user;
    end if;
    update levelmeup.profiles set
      book = p_change -> 'book' ->> 'title',
      book_started_at = case when p_change -> 'book' ->> 'title' is null then null else now() end
    where user_id = p_user;
  end if;

  -- Day-shaping abilities (M6b) and Second Wind (M7a). Unbreakable is never a player's change: `advance` records it.
  if jsonb_typeof(p_change -> 'ability') = 'object' then
    if (p_change -> 'ability' ->> 'id') not in ('stillness', 'dawn_ritual', 'second_wind') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.character_state
    set ability_last_used = ability_last_used || jsonb_build_object(p_change -> 'ability' ->> 'id', (p_change -> 'ability' ->> 'day')::int)
    where user_id = p_user;
  end if;

  v := levelmeup.bump(p_user);
  outcome := jsonb_build_object('type', p_type, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result) values (p_user, p_event, p_type, p_payload, outcome);
  return outcome;
end $$;

-- Lazy day closing and the next day (architecture §4.3), computed by _shared/advance.ts from the state it read at
-- p_version. Fails with lmu:conflict if anything was written since, so the caller re-reads and recomputes.
create or replace function levelmeup.advance(p_user uuid, p_version int, p_outcome jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  c record;
  d levelmeup.quest_days;
  l record;
  inserted int;
  new_day jsonb := p_outcome -> 'newDay';
  day bigint;
  v int;
begin
  if levelmeup.lock_player(p_user) <> p_version then raise exception 'lmu:conflict'; end if;

  for c in
    select * from jsonb_to_recordset(coalesce(p_outcome -> 'close', '[]'))
      as x("dayId" bigint, resolution text, "streakApplied" boolean, checkin boolean)
  loop
    select * into d from levelmeup.quest_days where id = c."dayId" and user_id = p_user;
    if not found then raise exception 'lmu:not_found'; end if;
    if d.status <> 'open' then raise exception 'lmu:not_open'; end if;
    if d.ends_at > now() then raise exception 'lmu:not_ended'; end if;
    if exists (select 1 from levelmeup.quest_days where user_id = p_user and day_number < d.day_number and status = 'open') then
      raise exception 'lmu:out_of_order';
    end if;
    update levelmeup.quest_days
    set status = 'closed', resolution = c.resolution, streak_applied = coalesce(c."streakApplied", false), closed_at = now()
    where id = d.id;
    if coalesce(c.checkin, false) then insert into levelmeup.checkins (user_id, day_id) values (p_user, d.id); end if;
  end loop;

  if jsonb_typeof(p_outcome -> 'gap') = 'object' then
    insert into levelmeup.checkins (user_id, gap_from, gap_to)
    values (p_user, (p_outcome -> 'gap' ->> 'from')::int, (p_outcome -> 'gap' ->> 'to')::int);
  end if;

  -- M7a (decision 5): days that waited behind a check-in, now applied to the streak in order, and the check-ins that
  -- replay opened (a missed day, or away days between two days). The foreign key keeps a day check-in on this player.
  update levelmeup.quest_days set streak_applied = true
  where user_id = p_user and status = 'closed' and not streak_applied
    and id in (select (x #>> '{}')::bigint from jsonb_array_elements(coalesce(p_outcome -> 'applied', '[]')) x);
  insert into levelmeup.checkins (user_id, day_id, gap_from, gap_to)
  select p_user, (x ->> 'dayId')::bigint, (x ->> 'gapFrom')::int, (x ->> 'gapTo')::int
  from jsonb_array_elements(coalesce(p_outcome -> 'opened', '[]')) x;

  -- "I just didn't", settled when its recovery day ended (decision 4); Unbreakable's use (decision 8).
  if jsonb_typeof(p_outcome -> 'resolved') = 'object' then
    update levelmeup.checkins set resolved_at = now(), outcome = p_outcome -> 'resolved' ->> 'outcome'
    where id = (p_outcome -> 'resolved' ->> 'id')::bigint and user_id = p_user and answer = 'just_didnt' and resolved_at is null;
    if not found then raise exception 'lmu:not_found'; end if;
  end if;
  if jsonb_typeof(p_outcome -> 'ability') = 'object' then
    if (p_outcome -> 'ability' ->> 'id') <> 'unbreakable' then raise exception 'lmu:bad_change'; end if;
    update levelmeup.character_state
    set ability_last_used = ability_last_used || jsonb_build_object('unbreakable', (p_outcome -> 'ability' ->> 'day')::int)
    where user_id = p_user;
  end if;

  insert into levelmeup.ladder_states (user_id, ladder_id, state, updated_at)
  select p_user, x.key, x.value, now() from jsonb_each(coalesce(p_outcome -> 'ladders', '{}')) x
  on conflict (user_id, ladder_id) do update set state = excluded.state, updated_at = excluded.updated_at;

  -- Rung bonuses, Discipline and streak milestones. A key already in the ledger is never paid again.
  for l in
    select * from jsonb_to_recordset(coalesce(p_outcome -> 'ledger', '[]'))
      as x("sourceType" text, "sourceId" text, stat text, amount int)
  loop
    if l."sourceType" not in ('rung', 'discipline', 'milestone') or l.amount <= 0 or l.amount > 200 then
      raise exception 'lmu:bad_ledger';
    end if;
    insert into levelmeup.xp_ledger (user_id, source_type, source_id, stat, amount)
    values (p_user, l."sourceType", l."sourceId", l.stat, l.amount)
    on conflict (user_id, source_type, source_id, stat) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 1 then perform levelmeup.add_xp(p_user, jsonb_build_object(l.stat, l.amount), 1); end if;
  end loop;

  if jsonb_typeof(p_outcome -> 'streak') = 'object' then
    update levelmeup.character_state set
      streak_current = (p_outcome -> 'streak' ->> 'current')::int,
      streak_best = (p_outcome -> 'streak' ->> 'best')::int,
      shields = (p_outcome -> 'streak' ->> 'shields')::smallint,
      awaiting_checkin = (p_outcome -> 'streak' ->> 'awaitingCheckin')::boolean
    where user_id = p_user;
  end if;
  update levelmeup.character_state set
    hard_days_cleared = hard_days_cleared + coalesce((p_outcome -> 'counters' ->> 'hardDaysCleared')::int, 0),
    comebacks = comebacks + coalesce((p_outcome -> 'counters' ->> 'comebacks')::int, 0),
    recoveries_cleared = recoveries_cleared + coalesce((p_outcome -> 'counters' ->> 'recoveriesCleared')::int, 0)
  where user_id = p_user;
  if coalesce((p_outcome ->> 'lightUsed')::boolean, false) then
    update levelmeup.character_state set next_day_light = false where user_id = p_user;
  end if;

  if jsonb_typeof(new_day) = 'object' then
    if exists (select 1 from levelmeup.quest_days where user_id = p_user and status = 'open') then raise exception 'lmu:out_of_order'; end if;
    if exists (select 1 from levelmeup.quest_days where user_id = p_user and day_number >= (new_day ->> 'dayNumber')::int) then
      raise exception 'lmu:day_exists';
    end if;
    if (new_day ->> 'startsAt')::timestamptz < (select max(ends_at) from levelmeup.quest_days where user_id = p_user) then
      raise exception 'lmu:overlap';
    end if;
    day := levelmeup.insert_day(p_user, new_day);
  end if;

  v := levelmeup.bump(p_user);
  return jsonb_build_object('version', v, 'newDayId', day);
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.adjust(uuid, uuid, int, text, jsonb, jsonb) to lmu_service;
grant execute on function levelmeup.advance(uuid, int, jsonb) to lmu_service;
```

Before writing, compare this `advance` body line by line with `0003_write_functions.sql` lines 222–302 and this
`adjust` body with `0010_scholars_path.sql`: the only differences are the M7a blocks and comments. Check
`delete_player` (0004) and `restart_player` (0006) delete `checkins` before `quest_days` (the new foreign key).

- [ ] **Step 3: Static checks.**

Run: `npm -w supabase test -- migrations`
Expected: PASS (the lint: numbering, levelmeup only, the revoke after a function).

- [ ] **Step 4: Commit** (the database tests run against the live project only in Task 8, with the owner's yes).

```bash
git add supabase/migrations/0011_checkin.sql supabase/tests/db/adjust.sql supabase/tests/db/functions.sql
git commit -m "M7a T3: migration 0011 - check-in resolution, light next day, lighter-plan answer; adjust and advance; pgTAP"
```

## Task 4: Server — the check-in in the snapshot and the state

**Files:**
- Modify: `supabase/functions/_shared/state.ts`, `supabase/functions/_shared/db.ts`, `supabase/functions/_shared/today.ts`
- Test: `supabase/tests/unit/fixtures.ts`, `supabase/tests/unit/state.test.ts`; `apps/mobile/test/support/fixtures.ts`

- [ ] **Step 1: Types.** In `supabase/functions/_shared/state.ts`:

  1. Add to the rules imports: `checkinEvents`, `lighterMinutes`, `lighterPlanOffered` (values) and `CheckinAnswer` (type).
  2. `ProfileRow`, after `accountability_level`:

```ts
  /** M7a: when the player last answered the lighter-plan offer (decision 9). */
  lighter_plan_at: Date | null;
```

  3. `CharacterRow`, after `ability_last_used`:

```ts
  /** M7a: the next day is light (a "sick" or "injured" check-in answer, decision 6). */
  next_day_light: boolean;
```

  4. Replace `export type CheckinRow = …` with:

```ts
/**
 * M7a: the check-in not yet resolved (one at a time, decision 3), with the missed day's window and core quest, and whether
 * the recovery quest on its recovery day was cleared.
 */
export type PendingCheckin = {
  id: Id;
  day_id: Id | null;
  gap_from: number | null;
  gap_to: number | null;
  answer: CheckinAnswer | null;
  recovery_day_id: Id | null;
  missed_day: number | null;
  missed_starts_at: Date | null;
  missed_ends_at: Date | null;
  missed_time_zone: string | null;
  missed_core: string | null;
  missed_ladder: string | null;
  recovered: boolean;
};

/** M7a: a closed day waiting behind a check-in (`streak_applied = false`). */
export type QueuedDay = { id: Id; day_number: number; resolution: 'streak_day' | 'protected' | 'awaiting_checkin' };

/** M7a: a check-in answered in the last 14 days (the lighter-plan offer). */
export type AnsweredRow = { answer: CheckinAnswer; answered_at: Date; gap_from: number | null; gap_to: number | null };

/** How a settled "I just didn't" ended (decision 4). */
export type MissOutcome = 'recovered' | 'unbreakable' | 'shield' | 'reset';

/** M7a: the latest settled "I just didn't" of the last 2 days, shown once by the phone. */
export type ResultRow = { id: Id; outcome: MissOutcome };
```

  5. `DayOffers`, after `stepDown`:

```ts
  /** M7a: the quest Second Wind would redo with "I just didn't" on the pending check-in, or null (decision 7). */
  secondWind: QuestFields | null;
```

and `NO_OFFERS` gains `secondWind: null`.

  6. In `characterView`'s returned object, after `abilityLastUsed`: `nextDayLight: c.next_day_light,`.
  7. In `Snapshot`, replace `checkins: CheckinRow[];` and `queued: boolean;` (with their comments) by:

```ts
  /** M7a: the check-in not yet resolved, or null. */
  checkin: PendingCheckin | null;
  /** M7a: closed days waiting behind a check-in, in day order (possibly older than `days`). */
  queue: QueuedDay[];
  /** M7a: check-ins answered in the last 14 days. */
  answered: AnsweredRow[];
  /** M7a: the latest settled "I just didn't" of the last 2 days, or null. */
  result: ResultRow | null;
  /** M7a: the database clock when the snapshot was read. */
  readAt: Date;
```

  8. Before `stateView`, add:

```ts
/** M7a: the pending check-in as the phone shows it (decisions 3, 7). */
function checkinView(c: PendingCheckin, offers: DayOffers) {
  const gap = c.day_id === null;
  return {
    id: Number(c.id),
    /** The missed day, or the first and last away days. */
    from: gap ? c.gap_from! : c.missed_day!,
    to: gap ? c.gap_to! : c.missed_day!,
    gap,
    /** The missed day's date (`YYYY-MM-DD`), or null for away days. */
    date: gap || c.missed_starts_at === null
      ? null
      : calendarDate({ starts_at: c.missed_starts_at, ends_at: c.missed_ends_at!, time_zone: c.missed_time_zone! }),
    /** The missed day's core quest and its ladder: what "injured" rests and "too hard" eases. */
    core: c.missed_core,
    ladder: c.missed_ladder,
    /** "just_didnt" while its recovery day runs; null until answered. */
    answer: c.answer,
    /** The quest Second Wind would redo with "I just didn't", or null. */
    secondWind: c.answer === null ? offers.secondWind : null,
  };
}

/** M7a: the lighter plan one step down and whether it is offered now; null at the fewest minutes (decision 9). */
export function lighterPlanView(s: Snapshot): { from: number; to: number; offered: boolean } | null {
  const to = lighterMinutes(s.profile.minutes_per_day);
  if (to === null) return null;
  const events = checkinEvents(s.answered.map((a) => ({
    answer: a.answer, at: a.answered_at.getTime(), days: a.gap_from === null || a.gap_to === null ? 1 : a.gap_to - a.gap_from + 1,
  })));
  const answeredAt = s.profile.lighter_plan_at?.getTime() ?? null;
  return { from: s.profile.minutes_per_day, to, offered: lighterPlanOffered(events, s.readAt.getTime(), answeredAt) };
}
```

  9. In `stateView`, replace the `checkinsDue: …` entry with:

```ts
    /** M7a: the check-in waiting for an answer, or held after "I just didn't" until its day ends (decisions 3–4). */
    checkin: s.checkin === null ? null : checkinView(s.checkin, offers),
    /** M7a: the latest settled "I just didn't", shown once by the phone. */
    checkinResult: s.result === null ? null : { id: Number(s.result.id), outcome: s.result.outcome },
    /** M7a: the lighter plan (decision 9). */
    lighterPlan: lighterPlanView(s),
```

- [ ] **Step 2: The Second Wind offer.** In `supabase/functions/_shared/today.ts`, add `secondWindRedo` to the rules
  import and, before `dayOffers`:

```ts
/** M7a: the quest Second Wind would redo with "I just didn't" on the pending check-in (decision 7), or null. */
function secondWindOffer(s: Snapshot, library: QuestLibrary, input: DayInput, built: BuiltDay): QuestFields | null {
  const c = s.checkin;
  if (c === null || c.answer !== null || c.missed_core === null) return null;
  const redo = secondWindRedo(library, input, built, c.missed_core, s.character.ability_last_used.second_wind ?? null);
  return redo === null ? null : fieldsOf(library, redo);
}
```

and in `dayOffers`'s final return add `secondWind: secondWindOffer(s, library, input, built),`.

- [ ] **Step 3: The loader.** In `supabase/functions/_shared/db.ts`, import `LIGHTER_PLAN_WINDOW_MS` beside
  `PAIN_WINDOW_MS`, replace `CheckinRow` in the type import by `AnsweredRow, PendingCheckin, QueuedDay, ResultRow`, and
  in `loadSnapshot` replace the `checkins` query and the `queued` query by:

```ts
    const [checkin] = await tx<PendingCheckin[]>`
      select c.id, c.day_id, c.gap_from, c.gap_to, c.answer, c.recovery_day_id,
        d.day_number as missed_day, d.starts_at as missed_starts_at, d.ends_at as missed_ends_at, d.time_zone as missed_time_zone,
        q.template_id as missed_core, q.ladder_id as missed_ladder,
        exists (select 1 from levelmeup.quest_instances r
          where r.day_id = c.recovery_day_id and r.slot = 'recovery' and r.completed_at is not null) as recovered
      from levelmeup.checkins c
      left join levelmeup.quest_days d on d.id = c.day_id
      left join levelmeup.quest_instances q on q.day_id = c.day_id and q.slot = 'core'
      where c.user_id = ${userId} and c.resolved_at is null
      order by c.id limit 1`;
    const queue = await tx<QueuedDay[]>`
      select id, day_number, resolution from levelmeup.quest_days
      where user_id = ${userId} and status = 'closed' and not streak_applied order by day_number`;
    const answered = await tx<AnsweredRow[]>`
      select answer, answered_at, gap_from, gap_to from levelmeup.checkins
      where user_id = ${userId} and answered_at > now() - make_interval(secs => ${LIGHTER_PLAN_WINDOW_MS / 1000})`;
    const [result] = await tx<ResultRow[]>`
      select id, outcome from levelmeup.checkins
      where user_id = ${userId} and outcome in ('recovered', 'unbreakable', 'shield', 'reset') and resolved_at > now() - interval '2 days'
      order by resolved_at desc, id desc limit 1`;
    const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
```

and in the returned object replace `checkins: [...checkins]` and `queued` by
`checkin: checkin ?? null, queue: [...queue], answered: [...answered], result: result ?? null, readAt: now`.

- [ ] **Step 4: Fixtures.** In `supabase/tests/unit/fixtures.ts`:
  - `profileRow`: add `lighter_plan_at: null,` before `...over`; `characterRow`: add `next_day_light: false,`.
  - `dayTwoSnapshot`: replace `checkins: [],` and `queued: false,` by
    `checkin: null, queue: [], answered: [], result: null, readAt: new Date(w.startsAt + HOUR),`.
  - `afterDay1`: replace `queued: false,` by `queue: [], pending: null,` (Task 6 adds these to `AdvanceInput`; until
    then the typecheck of this one line fails, which Task 6 fixes).
  - Import the type `PendingCheckin` and add:

```ts
/** M7a: a check-in waiting for day 1 (its core quest, push-0, missed), as `loadSnapshot` reads it. Its id is 7. */
export function pendingCheckin(over: Partial<PendingCheckin> = {}): PendingCheckin {
  const core = DAY1.quests.find((q) => q.slot === 'core')!;
  return {
    id: '7', day_id: '1', gap_from: null, gap_to: null, answer: null, recovery_day_id: null,
    missed_day: 1, missed_starts_at: new Date(DAY1.startsAt), missed_ends_at: new Date(DAY1.endsAt), missed_time_zone: 'Asia/Manila',
    missed_core: core.templateId, missed_ladder: core.ladder, recovered: false, ...over,
  };
}
```

  In `apps/mobile/test/support/fixtures.ts`, `serverState`'s snapshot: replace `checkins: [],` and `queued: false,` by
  `checkin: null, queue: [], answered: [], result: null, readAt: new Date(ONBOARDED + HOUR),` (import `ONBOARDED`).
  Then `git grep -n "queued\|checkins:\|checkinsDue" -- supabase apps/mobile` and update any other literal snapshot the
  same way (a test that asserted `checkinsDue: []` now asserts `checkin: null`).

- [ ] **Step 5: Write the failing tests.** Append to `supabase/tests/unit/state.test.ts` (import `cumulativeXpForLevel`
  from the rules; `calendarDate`, `stateView` and the type `Snapshot` from `../../functions/_shared/state.ts`; `DAY1`,
  `pendingCheckin`, `characterRow`, `profileRow`, `DAY_TWO_SLOTS`, `dayTwoSnapshot`, `historyOf` from `./fixtures.ts`;
  `dayOffers` from `../../functions/_shared/today.ts`; `LIBRARY` from content; skip any the file already imports):

```ts
describe('the check-in in the state (M7a)', () => {
  const view = (s: Snapshot) => stateView(s, dayOffers(s, LIBRARY), historyOf(s));

  it('a pending check-in: the missed day and its date, the core quest and its ladder, no answer yet', () => {
    const date = calendarDate({ starts_at: new Date(DAY1.startsAt), ends_at: new Date(DAY1.endsAt), time_zone: 'Asia/Manila' });
    expect(view(dayTwoSnapshot(DAY_TWO_SLOTS, { checkin: pendingCheckin() })).checkin).toEqual({
      id: 7, from: 1, to: 1, gap: false, date, core: 'push-0', ladder: 'push', answer: null, secondWind: null,
    });
  });

  it('away days: the first and the last, without a date or a quest', () => {
    const gap = pendingCheckin({
      day_id: null, gap_from: 3, gap_to: 5, missed_day: null, missed_starts_at: null, missed_ends_at: null, missed_time_zone: null,
      missed_core: null, missed_ladder: null,
    });
    expect(view(dayTwoSnapshot(DAY_TWO_SLOTS, { checkin: gap })).checkin).toMatchObject({ from: 3, to: 5, gap: true, date: null, core: null });
  });

  it("offers Second Wind to a Warrior at level 5 whose missed core quest was yesterday's (decision 7)", () => {
    const slots = { core: 'walk-1', side1: 'mobility-0', side2: 'reading-0' };
    const warrior = characterRow({ awaiting_checkin: true, xp_strength: cumulativeXpForLevel(5) });
    const s = dayTwoSnapshot(slots, { checkin: pendingCheckin(), character: warrior });
    expect(view(s).checkin!.secondWind).toMatchObject({ templateId: 'push-0', why: { code: 'second_wind' } });
    expect(view({ ...s, character: { ...warrior, ability_last_used: { second_wind: 1 } } }).checkin!.secondWind).toBeNull();
    expect(view({ ...s, checkin: pendingCheckin({ answer: 'just_didnt' }) }).checkin!.secondWind).toBeNull();
  });

  it('the lighter plan: one step down, offered after 3 paused days in 14, quiet for 14 days after an answer', () => {
    const s = dayTwoSnapshot();
    const at = new Date(s.readAt.getTime() - 3_600_000);
    const paused = { answered: [{ answer: 'emergency' as const, answered_at: at, gap_from: 3, gap_to: 5 }] };
    expect(view(s).lighterPlan).toEqual({ from: 25, to: 15, offered: false });
    expect(view({ ...s, ...paused }).lighterPlan).toEqual({ from: 25, to: 15, offered: true });
    expect(view({ ...s, ...paused, profile: profileRow(undefined, { lighter_plan_at: at }) }).lighterPlan!.offered).toBe(false);
    expect(view({ ...s, profile: profileRow(undefined, { minutes_per_day: 10 }) }).lighterPlan).toBeNull();
  });

  it('the latest settled miss travels once; the character says when tomorrow is light', () => {
    const s = dayTwoSnapshot(DAY_TWO_SLOTS, { result: { id: '9', outcome: 'shield' }, character: characterRow({ next_day_light: true }) });
    expect(view(s).checkinResult).toEqual({ id: 9, outcome: 'shield' });
    expect(view(s).character.nextDayLight).toBe(true);
  });
});
```

- [ ] **Step 6: Run and see them fail, then pass.**

Run: `npm -w supabase test -- state` before Steps 1–4 are saved: FAIL; after: PASS. Then `npm -w supabase run typecheck`
(only `fixtures.ts`'s `afterDay1` line fails until Task 6).

- [ ] **Step 7: Commit.**

```bash
git add supabase/functions/_shared supabase/tests/unit apps/mobile/test/support/fixtures.ts
git commit -m "M7a T4: server - the pending check-in, the queue, the lighter plan and the result in the snapshot and the state"
```

## Task 5: Server — the `checkin` and `lighter_plan` events and their planner

**Files:**
- Modify: `supabase/functions/_shared/events.ts`, `supabase/functions/_shared/adjust.ts`
- Create: `supabase/functions/_shared/checkin.ts`
- Test: `supabase/tests/unit/events.test.ts`, `supabase/tests/unit/checkin.test.ts` (new)

- [ ] **Step 1: Write the failing tests.** Append to `supabase/tests/unit/events.test.ts` (it parses with
  `parseSyncBody`; follow the file's helper for one event, `parse(event)` or similar):

```ts
describe('the check-in and the lighter plan (M7a)', () => {
  const id = '00000000-0000-4000-8000-0000000000a1';
  const one = (event: Record<string, unknown>) => parseSyncBody({ timeZone: 'Asia/Manila', events: [{ id, ...event }] });

  it('reads an answer, with Second Wind only for "I just didn\'t"', () => {
    expect(one({ type: 'checkin', checkinId: 7, answer: 'just_didnt', secondWind: true })).toMatchObject({
      events: [{ id, type: 'checkin', checkinId: 7, answer: 'just_didnt', secondWind: true }],
    });
    for (const bad of [
      { type: 'checkin', checkinId: 7, answer: 'sick', secondWind: true },
      { type: 'checkin', checkinId: 7, answer: 'bored', secondWind: false },
      { type: 'checkin', checkinId: 0, answer: 'sick', secondWind: false },
      { type: 'checkin', checkinId: 7, answer: 'sick' },
    ]) expect(one(bad)).toMatchObject({ events: [], rejected: [{ id, code: 'bad_event' }] });
  });

  it('reads the lighter-plan answer', () => {
    expect(one({ type: 'lighter_plan', accept: false })).toMatchObject({ events: [{ id, type: 'lighter_plan', accept: false }] });
    expect(one({ type: 'lighter_plan', accept: 'yes' })).toMatchObject({ rejected: [{ id, code: 'bad_event' }] });
  });
});
```

Create `supabase/tests/unit/checkin.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cumulativeXpForLevel, newLadder } from '../../../packages/rules/src/index.ts';
import type { CheckinAnswer } from '../../../packages/rules/src/index.ts';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { planAdjust } from '../../functions/_shared/adjust.ts';
import type { Snapshot } from '../../functions/_shared/state.ts';
import { DAY_TWO_SLOTS, HOUR, characterRow, dayTwoSnapshot, ladderRows, manilaDay, pendingCheckin, profileRow } from './fixtures.ts';

const ctx = { nowMs: manilaDay(2).startsAt + HOUR, library: LIBRARY };
const answer = (a: CheckinAnswer, secondWind = false) =>
  ({ id: '00000000-0000-4000-8000-0000000000a1', type: 'checkin' as const, checkinId: 7, answer: a, secondWind });
const waiting = (over: Partial<Snapshot> = {}): Snapshot => dayTwoSnapshot(DAY_TWO_SLOTS, {
  checkin: pendingCheckin(),
  character: characterRow({ awaiting_checkin: true, streak_current: 4, streak_best: 6, shields: 1 }),
  ladders: ladderRows({ push: newLadder(1) }),
  ...over,
});

describe('answering the check-in (M7a decisions 2–8)', () => {
  it('refuses a check-in that is not the pending one, or is answered', () => {
    expect(planAdjust(waiting(), { ...answer('sick'), checkinId: 8 }, ctx)).toEqual({ code: 'not_found' });
    expect(planAdjust(waiting({ checkin: null }), answer('sick'), ctx)).toEqual({ code: 'not_found' });
    expect(planAdjust(waiting({ checkin: pendingCheckin({ answer: 'just_didnt' }) }), answer('sick'), ctx)).toEqual({ code: 'already_answered' });
  });

  it('refuses when no day runs (lmu-sync closes ended days first)', () => {
    expect(planAdjust(waiting(), answer('sick'), { ...ctx, nowMs: manilaDay(2).endsAt })).toEqual({ code: 'day_closed' });
  });

  it('sick: resolved at once, the streak goes on, the next day is light', () => {
    expect(planAdjust(waiting(), answer('sick'), ctx)).toEqual({
      change: {
        day: { id: 2 },
        checkin: { id: 7, answer: 'sick', recoveryDayId: null, outcome: 'protected' },
        streak: { current: 4, best: 6, shields: 1, awaitingCheckin: false },
        lightNext: true,
      },
    });
  });

  it('injured also rests the missed core exercise; too hard steps its ladder down; away days touch no ladder', () => {
    expect(planAdjust(waiting(), answer('injured'), ctx)).toMatchObject({ change: { ladders: { push: { paused: true } } } });
    expect(planAdjust(waiting(), answer('too_hard'), ctx)).toMatchObject({ change: { ladders: { push: { rung: 0 } } } });
    const gap = pendingCheckin({ day_id: null, gap_from: 1, gap_to: 1, missed_day: null, missed_core: null, missed_ladder: null });
    const plan = planAdjust(waiting({ checkin: gap }), answer('too_hard'), ctx);
    expect('change' in plan && plan.change.ladders).toBeUndefined();
  });

  it('a lighter load drops the minutes one step and answers the lighter-plan offer; never below 10', () => {
    expect(planAdjust(waiting(), answer('lighter_load'), ctx)).toMatchObject({ change: { minutes: 15, lighterPlanAt: true } });
    const lowest = planAdjust(waiting({ profile: profileRow(undefined, { minutes_per_day: 10 }) }), answer('lighter_load'), ctx);
    expect(lowest).toMatchObject({ change: { lighterPlanAt: true } });
    expect('change' in lowest && lowest.change.minutes).toBeUndefined();
  });

  it("\"I just didn't\": the class's recovery quest joins today and the streak stays held", () => {
    const plan = planAdjust(waiting(), answer('just_didnt'), ctx);
    expect(plan).toMatchObject({
      change: {
        day: { id: 2 },
        checkin: { id: 7, answer: 'just_didnt', recoveryDayId: 2, outcome: null },
        recovery: { slot: 'recovery', templateId: 'recovery-walk', xp: { discipline: 5 } },
      },
    });
    expect('change' in plan && plan.change.streak).toBeUndefined();
    const s = waiting();
    const core = s.instances.find((q) => String(q.day_id) === '2' && q.slot === 'core')!;
    const held = { ...s, instances: [...s.instances, { ...core, id: '299', slot: 'recovery' as const }] };
    expect(planAdjust(held, answer('just_didnt'), ctx)).toEqual({ code: 'already_applied' });
  });

  it('Second Wind redoes the missed core quest and starts its wait; refused when not ready', () => {
    const slots = { core: 'walk-1', side1: 'mobility-0', side2: 'reading-0' };
    const warrior = dayTwoSnapshot(slots, {
      checkin: pendingCheckin(), character: characterRow({ awaiting_checkin: true, xp_strength: cumulativeXpForLevel(5) }),
    });
    expect(planAdjust(warrior, answer('just_didnt', true), ctx)).toMatchObject({
      change: { recovery: { templateId: 'push-0', why: { code: 'second_wind' } }, ability: { id: 'second_wind', day: 2 } },
    });
    expect(planAdjust(waiting(), answer('just_didnt', true), ctx)).toEqual({ code: 'ability_not_ready' });
  });
});

describe('the lighter plan (decision 9)', () => {
  const lighter = (accept: boolean) => ({ id: '00000000-0000-4000-8000-0000000000a2', type: 'lighter_plan' as const, accept });

  it('"Keep my plan" answers the offer; accepting drops the minutes one step; at 10 there is none', () => {
    expect(planAdjust(dayTwoSnapshot(), lighter(false), ctx)).toEqual({ change: { lighterPlanAt: true } });
    expect(planAdjust(dayTwoSnapshot(), lighter(true), ctx)).toEqual({ change: { minutes: 15, lighterPlanAt: true } });
    const ten = dayTwoSnapshot(DAY_TWO_SLOTS, { profile: profileRow(undefined, { minutes_per_day: 10 }) });
    expect(planAdjust(ten, lighter(true), ctx)).toEqual({ code: 'no_lighter_plan' });
  });
});
```

- [ ] **Step 2: Run and see them fail.**

Run: `npm -w supabase test -- events checkin`
Expected: FAIL (`unsupported_event`; `planAdjust` has no `checkin` case).

- [ ] **Step 3: The events.** In `supabase/functions/_shared/events.ts`:
  - Header comment: "… M6e the offline-built day and quests named by day and slot; M7a the check-in's answer and the
    lighter plan; the rest arrive …".
  - Add `CHECKIN_ANSWERS` to the rules value import and `CheckinAnswer` to the type import.
  - After `BookEvent`:

```ts
/** M7a: the answer to the pending check-in (decision 2); Second Wind only with "I just didn't" (decision 7). */
export type CheckinEvent = { id: string; type: 'checkin'; checkinId: number; answer: CheckinAnswer; secondWind: boolean };
/** M7a: the lighter-plan offer answered: lighten (one step fewer minutes) or keep the plan (decision 9). */
export type LighterEvent = { id: string; type: 'lighter_plan'; accept: boolean };
```

  - `AdjustEvent` gains `| CheckinEvent | LighterEvent`; `ADJUST_TYPES` gains `'checkin', 'lighter_plan'`.
  - In `parseEvent`, before `case 'provisional_day'`:

```ts
    case 'checkin': {
      if (!isId(raw.checkinId) || !CHECKIN_ANSWERS.includes(raw.answer as CheckinAnswer) || typeof raw.secondWind !== 'boolean') return bad;
      if (raw.secondWind && raw.answer !== 'just_didnt') return bad;
      return { id, type: 'checkin', checkinId: raw.checkinId, answer: raw.answer as CheckinAnswer, secondWind: raw.secondWind };
    }
    case 'lighter_plan':
      return typeof raw.accept === 'boolean' ? { id, type: 'lighter_plan', accept: raw.accept } : bad;
```

- [ ] **Step 4: The planner.** Create `supabase/functions/_shared/checkin.ts`:

```ts
// The check-in's answer (spec §3.7; M7a decisions 2–8): the change `levelmeup.adjust` writes, or why it is refused. Pure.
// A protected answer resolves the check-in at once; "I just didn't" adds the recovery quest to the running day, and
// `planAdvance` settles the miss when that day ends.
import {
  addRecovery, checkinOutcome, findTemplate, lighterMinutes, newLadder, painKey, recordPain, resolveCheckin, stepDown,
} from '../../../packages/rules/src/index.ts';
import type { BuiltDay, QuestLibrary, RecoveryOption } from '../../../packages/rules/src/index.ts';
import type { AdjustCode, Change, Plan } from './adjust.ts';
import { toDraft } from './drafts.ts';
import type { CheckinEvent } from './events.ts';
import { ladderMap, streakState } from './state.ts';
import type { Snapshot } from './state.ts';
import { openDay, questsOf, todayBuilt, todayInput } from './today.ts';

const refuse = (code: AdjustCode): Plan => ({ code });

export function planCheckin(s: Snapshot, event: CheckinEvent, { nowMs, library }: { nowMs: number; library: QuestLibrary }): Plan {
  const pending = s.checkin;
  if (pending === null || Number(pending.id) !== event.checkinId) return refuse('not_found');
  if (pending.answer !== null) return refuse('already_answered');
  // lmu-sync closes ended days before this event, so the answer lands on the day that runs now (decision 2).
  const day = openDay(s);
  if (day === null || nowMs >= day.ends_at.getTime()) return refuse('day_closed');
  const outcome = checkinOutcome(event.answer);
  const checkin: NonNullable<Change['checkin']> = { id: Number(pending.id), answer: event.answer, recoveryDayId: null, outcome: null };
  const change: Change = { day: { id: Number(day.id) }, checkin };

  // The missed core quest's exercise rests after an injury; its ladder steps down after "too hard" (decision 6).
  const ladders = ladderMap(s.ladders);
  const missed = pending.missed_core === null ? undefined : findTemplate(library, pending.missed_core);
  if (outcome.pauseLadder && missed !== undefined && missed.exercise !== null) {
    const key = painKey(missed);
    change.ladders = { [key]: recordPain(ladders[key] ?? newLadder()).state };
  }
  if (outcome.stepDownLadder && pending.missed_ladder !== null) {
    change.ladders = { [pending.missed_ladder]: stepDown(ladders[pending.missed_ladder] ?? newLadder()).state };
  }
  if (outcome.reduceDailyMinutes) {
    const minutes = lighterMinutes(s.profile.minutes_per_day);
    if (minutes !== null) change.minutes = minutes;
    change.lighterPlanAt = true;
  }
  if (outcome.lighterTomorrow) change.lightNext = true;

  if (outcome.resolution === 'protected') {
    checkin.outcome = 'protected';
    const streak = streakState(s.character);
    if (streak.awaitingCheckin) change.streak = resolveCheckin(streak, { kind: 'protected' }).state;
    return { change };
  }

  // "I just didn't": the recovery quest today; the miss is settled when today ends (decision 4).
  const quests = questsOf(s, day);
  if (quests.some((q) => q.slot === 'recovery')) return refuse('already_applied');
  let option: RecoveryOption = { kind: 'recovery' };
  if (event.secondWind) {
    if (pending.missed_core === null) return refuse('ability_not_ready');
    option = { kind: 'second_wind', missedCore: pending.missed_core, lastUsedDay: s.character.ability_last_used.second_wind ?? null };
  }
  let built: BuiltDay;
  try {
    built = addRecovery(library, todayInput(s, day), todayBuilt(day, quests), option);
  } catch (error) {
    if (error instanceof RangeError && event.secondWind) return refuse('ability_not_ready');
    throw error;
  }
  change.recovery = toDraft(library, built.quests.find((q) => q.slot === 'recovery')!);
  checkin.recoveryDayId = Number(day.id);
  if (event.secondWind) change.ability = { id: 'second_wind', day: day.day_number };
  return { change };
}
```

In `supabase/functions/_shared/adjust.ts`:
  - Add `lighterMinutes` to the rules import, `CheckinAnswer`, `StreakState` to the rules type import, and
    `import { planCheckin } from './checkin.ts';`.
  - `ADJUST_CODES` gains `'already_answered', 'no_lighter_plan'` (at the end).
  - `Change` gains, after `book`:

```ts
  /** M7a: the check-in's answer (decisions 2–4); `outcome` only when it is resolved at once. */
  checkin?: { id: number; answer: CheckinAnswer; recoveryDayId: number | null; outcome: 'protected' | null };
  /** M7a: the recovery quest, added to the day `day` names. */
  recovery?: InstanceDraft;
  /** M7a: the streak after a protected answer. */
  streak?: StreakState;
  /** M7a: the daily minutes, one step lighter (decisions 6, 9). */
  minutes?: number;
  /** M7a: the next day is light (decision 6). */
  lightNext?: true;
  /** M7a: the lighter-plan offer is answered (decision 9). */
  lighterPlanAt?: true;
```

  and `ability?: { id: DayAbility | 'second_wind'; day: number };`.
  - In `plan`'s switch, after `case 'book'`:

```ts
    case 'checkin':
      return planCheckin(s, event, { nowMs, library });
    case 'lighter_plan': {
      // Either answer quiets the offer for 14 days; accepting drops the daily minutes one step (decision 9).
      if (!event.accept) return { change: { lighterPlanAt: true } };
      const minutes = lighterMinutes(s.profile.minutes_per_day);
      if (minutes === null) return refuse('no_lighter_plan');
      return { change: { minutes, lighterPlanAt: true } };
    }
```

- [ ] **Step 5: Run and see them pass.**

Run: `npm -w supabase test`
Expected: PASS except `advance.test.ts` until Task 6 adds `queue`/`pending` (only if it fails to compile; vitest strips
types, so it should pass).

- [ ] **Step 6: Commit.**

```bash
git add supabase/functions/_shared supabase/tests/unit
git commit -m "M7a T5: server - the checkin and lighter_plan events, planCheckin (protected at once, recovery quest, Second Wind)"
```

## Task 6: Server — `planAdvance` replays the queue and settles "I just didn't"

**Files:**
- Modify: `supabase/functions/_shared/advance.ts`
- Test: `supabase/tests/unit/advance.test.ts`

- [ ] **Step 1: Write the failing tests.** In `supabase/tests/unit/advance.test.ts`, import
  `cumulativeXpForLevel` from the rules, `pendingCheckin` from `./fixtures.ts`, and the types `CharacterRow`, `DayDraft`,
  `DayRow`, `PendingCheckin`, `QueuedDay` from `../../functions/_shared/state.ts`. Add the helpers after `const core = …`:

```ts
/** Day n (n ≥ 2) of the fixtures' player in Manila, with day 1's quests. */
const dayN = (n: number): DayDraft => {
  const w = manilaDay(n);
  return { ...DAY1, dayNumber: n, startsAt: new Date(w.startsAt).toISOString(), endsAt: new Date(w.endsAt).toISOString() };
};
const closedRow = (n: number, resolution: DayRow['resolution']): DayRow =>
  dayRow(dayN(n), n, { status: 'closed', resolution, streak_applied: false });
const queued = (n: number, resolution: QueuedDay['resolution']): QueuedDay => ({ id: String(n), day_number: n, resolution });
const held = (over: Partial<PendingCheckin> = {}): PendingCheckin => pendingCheckin({ answer: 'just_didnt', recovery_day_id: '2', ...over });
```

Replace the two tests that pass `queued: true` ("once a day waits from an earlier sync…" and "away days behind a
waiting day wait too…") with:

```ts
  it('once a day waits from an earlier sync, every later day waits, missed or not', () => {
    const out = planAdvance(afterDay1([], manilaDay(3).endsAt, {
      character: characterRow({ awaiting_checkin: true }),
      days: [closedRow(2, 'streak_day'), dayRow(dayN(3), 3)],
      instances: instanceRows(dayN(3), 3),
      queue: [queued(2, 'streak_day')],
    }))!;
    expect(out.close).toEqual([{ dayId: 3, resolution: 'awaiting_checkin', streakApplied: false, checkin: false }]);
    expect(out.applied).toEqual([]);
  });

  it('away days behind a waiting day wait too: no gap check-in now', () => {
    const out = planAdvance(afterDay1([], manilaDay(6).startsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true }),
      days: [closedRow(2, 'streak_day'), dayRow(dayN(3), 3)],
      instances: instanceRows(dayN(3), 3, ['core']),
      queue: [queued(2, 'streak_day')],
    }))!;
    expect(out.gap).toBeNull();
    expect(out.newDay!.dayNumber).toBe(6);
    expect(out.streak.awaitingCheckin).toBe(true);
  });
```

and append:

```ts
describe('the check-in answered (M7a)', () => {
  it('once the check-in is resolved, the days that waited are applied in order (decision 5)', () => {
    const out = planAdvance(afterDay1([], manilaDay(4).startsAt + HOUR, {
      character: characterRow({ streak_current: 5, streak_best: 6 }),
      days: [closedRow(2, 'streak_day'), closedRow(3, 'streak_day'), dayRow(dayN(4), 4)],
      instances: instanceRows(dayN(4), 4),
      queue: [queued(3, 'streak_day'), queued(2, 'streak_day')],
    }))!;
    expect(out.applied).toEqual([2, 3]);
    expect(out.opened).toEqual([]);
    expect(out.streak).toEqual({ current: 7, best: 7, shields: 1, awaitingCheckin: false });
    expect(out.ledger).toContainEqual({ sourceType: 'milestone', sourceId: 'day:3', stat: 'discipline', amount: 20 });
    expect(out.close).toEqual([]);
    expect(out.newDay).toBeNull();
  });

  it('the replay stops at a missed day, which opens its own check-in; the days after it keep waiting', () => {
    const out = planAdvance(afterDay1([], manilaDay(5).startsAt + HOUR, {
      character: characterRow({ streak_current: 2, streak_best: 2 }),
      days: [closedRow(2, 'streak_day'), closedRow(3, 'awaiting_checkin'), closedRow(4, 'streak_day'), dayRow(dayN(5), 5)],
      instances: instanceRows(dayN(5), 5),
      queue: [queued(2, 'streak_day'), queued(3, 'awaiting_checkin'), queued(4, 'streak_day')],
    }))!;
    expect(out.applied).toEqual([2, 3]);
    expect(out.opened).toEqual([{ dayId: 3 }]);
    expect(out.streak).toEqual({ current: 3, best: 3, shields: 0, awaitingCheckin: true });
  });

  it('away days between waiting days, or before the running day, are one gap check-in', () => {
    const between = planAdvance(afterDay1([], manilaDay(6).startsAt + HOUR, {
      days: [closedRow(2, 'streak_day'), closedRow(5, 'streak_day'), dayRow(dayN(6), 6)],
      instances: instanceRows(dayN(6), 6),
      queue: [queued(2, 'streak_day'), queued(5, 'streak_day')],
    }))!;
    expect(between.applied).toEqual([2]);
    expect(between.opened).toEqual([{ gapFrom: 3, gapTo: 4 }]);
    expect(between.streak.awaitingCheckin).toBe(true);
    const before = planAdvance(afterDay1([], manilaDay(5).startsAt + HOUR, {
      days: [closedRow(2, 'streak_day'), dayRow(dayN(5), 5)],
      instances: instanceRows(dayN(5), 5),
      queue: [queued(2, 'streak_day')],
    }))!;
    expect(before.applied).toEqual([2]);
    expect(before.opened).toEqual([{ gapFrom: 3, gapTo: 4 }]);
  });

  it('"I just didn\'t" is settled when its recovery day ends: recovered keeps the streak and counts for Rise Again', () => {
    const out = planAdvance(afterDay1([], manilaDay(2).endsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true, streak_current: 5, streak_best: 5, shields: 1 }),
      days: [dayRow(DAY1, 1, { status: 'closed', resolution: 'awaiting_checkin', streak_applied: true }), dayRow(dayN(2), 2)],
      instances: instanceRows(dayN(2), 2, ['core']),
      pending: held({ recovered: true }),
    }))!;
    expect(out.resolved).toEqual({ id: 7, outcome: 'recovered' });
    expect(out.counters.recoveriesCleared).toBe(1);
    expect(out.close).toEqual([{ dayId: 2, resolution: 'streak_day', streakApplied: true, checkin: false }]);
    expect(out.streak).toEqual({ current: 6, best: 6, shields: 1, awaitingCheckin: false });
    expect(out.ability).toBeNull();
  });

  it('not recovered: Unbreakable when ready (no shield needed), else a shield, else a reset that keeps the best', () => {
    const settle = (character: Partial<CharacterRow>) => planAdvance(afterDay1([], manilaDay(2).endsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true, streak_current: 5, streak_best: 9, ...character }),
      days: [dayRow(dayN(2), 2)],
      instances: instanceRows(dayN(2), 2, ['side1', 'side2']),
      pending: held(),
    }))!;
    const level10 = cumulativeXpForLevel(10);
    const unbreakable = settle({ xp_strength: level10, shields: 0 });
    expect(unbreakable.resolved).toEqual({ id: 7, outcome: 'unbreakable' });
    expect(unbreakable.ability).toEqual({ id: 'unbreakable', day: 2 });
    expect(unbreakable.streak.current).toBe(6);
    const cooling = settle({ xp_strength: level10, shields: 1, ability_last_used: { unbreakable: 1 } });
    expect(cooling.resolved).toEqual({ id: 7, outcome: 'shield' });
    expect(cooling.streak).toMatchObject({ current: 6, shields: 0 });
    const reset = settle({ shields: 0 });
    expect(reset.resolved).toEqual({ id: 7, outcome: 'reset' });
    expect(reset.streak).toEqual({ current: 1, best: 9, shields: 0, awaitingCheckin: false });
  });

  it('days that waited behind the held check-in are applied once it is settled, before the recovery day itself', () => {
    const out = planAdvance(afterDay1([], manilaDay(3).endsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true, streak_current: 5, streak_best: 5, shields: 1 }),
      days: [closedRow(2, 'streak_day'), dayRow(dayN(3), 3)],
      instances: instanceRows(dayN(3), 3, ['core']),
      queue: [queued(2, 'streak_day')],
      pending: held({ recovery_day_id: '3' }),
    }))!;
    expect(out.resolved).toEqual({ id: 7, outcome: 'shield' });
    expect(out.applied).toEqual([2]);
    expect(out.close).toEqual([{ dayId: 3, resolution: 'streak_day', streakApplied: true, checkin: false }]);
    expect(out.streak).toEqual({ current: 7, best: 7, shields: 1, awaitingCheckin: false });
  });

  it('after "sick" or "injured" the next day is light, and the flag is used up (decision 6)', () => {
    const out = planAdvance(afterDay1(['core'], day1End, { character: characterRow({ next_day_light: true }) }))!;
    expect(out.newDay).toMatchObject({ dayNumber: 2, light: true, comeback: false });
    expect(out.lightUsed).toBe(true);
    expect(planAdvance(afterDay1(['core'], day1End))!.lightUsed).toBe(false);
  });
});
```

- [ ] **Step 2: Run and see them fail.**

Run: `npm -w supabase test -- advance`
Expected: FAIL (`out.applied` undefined, …).

- [ ] **Step 3: Implement.** In `supabase/functions/_shared/advance.ts`:

  1. Header comment, add: "M7a: once a check-in is resolved, the days that waited behind it are applied in order, and
     "I just didn't" is settled when its recovery day ends."
  2. Rules imports: add `abilityReady`, `resolveCheckin` (values) and `ClosedDayResolution` (type); state type imports:
     add `MissOutcome`, `PendingCheckin`, `QueuedDay`.
  3. In `AdvanceInput`, replace `queued: boolean;` (and its comment) by:

```ts
  /** M7a: closed days waiting behind a check-in (Snapshot.queue), possibly older than `days`. */
  queue: readonly QueuedDay[];
  /** M7a: the check-in not yet resolved (Snapshot.checkin). */
  pending: PendingCheckin | null;
```

  4. `ClosedDayOutcome.streakApplied`'s comment: "(M7 applies it then)" → "(the replay applies it once the check-in is
     resolved)"; `checkin`'s comment: "…gets its check-in when M7 replays the queue." → "…gets its check-in when the
     replay reaches it."
  5. Before `Outcome`, add `export type Opened = { dayId: number } | { gapFrom: number; gapTo: number };` (doc: "M7a:
     a check-in the replay opens: a missed day, or away days between two days."), and in `Outcome` change
     `counters` to `{ hardDaysCleared: number; comebacks: number; recoveriesCleared: number }` and add after `offline`:

```ts
  /** M7a (decision 5): days that waited behind a check-in, applied now, in day order. */
  applied: number[];
  /** Check-ins the replay opened. */
  opened: Opened[];
  /** "I just didn't", settled when its recovery day ended (decision 4). */
  resolved: { id: number; outcome: MissOutcome } | null;
  /** Unbreakable, used on that miss (decision 8). */
  ability: { id: 'unbreakable'; day: number } | null;
  /** The new day is the light day a check-in answer asked for (decision 6). */
  lightUsed: boolean;
```

  6. In `planAdvance`, replace everything from `let streak = streakState(input.character);` to the end of the `for`
     loop over `days` with:

```ts
  let streak = streakState(input.character);
  const queue = [...input.queue].sort((a, b) => a.day_number - b.day_number);
  const close: ClosedDayOutcome[] = [];
  const counters = { hardDaysCleared: 0, comebacks: 0, recoveriesCleared: 0 };
  const applied: number[] = [];
  const opened: Opened[] = [];
  let resolved: Outcome['resolved'] = null;
  let ability: Outcome['ability'] = null;

  /** Applies a closed day to the streak (with its milestone); true when it opens a check-in. */
  const applyClosed = (dayNumber: number, resolution: ClosedDayResolution): boolean => {
    const opens = resolution.kind === 'awaiting_checkin' && !streak.awaitingCheckin;
    const change = applyDay(streak, resolution);
    streak = change.state;
    if (change.milestoneXp > 0) pay({ sourceType: 'milestone', sourceId: `day:${dayNumber}`, stat: 'discipline', amount: change.milestoneXp });
    return opens;
  };

  /**
   * M7a (decision 5): while no check-in is pending, the days that waited behind one are applied in day order, as if it
   * had been answered at once. A missed day among them opens its own check-in and away days (a jump in day numbers) one
   * gap check-in; the days after it keep waiting. `next` is the number of the first day after the queue, when one exists.
   */
  const drain = (next: number | null): void => {
    while (!streak.awaitingCheckin && queue.length > 0) {
      const day = queue.shift()!;
      if (applyClosed(day.day_number, { kind: day.resolution })) opened.push({ dayId: Number(day.id) });
      applied.push(Number(day.id));
      const after = queue[0]?.day_number ?? next;
      if (!streak.awaitingCheckin && after !== null && after > day.day_number + 1) {
        streak = applyDay(streak, { kind: 'awaiting_checkin' }).state;
        opened.push({ gapFrom: day.day_number + 1, gapTo: after - 1 });
      }
    }
  };

  /** "I just didn't" is settled when its recovery day ends (decisions 4, 8): recovered, Unbreakable, a shield or a reset. */
  const settles = (day: DayRow): boolean =>
    input.pending !== null && input.pending.answer === 'just_didnt' && String(input.pending.recovery_day_id) === String(day.id)
    && streak.awaitingCheckin;
  const settle = (pending: PendingCheckin, dayNumber: number): void => {
    const { recovered } = pending;
    const player = rulesProfile();
    const unbreakable = !recovered
      && abilityReady('unbreakable', player.classId, player.level, input.character.ability_last_used.unbreakable ?? null, dayNumber);
    const change = resolveCheckin(streak, { kind: 'miss', recovered, shieldWaived: unbreakable });
    streak = change.state;
    resolved = { id: Number(pending.id), outcome: recovered ? 'recovered' : unbreakable ? 'unbreakable' : change.shieldUsed ? 'shield' : 'reset' };
    if (unbreakable) ability = { id: 'unbreakable', day: dayNumber };
    if (recovered) counters.recoveriesCleared++;
  };

  // A check-in resolved since the last run (a protected answer) lets the waiting days go now.
  drain(days.find((d) => d.status === 'open')?.day_number ?? null);

  for (const day of days) {
    if (day.status !== 'open' || day.ends_at.getTime() > nowMs) continue;
    if (settles(day)) settle(input.pending!, day.day_number);
    drain(day.day_number);
    const quests = input.instances.filter((q) => String(q.day_id) === String(day.id));
    const done = quests.filter((q) => q.completed_at !== null);
    const coreDone = done.some((q) => q.slot === 'core');
    const questsDone = done.filter((q) => STREAK_SLOTS.includes(q.slot)).length;
    const resolution = closedDayResolution({ coreDone, questsDone, protection: day.protection });

    let streakApplied = true;
    let checkin = false;
    if (queue.length > 0 || (streak.awaitingCheckin && resolution.kind !== 'awaiting_checkin')) {
      streakApplied = false;
      queue.push({ id: day.id, day_number: day.day_number, resolution: resolution.kind });
    } else {
      checkin = applyClosed(day.day_number, resolution);
    }
```

     followed by the loop's unchanged rest (Discipline for a cleared core, the hard-day and comeback counters,
     `closeLadders`, the rung bonuses, `close.push(…)`).
  7. In the new-day part: replace `!queued` with `queue.length === 0` in the gap condition (and its comment's "(M7
     replays them …)" with "(the replay finds them from the jump in day numbers)"); add `let lightUsed = false;` beside
     `let offline …`; and replace the `dayInput` and `budget` lines by:

```ts
    // A "sick" or "injured" answer asked for a light next day (decision 6); the flag is used up with it.
    const light = comeback || input.character.next_day_light;
    lightUsed = input.character.next_day_light;
    const dayInput: DayInput = {
      dayNumber, profile: rulesProfile(), ladders, history, light, workoutsDone: input.workoutsDone, articleId: null,
    };
    let quests: InstanceDraft[] = [];
    let budget = light ? LIGHT_DAY_MINUTES : profile.minutes_per_day;
```

     and in `newDay`, `light: comeback,` becomes `light,`.
  8. The end:

```ts
  const replayed = applied.length > 0 || opened.length > 0 || resolved !== null;
  if (close.length === 0 && newDay === null && !replayed) return null;
  return {
    close, gap, ladders: changed, ledger, streak, counters, newDay, buildError, offline, applied, opened, resolved, ability, lightUsed,
  };
```

- [ ] **Step 4: Run and see them pass.**

Run: `npm -w supabase test` and `npm -w supabase run typecheck`
Expected: PASS. Earlier tests that compare `counters` whole gain `recoveriesCleared: 0`; nothing else in them changes.

- [ ] **Step 5: Commit.**

```bash
git add supabase/functions/_shared/advance.ts supabase/tests/unit/advance.test.ts
git commit -m "M7a T6: planAdvance replays the days behind a check-in, settles I just didn't (Unbreakable, shield, reset), light next day"
```

## Task 7: Server — `lmu-sync` and the live tests

**Files:**
- Modify: `supabase/functions/lmu-sync/index.ts`
- Test: `supabase/tests/live/live.test.ts`, `supabase/tests/live/helpers.ts`

- [ ] **Step 1: `lmu-sync`.**
  - `applyEvent(userId: string, event: PhoneEvent, timeZone: string)`; in its `try`, before
    `const result = isAdjust(event) ? …`, add:

```ts
    // M7a decision 2: ended days close first, so a check-in's answer always lands on the day that runs now.
    if (event.type === 'checkin') await advance(userId, timeZone);
```

  - The events loop: `results.push(await applyEvent(player.userId, event, request.timeZone));`.
  - Both `planAdvance({ ...snapshot, … })` calls (in `provisional` and `advance`) add `pending: snapshot.checkin,`.

- [ ] **Step 2: The live tests.** In `supabase/tests/live/helpers.ts`, `MAX_PLAYERS` becomes 11 (and the comment's count).
  Append to `supabase/tests/live/live.test.ts` (import `lighterMinutes` from the rules package):

```ts
describe('the check-in and the lighter plan (M7a)', () => {
  let p: Player;

  beforeAll(async () => {
    p = await newPlayer();
    expect((await call('lmu-onboarding', p.token, ONBOARDING)).status).toBe(201);
  });

  it('a new player has no check-in, no result, and a lighter plan that is not offered', async () => {
    const { body } = await sync(p);
    expect(body.state.checkin).toBeNull();
    expect(body.state.checkinResult).toBeNull();
    expect(body.state.character.nextDayLight).toBe(false);
    const minutes = body.state.profile.minutesPerDay;
    expect(body.state.lighterPlan).toEqual({ from: minutes, to: lighterMinutes(minutes), offered: false });
  });

  it('an answer with no check-in due is refused; a malformed one is rejected', async () => {
    const id = eventId();
    const bad = eventId();
    const { body } = await sync(p, [
      { id, type: 'checkin', checkinId: 1, answer: 'sick', secondWind: false },
      { id: bad, type: 'checkin', checkinId: 1, answer: 'bored', secondWind: false },
    ]);
    expect(body.results).toEqual([{ id, ok: false, code: 'not_found' }]);
    expect(body.rejected).toEqual([{ id: bad, code: 'bad_event' }]);
  });

  it('"Keep my plan" keeps the minutes; accepting drops them one step at a time, down to 10', async () => {
    const keep = await sync(p, [{ id: eventId(), type: 'lighter_plan', accept: false }]);
    expect(keep.body.results[0].ok).toBe(true);
    let minutes = keep.body.state.profile.minutesPerDay;
    while (lighterMinutes(minutes) !== null) {
      const { body } = await sync(p, [{ id: eventId(), type: 'lighter_plan', accept: true }]);
      expect(body.results[0].ok).toBe(true);
      expect(body.state.profile.minutesPerDay).toBe(lighterMinutes(minutes));
      minutes = body.state.profile.minutesPerDay;
    }
    const id = eventId();
    const { body } = await sync(p, [{ id, type: 'lighter_plan', accept: true }]);
    expect(body.results).toEqual([{ id, ok: false, code: 'no_lighter_plan' }]);
    expect(body.state.lighterPlan).toBeNull();
  });
});
```

(The full check-in flow needs a day to end; the database tests (Task 3) and the unit tests (Tasks 5–6) cover it, and
the emulator check (Task 16) runs it end to end.)

- [ ] **Step 3: Static checks.**

Run: `npm run check:functions`, `npm -w supabase run typecheck`, `npm -w supabase test`
Expected: PASS. (Never a bare `npx vitest run` in `supabase/`: it runs the live project.)

- [ ] **Step 4: Commit.**

```bash
git add supabase
git commit -m "M7a T7: lmu-sync closes ended days before a check-in answer; live tests for the check-in and the lighter plan (11 players)"
```

## Task 8: DEPLOY (needs the owner's yes)

- [ ] **Step 1:** Ask the owner (batched with anything else pending). On a yes:

```bash
npm run db:deploy
npm run db:test
npm run deploy:functions
npm run test:live
```

Expected: 0011 applied (the wedding's migration history unchanged); `db:test` passes with the new tests
(`test_adjust_checkin`, `test_adjust_second_wind`, `test_advance_replays_and_settles`) and nothing left behind;
the three functions ACTIVE; `test:live` all pass with 11 players; the leftovers check finds no test player.

- [ ] **Step 2:** Record the result in this plan's "As built" (versions, counts, times).

## Task 9: Phone — notices, the cache, the projection, a light offline day

**Files:**
- Modify: `apps/mobile/src/game/notices.ts`, `apps/mobile/src/data/local.ts`, `apps/mobile/src/game/project.ts`,
  `apps/mobile/src/game/types.ts`, `apps/mobile/src/game/offlineDay.ts`
- Test: `apps/mobile/test/support/fixtures.ts`, `apps/mobile/test/project.test.ts`, `apps/mobile/test/offlineDay.test.ts`,
  `apps/mobile/test/notices.test.ts`, `apps/mobile/test/local.test.ts`

- [ ] **Step 1: The fixture.** In `apps/mobile/test/support/fixtures.ts` (import `pendingCheckin` from the server
  fixtures and the type `PendingCheckin` from the server's `state.ts`):

```ts
/**
 * M7a: day 2 with a check-in waiting for day 1 (push-0 missed; check-in id 7), the streak paused at 4 (best 6, one
 * shield). `slots` changes day 2's quests (Second Wind needs a day without push).
 */
export function checkinState(
  over: Partial<PendingCheckin> = {},
  character: Partial<CharacterRow> = {},
  slots: { core: string; side1: string; side2: string } = DAY_TWO_SLOTS,
): ServerState {
  const snapshot = dayTwoSnapshot(slots, {
    ladders: ladderRows({ push: newLadder(1) }),
    checkin: pendingCheckin(over),
    character: characterRow({ awaiting_checkin: true, streak_current: 4, streak_best: 6, shields: 1, ...character }),
  });
  return stateView(snapshot, dayOffers(snapshot, LIBRARY), historyOf(snapshot));
}

/** A day 2 without push-1, so Second Wind can redo day 1's push-0. */
export const SECOND_WIND_SLOTS = { core: 'walk-1', side1: 'mobility-0', side2: 'reading-0' } as const;
```

- [ ] **Step 2: Write the failing tests.** Append to `apps/mobile/test/project.test.ts`:

```ts
describe('the check-in on its way (M7a decision 10)', () => {
  const checkin = (answer: CheckinAnswer, checkinId = 7): PhoneEvent =>
    ({ id: '00000000-0000-4000-8000-0000000000c1', type: 'checkin', checkinId, answer, secondWind: false });
  const lighter = (accept: boolean): PhoneEvent => ({ id: '00000000-0000-4000-8000-0000000000c2', type: 'lighter_plan', accept });

  it('a protected answer resolves it at once: no card, the streak goes on', () => {
    const shown = project(checkinState(), [checkin('emergency')]);
    expect(shown.checkin).toBeNull();
    expect(shown.character.streak.awaitingCheckin).toBe(false);
    expect(shown.answering).toBe(true);
  });

  it('"I just didn\'t" holds the streak until the recovery quest arrives', () => {
    const shown = project(checkinState(), [checkin('just_didnt')]);
    expect(shown.checkin).toMatchObject({ id: 7, answer: 'just_didnt', secondWind: null });
    expect(shown.character.streak.awaitingCheckin).toBe(true);
    expect(project(checkinState(), []).answering).toBe(false);
  });

  it('injured rests the missed exercise; too hard eases its ladder; sick makes the next day light', () => {
    expect(project(checkinState(), [checkin('injured')])).toMatchObject({ paused: ['push'], ladderChanges: [{ key: 'push', change: 'pain' }] });
    expect(project(checkinState(), [checkin('too_hard')]).ladderChanges).toEqual([{ key: 'push', change: 'step_down' }]);
    expect(project(checkinState(), [checkin('sick')]).character.nextDayLight).toBe(true);
  });

  it('a lighter load or an accepted lighter plan drops the minutes one step; "keep my plan" quiets the offer', () => {
    expect(project(checkinState(), [checkin('lighter_load')])).toMatchObject({
      profile: { minutesPerDay: 15 }, lighterPlan: { from: 15, to: 10, offered: false },
    });
    expect(project(checkinState(), [lighter(true)])).toMatchObject({ profile: { minutesPerDay: 15 }, lighterPlan: { from: 15, to: 10 } });
    expect(project(checkinState(), [lighter(false)])).toMatchObject({
      profile: { minutesPerDay: 25 }, lighterPlan: { from: 25, to: 15, offered: false },
    });
  });

  it('an answer for another check-in changes nothing', () => {
    expect(project(checkinState(), [checkin('sick', 8)]).checkin).toMatchObject({ id: 7, answer: null });
  });
});
```

Append to `apps/mobile/test/offlineDay.test.ts` a test in the file's style: the cached state with
`character.nextDayLight: true` (set on the `ServerState` the test builds from) gives an event with `light: true` and
the budget `LIGHT_DAY_MINUTES` (rules), and without it `light: false`.

In `apps/mobile/test/local.test.ts`, the migration count it asserts (5) becomes 6, if it asserts one.

- [ ] **Step 3: Run and see them fail.**

Run: `npm -w apps/mobile test -- project offlineDay notices local`
Expected: FAIL (`answering` undefined; the check-in unchanged).

- [ ] **Step 4: Implement.**

`apps/mobile/src/game/notices.ts`, at the end of `TEXT`:

```ts
  already_answered: 'That check-in was already answered.',
  no_lighter_plan: 'Your plan is already at its lightest: 10 minutes a day.',
```

`apps/mobile/src/data/local.ts`, a sixth migration:

```ts
  // M7a: the state gained the check-in, its result and the lighter plan; an older copy would break Today until the first
  // sync, so it goes (the outbox stays).
  `delete from cache where key = 'state';`,
```

`apps/mobile/src/game/types.ts`: export `CheckinView = NonNullable<ServerState['checkin']>`,
`LighterView = ServerState['lighterPlan']`, `MissOutcome = NonNullable<ServerState['checkinResult']>['outcome']`.

`apps/mobile/src/game/project.ts`:
  - Header comment, add: "M7a: a check-in answer shows at once (the card goes, or the streak is held for the recovery
    quest the server adds); the lighter plan drops the minutes one step."
  - Imports: `checkinOutcome`, `lighterMinutes` from `@levelmeup/rules`.
  - `Shown` gains:

```ts
  /** A check-in answer is on its way (M7a): the recovery quest of "I just didn't" arrives with the sync. */
  answering: boolean;
```

  - Before `export function project`:

```ts
/** The lighter plan once the minutes are `minutes` (decision 9): the next step down, quiet for 14 days. */
function stepped(minutes: number): ServerState['lighterPlan'] {
  const to = lighterMinutes(minutes);
  return to === null ? null : { from: minutes, to, offered: false };
}
```

  - In `project`, beside the other `let`s: `let checkin = server.checkin;`, `let lighterPlan = server.lighterPlan;`,
    `let answering = false;`. In the loop, before `if (today === null) continue;`:

```ts
    if (event.type === 'checkin') {
      const asked = checkin;
      if (asked === null || asked.id !== event.checkinId || asked.answer !== null) continue;
      const outcome = checkinOutcome(event.answer);
      answering = true;
      if (outcome.resolution === 'protected') {
        checkin = null;
        character = { ...character, streak: { ...character.streak, awaitingCheckin: false } };
      } else {
        checkin = { ...asked, answer: 'just_didnt', secondWind: null };
      }
      const missed = asked.core === null ? undefined : findTemplate(LIBRARY, asked.core);
      if (outcome.pauseLadder && missed !== undefined && missed.exercise !== null) {
        const key = painKey(missed);
        if (!paused.includes(key)) paused = [...paused, key].sort();
        ladderChanges.push({ key, change: 'pain' });
      }
      if (outcome.stepDownLadder && asked.ladder !== null) ladderChanges.push({ key: asked.ladder, change: 'step_down' });
      if (outcome.reduceDailyMinutes && lighterPlan !== null) {
        profile = { ...profile, minutesPerDay: lighterPlan.to };
        lighterPlan = stepped(lighterPlan.to);
      }
      if (outcome.lighterTomorrow) character = { ...character, nextDayLight: true };
      continue;
    }
    if (event.type === 'lighter_plan') {
      if (lighterPlan === null) continue;
      if (event.accept) profile = { ...profile, minutesPerDay: lighterPlan.to };
      lighterPlan = event.accept ? stepped(lighterPlan.to) : { ...lighterPlan, offered: false };
      continue;
    }
```

  - The return adds `checkin, lighterPlan, answering`.

`apps/mobile/src/game/offlineDay.ts`: the `DayInput`'s `light: next.comeback` becomes
`light: next.comeback || shown.character.nextDayLight` (a "sick" or "injured" answer, M7a decision 6: the server builds
the same light day, so it keeps the phone's).

- [ ] **Step 5: Run and see them pass.**

Run: `npm -w apps/mobile test` and `npm -w apps/mobile run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/mobile
git commit -m "M7a T9: phone - check-in and lighter-plan events in the projection, notices, cache 6, a light offline day"
```

## Task 10: Phone — the store: "Later", and the result seen once

**Files:**
- Modify: `apps/mobile/src/state/store.ts`, `apps/mobile/app/_layout.tsx`, `apps/mobile/test/support/store.ts`
- Test: `apps/mobile/test/store.test.ts`

- [ ] **Step 1: Write the failing tests.** Append to `apps/mobile/test/store.test.ts` (with the file's `setup` helper):

```ts
describe('the check-in on this phone (M7a decision 10)', () => {
  it('"Later" hides a check-in until the app is opened again', async () => {
    const { store } = await setup([]);
    store.getState().answerLater(7);
    expect(store.getState().checkinLater).toBe(7);
    store.getState().reopen();
    expect(store.getState().checkinLater).toBeNull();
  });

  it('a result the player has seen stays seen after a restart, and goes with the character', async () => {
    const { store, deps, kv } = await setup([]);
    await store.getState().boot();
    await store.getState().dismissCheckinResult(9);
    expect(kv.get(CHECKIN_RESULT_KEY)).toBe('9');
    const again = createGameStore(deps);
    await again.getState().boot();
    expect(again.getState().checkinResultSeen).toBe(9);
    await again.getState().startOver();
    expect(kv.has(CHECKIN_RESULT_KEY)).toBe(false);
    again.getState().stop();
  });
});
```

(Adapt the `setup` call and the `kv` map's API to the file's helper: it returns `{ store, deps, kv }` with `kv` a
`Map`.)

- [ ] **Step 2: Run and see them fail.** Run: `npm -w apps/mobile test -- store`. Expected: FAIL.

- [ ] **Step 3: Implement** in `apps/mobile/src/state/store.ts`:
  - `export const CHECKIN_RESULT_KEY = 'lmu.checkin-result';`
  - `GameState` gains:

```ts
  /** M7a: the check-in put off with "Later": hidden until the app is next opened (decision 10). */
  checkinLater: number | null;
  /** M7a: the last check-in result the player dismissed (kept on the phone). */
  checkinResultSeen: number | null;
  answerLater: (checkinId: number) => void;
  /** The app came back to the foreground: a check-in put off with "Later" shows again. */
  reopen: () => void;
  dismissCheckinResult: (checkinId: number) => Promise<void>;
```

  - A reader beside `readVow`:

```ts
const readSeen = (text: string | null): number | null => {
  const n = Number(text);
  return text !== null && Number.isSafeInteger(n) ? n : null;
};
```

  - Initial state: `checkinLater: null, checkinResultSeen: null,`.
  - `boot`: read `deps.kv.getItem(CHECKIN_RESULT_KEY).catch(() => null)` with the others and set
    `checkinResultSeen: readSeen(seen), checkinLater: null`.
  - `forget`: `await deps.kv.removeItem(CHECKIN_RESULT_KEY);` and `checkinResultSeen: null, checkinLater: null` in its `set`.
  - Actions:

```ts
      answerLater: (checkinId) => set({ checkinLater: checkinId }),

      reopen: () => set({ checkinLater: null }),

      dismissCheckinResult: async (checkinId) => {
        set({ checkinResultSeen: checkinId });
        await deps.kv.setItem(CHECKIN_RESULT_KEY, String(checkinId)).catch(() => {});
      },
```

  In `apps/mobile/app/_layout.tsx`, the foreground listener becomes:

```ts
      if (state === 'active') {
        store.getState().reopen();
        void store.getState().syncNow();
      }
```

  In `apps/mobile/test/support/store.ts`, `testStore` gains `checkinLater: null, checkinResultSeen: null,
  answerLater: jest.fn(), reopen: jest.fn(), dismissCheckinResult: jest.fn(async () => {}),`.

- [ ] **Step 4: Run and see them pass.** Run: `npm -w apps/mobile test` and `npm -w apps/mobile run typecheck`.

- [ ] **Step 5: Commit.**

```bash
git add apps/mobile
git commit -m "M7a T10: phone store - Later until the next open, the check-in result seen once"
```

## Task 11: Phone — the check-in screen

**Files:**
- Create: `apps/mobile/src/game/checkin.ts`, `apps/mobile/src/screens/Checkin.tsx`, `apps/mobile/app/checkin.tsx`
- Test: `apps/mobile/test/checkin.test.ts` (new), `apps/mobile/test/checkin-screen.test.tsx` (new)

- [ ] **Step 1: Write the failing tests.** `apps/mobile/test/checkin.test.ts`:

```ts
/** @jest-environment node */
import { CHECKIN_TEXT, fillText } from '@levelmeup/content';
import { answerLine, checkinLead, resultText, streakNote } from '../src/game/checkin.ts';
import { project } from '../src/game/project.ts';
import { checkinState } from './support/fixtures.ts';

const T = CHECKIN_TEXT;

describe('the check-in words (M7a)', () => {
  const shown = project(checkinState(), []);
  const checkin = shown.checkin!;

  it('names yesterday, an earlier day (its date, "Sat 10 Oct"), or the away days', () => {
    expect(checkinLead(checkin, 2)).toBe(T.leadYesterday);
    expect(checkinLead(checkin, 3)).toMatch(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}'s core quest/);
    expect(checkinLead({ ...checkin, gap: true, from: 3, to: 5, date: null }, 6)).toBe(fillText(T.leadGap, { days: 3 }));
    expect(checkinLead({ ...checkin, gap: true, from: 3, to: 3, date: null }, 4)).toBe(T.leadGapOne);
  });

  it('says only "Streak paused" when an answer has nothing more to do', () => {
    expect(answerLine('too_hard', checkin, shown.lighterPlan)).toBe(T.answers.too_hard.outcome);
    expect(answerLine('too_hard', { ...checkin, ladder: null }, shown.lighterPlan)).toBe(T.pausedOnly);
    expect(answerLine('lighter_load', checkin, null)).toBe(T.pausedOnly);
  });

  it('tells how a miss was settled, with the best streak after a reset', () => {
    expect(resultText('recovered', 6)).toBe(T.result.recovered);
    expect(resultText('reset', 6)).toBe(fillText(T.result.reset, { best: 6 }));
  });

  it('marks the streak paused, then held today', () => {
    expect(streakNote(shown)).toBe(T.streakPaused);
    expect(streakNote({ ...shown, checkin: { ...checkin, answer: 'just_didnt' } })).toBe(T.streakHeld);
    expect(streakNote(project(checkinState({}, { awaiting_checkin: false }), []))).toBeNull();
  });
});
```

`apps/mobile/test/checkin-screen.test.tsx`:

```tsx
import { CHECKIN_TEXT } from '@levelmeup/content';
import { cumulativeXpForLevel } from '@levelmeup/rules';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Checkin } from '../src/screens/Checkin.tsx';
import { SECOND_WIND_SLOTS, checkinState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const T = CHECKIN_TEXT;

async function open(state = checkinState()) {
  const store = testStore({ view: project(state, []) });
  const onDone = jest.fn();
  await render(withStore(store, <Checkin onDone={onDone} />));
  return { store, onDone };
}

describe('the check-in screen (board F1)', () => {
  it('asks the question with the five answers and what each does', async () => {
    await open();
    expect(screen.getByText(T.title)).toBeTruthy();
    for (const key of ['sick_or_injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt'] as const) {
      expect(screen.getByText(T.answers[key].label)).toBeTruthy();
    }
    expect(screen.getByText(T.answers.too_hard.outcome)).toBeTruthy();
  });

  it('"I just didn\'t" sends the answer and goes back to Today', async () => {
    const { store, onDone } = await open();
    await fireEvent.press(screen.getByText(T.answers.just_didnt.label));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin', checkinId: 7, answer: 'just_didnt', secondWind: false });
    expect(onDone).toHaveBeenCalled();
  });

  it('"sick or injured" asks which before it can be sent', async () => {
    const { store } = await open();
    await fireEvent.press(screen.getByText(T.answers.sick_or_injured.label));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(T.injured));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin', checkinId: 7, answer: 'injured', secondWind: false });
  });

  it('offers Second Wind when the server does', async () => {
    const { store } = await open(checkinState({}, { xp_strength: cumulativeXpForLevel(5) }, SECOND_WIND_SLOTS));
    await fireEvent.press(screen.getByText(T.answers.just_didnt.label));
    await fireEvent.press(screen.getByText(/^Second Wind: redo /));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin', checkinId: 7, answer: 'just_didnt', secondWind: true });
  });

  it('"Answer later" puts it off and goes back', async () => {
    const { store, onDone } = await open();
    await fireEvent.press(screen.getByText(T.later));
    expect(store.getState().answerLater).toHaveBeenCalledWith(7);
    expect(onDone).toHaveBeenCalled();
  });

  it('says so when nothing waits for an answer', async () => {
    await open(checkinState({ answer: 'just_didnt' }));
    expect(screen.getByText(T.gone)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and see them fail.** Run: `npm -w apps/mobile test -- checkin`. Expected: FAIL (modules missing).

- [ ] **Step 3: The helpers** `apps/mobile/src/game/checkin.ts`:

```ts
// The check-in's words for this player (M7a, board F1): which day it asks about, what each answer does here, how a settled
// miss ended, and the streak's note. Pure.
import { CHECKIN_TEXT, fillText } from '@levelmeup/content';
import { dateKeyLabel } from '../lib/dates.ts';
import type { Shown } from './project.ts';
import type { CheckinView, LighterView, MissOutcome } from './types.ts';

const T = CHECKIN_TEXT;

/** The five answers on the board, in order; "sick or injured" asks which afterwards. */
export type CheckinChoice = keyof typeof CHECKIN_TEXT.answers;
export const CHECKIN_CHOICES: readonly CheckinChoice[] = ['sick_or_injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt'];

/** "Yesterday's core quest wasn't cleared…", the day's date, or the away days. `today` is the running day's number. */
export function checkinLead(c: CheckinView, today: number | null): string {
  if (c.gap) {
    const days = c.to - c.from + 1;
    return days === 1 ? T.leadGapOne : fillText(T.leadGap, { days });
  }
  if (today !== null && c.from === today - 1) return T.leadYesterday;
  return c.date === null ? T.leadYesterday : fillText(T.lead, { day: dateKeyLabel(c.date) });
}

/** The line under an answer: what it does here ("Streak paused" when the day has no ladder, or the minutes can't drop). */
export function answerLine(choice: CheckinChoice, c: CheckinView, lighter: LighterView): string {
  if (choice === 'too_hard' && c.ladder === null) return T.pausedOnly;
  if (choice === 'lighter_load' && lighter === null) return T.pausedOnly;
  return T.answers[choice].outcome;
}

/** How a settled "I just didn't" ended (decision 4). */
export function resultText(outcome: MissOutcome, best: number): string {
  return outcome === 'reset' ? fillText(T.result.reset, { best }) : T.result[outcome];
}

/** "paused" while a check-in waits, "held today" after "I just didn't", else null. */
export function streakNote(view: Pick<Shown, 'checkin' | 'character'>): string | null {
  if (view.checkin?.answer === 'just_didnt') return T.streakHeld;
  return view.character.streak.awaitingCheckin ? T.streakPaused : null;
}
```

- [ ] **Step 4: The screen** `apps/mobile/src/screens/Checkin.tsx`:

```tsx
// The missed-day check-in (spec §3.7, board F1; M7a decisions 3, 7): five answers, each with what it does here; "sick or
// injured" asks which, and "I just didn't" offers Second Wind when the server does. "Answer later" keeps it for the next
// open; the streak stays paused until then.
import { CHECKIN_TEXT, LIBRARY, authoredTemplate, fillText } from '@levelmeup/content';
import { findTemplate } from '@levelmeup/rules';
import type { CheckinAnswer } from '@levelmeup/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHECKIN_CHOICES, answerLine, checkinLead } from '../game/checkin.ts';
import type { CheckinChoice } from '../game/checkin.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';

const T = CHECKIN_TEXT;

export type CheckinProps = { onDone: () => void };

export function Checkin({ onDone }: CheckinProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const answerLater = useGame((s) => s.answerLater);
  const [choice, setChoice] = useState<CheckinChoice | null>(null);
  const [injured, setInjured] = useState<boolean | null>(null);
  const [secondWind, setSecondWind] = useState(false);
  const [busy, setBusy] = useState(false);
  const checkin = view?.checkin ?? null;

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 18 }}>
      {children}
    </ScreenScroll>
  );
  if (view === null || checkin === null || checkin.answer !== null) {
    return frame(
      <>
        <NarrationBox>{T.gone}</NarrationBox>
        <Button label={T.done} variant="secondary" onPress={onDone} />
      </>,
    );
  }

  const missed = checkin.core === null ? undefined : findTemplate(LIBRARY, checkin.core);
  const restsExercise = missed !== undefined && missed.exercise !== null;
  const redo = checkin.secondWind;
  const answer: CheckinAnswer | null =
    choice === null ? null
      : choice === 'sick_or_injured' ? (injured === null ? null : injured ? 'injured' : 'sick')
        : choice;
  const pick = (next: CheckinChoice) => {
    setChoice(next);
    setInjured(null);
    setSecondWind(false);
  };
  const send = async (): Promise<void> => {
    if (answer === null || busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'checkin', checkinId: checkin.id, answer, secondWind: answer === 'just_didnt' && secondWind });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };

  return frame(
    <>
      <NarrationBox>{T.title}</NarrationBox>
      <Body tone="chalk">{checkinLead(checkin, view.today?.dayNumber ?? null)}</Body>
      <View style={{ gap: 10 }}>
        {CHECKIN_CHOICES.map((c) => (
          <OptionCard key={c} label={T.answers[c].label} detail={answerLine(c, checkin, view.lighterPlan)} selected={choice === c} onPress={() => pick(c)} />
        ))}
      </View>
      {choice === 'sick_or_injured' && (
        <View style={{ gap: 10 }}>
          <Title>{T.which}</Title>
          <OptionCard label={T.sick} selected={injured === false} onPress={() => setInjured(false)} />
          <OptionCard label={T.injured} detail={restsExercise ? T.injuredNote : undefined} selected={injured === true} onPress={() => setInjured(true)} />
        </View>
      )}
      {choice === 'just_didnt' && redo !== null && (
        <View style={{ gap: 10 }}>
          <Title>{T.how}</Title>
          <OptionCard label={T.recovery} selected={!secondWind} onPress={() => setSecondWind(false)} />
          <OptionCard
            label={fillText(T.secondWind, { quest: authoredTemplate(redo.templateId).voice[view.profile.voice].title })}
            selected={secondWind}
            onPress={() => setSecondWind(true)}
          />
        </View>
      )}
      <Button label={T.answer} variant="commitment" disabled={answer === null || busy} onPress={() => void send()} />
      <Button label={T.later} variant="secondary" onPress={() => { answerLater(checkin.id); onDone(); }} />
      <Small tone="chalk">{T.laterNote}</Small>
    </>,
  );
}
```

The route `apps/mobile/app/checkin.tsx`, in the style of `app/book.tsx`:

```tsx
import { goBack } from '../src/lib/navigation.ts';
import { Checkin } from '../src/screens/Checkin.tsx';

export default function CheckinRoute() {
  return <Checkin onDone={goBack} />;
}
```

- [ ] **Step 5: Run and see them pass.** Run: `npm -w apps/mobile test` and `npm -w apps/mobile run typecheck`.

- [ ] **Step 6: Commit.**

```bash
git add apps/mobile
git commit -m "M7a T11: phone - the check-in screen (five answers, sick or injured, Second Wind, answer later)"
```

## Task 12: Phone — Today: the card, the held streak, the result, the lighter plan; the rest limit; Quest cleared

**Files:**
- Create: `apps/mobile/src/screens/CheckinNotes.tsx`
- Modify: `apps/mobile/src/screens/Today.tsx`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/dev/offline.tsx`,
  `apps/mobile/src/screens/DayActions.tsx`, `apps/mobile/src/quest/cleared.ts`, `apps/mobile/src/screens/quest/Cleared.tsx`
- Test: `apps/mobile/test/screens.test.tsx`, `apps/mobile/test/adjust.test.tsx`, `apps/mobile/test/cleared.test.ts`

- [ ] **Step 1: Write the failing tests.** In `apps/mobile/test/screens.test.tsx`, give `renderToday` an `onCheckin`
  (a `jest.fn()` it returns) and append:

```tsx
describe('Today after a missed day (M7a)', () => {
  const T = CHECKIN_TEXT;

  it('asks the check-in, shows the streak paused, and opens the check-in screen', async () => {
    const { store, onCheckin } = await renderToday(testStore({ view: project(checkinState(), []) }), DAY_TWO_NOW);
    expect(screen.getByText(T.title)).toBeTruthy();
    expect(screen.getByText(T.leadYesterday)).toBeTruthy();
    expect(screen.getByText(`day streak · ${T.streakPaused}`)).toBeTruthy();
    await fireEvent.press(screen.getByText(T.open));
    expect(onCheckin).toHaveBeenCalled();
    await fireEvent.press(screen.getByText(T.openLater));
    expect(store.getState().answerLater).toHaveBeenCalledWith(7);
  });

  it('hides a check-in put off with "Later"', async () => {
    await renderToday(testStore({ view: project(checkinState(), []), checkinLater: 7 }), DAY_TWO_NOW);
    expect(screen.queryByText(T.title)).toBeNull();
  });

  it('holds the streak after "I just didn\'t" and says the recovery quest is on its way', async () => {
    const answer = { id: '00000000-0000-4000-8000-0000000000c1', type: 'checkin' as const, checkinId: 7, answer: 'just_didnt' as const, secondWind: false };
    await renderToday(testStore({ view: project(checkinState(), [answer]) }), DAY_TWO_NOW);
    expect(screen.getByText(T.held)).toBeTruthy();
    expect(screen.getByText(T.waiting)).toBeTruthy();
    expect(screen.getByText(`day streak · ${T.streakHeld}`)).toBeTruthy();
  });

  it('shows a settled miss once', async () => {
    const state = { ...checkinState(), checkin: null, checkinResult: { id: 9, outcome: 'shield' as const } };
    const { store } = await renderToday(testStore({ view: project(state, []) }), DAY_TWO_NOW);
    expect(screen.getByText(T.result.shield)).toBeTruthy();
    await fireEvent.press(screen.getByText(T.done));
    expect(store.getState().dismissCheckinResult).toHaveBeenCalledWith(9);
    await renderToday(testStore({ view: project(state, []), checkinResultSeen: 9 }), DAY_TWO_NOW);
    expect(screen.queryByText(T.result.shield)).toBeNull();
  });

  it('offers the lighter plan when the state does, both ways', async () => {
    const state = { ...checkinState(), checkin: null, lighterPlan: { from: 25, to: 15, offered: true } };
    const { store } = await renderToday(testStore({ view: project(state, []) }), DAY_TWO_NOW);
    expect(screen.getByText(fillText(LIGHTER_TEXT.offer, { from: 25, to: 15 }))).toBeTruthy();
    await fireEvent.press(screen.getByText(LIGHTER_TEXT.decline));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'lighter_plan', accept: false });
  });
});
```

In `apps/mobile/test/adjust.test.tsx` (the DayActions tests), add: with `restAllowed: false` and
`lighterPlan: { from: 25, to: 15, offered: false }` on the view, the rest panel shows `ADJUST_TEXT.rest.limit` and the
button `fillText(LIGHTER_TEXT.restLimit, { from: 25, to: 15 })`, which enqueues `{ type: 'lighter_plan', accept: true }`;
with `lighterPlan: null` it shows no button.

In `apps/mobile/test/cleared.test.ts`, add: `clearedSummary` of a recovery quest gives `recovered: true`, of the core
`recovered: false` (build the after-shot by adding a `recovery` slot quest to the fixture's quests, as the file does for
other slots).

- [ ] **Step 2: Run and see them fail.** Run: `npm -w apps/mobile test -- screens adjust cleared`. Expected: FAIL.

- [ ] **Step 3: Today's notes** `apps/mobile/src/screens/CheckinNotes.tsx`:

```tsx
// Today's part of the check-in (M7a, board F3 without the Pact's parts): a settled "I just didn't" once, the question while
// a check-in waits (unless put off with "Later"), the held streak, and the lighter-plan offer.
import { CHECKIN_TEXT, LIGHTER_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import { checkinLead, resultText } from '../game/checkin.ts';
import type { Shown } from '../game/project.ts';
import { useGame } from '../state/store.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { Small } from '../ui/Text.tsx';

const T = CHECKIN_TEXT;

export type CheckinNotesProps = { view: Shown; onCheckin: () => void };

export function CheckinNotes({ view, onCheckin }: CheckinNotesProps) {
  const enqueue = useGame((s) => s.enqueue);
  const later = useGame((s) => s.checkinLater);
  const answerLater = useGame((s) => s.answerLater);
  const seen = useGame((s) => s.checkinResultSeen);
  const dismissResult = useGame((s) => s.dismissCheckinResult);
  const { checkin, checkinResult: result, lighterPlan } = view;
  return (
    <>
      {result !== null && result.id !== seen && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{resultText(result.outcome, view.character.streak.best)}</NarrationBox>
          <Button label={T.done} variant="secondary" onPress={() => void dismissResult(result.id)} />
        </View>
      )}
      {checkin !== null && checkin.answer === null && checkin.id !== later && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{T.title}</NarrationBox>
          <Small tone="chalk">{checkinLead(checkin, view.today?.dayNumber ?? null)}</Small>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Button label={T.open} onPress={onCheckin} />
            <Button label={T.openLater} variant="secondary" onPress={() => answerLater(checkin.id)} />
          </View>
        </View>
      )}
      {checkin !== null && checkin.answer === 'just_didnt' && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{T.held}</NarrationBox>
          {view.answering && <Small tone="chalk">{T.waiting}</Small>}
        </View>
      )}
      {lighterPlan !== null && lighterPlan.offered && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{fillText(LIGHTER_TEXT.offer, { from: lighterPlan.from, to: lighterPlan.to })}</NarrationBox>
          <Button label={LIGHTER_TEXT.accept} onPress={() => void enqueue({ type: 'lighter_plan', accept: true })} />
          <Button label={LIGHTER_TEXT.decline} variant="secondary" onPress={() => void enqueue({ type: 'lighter_plan', accept: false })} />
        </View>
      )}
    </>
  );
}
```

- [ ] **Step 4: Today.** In `apps/mobile/src/screens/Today.tsx`:
  - Header comment: "… M6b adds the day's adjustments (DayActions.tsx); M7a the check-in (CheckinNotes.tsx). …"
  - `TodayProps` gains `/** The check-in screen (M7a). */ onCheckin: () => void;` and the function takes it.
  - Imports: `CheckinNotes`, `streakNote` from `../game/checkin.ts`.
  - The streak's caption: `<Small tone="chalk">{note === null ? 'day streak' : `day streak · ${note}`}</Small>` with
    `const note = streakNote(view);` computed inside the `view !== null` block (or above, guarded).
  - In the gutter `View`, after the training notice and before `{noticeBoxes}`:
    `{view !== null && <CheckinNotes view={view} onCheckin={onCheckin} />}`.

  In `apps/mobile/app/(tabs)/index.tsx`: `onCheckin={() => router.push('/checkin')}`. In `apps/mobile/app/dev/offline.tsx`:
  `onCheckin={() => {}}`, and its store gains `checkinLater: null, checkinResultSeen: null, answerLater: () => {},
  reopen: () => {}, dismissCheckinResult: noop`.

- [ ] **Step 5: The rest limit.** In `apps/mobile/src/screens/DayActions.tsx`, import `LIGHTER_TEXT`; `panelFor` takes
  `lighter: Shown['lighterPlan']` as a third argument (the call passes `view.lighterPlan`), and its `plan_rest` case
  becomes:

```ts
    case 'plan_rest':
      if (today.restAllowed) return { text: T.rest.explain, send: { label: T.rest.confirm, event: { type: 'plan_rest', dayId: today.id } } };
      // M7a decision 9: over the rest limit, a lighter plan is the other way.
      return {
        text: T.rest.limit,
        send: lighter === null
          ? null
          : { label: fillText(LIGHTER_TEXT.restLimit, { from: lighter.from, to: lighter.to }), event: { type: 'lighter_plan', accept: true } },
      };
```

- [ ] **Step 6: Quest cleared.** In `apps/mobile/src/quest/cleared.ts`, `ClearedNumbers` gains
  `/** The recovery quest: the day is taken back when today ends (M7a). */ recovered: boolean;` and the return
  `recovered: quest.slot === 'recovery',`. In `apps/mobile/src/screens/quest/Cleared.tsx`, after the streak row:
  `{numbers.recovered && <Body tone="chalk">{C.recovered}</Body>}` (import `Body` if the file doesn't).

- [ ] **Step 7: Run and see them pass.** Run: `npm -w apps/mobile test` and `npm -w apps/mobile run typecheck`.

- [ ] **Step 8: Commit.**

```bash
git add apps/mobile
git commit -m "M7a T12: Today - the check-in card, held streak, result once, lighter-plan offer; rest limit offers it; recovery line"
```

## Task 13: Phone — the class path and a developer preview

**Files:**
- Create: `apps/mobile/app/dev/checkin.tsx`
- Modify: `apps/mobile/app/dev/index.tsx`
- Test: `apps/mobile/test/character.test.ts`

- [ ] **Step 1: The class path test.** In `apps/mobile/test/character.test.ts`, replace the expectation that Second Wind
  is `later` with:

```ts
  it('Second Wind and Unbreakable are ready or cooling down since M7a; Insight still arrives later', () => {
    expect(abilityStatus('second_wind', 'warrior', 5, null, 3)).toEqual({ kind: 'ready' });
    expect(abilityStatus('second_wind', 'warrior', 5, 3, 6)).toEqual({ kind: 'cooldown', days: 4 });
    expect(abilityStatus('unbreakable', 'warrior', 10, 2, 10)).toEqual({ kind: 'cooldown', days: 22 });
    expect(abilityStatus('insight', 'mage', 5, null, 3)).toEqual({ kind: 'later' });
  });
```

Run: `npm -w apps/mobile test -- character`. Expected: PASS (Task 2 changed `ABILITIES_LATER`).

- [ ] **Step 2: The preview** `apps/mobile/app/dev/checkin.tsx`:

```tsx
// Development only (M7a): Today with a made-up check-in for yesterday, and the check-in screen, in a store of their own.
// Nothing is sent, so the words and the flow can be checked on a device without missing a day.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { project } from '../../src/game/project.ts';
import { Checkin } from '../../src/screens/Checkin.tsx';
import { Today } from '../../src/screens/Today.tsx';
import { GameProvider, useGame } from '../../src/state/store.ts';
import type { GameState } from '../../src/state/store.ts';
import { colors, space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { NarrationBox } from '../../src/ui/NarrationBox.tsx';

const noop = async () => {};

export default function CheckinPreview() {
  const insets = useSafeAreaInsets();
  const cached = useGame((s) => s.cached);
  const art = useGame((s) => s.art);
  const [screen, setScreen] = useState<'today' | 'checkin'>('today');
  const store = useMemo(() => {
    const state = cached?.state;
    if (state === undefined || state.today === null) return null;
    const core = state.today.quests.find((q) => q.slot === 'core') ?? null;
    const yesterday = Math.max(1, state.today.dayNumber - 1);
    const view = project({
      ...state,
      character: { ...state.character, streak: { ...state.character.streak, awaitingCheckin: true } },
      checkin: {
        id: -1, from: yesterday, to: yesterday, gap: false, date: null, core: core?.templateId ?? null, ladder: core?.ladder ?? null,
        answer: null, secondWind: null,
      },
      lighterPlan: state.lighterPlan === null ? null : { ...state.lighterPlan, offered: true },
    }, []);
    return createStore(() => ({
      phase: 'ready', view, art, status: 'idle', notices: [], signInLost: false, trainingNoticeSeen: true, lastSyncedAt: null,
      checkinLater: null, checkinResultSeen: null,
      syncNow: noop, dismissNotice: noop, enqueue: noop, startOver: noop, dismissTrainingNotice: noop,
      answerLater: () => {}, reopen: () => {}, dismissCheckinResult: noop,
    })) as unknown as StoreApi<GameState>;
  }, [cached, art]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <NarrationBox>
          {store === null ? 'No day is cached yet: sync once, then open this preview.' : 'A made-up check-in for yesterday. Nothing is sent.'}
        </NarrationBox>
      </View>
      {store !== null && (
        <GameProvider store={store}>
          {screen === 'today'
            ? <Today onSettings={() => {}} onOpenQuest={() => {}} onSwap={() => {}} onPain={() => {}} onVanish={() => {}} onTraining={() => {}} onCheckin={() => setScreen('checkin')} />
            : <Checkin onDone={() => setScreen('today')} />}
        </GameProvider>
      )}
    </View>
  );
}
```

In `apps/mobile/app/dev/index.tsx`, beside "Offline day preview", add a link "Check-in preview" → `/dev/checkin`, in the
same form as the others.

- [ ] **Step 3: Checks.** Run: `npm -w apps/mobile test`, `npm -w apps/mobile run typecheck`, `npm run check:bundle`.
  Expected: PASS (the preview is development only, as M6e's).

- [ ] **Step 4: Commit.**

```bash
git add apps/mobile
git commit -m "M7a T13: class path shows Second Wind and Unbreakable; developer check-in preview"
```

## Task 14: Docs

- [ ] **Step 1:** Update, each a short factual addition:
  - MVP spec §2.5: Unbreakable "doesn't cost a shield or the streak" (decision 8); the "Limits count quest days…" bullet:
    "Unbreakable (M7a)" built. §3.7: a *Built in M7a (2026-10-12)* paragraph (the five answers on the phone with "sick
    or injured" asking which; protected answers resolve at once; "I just didn't" adds the recovery quest to the running
    day and is settled when it ends; Unbreakable automatic; Rise Again on a recovered day; "Later" until the next open;
    the result once; the lighter plan offered at most once every 14 days, and over the rest limit) and the reworded
    "delaying the answer changes nothing… except that two missed days in a row share one check-in while the first is
    unanswered (owner, M3)".
  - Architecture §4.3: the replay (`planAdvance`: waiting days applied in day order once no check-in is pending; a
    missed day or a jump in day numbers opens the next check-in) and the settled miss; §4.1: the `checkin` and
    `lighter_plan` events (adjustments; `lmu-sync` closes ended days before a check-in answer); §3: the `checkins`
    resolution columns, `next_day_light`, `lighter_plan_at` (migration 0011).
  - Roadmap: the milestone table's M7 row becomes three rows, **7a The check-in** (this plan, "Built …"), **7b Settings
    and notifications**, **7c Accountability** (from decision 1); the "Carried forward" rows this plan closes are
    marked done (M2 Unbreakable/recovery/`secondWindRedo`/history; M3 queue replay and the §3.7 rewording; M6a the
    phone sends the check-in; M6b the lighter plan's cooldown and the rest-limit offer; M6d Second Wind and Unbreakable
    on the class path; M6e the owner's offline question, answered no); new "Carried forward from M7a" rows: M7b (the
    late-rest notice; a tap time on `plan_rest`/`pain`; Settings raises the minutes again), M7c (consequences on "I just
    didn't", the note, the Shadow), M9 (the check-in's numbers in the pilot: answers chosen, recoveries).
  - `supabase/README.md`: migration 0011, live tests 11 players. `apps/mobile/README.md`: the check-in screen, the
    preview. `packages/rules/README.md`: the lighter plan's 14-day wait and `secondWindRedo` (in the decisions list).
  - `docs/device-verification-checklist.md`: a section "## M7a — The check-in" (same columns as M6e) with rows:
    1. After a day with the core quest undone, Today opens with "The day closed. What happened?", the lead names the
       day, and the streak reads "day streak · paused".
    2. "Later" hides the card; leaving the app and coming back shows it again.
    3. Each answer shows its line; "sick or injured" asks which; Answer returns to Today; after the sync the card is
       gone and the streak no longer paused.
    4. "I just didn't": Today says "Clear the recovery quest today…" (and "appears once the System has your answer"
       before the sync); after it, the recovery quest is under "Recovery", 5 minutes, Discipline +5; clearing it shows
       "You took the day back. Your streak holds when today ends."
    5. The next day: the result shows once (recovered, or the shield or reset line); *Rise Again* celebrates.
    6. "I need a lighter load": the next day has the fewer minutes.
    7. Second Wind (a Warrior at level 5 whose missed core quest was yesterday's): the choice names the quest; the
       recovery slot then holds it at full XP.
    8. The lighter-plan offer shows once; "Keep my plan" hides it, and it doesn't come back on the next open.
    9. Over the rest limit, the rest panel offers "Lighten the plan: 25 → 15 minutes a day".
    10. Character: Second Wind and Unbreakable read "Ready" or "Ready again in N days".
    11. At the largest font, the check-in screen and Today's card keep every word.
    12. The developer check-in preview shows the card and the screen; nothing is sent.
  - This plan: an "As built" section (filled during the build).

- [ ] **Step 2: Commit.**

```bash
git add docs packages/rules/README.md supabase/README.md apps/mobile/README.md
git commit -m "M7a T14: docs - spec 2.5/3.7, architecture, roadmap (M7 split, carried forward), READMEs, checklist"
```

## Task 15: Final checks and the code review

- [ ] **Step 1:** Run everything and record the counts:

```bash
npm test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
npm run pacing
```

Expected: all pass; pacing unchanged (M7a changes no quest, tier or ladder rule; a light day after "sick" is outside
the simulation).

- [ ] **Step 2:** Request the independent code review (superpowers:requesting-code-review) of `55931c5..HEAD` with
  this plan as the requirements. Focus: the replay's order and the "as if answered at once" rule, the settle before
  the recovery day, no double streak credit, Unbreakable without a shield, refusal paths, idempotency of `checkin`
  and `lighter_plan`, SQL guards (an answer only for this player's unanswered check-in; the recovery quest only on the
  named day), the phone projection matching the server, no shaming copy. Fix Critical and Important findings, re-review.

## Task 16: Emulator check (after Task 8)

- [ ] Run the checklist rows on the emulator with a test character whose core quest was missed on a real day
  (decision in "Remote steps"); rows 7 and 9 need a Warrior at level 5 or a rest limit, so they may stay for the Find
  X9. Record results and anything found in the checklist ("What the emulator found (M7a)"), fix, re-run.

## After the build

Merge order stays M5 → M6a → M6b → M6c → M6d → M6e → M7a after the owner's Find X9 checks; the branch is kept until
then. Next in the loop: M7b (Settings and notifications).

## As built

Built 2026-10-12 on `m7a-checkin` (from `m6e-offline-days` 55931c5), with the owner's "Yes to all, proceed" of
2026-10-12 for the build and its deploy.

| Task | Commit |
|---|---|
| T1 rules: the lighter plan and `secondWindRedo` | f7868c7 |
| T2 content: the check-in's words | 3daeda3 |
| T3 migration 0011 and its pgTAP tests | dda6e42 |
| T4 the check-in in the snapshot and the state | c99afaa |
| T5 the `checkin` and `lighter_plan` events, `planCheckin` | 4fe0b43 |
| T6 `planAdvance`: the replay and the settled miss | fa40265 |
| T7 `lmu-sync` and the live tests | 4ab7e29 |
| T9 the projection, notices, cache 6, the light offline day | c337326 |
| T10 the store | 35a780f |
| T11 the check-in screen | 739de01 |
| T12 Today, the rest limit, Quest cleared | c84297a |
| T13 the developer preview | 5f54aae |
| T14 docs | 2cbb016 |

### Changes from the plan

- The events unit test and the live batch test used `type: 'checkin'` as their "unsupported event" example; they now
  use `accountability_set` (M7c), since `checkin` is supported.
- Two tests that spread a snapshot into `planAdvance` (server `advance.test.ts`, app `offlineDay.test.ts`) pass
  `pending: snapshot.checkin`, as `lmu-sync` does.
- The live M7a block creates its player in its first test (the file's style) instead of `beforeAll`; the helper's
  comment now says 11 players.
- The recovery line on Quest cleared uses the ink tone: the panel is paper (the plan said chalk).
- The class-path test (Task 13 step 1) landed with Task 9: Task 2 had already made Second Wind and Unbreakable ready.
  The Today tests use a local `renderToday(store, at)`; the store tests use the file's `setup` helper; a cache test
  covers a version-5 install; a Quest cleared test checks the recovery line.
- Task 8 (the deploy) ran after the server's code review and its fixes, so only reviewed code went live (as in M6e).
- Decision 2 is refined: `lmu-sync` applies a batch's check-in answers after its other events (`applyOrder`), so a
  completion sent after an answer still lands before its day closes; the phone builds an offline day without the
  answers still on their way (`offlineView`), as the server will store it.

### Code review (2026-10-12): fixes

Two reviews (server Tasks 1–7, phone Tasks 9–14), both "With fixes"; the re-reviews confirmed the fixes (server
8a2b882, phone a6f7ac7 and 72304a4):
- **Critical:** an answer closed the ended days before the completions sent after it in the same sync, so they were
  refused (`day_closed`) and the day became a miss. Answers now apply last.
- The replay gave each of two missed days in a row its own check-in when they waited behind an earlier one; they now
  share it, as they would have if the first answer had come at once.
- A pgTAP test called `lmu_test.start(2)` inside a scan (once per row); it is called once.
- The offline day applied a queued answer's light day, rest or fewer minutes, which the server applies only after
  that day: it leaves them out now.
- Today tolerates a state from an older server (no check-in, result or lighter plan); one tap answers the
  lighter-plan offer (a double tap stepped the minutes twice); no stale or offline Second Wind; the streak caption
  wraps; a resolved check-in answered again is `already_answered`; `levelmeup.adjust` refuses the check-in's keys on
  other kinds, Second Wind outside an answer, and an answer resolved as anything but protected.
- Carried forward (roadmap "Carried forward from M7a"): the lighter-plan count for shared check-ins, an injury and
  today's quest of that exercise, an offline answer taking effect a day later, the notice words for two refusals,
  and boards F1/F3's header and recovery-first order.

### Deploy and device check (2026-10-12)

With the owner's "Yes to all, proceed" (2026-10-12), after the server review: `db:deploy` applied 0011 (the wedding's
history unchanged); `db:test` passed (adjust 74 assertions in 10 tests, functions 191 in 18, isolation 97, storage 6,
tables 206; nothing left behind); `deploy:functions` (v10, ACTIVE, 04:26 UTC); `test:live` 36 of 36; no test player
left. Emulator (test character Uma, after the deploy): rows 11 and 12 pass (the check-in preview: the card, "day
streak · paused", the five answers, "Which was it?", the Answer button waiting for a full answer; every word at font
scale 2.0; nothing sent). Rows 1–6 wait for Uma's real day boundary (08:00 UTC); rows 7, 9 and 10 need a Warrior at
level 5 or a used-up rest week (Find X9). Found: Metro's fast refresh of the cache migration file broke the running
app's database ("could not open its records") until it was restarted; development only (an update restarts the app).

Checks: content 1049, rules 447, server 328, app 604 tests; `typecheck`, `check:functions`, `check:portable` (198/72
exports), `check:bundle` (33 files, no secrets) pass; `npm run pacing` unchanged from M6c.


