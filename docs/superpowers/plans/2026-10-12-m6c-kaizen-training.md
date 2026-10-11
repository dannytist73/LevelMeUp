# M6c — Kaizen training — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strength quests become real workouts: short sessions of 3–4 exercises, built for the player's equipment and
program style (Men's / Women's / No preference) from an exercise library based on the owner's Kaizen material,
logged set by set, and growing in exercises, sets and difficulty as the player shows they're ready.

**Architecture:** The rules package gains a workout planner (`packages/rules/src/workout.ts`): a workout template
says how many sets each exercise gets and the hardest exercise level allowed; `planWorkout` picks the exercises for
the player (equipment, limitations, program day) from the library's moves and program layouts. The day builder
attaches the plan to the quest draft the way it attaches a Scholar's Path book, and the server stores it on the quest
instance as a `session` condition, so a later content change never rewrites a day. One ladder (`workout`) carries
the progression with the existing ladder rules. The player's equipment and program style are two new profile fields,
set in onboarding (a new "Training" step) and changed later from Settings through a new adjustment event
(`training`), which also re-plans today's open workout.

**Tech Stack:** as M6b (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14, Vitest, Deno 2.9,
TypeScript 6, pgTAP). No new dependencies, no new native modules (no EAS build), no new monthly cost.

**Specs:** MVP spec §1.1 (beat 4), §2.5, §3.1–3.5; architecture §3, §4.1–4.2; roadmap M6c row and the "Carried
forward" rows for M6c (quest art per exercise, M6a; hard-day titles, M6b); research `docs/research/kaizen-training.md`
and `docs/research/kaizen-videos.md` (committed 05531a3).

---

## Plain summary

M6c turns the strength quests into workouts. When it's done:

- In onboarding, after the body questions, the player says **what they can train with** (just their body, resistance
  bands, dumbbells, a bench, a pull-up bar, or a gym) and picks a **program**: Men's (more upper-body work), Women's
  (more legs and glutes) or No preference (an even mix). Anyone can pick any program. Both can be changed later in
  Settings → Training.
- On strength days the core quest is a **workout**: 3 exercises at first (2 sets each), chosen from about 50 exercises
  so that every one fits the player's equipment and avoids their reported limits. The quest screen lists each
  exercise with how to do it and a set-by-set log.
- Workouts **rotate** through the program's days (A, B, C, or A, B for No preference). A missed workout comes back
  next time.
- Workouts **grow on readiness**, like every ladder: harder exercises first (wall push-ups → incline push-ups →
  push-ups; machines → dumbbells → barbells), then more sets, then a fourth exercise. "Too hard" eases them, hard days
  shrink them to one set of the first two exercises, and "I felt pain" rests them.
- Players on 10 or 15 minutes a day keep the short single-exercise strength quests (a workout needs at least 16
  minutes); onboarding says so.
- Every exercise has a picture family, and the beginner exercises get their own pictures (the M6a art problem:
  "Wall push-ups" showed floor push-ups). Publishing the new pictures needs the owner's yes.
- Quest titles no longer name numbers, so a hard day never shows "Walk 5 minutes" for a 3-minute walk.

The exercise names, program layouts and rep ranges come from the Kaizen workout builders (facts); every instruction
is written in LevelMeUp's own words. The coaching videos' advice that's unsafe without a coach (training to failure,
aggressive diets, supplements, penalties) stays out.

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop. Earlier owner
choices (2026-10-11, AskUserQuestion): equipment plus program style (Men's / Women's / No preference); a fixed art set
in Supabase storage; the videos transcribed locally.

1. **Training setup = equipment + program style.** Equipment is a multi-select of `bands`, `dumbbells`, `bench`,
   `pullup_bar`, `gym` (a gym has everything), or "Just my body" (an empty list). Program style is `men`, `women` or
   `none`. They are profile fields (`profiles.equipment`, `profiles.program_style`; migration 0009), part of the
   rules' `PlayerProfile`. Defaults: no equipment, `none`.
2. **Onboarding asks on a new "Training" step** right after Body, shown only when strength work is possible (the
   player doesn't follow their own plan and the safety check is clear); otherwise the defaults are sent. The Rhythm
   step says when workouts won't fit (10 or 15 minutes a day), like its own-program note.
3. **The exercise library** (`packages/content/src/training/moves.ts`): 53 moves in 15 slots (the workout builder's
   substitution groups: horizontal push, incline push, chest, vertical push, horizontal pull, vertical pull, squat,
   quads, hip hinge, hamstrings/glutes, shoulders, biceps, triceps, abs, calves). Each move has its slots, a picture
   family (`push`, `press`, `pull`, `squat`, `hinge`, `core`, `isolation`), what it needs, a level (1 easy to 3: the
   bodyweight versions get harder, and every barbell lift is level 3), a rep or seconds range (the builders' ranges;
   ours for bodyweight moves), per side or not, contraindications, 2–3 steps and a form cue in our own words. The
   progress line comes from the kind of move: heavier weight, a stronger band, a slower lowering, or a longer hold.
4. **Programs** (`training/programs.ts`): Men's = the builder's 3-day men's layout; Women's = its 3-day women's layout;
   No preference = its 2-day layout, which both builders share. Each day lists 6 slots, most important first.
5. **Planning a workout** (`planWorkout`, rules): the program day is `workoutsDone mod days` (workouts completed so
   far, so a missed workout repeats). For each slot of that day, then of the days after it, it takes the best move the
   player can do: one that needs only what they have, has no contraindication they reported, is at most the
   template's level and isn't already in the session. Moves that use their equipment come before bodyweight ones (they
   told us what they own), then the higher level, then library order. It stops at the template's number of exercises;
   fewer than 2 means no workout today (the builder falls back to the single-exercise ladders).
6. **The workout ladder** (`workout`, strength, every class's affinity) has 6 rungs: rung 0 is 3 exercises × 2 sets at
   level 1 (16 minutes), rung 1 the same at level 2, rung 2 at level 3, rung 3 is 3 × 3 sets (23 minutes), rung 4 is
   4 × 3 (29), rung 5 is 4, 3, 3, 3 sets (32). Minutes = a 2-minute warm-up + 2.25 minutes a set (work and about 2
   minutes' rest). Rungs 0–2 are standard quests (20 XP), 3–5 major (30 XP). The hard-day version is one set of the
   first two exercises (7 minutes): the videos' minimum session for a low day. A 25-minute day fits rungs 0–2 (the core gets 21 minutes); 40 minutes fits all; 10 and 15 fit none.
   Starting rung: "Most weeks" starts at rung 1 (onboarding's training seed), everyone else at 0.
7. **Workouts lead the strength days.** The workout ladder is the only strength ladder with a class affinity, so a
   strength core quest is a workout whenever one fits; push-ups, squats and core training stay as side quests, swaps,
   and the strength quests of short days. A workout is full-body, so the day after one no strength ladder is built in
   any slot, and the core is walking or mobility (the existing after-strength rule).
8. **Stored as a session.** The quest draft carries the planned moves (`QuestDraft.moves`); the server stores
   `{ kind: 'session', moves: [{ move, unit, min, max, perSide, sets }] }` as the instance's condition and the minutes
   of the version in use. Hard day, swaps, Second Wind and offers re-draft from the stored moves.
9. **Logging:** completion type `reps`; the phone shows each exercise (name, "2 sets of 8–12 reps", how to do it, the
   form cue and progress line) with a counter per set starting at the bottom of the range, and sends every set in
   order (`{ sets: [...] }`). The server accepts a session log only with exactly the planned number of sets. Loads are
   advice, not logged (later).
10. **Progression** uses the existing ladder rules unchanged: 3 good sessions in 14 days step up (gentle 4, hard 2),
    at most once a week; "Too hard" offers a step down; missed workouts, time away and "I felt pain" behave as for
    every ladder. Pain on any exercise rests the whole workout ladder (conservative); the single-exercise ladders
    still offer strength work, and "Resume" brings workouts back one rung lower.
11. **Safety:** a gentle start, an own program or a 10–15-minute day never gets workouts (existing rules). Every
    move's contraindications follow the player's limits. Nothing says "to failure": every set ends with 1–2 good reps
    left. Barbell lifts are level 3 only and say "learn it with a light bar first" and "use the rack's safety bars".
12. **Changing the setup later:** Settings → Training sends `training` (equipment, program style). The planner
    re-plans today's open, unstarted workout with the new setup (same rung, same XP) and stores the profile; the next
    days use it. `levelmeup.adjust` gains the `training` change (migration 0009).
13. **Quest art per exercise** (M6a carried item): a session's picture is its first move's family (`move-push` …
    `move-isolation`); the bodyweight ladders' early rungs get their own (`push-wall`, `push-incline`, `push-knee`,
    `squat-chair`, `squat-split`, `core-dead-bug`, `core-side-plank`; sit-to-stands reuse `micro-strength`). 14 new
    pictures rendered with the M6a pipeline and published as `lmu-art/v3` (34 pictures and the manifest). The upload
    needs the owner's yes; until then the new keys draw the ink fallback.
14. **Hard-day titles** (M6b carried item): no quest title names a number (a test checks), so a hard day can't show
    the full version's minutes; the summary line carries the numbers.
15. **Pacing re-run:** the campaign personas train with no equipment and no preference. If a target fails, tune the
    workout content (minutes, tiers), not the level curve, and record the result.
16. **What waits:** load logging and per-exercise history; planned deload weeks (the videos say every 5–8 weeks for
    beginners; rungs rising only on readiness, hard days and step-downs cover it for now); a warm-up quest; a steps
    quest (+1,000 at a time); an evening fatigue check-in; choosing days a week; rest timers between sets; exercise
    demo videos. All go to the roadmap's carried-forward table.

## Remote steps (each needs the owner's yes)

- Task 9: `npm run db:deploy` (migration 0009), `npm run db:test`, `npm run deploy:functions`, `npm run test:live`.
- Task 14: upload the v3 art set (34 pictures + manifest) to the `lmu-art` bucket in the Supabase dashboard.

Ask for both together at Task 9; the art is rendered and picked locally in Task 13 either way.

## File map

| File | Change |
|---|---|
| `packages/rules/src/workout.ts` | **New.** Equipment, program styles, moves, programs, `planWorkout`, `sessionCondition`, `sessionMinutes`, `plannedMoves`, `workoutMinutes`, `isWorkout`, `hasEquipment`, `sessionSets`. |
| `packages/rules/src/constants.ts` | Workout constants. |
| `packages/rules/src/library.ts` | `workout` and `session` conditions; `QuestLibrary.training`; `PlayerProfile.equipment` and `programStyle`; validation. |
| `packages/rules/src/day.ts` | `DayInput.workoutsDone`, `QuestDraft.moves`, `draftQuest` options, `movesFor`, the day after a workout. |
| `packages/rules/src/adjust.ts` | Hard day, swaps and Second Wind keep or plan the moves. |
| `packages/rules/src/onboarding.ts` | `workoutsFit`. |
| `packages/rules/src/campaign.ts` | Personas' training setup; workouts done. |
| `packages/rules/src/index.ts` | Export `workout.ts`. |
| `packages/rules/test/workout.test.ts` | **New.** |
| `packages/rules/test/fixtures/library.ts` | `training` in the fixture library; profile and day-input defaults; a workout fixture. |
| `packages/rules/test/day.test.ts`, `adjust.test.ts`, `library.test.ts`, `onboarding.test.ts` | New cases. |
| `packages/content/src/training/moves.ts` | **New.** 53 moves with words; `authoredMove`, `progressLine`. |
| `packages/content/src/training/programs.ts` | **New.** The three programs. |
| `packages/content/src/quests/workout.ts` | **New.** The workout ladder and its 6 templates. |
| `packages/content/src/quests/strength.ts` | Push, squat and core lose their class affinity; per-rung art keys. |
| `packages/content/src/quests/mind.ts`, `vitality.ts` | Titles without numbers. |
| `packages/content/src/library.ts`, `types.ts` | The training library; `AuthoredTemplate.art`. |
| `packages/content/src/names.ts`, `onboarding.ts`, `play.ts`, `format.ts`, `art.ts` | Names, the Training step's words, the workout log's words, summaries from the stored quest, art keys. |
| `packages/content/scripts/review.ts` | `questSummary` takes the condition and minutes. |
| `packages/content/test/training.test.ts` | **New.** The library, the programs, every setup plans. |
| `packages/content/test/*.test.ts`, `trained.ts` | Profiles with a training setup; titles; art; days. |
| `supabase/migrations/0009_training.sql` | **New.** Profile columns; `start_player` and `adjust` replaced. |
| `supabase/tests/db/tables.sql`, `functions.sql`, `adjust.sql` | New assertions. |
| `supabase/functions/_shared/state.ts`, `db.ts`, `drafts.ts`, `today.ts`, `advance.ts`, `onboarding.ts`, `events.ts`, `adjust.ts` | Training fields, workouts done, sessions, the `training` event. |
| `supabase/tests/unit/*.ts`, `supabase/tests/live/live.test.ts` | New cases. |
| `apps/mobile/src/onboarding/flow.ts`, `src/screens/onboarding/GearStep.tsx`, `app/onboarding/gear.tsx` | The Training step. |
| `apps/mobile/src/screens/onboarding/RhythmStep.tsx` | The workouts note. |
| `apps/mobile/src/quest/payload.ts`, `src/screens/quest/WorkoutLog.tsx`, `src/screens/Quest.tsx`, `QuestCard.tsx`, `Today.tsx`, `Swap.tsx`, `Pain.tsx` | The workout log, summaries, art. |
| `apps/mobile/src/screens/Training.tsx`, `app/training.tsx`, `src/screens/Settings.tsx` | Changing the setup. |
| `apps/mobile/src/game/project.ts`, `adjust.ts`, `notices.ts` | The `training` event; moves on hard day. |
| `apps/mobile/src/data/local.ts` | Cache migration 4. |
| `apps/mobile/test/*.test.ts(x)` | New cases. |
| `scripts/art/quest-art.py`, `docs/design/quest-art.md`, `apps/mobile/src/art/manifest.ts` | 14 new subjects, v3. |
| `docs/…` | Checklist rows, roadmap, specs, README, plan "As built". |

## Commands

- Rules / content tests: `npm test -w @levelmeup/rules`, `npm test -w @levelmeup/content`.
- Server unit tests: `cd supabase && npx vitest run --project unit` (**never** a bare `npx vitest run` in
  `supabase/`: it also runs the live project).
- App tests: `npm test -w @levelmeup/mobile`.
- Everything: `npm test` (unit tests only), `npm run typecheck`, `npm run check:functions`, `npm run check:portable`,
  `npm run check:bundle`, `npm run pacing`.

---

### Task 0: Baseline

**Files:** none.

- [ ] **Step 1: Confirm the branch and a clean tree**

Run: `git status --short; git branch --show-current; git log --oneline -2`
Expected: no changes; `m6c-kaizen-training`; HEAD is the research commit (05531a3) on top of 0b02449.

- [ ] **Step 2: Run every unit test and the checks**

Run: `npm test; npm run typecheck; npm run check:functions; npm run check:portable; npm run check:bundle`
Expected: content 867, rules 374, server 233, app 475 tests pass (M6b's final numbers); every check clean. Write the
numbers into `.claude/build-loop.local.md`.

---

### Task 1: Rules — the training types, the profile fields and the stop-gaps

The new types and fields arrive first, with the defaults ("just my body", no preference, no workouts done) at every
place that builds a profile or a day, so every package keeps passing. Task 2 adds the planner; Tasks 8 and 10 replace
the stop-gaps with real values.

**Files:**
- Create: `packages/rules/src/workout.ts`
- Modify: `packages/rules/src/constants.ts`, `library.ts`, `day.ts`, `campaign.ts`, `index.ts`
- Modify: `packages/rules/test/fixtures/library.ts`, `packages/rules/test/library.test.ts`
- Modify (stop-gaps): `packages/content/test/days.test.ts`, `fuzz.test.ts`, `onboarding.test.ts`, `trained.ts`,
  `packages/content/src/library.ts`, `supabase/functions/_shared/onboarding.ts`, `state.ts`, `today.ts`, `advance.ts`,
  `apps/mobile/src/onboarding/flow.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/rules/test/library.test.ts`, add inside the existing `describe` for `validateProfile` (or a new one at the
end of the file):

```ts
describe('the training setup (M6c)', () => {
  it('accepts no equipment, any mix of equipment and every program style', () => {
    expect(() => validateProfile(profile({ equipment: [] }))).not.toThrow();
    expect(() => validateProfile(profile({ equipment: ['bands', 'dumbbells', 'bench', 'pullup_bar', 'gym'] }))).not.toThrow();
    for (const programStyle of ['men', 'women', 'none'] as const) expect(() => validateProfile(profile({ programStyle }))).not.toThrow();
  });

  it('refuses unknown or repeated equipment and an unknown program style', () => {
    expect(() => validateProfile(profile({ equipment: ['kettlebell' as never] }))).toThrow(RangeError);
    expect(() => validateProfile(profile({ equipment: ['bands', 'bands'] }))).toThrow(RangeError);
    expect(() => validateProfile(profile({ programStyle: 'unisex' as never }))).toThrow(RangeError);
  });
});
```

`profile` is the file's existing helper (`profile(over)` spreading over `PROFILE`); if the file names it differently,
use its name. Import `validateProfile` if it isn't imported yet.

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w @levelmeup/rules -- library`
Expected: FAIL (the unknown equipment and style are accepted; TypeScript types are erased, so the calls run).

- [ ] **Step 3: Add the workout constants**

Append to `packages/rules/src/constants.ts`:

```ts

// Workouts (M6c decision 6)
/** Minutes a workout set takes with its rest (about 2 minutes); a workout also starts with a warm-up. */
export const WORKOUT_SET_MINUTES = 2.25;
export const WORKOUT_WARMUP_MINUTES = 2;
/** A workout needs at least this many exercises the player can do, or the day uses the single-exercise ladders. */
export const MIN_WORKOUT_MOVES = 2;
```

- [ ] **Step 4: Create `packages/rules/src/workout.ts` with the types**

```ts
// Workouts (M6c): sessions of several exercises, planned for the player from the library's moves and programs. Pure
// and deterministic, so the server plans a workout when it builds a day and the phone can draft the same quest again.
// The exercise names, slots and rep ranges come from the owner's Kaizen workout builders (docs/research); the words
// live in packages/content.
import type { Limitation } from './types.ts';

/** What a player can train with; bodyweight needs nothing, and a gym has everything (decision 1). */
export type Equipment = 'bands' | 'dumbbells' | 'bench' | 'pullup_bar' | 'gym';
export const EQUIPMENT: readonly Equipment[] = ['bands', 'dumbbells', 'bench', 'pullup_bar', 'gym'];

/** The program a player's workouts follow (owner decision 2026-10-11: Men's / Women's / No preference). */
export type ProgramStyle = 'men' | 'women' | 'none';
export const PROGRAM_STYLES: readonly ProgramStyle[] = ['men', 'women', 'none'];

/** A movement slot: exercises that can stand in for each other (the workout builder's substitution groups). */
export type MoveSlot =
  | 'horizontal_push' | 'incline_push' | 'chest' | 'vertical_push' | 'horizontal_pull' | 'vertical_pull' | 'squat'
  | 'quads' | 'hip_hinge' | 'hamstrings_glutes' | 'shoulders' | 'biceps' | 'triceps' | 'abs' | 'calves';
export const MOVE_SLOTS: readonly MoveSlot[] = [
  'horizontal_push', 'incline_push', 'chest', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'quads',
  'hip_hinge', 'hamstrings_glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'calves',
];

/** An exercise's picture family (quest art, decision 13). */
export type MovePattern = 'push' | 'press' | 'pull' | 'squat' | 'hinge' | 'core' | 'isolation';
export const MOVE_PATTERNS: readonly MovePattern[] = ['push', 'press', 'pull', 'squat', 'hinge', 'core', 'isolation'];

/** 1 is the easiest version; a workout template caps it. Every barbell lift is 3. */
export type MoveLevel = 1 | 2 | 3;

/** The rules-relevant part of an exercise. */
export type Move = {
  id: string;
  slots: readonly MoveSlot[];
  pattern: MovePattern;
  /** Everything it needs; empty for bodyweight. */
  needs: readonly Equipment[];
  level: MoveLevel;
  /** Reps, or seconds for a hold. */
  unit: 'reps' | 'seconds';
  min: number;
  max: number;
  perSide: boolean;
  contraindications: readonly Limitation[];
};

/** A program day: its slots, most important first. */
export type ProgramDay = readonly MoveSlot[];

export type TrainingLibrary = { moves: readonly Move[]; programs: Readonly<Record<ProgramStyle, readonly ProgramDay[]>> };

/** One exercise of a planned workout; the template gives its sets. */
export type PlannedMove = { move: string; unit: Move['unit']; min: number; max: number; perSide: boolean };

/** One exercise as a quest stores it. */
export type SessionMove = PlannedMove & { sets: number };
```

- [ ] **Step 5: Extend the library types and validation**

In `packages/rules/src/library.ts`:

Change the first import line and add the workout import:

```ts
import { CLASSES, GOALS, LIMITATIONS, MAX_GOALS, MINUTES_OPTIONS, MIN_SIDE_MINUTES, TRAINABLE_STATS } from './constants.ts';
import type { LadderState } from './ladder.ts';
import type { ClassId, Difficulty, Goal, Limitation, Stat, Tier, TrainableStat } from './types.ts';
import { EQUIPMENT, PROGRAM_STYLES } from './workout.ts';
import type { Equipment, MoveLevel, ProgramStyle, SessionMove, TrainingLibrary } from './workout.ts';
import type { XpSplit } from './xp.ts';
```

Replace the `Condition` type:

```ts
/** What "done" means, measurably (spec §3.1). */
export type Condition =
  | { kind: 'reps'; sets: number; reps: number; perSide: boolean }
  | { kind: 'hold'; sets: number; seconds: number; perSide: boolean }
  | { kind: 'minutes'; minutes: number }
  | { kind: 'habit' }
  | { kind: 'sentence' }
  /** A workout template (M6c): the sets of each exercise, in order, and the hardest exercise level it may use. */
  | { kind: 'workout'; sets: readonly number[]; level: MoveLevel }
  /** A planned workout as a quest stores it: each exercise with its sets (`sessionCondition`). */
  | { kind: 'session'; moves: readonly SessionMove[] };
```

Replace the `QuestLibrary` type:

```ts
export type QuestLibrary = {
  ladders: readonly Ladder[];
  templates: readonly QuestTemplate[];
  /** The 5-minute recovery quest for each class (spec §3.7). */
  recovery: Readonly<Record<ClassId, string>>;
  /** The exercises and programs workouts are planned from (M6c). */
  training: TrainingLibrary;
};
```

In `PlayerProfile`, after `ownProgram`:

```ts
  /** What the player can train with (M6c); empty means bodyweight only. */
  equipment: readonly Equipment[];
  /** The program their workouts follow (M6c). */
  programStyle: ProgramStyle;
```

In `validateProfile`, before the `for (const stat …)` loop:

```ts
  const { equipment } = profile;
  if (new Set(equipment).size !== equipment.length || !equipment.every((e) => EQUIPMENT.includes(e))) {
    throw new RangeError(`unknown or repeated equipment in [${equipment.join(', ')}]`);
  }
  if (!PROGRAM_STYLES.includes(profile.programStyle)) throw new RangeError(`unknown program style ${profile.programStyle}`);
```

- [ ] **Step 6: Add `workoutsDone` to the day input**

In `packages/rules/src/day.ts`, in `DayInput` after `light`:

```ts
  /** Workouts completed so far (M6c): a new workout follows the program's next day; a missed one repeats. */
  workoutsDone: number;
```

- [ ] **Step 7: Export the module and give the campaign personas a setup**

In `packages/rules/src/index.ts` add after `export * from './library.ts';`:

```ts
export * from './workout.ts';
```

In `packages/rules/src/campaign.ts`, in the daily `profile` literal after `ownProgram: false,`:

```ts
      equipment: [],
      programStyle: 'none',
```

and in the `buildDay` call add `workoutsDone: 0,` after `light: false,` (Task 3 counts real workouts).

- [ ] **Step 8: Update the rules fixtures**

In `packages/rules/test/fixtures/library.ts`: import `TrainingLibrary` (`import type { TrainingLibrary } from
'../../src/workout.ts';`) and add, before `export const FIXTURE`:

```ts
/** No exercises and no programs: the fixture library has no workouts (the workout fixture in Task 2 has). */
export const NO_TRAINING: TrainingLibrary = { moves: [], programs: { men: [], women: [], none: [] } };
```

In `FIXTURE`, after `recovery: {…},` add `training: NO_TRAINING,`. In `PROFILE`, after `ownProgram: false,` add
`equipment: [], programStyle: 'none',`. In `dayInput`, after `light: false,` add `workoutsDone: 0,`.

Search the rules tests for other literal profiles or day inputs:

Run: `git grep -nE "ownProgram:|light: (true|false)," packages/rules/test`
For each literal `PlayerProfile` add `equipment: [], programStyle: 'none'`; for each literal `DayInput` add
`workoutsDone: 0`; for each literal `QuestLibrary` add `training: NO_TRAINING`.

- [ ] **Step 9: Stop-gaps in the other packages**

Every place that builds a profile, a day input or a library gets the defaults now:

- `packages/content/src/library.ts`: in `LIBRARY`, add
  `training: { moves: [], programs: { men: [], women: [], none: [] } },` (Task 4 fills it).
- `packages/content/test/days.test.ts`, `fuzz.test.ts`, `onboarding.test.ts`, `trained.ts`: add
  `equipment: [], programStyle: 'none'` to each literal profile, and `workoutsDone: 0` to each `buildDay` input.
  (Run `git grep -nE "ownProgram|buildDay\(" packages/content/test` to find them.)
- `supabase/functions/_shared/onboarding.ts`, in `startArgs`: add `equipment: [], programStyle: 'none',` to the
  `player` literal after `ownProgram: choices.ownProgram,`, and `workoutsDone: 0,` to the `buildDay` input after
  `light: true,`.
- `supabase/functions/_shared/state.ts`, in `toProfile`: add `equipment: [], programStyle: 'none',` after
  `ownProgram: p.own_program,`.
- `supabase/functions/_shared/today.ts`, in `todayInput`: add `workoutsDone: 0,` after `light: day.light,`.
- `supabase/functions/_shared/advance.ts`: in the `buildDay` call add `workoutsDone: 0,` after `light: comeback,`.
- `apps/mobile/src/onboarding/flow.ts`, in `draftProfile`: add `equipment: [], programStyle: 'none',` after
  `ownProgram: draft.training === 'own',`.

Each is replaced in Tasks 3, 8 and 10; `git grep -nE "workoutsDone: 0|programStyle: 'none'" supabase apps packages/rules/src`
lists them.

- [ ] **Step 10: Run everything**

Run: `npm test; npm run typecheck`
Expected: all pass (rules 376: the two new tests); typecheck clean.

- [ ] **Step 11: Commit**

```bash
git add -A packages supabase apps/mobile/src
git commit -m "M6c rules: training setup types (equipment, program style), profile fields and stop-gaps"
```

---

### Task 2: Rules — planning a workout

**Files:**
- Modify: `packages/rules/src/workout.ts`
- Create: `packages/rules/test/workout.test.ts`
- Modify: `packages/rules/test/fixtures/library.ts`

- [ ] **Step 1: Add a workout fixture**

Append to `packages/rules/test/fixtures/library.ts`:

```ts
const move = (id: string, slots: MoveSlot[], level: MoveLevel, extra: Partial<Move> = {}): Move => ({
  id, slots, pattern: 'push', needs: [], level, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: [], ...extra,
});

/** A small exercise library: bodyweight moves at each level, a few that need equipment, and two programs. */
export const TRAINING: TrainingLibrary = {
  moves: [
    move('db-press', ['horizontal_push'], 1, { needs: ['dumbbells'] }),
    move('wall-push', ['horizontal_push'], 1, { contraindications: ['wrist'] }),
    move('incline-push', ['horizontal_push'], 2, { contraindications: ['wrist'] }),
    move('push-up', ['horizontal_push'], 3, { contraindications: ['wrist'] }),
    move('bb-row', ['horizontal_pull'], 3, { needs: ['gym'], pattern: 'pull' }),
    move('y-raise', ['horizontal_pull'], 1, { pattern: 'pull' }),
    move('chair-squat', ['squat', 'quads'], 1, { pattern: 'squat', contraindications: ['knee'] }),
    move('split-squat', ['squat', 'quads'], 2, { pattern: 'squat', contraindications: ['knee'], perSide: true }),
    move('bridge', ['hip_hinge'], 1, { pattern: 'hinge' }),
    move('plank', ['abs'], 1, { pattern: 'core', unit: 'seconds', min: 20, max: 40 }),
    move('chin-up', ['vertical_pull'], 3, { needs: ['pullup_bar'], pattern: 'pull' }),
  ],
  programs: {
    men: [['horizontal_push', 'horizontal_pull', 'squat', 'abs'], ['vertical_pull', 'hip_hinge', 'quads', 'abs']],
    women: [['hip_hinge', 'quads', 'horizontal_pull', 'abs']],
    none: [['squat', 'horizontal_push', 'hip_hinge', 'horizontal_pull'], ['quads', 'vertical_pull', 'abs', 'horizontal_push']],
  },
};

/** A workout template: 3 exercises of 2 sets at `level`, or the given shape. */
export function workoutTemplate(rung: number, level: MoveLevel, sets: number[] = [2, 2, 2]): QuestTemplate {
  return {
    ...template({ id: `workout-${rung}`, ladder: 'workout', rung, stat: 'strength', minutes: workoutMinutes(sets), exercise: 'strength' }),
    completion: 'reps',
    condition: { kind: 'workout', sets, level },
    hardDay: { minutes: workoutMinutes([1, 1]), condition: { kind: 'workout', sets: [1, 1], level } },
  };
}

/** FIXTURE plus a workout ladder (rungs: level 1, 2, 3, then 3 × 3 sets) that every class prefers. */
export const WORKOUT_FIXTURE: QuestLibrary = {
  ...FIXTURE,
  ladders: [...FIXTURE.ladders, ladder('workout', 'strength', ['body'], ['warrior', 'mage', 'rogue', 'monk'])],
  templates: [...FIXTURE.templates, workoutTemplate(0, 1), workoutTemplate(1, 2), workoutTemplate(2, 3), workoutTemplate(3, 3, [3, 3, 3])],
  training: TRAINING,
};
```

Update the fixture's imports: `import type { Move, MoveLevel, MoveSlot, TrainingLibrary } from '../../src/workout.ts';`
and `import { workoutMinutes } from '../../src/workout.ts';` (the latter fails until Step 4; that is the red step).

- [ ] **Step 2: Write the failing tests**

Create `packages/rules/test/workout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MIN_WORKOUT_MOVES } from '../src/constants.ts';
import {
  hasEquipment, isWorkout, planWorkout, plannedMoves, sessionCondition, sessionMinutes, sessionSets, workoutMinutes,
} from '../src/workout.ts';
import { PROFILE, TRAINING, workoutTemplate } from './fixtures/library.ts';
import type { PlayerProfile } from '../src/library.ts';

const who = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({ ...PROFILE, ...over });
const ids = (moves: { move: string }[] | null): string[] | null => moves?.map((m) => m.move) ?? null;

describe('workout minutes (M6c decision 6)', () => {
  it('a 2-minute warm-up plus 2.25 minutes a set, rounded up', () => {
    expect(workoutMinutes([2, 2, 2])).toBe(16);
    expect(workoutMinutes([3, 3, 3])).toBe(23);
    expect(workoutMinutes([3, 3, 3, 3])).toBe(29);
    expect(workoutMinutes([4, 3, 3, 3])).toBe(32);
    expect(workoutMinutes([1, 1])).toBe(7);
  });
});

describe('equipment', () => {
  it('a gym has everything; otherwise every need must be owned', () => {
    expect(hasEquipment({ needs: [] }, [])).toBe(true);
    expect(hasEquipment({ needs: ['dumbbells', 'bench'] }, ['dumbbells'])).toBe(false);
    expect(hasEquipment({ needs: ['dumbbells', 'bench'] }, ['bench', 'dumbbells'])).toBe(true);
    expect(hasEquipment({ needs: ['pullup_bar'] }, ['gym'])).toBe(true);
  });
});

describe('planning a workout (decision 5)', () => {
  it('follows the program day: workouts done, round the program', () => {
    const t = workoutTemplate(0, 1);
    expect(ids(planWorkout(TRAINING, t, who({ programStyle: 'men' }), 0))).toEqual(['wall-push', 'y-raise', 'chair-squat']);
    expect(ids(planWorkout(TRAINING, t, who({ programStyle: 'men' }), 1))).toEqual(['bridge', 'chair-squat', 'plank']);
    expect(ids(planWorkout(TRAINING, t, who({ programStyle: 'men' }), 2))).toEqual(['wall-push', 'y-raise', 'chair-squat']);
  });

  it('takes the hardest version the template allows', () => {
    expect(ids(planWorkout(TRAINING, workoutTemplate(1, 2), who({ programStyle: 'none' }), 0))).toEqual(['split-squat', 'incline-push', 'bridge']);
    expect(ids(planWorkout(TRAINING, workoutTemplate(2, 3), who({ programStyle: 'none' }), 0))).toEqual(['split-squat', 'push-up', 'bridge']);
  });

  it('prefers what the player owns, then the level, then library order', () => {
    const plan = planWorkout(TRAINING, workoutTemplate(2, 3), who({ programStyle: 'none', equipment: ['dumbbells'] }), 0);
    expect(ids(plan)).toEqual(['split-squat', 'db-press', 'bridge']);
    const gym = planWorkout(TRAINING, workoutTemplate(2, 3, [2, 2, 2, 2]), who({ programStyle: 'none', equipment: ['gym'] }), 0);
    expect(ids(gym)).toEqual(['split-squat', 'db-press', 'bridge', 'bb-row']);
  });

  it('skips what the player reported and what they lack, and fills from the next days', () => {
    const plan = planWorkout(TRAINING, workoutTemplate(0, 1), who({ programStyle: 'men', limitations: ['wrist', 'knee'] }), 0);
    expect(ids(plan)).toEqual(['y-raise', 'plank', 'bridge']);
  });

  it('copies the move\'s range; the template gives the sets', () => {
    const t = workoutTemplate(0, 1);
    const plan = planWorkout(TRAINING, t, who({ programStyle: 'women' }), 0)!;
    expect(plan[0]).toEqual({ move: 'bridge', unit: 'reps', min: 8, max: 12, perSide: false });
    expect(sessionCondition(t, plan, false)).toEqual({ kind: 'session', moves: plan.map((m) => ({ ...m, sets: 2 })) });
    // The hard-day version keeps the first two exercises, one set each (decision 6).
    expect(sessionCondition(t, plan, true)).toEqual({ kind: 'session', moves: plan.slice(0, 2).map((m) => ({ ...m, sets: 1 })) });
  });

  it(`gives no workout when fewer than ${MIN_WORKOUT_MOVES} exercises fit`, () => {
    const hurt = who({ programStyle: 'women', limitations: ['knee', 'wrist'] });
    const only = { ...TRAINING, moves: TRAINING.moves.filter((m) => m.id === 'bridge' || m.id === 'chair-squat') };
    expect(planWorkout(only, workoutTemplate(0, 1), hurt, 0)).toBeNull();
  });

  it('refuses a template that is not a workout, a bad count and a style without a program', () => {
    const notWorkout = { ...workoutTemplate(0, 1), condition: { kind: 'minutes', minutes: 5 } as const };
    expect(() => planWorkout(TRAINING, notWorkout, who(), 0)).toThrow(RangeError);
    expect(() => planWorkout(TRAINING, workoutTemplate(0, 1), who(), -1)).toThrow(RangeError);
    expect(() => planWorkout({ ...TRAINING, programs: { ...TRAINING.programs, none: [] } }, workoutTemplate(0, 1), who(), 0)).toThrow(RangeError);
  });
});

describe('a stored session', () => {
  const t = workoutTemplate(3, 3, [3, 3, 3]);
  const plan = planWorkout(TRAINING, t, who({ programStyle: 'none' }), 0)!;

  it('takes as many minutes as its sets, in its version', () => {
    expect(sessionMinutes(t, plan, false)).toBe(23);
    expect(sessionMinutes(t, plan, true)).toBe(7);
    expect(sessionMinutes(t, plan.slice(0, 2), false)).toBe(workoutMinutes([3, 3]));
  });

  it('gives back its moves, and counts its sets', () => {
    const stored = sessionCondition(t, plan, false);
    expect(plannedMoves(stored)).toEqual(plan);
    expect(plannedMoves(sessionCondition(t, plan, true))).toEqual(plan.slice(0, 2));
    expect(plannedMoves({ kind: 'minutes', minutes: 5 })).toBeNull();
    expect(sessionSets(sessionCondition(t, plan, false))).toBe(9);
    expect(sessionSets({ kind: 'habit' })).toBe(0);
    expect(isWorkout(t)).toBe(true);
    expect(isWorkout({ condition: stored })).toBe(false);
  });

  it('refuses more moves than the template has sets for', () => {
    expect(() => sessionCondition(workoutTemplate(0, 1, [2, 2]), plan, false)).toThrow(RangeError);
  });
});
```

How the expectations follow from the fixture and decision 5 (the default profile has no equipment):

- men day 0 (`horizontal_push, horizontal_pull, squat, abs`) at level 1: wall-push (db-press needs dumbbells),
  y-raise (bb-row needs a gym and is level 3), chair-squat → 3 moves.
- men day 1 (`vertical_pull, hip_hinge, quads, abs`): chin-up needs a bar; bridge; chair-squat (it is in quads too);
  plank.
- none day 0 at level 2: squat → split-squat (2 > 1); horizontal_push → incline-push; hip_hinge → bridge.
- level 3: squat → split-squat (the best at ≤ 3 is still level 2); push → push-up; bridge.
- dumbbells at level 3: push → db-press (equipment first: 10 + 1 beats 3); the rest as before.
- gym, 4 exercises: split-squat, db-press (gym has dumbbells; db-press 11 vs push-up 3), bridge, horizontal_pull →
  bb-row (10 + 3 = 13 beats y-raise 1).
- men day 0 with wrist and knee: push moves all excluded; y-raise; squat → chair-squat and split-squat excluded; abs →
  plank; then day 1: vertical_pull → chin-up needs a bar; hip_hinge → bridge → `['y-raise', 'plank', 'bridge']`.
- women with knee and wrist, `only` = bridge and chair-squat: hip_hinge → bridge; quads → chair-squat excluded (knee);
  horizontal_pull, abs → nothing → 1 move → null.
- none day 0 for the stored session (level 3, 3 × 3): split-squat, push-up, bridge.

- [ ] **Step 3: Run them to see them fail**

Run: `npm test -w @levelmeup/rules -- workout`
Expected: FAIL (`workoutMinutes` and the planner don't exist).

- [ ] **Step 4: Implement the planner**

Append to `packages/rules/src/workout.ts` (and add the imports at the top: `import { MIN_WORKOUT_MOVES,
WORKOUT_SET_MINUTES, WORKOUT_WARMUP_MINUTES } from './constants.ts';` and
`import type { Condition, PlayerProfile, QuestTemplate } from './library.ts';`):

```ts

/** Minutes a workout takes: the warm-up plus every set with its rest. */
export function workoutMinutes(sets: readonly number[]): number {
  return WORKOUT_WARMUP_MINUTES + Math.ceil(sets.reduce((sum, n) => sum + n, 0) * WORKOUT_SET_MINUTES);
}

/** The template is a workout: its condition gives the sets of each exercise. */
export const isWorkout = (template: Pick<QuestTemplate, 'condition'>): boolean => template.condition.kind === 'workout';

/** The player has what the move needs; a gym counts as everything. */
export function hasEquipment(move: Pick<Move, 'needs'>, equipment: readonly Equipment[]): boolean {
  return equipment.includes('gym') || move.needs.every((need) => equipment.includes(need));
}

/** Equipment the player owns first (they told us what they have), then the harder version. Ties keep library order. */
const preference = (move: Move): number => (move.needs.length > 0 ? 10 : 0) + move.level;

function workoutShape(template: QuestTemplate, hardDay: boolean) {
  const shape = hardDay ? template.hardDay.condition : template.condition;
  if (shape.kind !== 'workout') throw new RangeError(`${template.id} is not a workout`);
  return shape;
}

/**
 * Plans a workout (decision 5): for each slot of today's program day, then of the days after it, the best move the
 * player can do (owned equipment, no reported limitation, at most the template's level, not already in the session),
 * until the template has its exercises. Null when fewer than MIN_WORKOUT_MOVES fit: the day uses other strength quests.
 */
export function planWorkout(training: TrainingLibrary, template: QuestTemplate, profile: PlayerProfile, workoutsDone: number): PlannedMove[] | null {
  const shape = workoutShape(template, false);
  if (!Number.isInteger(workoutsDone) || workoutsDone < 0) throw new RangeError(`workoutsDone must be a whole number, got ${workoutsDone}`);
  const days = training.programs[profile.programStyle];
  if (days === undefined || days.length === 0) throw new RangeError(`no program for ${profile.programStyle}`);
  const today = workoutsDone % days.length;
  const slots = days.flatMap((_, i) => days[(today + i) % days.length]!);
  const picked: Move[] = [];
  for (const slot of slots) {
    if (picked.length === shape.sets.length) break;
    let best: Move | null = null;
    for (const move of training.moves) {
      if (!move.slots.includes(slot) || move.level > shape.level || picked.includes(move)) continue;
      if (!hasEquipment(move, profile.equipment) || move.contraindications.some((tag) => profile.limitations.includes(tag))) continue;
      if (best === null || preference(move) > preference(best)) best = move;
    }
    if (best !== null) picked.push(best);
  }
  if (picked.length < MIN_WORKOUT_MOVES) return null;
  return picked.map((m) => ({ move: m.id, unit: m.unit, min: m.min, max: m.max, perSide: m.perSide }));
}

/**
 * A planned workout as a quest stores it: each move with its sets in the version in use. The hard-day version keeps the
 * first exercises its shape lists (one set of the first two: the minimum session, decision 6).
 */
export function sessionCondition(template: QuestTemplate, moves: readonly PlannedMove[], hardDay: boolean): Condition {
  const full = workoutShape(template, false);
  if (moves.length < MIN_WORKOUT_MOVES || moves.length > full.sets.length) {
    throw new RangeError(`${template.id} takes ${MIN_WORKOUT_MOVES} to ${full.sets.length} exercises, got ${moves.length}`);
  }
  const shape = workoutShape(template, hardDay);
  return { kind: 'session', moves: moves.slice(0, shape.sets.length).map((m, i) => ({ ...m, sets: shape.sets[i]! })) };
}

/** Minutes of a planned workout in the version in use; fewer moves than the template has take less. */
export function sessionMinutes(template: QuestTemplate, moves: readonly PlannedMove[], hardDay: boolean): number {
  return workoutMinutes(workoutShape(template, hardDay).sets.slice(0, moves.length));
}

/** A stored session's moves without their sets, to draft it again (its hard-day version); null for other quests. */
export function plannedMoves(condition: Condition): PlannedMove[] | null {
  if (condition.kind !== 'session') return null;
  return condition.moves.map(({ sets: _sets, ...move }) => move);
}

/** Every set a stored session asks for (the length of its log). */
export function sessionSets(condition: Condition): number {
  return condition.kind === 'session' ? condition.moves.reduce((sum, m) => sum + m.sets, 0) : 0;
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -w @levelmeup/rules`
Expected: PASS (every rules test, including the new workout tests).

- [ ] **Step 6: Commit**

```bash
git add packages/rules
git commit -m "M6c rules: plan a workout from the player's equipment, limits and program day"
```

---

### Task 3: Rules — workouts in the day builder and the adjustments

**Files:**
- Modify: `packages/rules/src/day.ts`, `adjust.ts`, `onboarding.ts`, `campaign.ts`
- Modify: `packages/rules/test/fixtures/library.ts`, `day.test.ts`, `adjust.test.ts`, `onboarding.test.ts`
- Modify: `supabase/functions/_shared/drafts.ts`, `today.ts`; `apps/mobile/src/game/adjust.ts` (the drafts carry the
  moves)

- [ ] **Step 1: Mirror the content's affinities in the workout fixture**

In `packages/rules/test/fixtures/library.ts`, replace the `ladders` line of `WORKOUT_FIXTURE` so push and squat lose
their class affinity (decision 7), as they will in the content:

```ts
  ladders: [
    ...FIXTURE.ladders.map((l) => (l.id === 'push' || l.id === 'squat' ? { ...l, affinity: [] } : l)),
    ladder('workout', 'strength', ['body'], ['warrior', 'mage', 'rogue', 'monk']),
  ],
```

- [ ] **Step 2: Write the failing tests**

Append to `packages/rules/test/day.test.ts` (add `WORKOUT_FIXTURE, TRAINING, workoutTemplate` to the fixture import,
and `import { draftQuest } from '../src/day.ts';`, `import { planWorkout } from '../src/workout.ts';`):

```ts
describe('workouts (M6c decisions 5–7)', () => {
  const strengthDay = (over: Partial<DayInput> = {}, profile: Parameters<typeof dayInput>[1] = {}) =>
    buildDay(WORKOUT_FIXTURE, dayInput({ dayNumber: 3, ...over }, profile));

  it('a strength core quest is a workout, planned for the player, at its rung\'s minutes and reward', () => {
    const core = quest(strengthDay(), 'core');
    expect(core.templateId).toBe('workout-0');
    expect(core.moves?.map((m) => m.move)).toEqual(['chair-squat', 'wall-push', 'bridge']);
    expect(core.minutes).toBe(16);
    expect(core.xp).toEqual({ strength: 20 });
  });

  it('follows the program: the next workout is the next day of it', () => {
    const core = quest(strengthDay({ workoutsDone: 1 }), 'core');
    expect(core.moves?.map((m) => m.move)).toEqual(['chair-squat', 'plank', 'wall-push']);
  });

  it('the day after a workout builds no strength ladder in any slot', () => {
    const day = buildDay(WORKOUT_FIXTURE, dayInput({ dayNumber: 4, history: [{ dayNumber: 3, quests: { core: 'workout-0' } }] }));
    for (const q of day.quests) expect(['push', 'squat', 'workout']).not.toContain(q.ladder);
  });

  it('no workout fits a 15-minute day, or a player who can do fewer than two exercises', () => {
    expect(quest(strengthDay({}, { minutesPerDay: 15 }), 'core').ladder).not.toBe('workout');
    const sparse = { ...WORKOUT_FIXTURE, training: { ...TRAINING, moves: TRAINING.moves.filter((m) => m.id === 'bridge') } };
    expect(quest(buildDay(sparse, dayInput({ dayNumber: 3 })), 'core').ladder).not.toBe('workout');
  });

  it('only a workout carries exercises, and it always does', () => {
    const workout = workoutTemplate(0, 1);
    expect(() => draftQuest(workout, 'core', { code: 'balance', stat: 'strength' })).toThrow(RangeError);
    const moves = planWorkout(TRAINING, workout, dayInput().profile, 0)!;
    expect(() => draftQuest(templateById(FIXTURE, 'push-0'), 'core', { code: 'balance', stat: 'strength' }, { moves })).toThrow(RangeError);
    expect(draftQuest(workout, 'core', { code: 'balance', stat: 'strength' }, { moves, hardDay: true })).toMatchObject({ minutes: 7, hardDay: true, moves });
  });

  it('refuses a negative or fractional count of workouts done', () => {
    expect(() => strengthDay({ workoutsDone: -1 })).toThrow(RangeError);
    expect(() => strengthDay({ workoutsDone: 1.5 })).toThrow(RangeError);
  });
});
```

Append to `packages/rules/test/adjust.test.ts` (import `WORKOUT_FIXTURE, TRAINING` from the fixtures, `planWorkout` from
`../src/workout.ts`, and `addRecovery, applyHardDay, swapOptions` from `../src/adjust.ts` if not imported yet):

```ts
describe('workouts in the adjustments (M6c decision 8)', () => {
  const input = dayInput({ dayNumber: 3 });
  const day = buildDay(WORKOUT_FIXTURE, input);

  it('a hard day keeps the workout\'s plan (it stores the first two exercises), fewer minutes, half XP', () => {
    const hard = applyHardDay(WORKOUT_FIXTURE, day, []);
    const core = hard.quests.find((q) => q.slot === 'core')!;
    expect(core.moves).toEqual(day.quests.find((q) => q.slot === 'core')!.moves);
    expect(core).toMatchObject({ hardDay: true, minutes: 7, xp: { strength: 10 } });
  });

  it('a swap can offer a workout, planned like a built one', () => {
    const roomy = dayInput({ dayNumber: 2 }, { minutesPerDay: 40 });
    const built = buildDay(WORKOUT_FIXTURE, roomy);
    const strengthSide = built.quests.find((q) => q.slot !== 'core' && q.stat === 'strength')!;
    const offer = swapOptions(WORKOUT_FIXTURE, roomy, built, strengthSide.slot).find((q) => q.ladder === 'workout')!;
    expect(offer.moves).toEqual(planWorkout(TRAINING, templateById(WORKOUT_FIXTURE, offer.templateId), roomy.profile, 0));
  });

  it('Second Wind redoes a missed workout with today\'s plan', () => {
    const today = dayInput({ dayNumber: 4, history: [{ dayNumber: 3, quests: { core: 'workout-0' } }] }, { level: 5 });
    const redo = addRecovery(WORKOUT_FIXTURE, today, buildDay(WORKOUT_FIXTURE, today), { kind: 'second_wind', missedCore: 'workout-0', lastUsedDay: null });
    const quest = redo.quests.find((q) => q.slot === 'recovery')!;
    expect(quest.templateId).toBe('workout-0');
    expect(quest.moves).toEqual(planWorkout(TRAINING, templateById(WORKOUT_FIXTURE, 'workout-0'), today.profile, 0));
  });
});
```

`buildDay`, `dayInput` and `templateById` are already imported by the adjust tests; add any that aren't.

Append to `packages/rules/test/onboarding.test.ts` (import `workoutsFit` and `WORKOUT_FIXTURE, PROFILE`):

```ts
describe('workoutsFit (M6c decision 2)', () => {
  it('a workout fits 25 minutes a day, not 15, and never a gentle start or an own program', () => {
    expect(workoutsFit(WORKOUT_FIXTURE, { ...PROFILE, minutesPerDay: 25 })).toBe(true);
    expect(workoutsFit(WORKOUT_FIXTURE, { ...PROFILE, minutesPerDay: 15 })).toBe(false);
    expect(workoutsFit(WORKOUT_FIXTURE, { ...PROFILE, gentleStart: true })).toBe(false);
    expect(workoutsFit(WORKOUT_FIXTURE, { ...PROFILE, ownProgram: true })).toBe(false);
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npm test -w @levelmeup/rules`
Expected: FAIL (drafts have no `moves`; `workoutsFit` doesn't exist).

- [ ] **Step 4: Drafts carry the moves; the builder plans them**

In `packages/rules/src/day.ts`:

Add the imports:

```ts
import { isWorkout, planWorkout, sessionMinutes } from './workout.ts';
import type { PlannedMove } from './workout.ts';
```

In `QuestDraft`, after `book`:

```ts
  /** A workout's planned exercises (M6c decision 8); null for every other quest. */
  moves: readonly PlannedMove[] | null;
```

Replace `draftQuest`:

```ts
/** A quest for a slot. The article and recovery quests have no hard-day version; a workout needs its exercises. */
export function draftQuest(
  template: QuestTemplate,
  slot: Slot,
  why: WhyReason,
  options: { hardDay?: boolean; book?: string | null; moves?: readonly PlannedMove[] | null } = {},
): QuestDraft {
  const hardDay = options.hardDay === true && template.role !== 'article' && template.role !== 'recovery';
  const moves = options.moves ?? null;
  if (isWorkout(template) !== (moves !== null)) {
    throw new RangeError(isWorkout(template) ? `${template.id} needs its planned exercises` : `${template.id} is not a workout`);
  }
  return {
    slot,
    templateId: template.id,
    ladder: template.ladder,
    rung: template.rung,
    stat: template.stat,
    tier: template.tier,
    minutes: moves !== null ? sessionMinutes(template, moves, hardDay) : hardDay ? template.hardDay.minutes : template.minutes,
    hardDay,
    xp: questReward(template, hardDay),
    why,
    book: options.book ?? null,
    moves,
  };
}
```

In `dayContext`, after the `dayNumber` check:

```ts
  if (!Number.isInteger(input.workoutsDone) || input.workoutsDone < 0) {
    throw new RangeError(`workoutsDone must be a whole number, got ${input.workoutsDone}`);
  }
```

and replace the yesterday block inside the loop:

```ts
      if (past.dayNumber === input.dayNumber - 1 && template.exercise === 'strength') {
        if (template.ladder !== null) strengthYesterday.add(template.ladder);
        // A workout trains the whole body, so every strength ladder rests the next day (M6c decision 7).
        if (isWorkout(template)) for (const l of library.ladders) if (l.stat === 'strength') strengthYesterday.add(l.id);
        if (slot === 'core' || slot === 'recovery') afterStrength = true;
      }
```

After `bookFor`, add:

```ts
/** A workout's exercises for this player today (decision 5); null for other quests, or when too few fit. */
export function movesFor(ctx: DayContext, template: QuestTemplate): PlannedMove[] | null {
  return isWorkout(template) ? planWorkout(ctx.library.training, template, ctx.input.profile, ctx.input.workoutsDone) : null;
}
```

In `ladderCandidates`, replace the lines from `const rung = …` to the `candidates.push` with:

```ts
    const rung = effectiveRung(library, ladder.id, input.profile, state, allowance);
    if (rung < 0) continue;
    const template = ladderRungs(library, ladder.id)[rung]!;
    // A workout needs at least two exercises the player can do today (decision 5).
    if (isWorkout(template) && movesFor(ctx, template) === null) continue;
    const capped = rung === state.rung ? null : allowedTopRung(library, ladder.id, input.profile) < state.rung ? 'limits' : 'time';
    candidates.push({ template, state, capped });
```

In `buildDay`, replace the `draft` helper:

```ts
  const draft = (slot: Slot, choice: Choice): QuestDraft => {
    const { template } = choice.candidate;
    return draftQuest(template, slot, explain(ctx, slot, choice, light), { book: bookFor(ctx, template), moves: movesFor(ctx, template) });
  };
```

- [ ] **Step 5: The adjustments keep or plan the moves**

In `packages/rules/src/adjust.ts`:

- Add `movesFor` to the import from `./day.ts`, and `import { isWorkout, planWorkout } from './workout.ts';`.
- In `swapOptions`, the last line becomes:

```ts
  return candidates.map((c) =>
    draftQuest(c.template, slot, { code: 'swap' }, { hardDay: day.hardDay, book: bookFor(ctx, c.template), moves: movesFor(ctx, c.template) }));
```

- In `applyHardDay`, the drafted quest keeps its exercises:

```ts
        ? draftQuest(templateById(library, q.templateId), q.slot, q.why, { hardDay: true, book: q.book, moves: q.moves })
```

- In `addRecovery`, replace `const quest = draftQuest(redo, 'recovery', { code: 'second_wind' });` with:

```ts
  // A missed workout is redone with today's plan; one that can't be planned any more is refused.
  const moves = isWorkout(redo) ? planWorkout(library.training, redo, input.profile, input.workoutsDone) : null;
  if (isWorkout(redo) && moves === null) throw new RangeError(`${redo.id} can't be planned for this player today`);
  const quest = draftQuest(redo, 'recovery', { code: 'second_wind' }, { moves });
```

- [ ] **Step 6: `workoutsFit` and the campaign's workouts**

In `packages/rules/src/onboarding.ts`, add `ladderRungs` to the import from `./library.ts`, add
`import { isWorkout } from './workout.ts';`, and after `strengthClosed`:

```ts
/** True when a workout fits the player's normal day: not at 10 or 15 minutes, a gentle start or an own program (M6c). */
export function workoutsFit(library: QuestLibrary, profile: PlayerProfile): boolean {
  return library.ladders.some((l) => {
    const first = ladderRungs(library, l.id)[0];
    return first !== undefined && isWorkout(first) && maxRungFor(library, l.id, profile) >= 0;
  });
}
```

In `packages/rules/src/campaign.ts`, in `runCampaign`: declare `let workoutsDone = 0;` beside `let streak`; pass
`workoutsDone` (instead of `0`) to `buildDay`; and in the quest loop, inside `if (cleared) {`, after `done++;` add
`if (quest.moves !== null) workoutsDone++;`.

- [ ] **Step 7: The server and the phone draft with the moves**

`supabase/functions/_shared/drafts.ts`: import `sessionCondition` beside `templateById`, extend the header comment with
"A workout stores its planned exercises and their sets (M6c).", and set the condition:

```ts
    condition: q.moves !== null ? sessionCondition(template, q.moves, q.hardDay) : q.hardDay ? template.hardDay.condition : template.condition,
```

`supabase/functions/_shared/today.ts`: import `plannedMoves` and, in `todayBuilt`, add `moves: plannedMoves(q.condition),`
after `book: q.book,`.

`apps/mobile/src/game/adjust.ts`: import `plannedMoves` from `@levelmeup/rules` and, in `hardFields`, pass it:

```ts
  const draft = draftQuest(templateById(LIBRARY, fields.templateId), slot, fields.why, {
    hardDay: true, book: fields.book, moves: plannedMoves(fields.condition),
  });
```

- [ ] **Step 8: Run everything**

Run: `npm test; npm run typecheck`
Expected: all pass. The content tests still pass: the real library has no workout ladder until Task 5. If the
typecheck finds a `QuestDraft` written out by hand in a test (rather than drafted), give it `moves: null`.

- [ ] **Step 9: Commit**

```bash
git add -A packages supabase/functions apps/mobile/src
git commit -m "M6c rules: workouts in the day builder, hard day, swaps and Second Wind; workoutsFit"
```

---

### Task 4: Content — the exercise library and the programs

**Files:**
- Create: `packages/content/src/training/moves.ts`, `packages/content/src/training/programs.ts`
- Create: `packages/content/test/training.test.ts`
- Modify: `packages/content/src/library.ts`, `packages/content/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/content/test/training.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EQUIPMENT, LIMITATIONS, MOVE_PATTERNS, MOVE_SLOTS, PROGRAM_STYLES } from '../../rules/src/index.ts';
import { lintText } from '../src/lint.ts';
import { MOVES, authoredMove, progressLine } from '../src/training/moves.ts';
import { PROGRAMS } from '../src/training/programs.ts';

describe('the exercise library (M6c decision 3)', () => {
  it('has 53 moves with unique ids and names', () => {
    expect(MOVES).toHaveLength(53);
    expect(new Set(MOVES.map((m) => m.id)).size).toBe(MOVES.length);
    expect(new Set(MOVES.map((m) => m.name)).size).toBe(MOVES.length);
    for (const m of MOVES) expect(m.id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('every move is well formed', () => {
    for (const m of MOVES) {
      expect(m.slots.length, m.id).toBeGreaterThan(0);
      for (const s of m.slots) expect(MOVE_SLOTS, m.id).toContain(s);
      expect(MOVE_PATTERNS, m.id).toContain(m.pattern);
      for (const e of m.needs) expect(EQUIPMENT, m.id).toContain(e);
      for (const c of m.contraindications) expect(LIMITATIONS, m.id).toContain(c);
      expect([1, 2, 3], m.id).toContain(m.level);
      expect(Number.isInteger(m.min) && Number.isInteger(m.max) && m.min >= 3 && m.min < m.max && m.max <= 60, m.id).toBe(true);
      expect(m.steps.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.steps.length, m.id).toBeLessThanOrEqual(3);
      expect(m.cue.length, m.id).toBeGreaterThan(10);
    }
  });

  it('every barbell lift is level 3 and says to learn it light', () => {
    for (const m of MOVES.filter((x) => x.id.startsWith('barbell-'))) {
      expect(m.level, m.id).toBe(3);
      expect(m.cue, m.id).toMatch(/light bar first/);
    }
  });

  it('nothing tells the player to go to failure, and the words pass the lint', () => {
    for (const m of MOVES) {
      for (const text of [m.name, ...m.steps, m.cue, progressLine(m)]) {
        expect(lintText(text), `${m.id}: ${text}`).toEqual([]);
        expect(text.toLowerCase(), m.id).not.toMatch(/failure|to fail|max out|all-out/);
      }
    }
  });

  it('the progress line follows the kind of move', () => {
    expect(progressLine(authoredMove('plank'))).toMatch(/hold a few seconds longer/);
    expect(progressLine(authoredMove('band-row'))).toMatch(/stronger band/);
    expect(progressLine(authoredMove('goblet-squat'))).toMatch(/heavier/);
    expect(progressLine(authoredMove('push-up'))).toMatch(/lower more slowly/);
    expect(() => authoredMove('kettlebell-swing')).toThrow(RangeError);
  });
});

describe('the programs (decision 4)', () => {
  it('Men\'s and Women\'s have three days, No preference two, each with six slots', () => {
    for (const style of PROGRAM_STYLES) {
      expect(PROGRAMS[style]).toHaveLength(style === 'none' ? 2 : 3);
      for (const day of PROGRAMS[style]) {
        expect(day).toHaveLength(6);
        for (const slot of day) expect(MOVE_SLOTS).toContain(slot);
      }
    }
  });

  it('every slot a program uses has a move', () => {
    for (const style of PROGRAM_STYLES) {
      for (const slot of PROGRAMS[style].flat()) expect(MOVES.some((m) => m.slots.includes(slot)), slot).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w @levelmeup/content -- training`
Expected: FAIL (the files don't exist).

- [ ] **Step 3: Write the programs**

Create `packages/content/src/training/programs.ts`:

```ts
// The program layouts (M6c decision 4), from the owner's Kaizen workout builders (docs/research/kaizen-training.md
// §3.4): Men's and Women's are the builders' 3-day layouts, No preference their shared 2-day one. Each day lists its
// slots, most important first; a workout takes as many as its rung allows.
import type { ProgramDay, ProgramStyle } from '../../../rules/src/index.ts';

export const PROGRAMS: Readonly<Record<ProgramStyle, readonly ProgramDay[]>> = {
  men: [
    ['incline_push', 'quads', 'horizontal_pull', 'shoulders', 'triceps', 'biceps'],
    ['squat', 'vertical_push', 'vertical_pull', 'hamstrings_glutes', 'abs', 'calves'],
    ['hip_hinge', 'horizontal_pull', 'chest', 'biceps', 'triceps', 'abs'],
  ],
  women: [
    ['hip_hinge', 'quads', 'horizontal_push', 'horizontal_pull', 'biceps', 'abs'],
    ['squat', 'hamstrings_glutes', 'vertical_pull', 'vertical_push', 'triceps', 'abs'],
    ['quads', 'hamstrings_glutes', 'horizontal_pull', 'chest', 'shoulders', 'abs'],
  ],
  none: [
    ['horizontal_push', 'horizontal_pull', 'quads', 'hamstrings_glutes', 'shoulders', 'abs'],
    ['squat', 'hip_hinge', 'vertical_pull', 'chest', 'shoulders', 'abs'],
  ],
};
```

- [ ] **Step 4: Write the exercise library**

Create `packages/content/src/training/moves.ts`. The order matters only for ties (decision 5: the same score keeps
library order), so within each family the gym machines come first, then dumbbells, bands and bodyweight.

```ts
// The exercise library (M6c decision 3). Names, slots and rep ranges follow the owner's Kaizen workout builders
// (docs/research/kaizen-training.md §4); the bodyweight moves and ranges are LevelMeUp's own. Every step and cue is
// written here, never copied. Player-facing, so the lint and the app's font-subset test cover every line.
import type { Move } from '../../../rules/src/index.ts';

/** A move with its words. */
export type AuthoredMove = Move & {
  /** Plain name, as a list shows it ("Goblet squat"). */
  name: string;
  /** 2–3 short how-to steps. */
  steps: readonly string[];
  /** The form cue: one line on doing it safely. */
  cue: string;
};

const LIGHT_BAR = 'Learn it with a light bar first; ';

export const MOVES: readonly AuthoredMove[] = [
  // Push: horizontal, incline and chest.
  {
    id: 'machine-chest-press', name: 'Machine chest press', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: ['gym'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Set the seat so the handles line up with the middle of your chest.', 'Press the handles forward until your arms are straight, then bring them back slowly.'],
    cue: 'Keep your shoulder blades against the pad and your wrists straight.',
  },
  {
    id: 'db-floor-press', name: 'Dumbbell floor press', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Lie on your back with your knees bent and a dumbbell in each hand above your chest.', 'Lower until your upper arms touch the floor, then press the weights back up.'],
    cue: 'Lower with control and keep your elbows a little in from your sides.',
  },
  {
    id: 'db-incline-press', name: 'Incline dumbbell press', slots: ['incline_push', 'chest'], pattern: 'push', needs: ['dumbbells', 'bench'],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Set a bench at a low incline and sit back with a dumbbell at each shoulder.', 'Press the weights up over your upper chest, then lower them slowly.'],
    cue: 'Keep your feet flat and your back against the bench.',
  },
  {
    id: 'barbell-bench-press', name: 'Barbell bench press', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['shoulder'],
    steps: ['Lie on the bench with your eyes under the bar and your feet flat on the floor.', 'Lower the bar to your lower chest with control, then press it back up.', "Set the rack's safety bars or train with a spotter."],
    cue: `${LIGHT_BAR}leave 2 good reps in every set.`,
  },
  {
    id: 'band-chest-press', name: 'Band chest press', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['shoulder'],
    steps: ['Anchor the band behind you at chest height and hold an end in each hand.', 'Step forward until the band is tight, then press both hands straight out and return slowly.'],
    cue: 'Keep your ribs down and your shoulders away from your ears.',
  },
  {
    id: 'wall-push-up', name: 'Wall push-ups', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: [],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ["Stand an arm's length from a wall with your hands on it at shoulder height.", 'Bend your elbows to bring your chest toward the wall, then push back.'],
    cue: 'Keep your body in one straight line from head to heels.',
  },
  {
    id: 'incline-push-up', name: 'Incline push-ups', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: [],
    level: 2, unit: 'reps', min: 8, max: 15, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ['Put your hands on a sturdy table, counter or bench, a little wider than your shoulders.', 'Lower your chest to the edge, then press back up.'],
    cue: "Use something that can't slide, and keep your hips in line with your shoulders.",
  },
  {
    id: 'push-up', name: 'Push-ups', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: [],
    level: 3, unit: 'reps', min: 6, max: 15, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ['Place your hands just wider than your shoulders, body straight from head to heels.', "Lower until your chest is a fist's height from the floor, then press up."],
    cue: 'End the set when your hips sag or your form breaks.',
  },
  {
    id: 'feet-up-push-up', name: 'Feet-up push-ups', slots: ['incline_push'], pattern: 'push', needs: [],
    level: 3, unit: 'reps', min: 6, max: 15, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ['Put your feet on a sturdy step or low bench and your hands on the floor.', 'Lower your chest toward the floor, then press back up.'],
    cue: 'Start with a low step and keep your body straight.',
  },
  // Press: vertical push.
  {
    id: 'db-shoulder-press', name: 'Dumbbell shoulder press', slots: ['vertical_push'], pattern: 'press', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Sit or stand tall with a dumbbell at each shoulder, palms facing forward.', 'Press the weights overhead until your arms are straight, then lower them to your shoulders.'],
    cue: 'Squeeze your glutes and keep your lower back from arching.',
  },
  {
    id: 'barbell-overhead-press', name: 'Barbell overhead press', slots: ['vertical_push'], pattern: 'press', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['shoulder', 'back'],
    steps: ['Stand with the bar resting on the front of your shoulders, hands just wider than them.', 'Press the bar straight up past your face, then lower it back to your shoulders.'],
    cue: `${LIGHT_BAR}brace your stomach and keep your ribs down.`,
  },
  {
    id: 'band-shoulder-press', name: 'Band shoulder press', slots: ['vertical_push'], pattern: 'press', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['shoulder'],
    steps: ['Stand on the middle of the band and hold an end at each shoulder.', 'Press both hands overhead, then lower them slowly.'],
    cue: 'Stand tall and keep your stomach tight.',
  },
  {
    id: 'pike-push-up', name: 'Pike push-ups', slots: ['vertical_push'], pattern: 'press', needs: [],
    level: 3, unit: 'reps', min: 6, max: 12, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ['Start in a push-up position, then walk your feet in so your hips point up.', 'Bend your elbows to lower the top of your head toward the floor, then press back up.'],
    cue: 'Lower slowly, and keep the movement small if your shoulders feel it.',
  },
  // Pull: horizontal.
  {
    id: 'cable-row', name: 'Seated cable row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Sit tall with your feet on the plate and a slight bend in your knees.', 'Pull the handle to your lower ribs, squeezing your shoulder blades together, then let it return slowly.'],
    cue: "Keep your chest up; don't rock your body to move the weight.",
  },
  {
    id: 'db-row', name: 'One-arm dumbbell row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: true, contraindications: ['back'],
    steps: ['Put one hand and knee on a bench or sturdy chair, and hold a dumbbell in the other hand.', 'Pull the weight up toward your hip, then lower it slowly. Do every rep, then switch sides.'],
    cue: 'Keep your back flat and still.',
  },
  {
    id: 'db-chest-supported-row', name: 'Chest-supported dumbbell row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['dumbbells', 'bench'],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: [],
    steps: ['Lie face down on a bench set at an incline, a dumbbell in each hand.', 'Pull both weights up beside your ribs, then lower them slowly.'],
    cue: 'Squeeze your shoulder blades together at the top.',
  },
  {
    id: 'barbell-row', name: 'Barbell bent-over row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['back'],
    steps: ['Hold the bar with straight arms, bend your knees a little and lean forward with a flat back.', 'Pull the bar to your lower ribs, then lower it with control.'],
    cue: `${LIGHT_BAR}keep your back flat the whole set.`,
  },
  {
    id: 'band-row', name: 'Band seated row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Sit with your legs out, loop the band around your feet and hold an end in each hand.', 'Pull your hands to your ribs, squeezing your shoulder blades together, then return slowly.'],
    cue: 'Sit tall and keep your shoulders down.',
  },
  {
    id: 'prone-y-raise', name: 'Prone Y raises', slots: ['horizontal_pull', 'shoulders'], pattern: 'pull', needs: [],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Lie face down with your arms overhead in a Y and your thumbs pointing up.', 'Lift your arms off the floor a little, hold for a breath, then lower.'],
    cue: 'Keep your neck long and your eyes on the floor.',
  },
  // Pull: vertical.
  {
    id: 'lat-pulldown', name: 'Lat pulldown', slots: ['vertical_pull'], pattern: 'pull', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Sit with your thighs under the pads and hold the bar a little wider than your shoulders.', 'Pull the bar down to your upper chest, then let it rise slowly.'],
    cue: "Lead with your elbows and don't lean far back.",
  },
  {
    id: 'band-pulldown', name: 'Band pulldown', slots: ['vertical_pull'], pattern: 'pull', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['shoulder'],
    steps: ['Anchor the band high, over a door or a bar, and kneel facing it with an end in each hand.', 'Pull your elbows down to your sides, then let your arms rise slowly.'],
    cue: 'Keep your chest up and your shoulders down.',
  },
  {
    id: 'chin-up-lower', name: 'Slow chin-up lowers', slots: ['vertical_pull'], pattern: 'pull', needs: ['pullup_bar'],
    level: 2, unit: 'reps', min: 3, max: 6, perSide: false, contraindications: ['shoulder', 'wrist'],
    steps: ['Step up on a sturdy chair so your chin is above the bar, palms facing you.', 'Lower yourself as slowly as you can until your arms are straight, then step back up.'],
    cue: 'Take 3 to 5 seconds on the way down; stop if your elbows or shoulders hurt.',
  },
  {
    id: 'chin-up', name: 'Chin-ups', slots: ['vertical_pull'], pattern: 'pull', needs: ['pullup_bar'],
    level: 3, unit: 'reps', min: 5, max: 10, perSide: false, contraindications: ['shoulder', 'wrist'],
    steps: ['Hang from the bar with your palms facing you, hands shoulder-width apart.', 'Pull until your chin is over the bar, then lower all the way down.'],
    cue: 'No swinging; lower with control every rep.',
  },
  // Squat and quads.
  {
    id: 'leg-press', name: 'Leg press', slots: ['squat', 'quads'], pattern: 'squat', needs: ['gym'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['knee'],
    steps: ['Sit with your back flat on the pad and your feet hip-width on the plate.', 'Lower the plate until your knees are bent to about a right angle, then press it away.'],
    cue: "Keep your lower back on the pad, and don't snap your knees straight at the top.",
  },
  {
    id: 'goblet-squat', name: 'Goblet squat', slots: ['squat', 'quads'], pattern: 'squat', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['knee'],
    steps: ['Hold one dumbbell upright against your chest, feet a little wider than your hips.', 'Sit your hips down between your heels, then stand up.'],
    cue: 'Keep your chest up and your knees pointing the same way as your toes.',
  },
  {
    id: 'db-split-squat', name: 'Dumbbell split squats', slots: ['squat', 'quads'], pattern: 'squat', needs: ['dumbbells'],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: true, contraindications: ['knee'],
    steps: ['Stand in a long stride with a dumbbell in each hand.', 'Lower your back knee toward the floor, then push back up. Do every rep, then switch legs.'],
    cue: 'Keep your front knee in line with your foot.',
  },
  {
    id: 'barbell-squat', name: 'Barbell back squat', slots: ['squat', 'quads'], pattern: 'squat', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['knee', 'back'],
    steps: ['Set the bar across your upper back in a rack, feet a little wider than your hips.', 'Sit your hips back and down as deep as your form allows, then stand up.', "Set the rack's safety bars at the bottom of your squat."],
    cue: `${LIGHT_BAR}leave 2 good reps in every set.`,
  },
  {
    id: 'band-squat', name: 'Band squats', slots: ['squat', 'quads'], pattern: 'squat', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['knee'],
    steps: ['Stand on the middle of the band and hold the ends at your shoulders.', 'Squat down as far as is comfortable, then stand up against the band.'],
    cue: 'Keep your heels down and your chest up.',
  },
  {
    id: 'chair-squat', name: 'Chair squats', slots: ['squat', 'quads'], pattern: 'squat', needs: [],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['knee'],
    steps: ['Stand in front of a sturdy chair with your feet hip-width apart.', 'Sit your hips back until you lightly touch the chair, then stand straight up again.'],
    cue: 'Keep your weight in your heels and your knees in line with your toes.',
  },
  {
    id: 'bodyweight-squat', name: 'Bodyweight squats', slots: ['squat', 'quads'], pattern: 'squat', needs: [],
    level: 2, unit: 'reps', min: 12, max: 20, perSide: false, contraindications: ['knee'],
    steps: ['Stand with your feet a little wider than your hips, toes turned slightly out.', 'Sit your hips back and down as far as is comfortable, chest up, then stand.'],
    cue: 'Go only as low as you can without pain.',
  },
  {
    id: 'split-squat', name: 'Split squats', slots: ['squat', 'quads'], pattern: 'squat', needs: [],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: true, contraindications: ['knee'],
    steps: ['Step one foot forward and one back, about a stride apart. Hold a wall or chair if you like.', 'Bend both knees to lower your back knee toward the floor, then push up. Do every rep, then switch.'],
    cue: 'Keep your front knee in line with your foot.',
  },
  {
    id: 'raised-split-squat', name: 'Back-foot-raised split squats', slots: ['squat', 'quads'], pattern: 'squat', needs: [],
    level: 3, unit: 'reps', min: 6, max: 12, perSide: true, contraindications: ['knee'],
    steps: ['Stand a stride in front of a sturdy chair and rest the top of your back foot on it.', 'Lower your back knee toward the floor, then push up through your front foot. Do every rep, then switch.'],
    cue: 'Hold a wall for balance at first, and keep your front knee in line with your foot.',
  },
  // Hinge, hamstrings and glutes.
  {
    id: 'db-glute-bridge', name: 'Dumbbell glute bridges', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Lie on your back with your knees bent and a dumbbell resting across your hips.', 'Push through your heels to lift your hips until your body is straight from knees to shoulders, then lower.'],
    cue: 'Squeeze your glutes at the top and keep your ribs down.',
  },
  {
    id: 'db-rdl', name: 'Dumbbell Romanian deadlift', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: ['dumbbells'],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['back'],
    steps: ['Stand with a dumbbell in each hand in front of your thighs, knees slightly bent.', 'Push your hips back and slide the weights down your legs until you feel a stretch, then stand tall.'],
    cue: 'Keep your back flat; the movement comes from your hips, not your spine.',
  },
  {
    id: 'barbell-rdl', name: 'Barbell Romanian deadlift', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['back'],
    steps: ['Hold the bar in front of your thighs with your knees slightly bent.', 'Push your hips back and lower the bar along your legs until you feel a stretch, then stand tall.'],
    cue: `${LIGHT_BAR}keep your back flat and the bar close.`,
  },
  {
    id: 'band-glute-bridge', name: 'Band glute bridges', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Lie on your back with your knees bent and a band looped just above your knees.', 'Lift your hips while pressing your knees gently out, then lower.'],
    cue: 'Squeeze your glutes at the top.',
  },
  {
    id: 'band-leg-curl', name: 'Band leg curls', slots: ['hamstrings_glutes'], pattern: 'hinge', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: true, contraindications: ['knee'],
    steps: ['Anchor the band low, lie face down and loop it around one ankle.', 'Bend your knee to pull your heel toward your glutes, then straighten slowly. Do every rep, then switch.'],
    cue: 'Keep your hips pressed into the floor.',
  },
  {
    id: 'glute-bridge', name: 'Glute bridges', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: [],
    level: 1, unit: 'reps', min: 12, max: 20, perSide: false, contraindications: [],
    steps: ['Lie on your back with your knees bent and your feet flat, hip-width apart.', 'Push through your heels to lift your hips, hold for a breath, then lower.'],
    cue: "Squeeze your glutes at the top; don't arch your lower back.",
  },
  {
    id: 'single-leg-bridge', name: 'Single-leg glute bridges', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: [],
    level: 2, unit: 'reps', min: 8, max: 15, perSide: true, contraindications: [],
    steps: ['Lie on your back with one knee bent and the other leg straight in the air.', 'Lift your hips with the planted leg, then lower. Do every rep, then switch.'],
    cue: 'Keep your hips level as you lift.',
  },
  {
    id: 'single-leg-reach', name: 'Single-leg reaches', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: [],
    level: 3, unit: 'reps', min: 8, max: 12, perSide: true, contraindications: ['back'],
    steps: ['Stand on one leg with a slight bend in the knee, near a wall for balance.', 'Hinge forward and reach toward the floor as your back leg lifts behind you, then stand tall. Do every rep, then switch.'],
    cue: 'Keep your back flat and your hips square to the floor.',
  },
  // Shoulders.
  {
    id: 'db-lateral-raise', name: 'Dumbbell lateral raises', slots: ['shoulders'], pattern: 'isolation', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Stand with a light dumbbell in each hand at your sides.', 'Raise your arms out to the sides until they are level with your shoulders, then lower slowly.'],
    cue: 'Lead with your elbows and keep your shoulders down.',
  },
  {
    id: 'band-lateral-raise', name: 'Band lateral raises', slots: ['shoulders'], pattern: 'isolation', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['shoulder'],
    steps: ['Stand on the band and hold an end in each hand at your sides.', 'Raise your arms out to the sides to shoulder height, then lower slowly.'],
    cue: 'Keep a slight bend in your elbows.',
  },
  {
    id: 'band-pull-apart', name: 'Band pull-aparts', slots: ['shoulders'], pattern: 'isolation', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Hold the band in front of your chest with straight arms, hands shoulder-width apart.', 'Pull the band apart until it touches your chest, then return slowly.'],
    cue: 'Squeeze your shoulder blades together and keep your shoulders down.',
  },
  // Arms.
  {
    id: 'db-curl', name: 'Dumbbell curls', slots: ['biceps'], pattern: 'isolation', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Stand with a dumbbell in each hand, palms facing forward.', 'Curl the weights up to your shoulders, then lower them slowly.'],
    cue: "Keep your elbows at your sides and don't swing.",
  },
  {
    id: 'band-curl', name: 'Band curls', slots: ['biceps'], pattern: 'isolation', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Stand on the middle of the band and hold an end in each hand, palms forward.', 'Curl your hands to your shoulders, then lower slowly.'],
    cue: 'Keep your elbows still at your sides.',
  },
  {
    id: 'db-overhead-extension', name: 'Dumbbell overhead extension', slots: ['triceps'], pattern: 'isolation', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Hold one dumbbell with both hands above your head.', 'Bend your elbows to lower it behind your head, then straighten your arms.'],
    cue: 'Keep your elbows pointing forward and your ribs down.',
  },
  {
    id: 'band-pushdown', name: 'Band pushdowns', slots: ['triceps'], pattern: 'isolation', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Anchor the band high and hold it with your elbows bent at your sides.', 'Push your hands down until your arms are straight, then let them rise slowly.'],
    cue: 'Keep your elbows pinned to your sides.',
  },
  // Core.
  {
    id: 'dead-bug', name: 'Dead bugs', slots: ['abs'], pattern: 'core', needs: [],
    level: 1, unit: 'reps', min: 6, max: 10, perSide: true, contraindications: ['back'],
    steps: ['Lie on your back with your arms pointing at the ceiling and your knees bent above your hips.', 'Slowly lower one arm and the opposite leg, then bring them back. Switch sides each rep.'],
    cue: 'Keep your lower back on the floor; make the movement smaller if it lifts.',
  },
  {
    id: 'plank', name: 'Forearm plank', slots: ['abs'], pattern: 'core', needs: [],
    level: 1, unit: 'seconds', min: 20, max: 40, perSide: false, contraindications: ['back', 'shoulder'],
    steps: ['Rest on your forearms and toes with your elbows under your shoulders.', 'Hold your body in a straight line from head to heels.'],
    cue: 'Squeeze your glutes, and drop to your knees if your lower back aches.',
  },
  {
    id: 'side-plank', name: 'Side plank', slots: ['abs'], pattern: 'core', needs: [],
    level: 2, unit: 'seconds', min: 15, max: 30, perSide: true, contraindications: ['shoulder'],
    steps: ['Lie on your side with your forearm under your shoulder and your legs stacked.', 'Lift your hips so your body is straight, and hold. Then switch sides.'],
    cue: 'Bend your bottom knee to the floor to make it easier.',
  },
  {
    id: 'lying-leg-raise', name: 'Lying leg raises', slots: ['abs'], pattern: 'core', needs: [],
    level: 2, unit: 'reps', min: 8, max: 15, perSide: false, contraindications: ['back'],
    steps: ['Lie on your back with your hands under your hips and your legs straight.', 'Raise your legs until they point up, then lower them slowly without touching the floor.'],
    cue: 'Bend your knees to make it easier, and keep your lower back down.',
  },
  {
    id: 'hanging-knee-raise', name: 'Hanging knee raises', slots: ['abs'], pattern: 'core', needs: ['pullup_bar'],
    level: 3, unit: 'reps', min: 8, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Hang from the bar with straight arms.', 'Raise your knees toward your chest, then lower them slowly.'],
    cue: 'No swinging; lower with control.',
  },
  // Calves.
  {
    id: 'calf-raise', name: 'Standing calf raises', slots: ['calves'], pattern: 'isolation', needs: [],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Stand on the edge of a step with your heels over the edge, holding a wall for balance.', 'Rise onto your toes, then lower your heels below the step slowly.'],
    cue: 'Pause at the top; hold a dumbbell to make it harder.',
  },
];

export function authoredMove(id: string): AuthoredMove {
  const move = MOVES.find((m) => m.id === id);
  if (!move) throw new RangeError(`unknown move ${id}`);
  return move;
}

/** How the move gets harder (Kaizen's double progression, in our words): weight, band, lowering or hold. */
export function progressLine(move: Pick<Move, 'unit' | 'needs'>): string {
  if (move.unit === 'seconds') return 'When the whole range feels easy, hold a few seconds longer.';
  if (move.needs.includes('bands') && !move.needs.includes('pullup_bar')) {
    return 'When every set reaches the top of the range, use a stronger band next time.';
  }
  if (move.needs.length > 0 && !(move.needs.length === 1 && move.needs[0] === 'pullup_bar')) {
    return 'When every set reaches the top of the range, go a little heavier next time.';
  }
  return 'When every set reaches the top of the range, lower more slowly. Harder versions come as your workouts climb.';
}
```

The `progressLine` rule: holds → longer; band moves → a stronger band; weights or machines → heavier; bodyweight and
pull-up-bar moves (chin-ups, hanging knee raises) → slower lowering, then a harder version.

- [ ] **Step 5: Put the training library in `LIBRARY` and export it**

In `packages/content/src/library.ts`, import the two files and replace the stop-gap:

```ts
import { MOVES } from './training/moves.ts';
import { PROGRAMS } from './training/programs.ts';
```

```ts
  training: { moves: MOVES, programs: PROGRAMS },
```

In `packages/content/src/index.ts` add:

```ts
export * from './training/moves.ts';
export * from './training/programs.ts';
```

- [ ] **Step 6: Run the content tests**

Run: `npm test -w @levelmeup/content`
Expected: PASS (the new training tests; the portable test sees `training/` files with type-only imports from the
rules).

- [ ] **Step 7: Commit**

```bash
git add packages/content
git commit -m "M6c content: the exercise library (53 moves in our own words) and the three programs"
```

---

### Task 5: Content — the workout quests, their words, and the pacing check

**Files:**
- Create: `packages/content/src/quests/workout.ts`
- Modify: `packages/content/src/library.ts`, `quests/strength.ts`, `names.ts`, `onboarding.ts`, `play.ts`, `format.ts`
- Modify: `packages/content/scripts/review.ts`
- Modify: `packages/content/test/library.test.ts`, `format.test.ts`, `onboarding.test.ts`
- Modify: `apps/mobile/src/screens/QuestCard.tsx`, `Quest.tsx`, `Swap.tsx`, `Pain.tsx` (the summary takes the stored quest)

- [ ] **Step 1: Write the failing tests**

`packages/content/test/format.test.ts`: replace the import with
`import { moveTarget, questSummary, targetText } from '../src/format.ts';` and add after the `it.each`:

```ts
  it('reads a workout template and a planned session', () => {
    expect(targetText({ kind: 'workout', sets: [2, 2, 2], level: 1 })).toBe('3 exercises, 2 sets each');
    expect(targetText({ kind: 'workout', sets: [4, 3, 3, 3], level: 3 })).toBe('4 exercises, 3–4 sets each');
    const session = {
      kind: 'session',
      moves: [
        { move: 'goblet-squat', unit: 'reps', min: 10, max: 15, perSide: false, sets: 2 },
        { move: 'plank', unit: 'seconds', min: 20, max: 40, perSide: false, sets: 2 },
      ],
    } as const;
    expect(targetText(session)).toBe('Goblet squat, Forearm plank');
    expect(moveTarget(session.moves[0])).toBe('2 sets of 10–15 reps');
    expect(moveTarget({ ...session.moves[1], perSide: true, sets: 1 })).toBe('1 hold of 20–40 seconds per side');
    expect(questSummary({ condition: session, minutes: 16 })).toBe('Goblet squat, Forearm plank · about 16 min');
  });

  it('summarises a quest as it is stored: its condition and minutes', () => {
    expect(questSummary({ condition: { kind: 'reps', sets: 3, reps: 8, perSide: false }, minutes: 10 })).toBe('3 sets of 8 · about 10 min');
    expect(questSummary({ condition: { kind: 'minutes', minutes: 20 }, minutes: 20 })).toBe('20 minutes');
    expect(questSummary({ condition: { kind: 'habit' }, minutes: 2 })).toBe('about 2 min');
  });
```

`packages/content/test/library.test.ts`:
- `COMPLETION_FOR` gains `workout: ['reps'],` and `session: [],` (a template never has a session condition).
- `volume` gains, before `default`:

```ts
    case 'workout':
      return condition.sets.reduce((sum, n) => sum + n, 0);
```

- In "has the 12 ladders and about 70 templates", rename it "has the 13 ladders and about 80 templates", put
  `'workout'` after `'own-program'` in the expected list, and raise the upper bound to 90 (the six workout rungs).
- Add to `describe('the whole library', …)`:

```ts
  it('every workout rung takes the minutes its sets take, and its hard day is one set of the first two exercises', () => {
    const rungs = ladderRungs(LIBRARY, 'workout');
    expect(rungs.map((t) => t.condition)).toEqual([
      { kind: 'workout', sets: [2, 2, 2], level: 1 },
      { kind: 'workout', sets: [2, 2, 2], level: 2 },
      { kind: 'workout', sets: [2, 2, 2], level: 3 },
      { kind: 'workout', sets: [3, 3, 3], level: 3 },
      { kind: 'workout', sets: [3, 3, 3, 3], level: 3 },
      { kind: 'workout', sets: [4, 3, 3, 3], level: 3 },
    ]);
    for (const t of rungs) {
      if (t.condition.kind !== 'workout' || t.hardDay.condition.kind !== 'workout') throw new Error(t.id);
      expect(t.minutes, t.id).toBe(workoutMinutes(t.condition.sets));
      expect(t.hardDay.condition, t.id).toEqual({ kind: 'workout', sets: [1, 1], level: t.condition.level });
      expect(t.hardDay.minutes, t.id).toBe(workoutMinutes([1, 1]));
      expect(t.contraindications, t.id).toEqual([]);
    }
  });

  it('only the workout ladder has a class affinity among the strength ladders, besides an own program (decision 7)', () => {
    const strength = LADDERS.filter((l) => l.stat === 'strength' && !l.ownProgram);
    expect(strength.filter((l) => l.affinity.length > 0).map((l) => l.id)).toEqual(['workout']);
  });
```

  and add `workoutMinutes` to the rules import.

`packages/content/test/onboarding.test.ts`: in '"most weeks" starts the training ladders one rung up…', expect
`['core', 'push', 'squat', 'walk', 'workout']`.

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w @levelmeup/content`
Expected: FAIL (no workout ladder, no `moveTarget`, the old `questSummary`).

- [ ] **Step 3: The workout ladder and its six rungs**

Create `packages/content/src/quests/workout.ts`:

```ts
// The workout ladder (M6c decision 6): every rung is a workout the rules plan for the player (planWorkout). Rungs raise
// the exercises' level first, then the sets, then add a fourth exercise. Minutes follow the rules' workoutMinutes (a
// 2-minute warm-up and 2.25 minutes a set); the hard-day version is one set of the first two exercises (7 minutes).
import type { Ladder, MoveLevel } from '../../../rules/src/index.ts';
import type { AuthoredTemplate, Voice, VoiceText } from '../types.ts';

export const WORKOUT_LADDERS: readonly Ladder[] = [
  { id: 'workout', stat: 'strength', goals: ['body'], affinity: ['warrior', 'mage', 'rogue', 'monk'], ownProgram: false, tracksBook: false },
];

const STEPS = [
  'Warm up for 2 minutes: march on the spot, circle your arms and do a few easy reps of the first exercise.',
  'Do the exercises in order, every set of one before the next.',
  'Rest about 2 minutes between sets, up to 3 after the first exercise.',
  'End each set with 1 or 2 good reps still in you.',
];
const SAFETY = ['Form comes before weight: pick a load you control on every rep.', 'If an exercise hurts, stop it and tap I felt pain below.'];

type Rung = { sets: number[]; level: MoveLevel; minutes: number; tier: 'standard' | 'major'; name: string; voice: Record<Voice, VoiceText> };

function rung(r: number, x: Rung): AuthoredTemplate {
  return {
    id: `workout-${r}`,
    role: 'ladder',
    ladder: 'workout',
    rung: r,
    stat: 'strength',
    split: null,
    tier: x.tier,
    minutes: x.minutes,
    completion: 'reps',
    condition: { kind: 'workout', sets: x.sets, level: x.level },
    exercise: 'strength',
    gentle: false,
    contraindications: [],
    hardDay: { minutes: 7, condition: { kind: 'workout', sets: [1, 1], level: x.level } },
    name: x.name,
    steps: STEPS,
    safety: SAFETY,
    voice: x.voice,
  };
}

export const WORKOUT_TEMPLATES: readonly AuthoredTemplate[] = [
  rung(0, {
    sets: [2, 2, 2], level: 1, minutes: 16, tier: 'standard', name: 'Starter workout',
    voice: {
      mentor: { title: "Today's workout", line: 'Three exercises, two easy sets each. Learn the moves before anything else.' },
      system: { title: 'Workout', line: 'Strength program, first rung. Three exercises, two sets each.' },
      questmaster: { title: 'The first forge', line: 'Three trials, two rounds each. Learn the shape of every one.' },
    },
  }),
  rung(1, {
    sets: [2, 2, 2], level: 2, minutes: 16, tier: 'standard', name: 'Steady workout',
    voice: {
      mentor: { title: "Today's workout", line: 'Some exercises step up a level today. Same sets, a little more challenge.' },
      system: { title: 'Workout', line: 'Strength program. Harder versions, two sets each.' },
      questmaster: { title: 'Trial of iron', line: 'The easy forms are behind you. Meet the harder ones.' },
    },
  }),
  rung(2, {
    sets: [2, 2, 2], level: 3, minutes: 16, tier: 'standard', name: 'Strong workout',
    voice: {
      mentor: { title: "Today's workout", line: 'The hardest versions are open now. Keep every rep clean.' },
      system: { title: 'Workout', line: 'Strength program. Full versions, two sets each.' },
      questmaster: { title: 'Trial of steel', line: 'The full form of every trial. Two rounds, no shortcuts.' },
    },
  }),
  rung(3, {
    sets: [3, 3, 3], level: 3, minutes: 23, tier: 'major', name: 'Longer workout',
    voice: {
      mentor: { title: "Today's workout", line: 'A third set for each exercise. Rest well between them.' },
      system: { title: 'Workout', line: 'Strength program. Three exercises, three sets each.' },
      questmaster: { title: 'The long forge', line: 'Three rounds of every trial. Your strength is earning its keep.' },
    },
  }),
  rung(4, {
    sets: [3, 3, 3, 3], level: 3, minutes: 29, tier: 'major', name: 'Full workout',
    voice: {
      mentor: { title: "Today's workout", line: 'A fourth exercise joins in. Take your time between sets.' },
      system: { title: 'Workout', line: 'Strength program. Four exercises, three sets each.' },
      questmaster: { title: 'Trial of the full forge', line: 'Four trials now, three rounds each. Stand ready.' },
    },
  }),
  rung(5, {
    sets: [4, 3, 3, 3], level: 3, minutes: 32, tier: 'major', name: 'Peak workout',
    voice: {
      mentor: { title: "Today's workout", line: 'The top of the program: an extra set on the first exercise. Well earned.' },
      system: { title: 'Workout', line: 'Strength program, top rung. Four exercises, an extra set on the first.' },
      questmaster: { title: 'Trial of the summit', line: 'The summit of the forge. Your first trial gets a fourth round.' },
    },
  }),
];
```

In `packages/content/src/library.ts`, import `WORKOUT_LADDERS, WORKOUT_TEMPLATES` from `./quests/workout.ts` and:

```ts
export const LADDERS: readonly Ladder[] = [...STRENGTH_LADDERS, ...WORKOUT_LADDERS, ...VITALITY_LADDERS, ...MIND_LADDERS];

export const TEMPLATES: readonly AuthoredTemplate[] = [
  ...STRENGTH_TEMPLATES,
  ...WORKOUT_TEMPLATES,
  ...VITALITY_TEMPLATES,
  ...MIND_TEMPLATES,
  ...SPECIAL_TEMPLATES,
];
```

Export the module from `src/index.ts`: `export * from './quests/workout.ts';`.

- [ ] **Step 4: Workouts lead the strength days (decision 7)**

In `packages/content/src/quests/strength.ts`, the push, squat and core ladders lose their affinity (own program keeps
it), with a comment above the array:

```ts
// Workouts lead a strength day (M6c decision 7): the workout ladder is the strength ladder every class prefers, so push,
// squat and core training now serve side quests, swaps and days too short for a workout.
export const STRENGTH_LADDERS: readonly Ladder[] = [
  { id: 'push', stat: 'strength', goals: ['body'], affinity: [], ownProgram: false, tracksBook: false },
  { id: 'squat', stat: 'strength', goals: ['body'], affinity: [], ownProgram: false, tracksBook: false },
  { id: 'core', stat: 'strength', goals: ['body'], affinity: [], ownProgram: false, tracksBook: false },
  { id: 'own-program', stat: 'strength', goals: ['body'], affinity: ['warrior'], ownProgram: true, tracksBook: false },
];
```

- [ ] **Step 5: The words**

`packages/content/src/names.ts`: change the type import to
`import type { AbilityId, ClassId, Equipment, Goal, Limitation, ProgramStyle, Stat } from '../../rules/src/index.ts';`,
add `workout: 'Workouts',` to `LADDER_NAMES` after `'own-program'`, and append:

```ts
/** The training setup's equipment as the Training step lists it (M6c decision 1). */
export const EQUIPMENT_NAMES: Readonly<Record<Equipment, string>> = {
  bands: 'Resistance bands',
  dumbbells: 'Dumbbells',
  bench: 'An adjustable bench',
  pullup_bar: 'A pull-up bar',
  gym: 'A gym: machines, barbells and cables',
};

/** The programs (owner's names, 2026-10-11), each with what it emphasises; anyone can pick any of them. */
export const PROGRAM_STYLE_CHOICES: Readonly<Record<ProgramStyle, { name: string; line: string }>> = {
  men: { name: "Men's program", line: 'More upper-body work: chest, back and shoulders.' },
  women: { name: "Women's program", line: 'More lower-body work: legs and glutes.' },
  none: { name: 'No preference', line: 'An even mix over two alternating days.' },
};
```

`packages/content/src/onboarding.ts`: add `workout: 'training',` to `SEEDS` after `walk: 'training',`; in
`ONBOARDING_TEXT`, add a `gear` entry after `body`:

```ts
  gear: {
    line: 'Your training. I build every workout from what you have.',
    equipment: 'What can you train with?',
    nothing: 'Just my body',
    style: 'Which program?',
    note: 'Any program suits anyone. You can change both later in Settings.',
  },
```

and in `rhythm`, after `ownProgram`:

```ts
    workouts: 'Workouts need 25 minutes a day or more. At 10 or 15 minutes, your strength quests stay single exercises.',
```

`packages/content/src/play.ts`: add to `PLAY_TEXT`, after `reps`:

```ts
  workout: {
    exercise: 'Exercise {n} of {total}',
    rest: 'Rest about 2 minutes between sets.',
    note: 'Each set starts at the bottom of the range. Log what you did; less still counts.',
    set: 'Set {n}',
    fewer: '{name}, set {n}, one less',
    more: '{name}, set {n}, one more',
    how: 'How to do it',
    hide: 'Hide the steps',
    log: 'Log workout',
    change: 'Change equipment or program',
  },
```

- [ ] **Step 6: Summaries from the stored quest**

Replace `packages/content/src/format.ts`:

```ts
import type { Condition, SessionMove } from '../../rules/src/index.ts';
import { authoredMove } from './training/moves.ts';

const count = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One exercise of a workout: "2 sets of 8–12 reps", "1 hold of 20–40 seconds per side". */
export function moveTarget(move: SessionMove): string {
  const side = move.perSide ? ' per side' : '';
  return move.unit === 'seconds'
    ? `${count(move.sets, 'hold')} of ${move.min}–${move.max} seconds${side}`
    : `${count(move.sets, 'set')} of ${move.min}–${move.max} reps${side}`;
}

/** "3 sets of 8", "4 holds of 30 seconds per side", "20 minutes", "One sentence", a workout's exercises; empty for a habit. */
export function targetText(condition: Condition): string {
  switch (condition.kind) {
    case 'reps':
      return `${count(condition.sets, 'set')} of ${condition.reps}${condition.perSide ? ' per side' : ''}`;
    case 'hold':
      return `${count(condition.sets, 'hold')} of ${condition.seconds} seconds${condition.perSide ? ' per side' : ''}`;
    case 'minutes':
      return count(condition.minutes, 'minute');
    case 'sentence':
      return 'One sentence';
    case 'habit':
      return '';
    case 'workout': {
      const low = Math.min(...condition.sets);
      const high = Math.max(...condition.sets);
      return `${count(condition.sets.length, 'exercise')}, ${low === high ? count(low, 'set') : `${low}–${high} sets`} each`;
    }
    case 'session':
      return condition.moves.map((m) => authoredMove(m.move).name).join(', ');
  }
}

/** A card's second line from the quest as stored (the version in use): "3 sets of 8 · about 10 min", "20 minutes". */
export function questSummary(quest: { condition: Condition; minutes: number }): string {
  if (quest.condition.kind === 'minutes') return targetText(quest.condition);
  const target = targetText(quest.condition);
  return target === '' ? `about ${quest.minutes} min` : `${target} · about ${quest.minutes} min`;
}
```

`packages/content/scripts/review.ts`, line 46: `questSummary(t)` and `questSummary(t.hardDay)` instead of
`questSummary(t, false)` and `questSummary(t, true)`.

The app's four callers pass the quest (or offer) itself, which carries its stored condition and minutes:
- `apps/mobile/src/screens/QuestCard.tsx` and `Quest.tsx`: `const summary = questSummary(quest);`
- `apps/mobile/src/screens/Swap.tsx`: `` detail: `${questSummary(f)} · ${STAT_NAMES[f.stat]} · +${xp} XP` ``
- `apps/mobile/src/screens/Pain.tsx`: `questSummary(gentle)` in the `gentleLine(…)` call.

- [ ] **Step 7: Run the content tests**

Run: `npm test -w @levelmeup/content`
Expected: PASS, except possibly the pacing tests (`campaign.test.ts`), which Step 8 settles.

- [ ] **Step 8: The pacing re-run (decision 15)**

Run: `node packages/content/scripts/campaign-report.ts 400`
Before M6c (2026-10-11, 200 runs) the tightest margins were the Warrior's steady level 10 (day 17.6, minimum 16.8) and
struggling level 10 (day 46.6, maximum 48); all targets met.

- If "All targets met.": record the table in the plan's "As built" section and go on.
- If a target fails, change the workout content only (the level curve needs the owner's OK), one change at a time, and
  re-run after each:
  1. Too fast (a minimum missed): make rungs 0–2 `minor` instead of `standard` (10 XP); their 16 minutes stay (a minor
     quest may take longer, spec §3.1).
  2. Too slow (a maximum missed): give the workout a Vitality share, `split: { strength: 0.8, vitality: 0.2 }` on every
     rung (spec §2.2 allows a secondary split), which moves XP between stats but not the level pace; if a level target
     is still missed, let the day after a workout build strength *side* quests again (remove the decision-7 line in
     `dayContext` that rests every strength ladder, and its test), which gives the Warrior's sides back their
     strength ladders.
  3. Rank C out of range only: leave it, record it in the roadmap's carried-forward table for the M9 pilot data.

  Record what was changed, and the final table, under "As built".

Run: `npm test -w @levelmeup/content -- campaign`
Expected: PASS.

- [ ] **Step 9: Run everything and commit**

Run: `npm test; npm run typecheck`
Expected: all pass.

```bash
git add -A packages/content apps/mobile/src
git commit -m "M6c content: the workout ladder (6 rungs), its words, summaries from the stored quest; pacing re-run"
```

---

### Task 6: Content — titles without numbers, per-exercise art keys, every setup plans

**Files:**
- Modify: `packages/content/src/quests/mind.ts`, `vitality.ts`, `strength.ts`, `packages/content/src/types.ts`,
  `packages/content/src/art.ts`
- Modify: `scripts/art/quest-art.py` (subjects only; rendering is Task 13)
- Modify: `packages/content/test/text.test.ts`, `art.test.ts`, `training.test.ts`, `days.test.ts`
- Modify: `apps/mobile/src/screens/Quest.tsx`, `Today.tsx` (art keys take the stored condition)

- [ ] **Step 1: Write the failing tests**

`packages/content/test/text.test.ts`, inside the `describe.each`:

```ts
  it('names no number in its titles when its hard-day version differs (M6b carried item)', () => {
    if (JSON.stringify(t.hardDay) === JSON.stringify({ minutes: t.minutes, condition: t.condition })) return;
    const number = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|hundred)\b/i;
    for (const voice of VOICES) expect(t.voice[voice].title, voice).not.toMatch(number);
  });
```

`packages/content/test/art.test.ts`: import `MOVES` from `../src/training/moves.ts`, and replace the two key tests:

```ts
  it('names each template by its own picture, its ladder, its stat for small quests, or its role', () => {
    expect(artKey(TEMPLATES.find((t) => t.id === 'push-0')!)).toBe('push-wall');
    expect(artKey(TEMPLATES.find((t) => t.id === 'push-3')!)).toBe('ladder-push');
    expect(artKey(TEMPLATES.find((t) => t.id === 'squat-0')!)).toBe('micro-strength');
    expect(artKey(TEMPLATES.find((t) => t.role === 'micro' && t.stat === 'wisdom')!)).toBe('micro-wisdom');
    expect(artKey(TEMPLATES.find((t) => t.role === 'dawn_ritual')!)).toBe('dawn-ritual');
    expect(artKey(TEMPLATES.find((t) => t.role === 'article')!)).toBe('article');
    expect(artKey(TEMPLATES.find((t) => t.role === 'recovery')!)).toBe('recovery');
    for (const t of TEMPLATES) expect(artKey(t)).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('a workout shows its first exercise\'s family (M6c decision 13)', () => {
    const workout = TEMPLATES.find((t) => t.ladder === 'workout')!;
    const session = { kind: 'session', moves: [{ move: 'db-rdl', unit: 'reps', min: 8, max: 12, perSide: false, sets: 2 }] } as const;
    expect(artKey(workout, session)).toBe('move-hinge');
  });

  it('needs 34 pictures: ladders, own rung pictures, small-quest stats, special quests and exercise families', () => {
    expect(ART_KEYS).toHaveLength(34);
    for (const ladder of LADDERS.filter((l) => l.id !== 'workout')) expect(ART_KEYS).toContain(`ladder-${ladder.id}`);
    for (const pattern of new Set(MOVES.map((m) => m.pattern))) expect(ART_KEYS).toContain(`move-${pattern}`);
    expect(ART_KEYS).toEqual(expect.arrayContaining([
      'push-wall', 'push-incline', 'push-knee', 'squat-chair', 'squat-split', 'core-dead-bug', 'core-side-plank',
      'micro-strength', 'micro-vitality', 'micro-wisdom', 'micro-focus', 'recovery', 'stillness', 'dawn-ritual', 'article',
    ]));
    expect(ART_KEYS).not.toContain('ladder-workout');
  });
```

Append to `packages/content/test/training.test.ts` (add `planWorkout, hasEquipment` and the types `Equipment,
PlayerProfile` to the rules import, and `LIBRARY` from `../src/library.ts`, `WORKOUT_TEMPLATES` from
`../src/quests/workout.ts`):

```ts
const player = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({
  classId: 'warrior', level: 5, goals: ['body'], minutesPerDay: 40, difficulty: 'steady', limitations: [], gentleStart: false,
  ownProgram: false, equipment: [], programStyle: 'none', stats: { strength: 7, vitality: 5, wisdom: 5, focus: 5 }, book: null, ...over,
});
const SETUPS: Equipment[][] = [[], ['bands'], ['dumbbells'], ['dumbbells', 'bench'], ['pullup_bar'], ['bands', 'dumbbells', 'bench', 'pullup_bar'], ['gym']];

describe('every setup gets its workouts (decision 5)', () => {
  it('plans every rung of every program for every equipment set, in full, within the equipment and level', () => {
    for (const equipment of SETUPS) {
      for (const programStyle of PROGRAM_STYLES) {
        for (const template of WORKOUT_TEMPLATES) {
          if (template.condition.kind !== 'workout') throw new Error(template.id);
          for (let done = 0; done < 3; done++) {
            const label = `${equipment.join('+') || 'body'} ${programStyle} ${template.id} day ${done}`;
            const plan = planWorkout(LIBRARY.training, template, player({ equipment, programStyle }), done);
            expect(plan, label).not.toBeNull();
            expect(plan!.length, label).toBe(template.condition.sets.length);
            expect(new Set(plan!.map((m) => m.move)).size, label).toBe(plan!.length);
            for (const m of plan!) {
              const move = authoredMove(m.move);
              expect(hasEquipment(move, equipment), `${label}: ${m.move}`).toBe(true);
              expect(move.level, `${label}: ${m.move}`).toBeLessThanOrEqual(template.condition.level);
            }
          }
        }
      }
    }
  });

  it('never plans an exercise a reported limit rules out; with every limit, a plan has 2 exercises or none', () => {
    for (const limitations of [['knee'], ['back'], ['shoulder'], ['wrist'], ['knee', 'back', 'shoulder', 'wrist']] as const) {
      for (const equipment of SETUPS) {
        for (const template of WORKOUT_TEMPLATES) {
          const plan = planWorkout(LIBRARY.training, template, player({ equipment, limitations: [...limitations] }), 0);
          if (plan === null) continue;
          expect(plan.length).toBeGreaterThanOrEqual(2);
          for (const m of plan) for (const tag of authoredMove(m.move).contraindications) expect(limitations).not.toContain(tag);
        }
      }
    }
  });

  it('climbs: bodyweight push-ups from the wall to the floor; a gym from machines to dumbbells to barbells', () => {
    const first = (level: number, equipment: Equipment[], style: 'none' | 'men' = 'none', done = 0) =>
      planWorkout(LIBRARY.training, WORKOUT_TEMPLATES[level - 1]!, player({ equipment, programStyle: style }), done)![0]!.move;
    expect([1, 2, 3].map((l) => first(l, []))).toEqual(['wall-push-up', 'incline-push-up', 'push-up']);
    expect([1, 2, 3].map((l) => first(l, ['gym'], 'men', 1))).toEqual(['leg-press', 'db-split-squat', 'barbell-squat']);
  });
});
```

(`WORKOUT_TEMPLATES[0..2]` are rungs 0–2, levels 1–3. No preference day 0 starts with horizontal push; Men's day 1
starts with squat.)

`packages/content/test/days.test.ts`:
- Import `EQUIPMENT, PROGRAM_STYLES` (and the `Equipment` type) from the rules and `authoredMove` from
  `../src/training/moves.ts`.
- In `profiles()`, give every profile a setup from its index, so the 1,024 profiles cover them all without growing:
  replace the Task 1 stop-gap `equipment: [], programStyle: 'none'` with
  `equipment: EQUIPMENT_SETS[all.length % EQUIPMENT_SETS.length]!, programStyle: PROGRAM_STYLES[all.length % 3]!`, where
  `const EQUIPMENT_SETS: Equipment[][] = [[], ['bands'], ['dumbbells', 'bench'], ['pullup_bar'], ['gym']];`.
- In `play()`, pass `workoutsDone: dayNumber - 1` (every earlier day counted as a workout, so the program rotates).
- In 'respects limitations, the safety check and own programs', inside the quest loop:

```ts
          for (const m of q.moves ?? []) {
            const move = authoredMove(m.move);
            for (const tag of move.contraindications) expect(profile.limitations).not.toContain(tag);
            expect(move.needs.every((n) => profile.equipment.includes(n) || profile.equipment.includes('gym'))).toBe(true);
          }
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w @levelmeup/content`
Expected: FAIL (numbers in titles, the old art keys).

- [ ] **Step 3: Titles without numbers**

Apply these title changes (each is the full title string; the line under it doesn't change). Run this from the repo
root; it fails if a title isn't found exactly as many times as listed:

```bash
python - <<'EOF'
from pathlib import Path
CHANGES = {
  'packages/content/src/quests/mind.ts': [
    ("title: 'Read for 5 minutes'", "title: 'A little reading'", 1), ("title: 'Read 5 minutes'", "title: 'Reading'", 1),
    ("title: 'Read for 10 minutes'", "title: 'Reading time'", 1), ("title: 'Read 10 minutes'", "title: 'Reading'", 1),
    ("title: 'Ten minutes of lore'", "title: 'Lore in the quiet'", 1),
    ("title: 'Read for 15 minutes'", "title: 'Reading time'", 1), ("title: 'Read 15 minutes'", "title: 'Reading'", 1),
    ("title: 'Read for 20 minutes'", "title: 'A longer read'", 1), ("title: 'Read 20 minutes'", "title: 'Reading'", 1),
    ("title: 'Read for 25 minutes'", "title: 'A longer read'", 1), ("title: 'Read 25 minutes'", "title: 'Reading'", 1),
    ("title: 'Read for 35 minutes'", "title: 'A long read'", 1), ("title: 'Read 35 minutes'", "title: 'Reading'", 1),
    ("title: 'One good thing'", "title: 'A good thing'", 2), ("title: 'One lesson'", "title: \"Today's lesson\"", 2),
    ("title: 'Ten-minute notes'", "title: 'Quick notes'", 2),
    ("title: 'Phone-free 10 minutes'", "title: 'Phone-free block'", 1), ("title: 'Phone-free 15 minutes'", "title: 'Phone-free block'", 1),
    ("title: 'Phone-free 20 minutes'", "title: 'Phone-free block'", 1), ("title: 'Phone-free 30 minutes'", "title: 'Phone-free block'", 1),
    ("title: 'Phone-free 35 minutes'", "title: 'Phone-free block'", 1),
    ("title: 'Two pages'", "title: 'A few pages'", 1), ("title: 'Read two pages'", "title: 'Read a few pages'", 1),
  ],
  'packages/content/src/quests/strength.ts': [
    ("title: 'Trial of eight'", "title: 'Trial of the steady descent'", 1), ("title: 'Trial of forty'", "title: 'The push-up summit'", 1),
  ],
  'packages/content/src/quests/vitality.ts': [
    ("title: 'Walk 5 minutes'", "title: 'Walk'", 1),
    ("title: 'Ten-minute walk'", "title: 'An easy walk'", 1), ("title: 'Walk 10 minutes'", "title: 'Walk'", 1),
    ("title: 'March of ten'", "title: 'The steady march'", 1),
    ("title: 'Fifteen-minute walk'", "title: 'A longer walk'", 1), ("title: 'Walk 15 minutes'", "title: 'Walk'", 1),
    ("title: 'March of fifteen'", "title: 'The open road'", 1),
    ("title: 'Twenty-minute walk'", "title: 'A good long walk'", 1), ("title: 'Walk 20 minutes'", "title: 'Walk'", 1),
    ("title: 'Brisk walk 25 minutes'", "title: 'Brisk walk'", 1), ("title: 'Brisk walk 30 minutes'", "title: 'Brisk walk'", 1),
    ("title: 'The four gates'", "title: 'The gates of breath'", 2),
  ],
}
for file, changes in CHANGES.items():
    path = Path(file)
    text = path.read_text(encoding='utf-8')
    for old, new, times in changes:
        assert text.count(old) == times, (file, old, text.count(old))
        text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')
print('titles changed')
EOF
```

- [ ] **Step 4: Per-exercise art keys**

`packages/content/src/types.ts`, in `AuthoredTemplate` after `voice`:

```ts
  /** Its own picture key, when the rung's exercise isn't the one its ladder's picture shows (M6c decision 13). */
  art?: string;
```

`packages/content/src/quests/strength.ts`: add `art: '<key>',` after `name` in these templates: `push-0` →
`'push-wall'`, `push-1` → `'push-incline'`, `push-2` → `'push-knee'`, `squat-0` → `'micro-strength'` (the sit-to-stand
picture), `squat-1` → `'squat-chair'`, `squat-4` → `'squat-split'`, `core-0` and `core-1` → `'core-dead-bug'`, `core-5` →
`'core-side-plank'`.

Replace `packages/content/src/art.ts`:

```ts
// Quest pictures (M6a decisions 1 and 10; M6c decision 13): a fixed art set covers every quest. A workout shows its first
// exercise's family; a rung whose exercise differs from its ladder's picture has its own key; other rungs show their
// ladder's, small quests their stat's, and special quests their role's. The app shows a key's picture when the art
// manifest online lists it, otherwise an ink fallback (apps/mobile/src/art/manifest.ts). The art brief,
// docs/design/quest-art.md, describes a picture for every key.
import type { Condition, QuestTemplate } from '../../rules/src/index.ts';
import { TEMPLATES } from './library.ts';
import { MOVES, authoredMove } from './training/moves.ts';

export function artKey(template: Pick<QuestTemplate, 'role' | 'ladder' | 'stat'> & { art?: string }, condition?: Condition): string {
  if (condition?.kind === 'session' && condition.moves.length > 0) return `move-${authoredMove(condition.moves[0]!.move).pattern}`;
  if (template.art !== undefined) return template.art;
  if (template.role === 'ladder' && template.ladder !== null) return `ladder-${template.ladder}`;
  if (template.role === 'micro') return `micro-${template.stat}`;
  return template.role.replace('_', '-');
}

/** Every key the quest library uses: what the art set has to cover. A workout template's own key is never shown. */
export const ART_KEYS: readonly string[] = [
  ...new Set([
    ...TEMPLATES.filter((t) => t.condition.kind !== 'workout').map((t) => artKey(t)),
    ...MOVES.map((m) => `move-${m.pattern}`),
  ]),
].sort();
```

The app passes the stored condition: `apps/mobile/src/screens/Quest.tsx` → `artKey(template, quest.condition)`;
`apps/mobile/src/screens/Today.tsx` → `artKey(authoredTemplate(q.templateId), q.condition)`.

- [ ] **Step 5: Subjects for the 14 new pictures**

In `scripts/art/quest-art.py`, add to `SUBJECTS` (after `"article"`):

```python
    # M6c: rungs with their own exercise, and the workout exercise families.
    "push-wall": "an adult man doing push-ups against a wall in a bright hallway, body in one straight line",
    "push-incline": "an adult woman doing incline push-ups with her hands on a sturdy kitchen counter",
    "push-knee": "an adult doing push-ups from the knees on a yoga mat in a living room",
    "squat-chair": "side view, an adult lowering into a squat to lightly touch a wooden chair behind them, arms forward",
    "squat-split": "an adult doing a split squat in a park, one foot forward, the back knee lowering toward the grass",
    "core-dead-bug": "an adult lying on their back on a mat, knees bent above the hips, one arm and the opposite leg reaching out",
    "core-side-plank": "an adult holding a side plank on one forearm on a mat at a beach at sunrise, body straight",
    "move-push": "an adult pressing a pair of dumbbells up from a flat bench in a small home gym",
    "move-press": "an adult woman pressing two dumbbells overhead, standing tall in a garage gym",
    "move-pull": "an adult doing a one-arm dumbbell row with one knee and hand on a bench",
    "move-squat": "an adult doing a goblet squat, holding one dumbbell against the chest, in a gym",
    "move-hinge": "an adult doing a Romanian deadlift with dumbbells, back flat and hips pushed back",
    "move-core": "an adult doing hanging knee raises from a pull-up bar in a doorway",
    "move-isolation": "an adult doing dumbbell curls in front of a gym mirror",
```

- [ ] **Step 6: Run the tests**

Run: `npm test -w @levelmeup/content; npm test -w @levelmeup/mobile`
Expected: PASS. (The app's glyph test covers the new strings.)

- [ ] **Step 7: Commit**

```bash
git add -A packages/content scripts/art apps/mobile/src
git commit -m "M6c content: titles without numbers, per-exercise art keys, every setup plans its workouts"
```

---

### Task 7: Database — migration 0009 and its tests

**Files:**
- Create: `supabase/migrations/0009_training.sql`
- Modify: `supabase/tests/db/tables.sql`, `functions.sql`, `adjust.sql`

The database tests run against the live project (`npm run db:test`, always rolled back), so they are written now and
run in Task 9 with the owner's yes. The migrations lint (`supabase/tests/unit/migrations-lint.test.ts`) runs locally.

- [ ] **Step 1: Write the database tests**

`supabase/tests/db/tables.sql`, inside `lmu_test.test_constraints()` after the `minutes_per_day` line:

```sql
  return next throws_ok(format('update levelmeup.profiles set equipment = array[''kettlebell''] where user_id = %L', a), '23514', null, 'unknown equipment');
  return next throws_ok(format('update levelmeup.profiles set program_style = %L where user_id = %L', 'unisex', a), '23514', null, 'unknown program style');
```

`supabase/tests/db/functions.sql`, append:

```sql
-- M6c: onboarding stores the training setup, or the defaults when an older phone sends none.
create function lmu_test.test_start_player_training() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.uid(41);
  b uuid := lmu_test.start(42);
begin
  insert into auth.users (id, aud, role, is_anonymous) values (a, 'authenticated', 'authenticated', true);
  perform levelmeup.start_player(a,
    '{"name": "Gym", "voice": "system", "classId": "warrior", "timeZone": "Asia/Manila", "boundaryMinutes": 240,
      "minutesPerDay": 40, "difficulty": "steady", "goals": ["body"], "limitations": [], "gentleStart": false,
      "ownProgram": false, "equipment": ["dumbbells", "bench"], "programStyle": "women", "reveal": {}}',
    '{"strength": 9, "vitality": 5, "wisdom": 5, "focus": 5, "discipline": 4}', '{}', lmu_test.day(1));
  return next is((select equipment from levelmeup.profiles where user_id = a), array['dumbbells', 'bench'], 'the equipment is stored');
  return next is((select program_style from levelmeup.profiles where user_id = a), 'women', 'the program style is stored');
  return next is((select equipment from levelmeup.profiles where user_id = b), '{}'::text[], 'no equipment by default');
  return next is((select program_style from levelmeup.profiles where user_id = b), 'none', 'no preference by default');
end $$;
```

`supabase/tests/db/adjust.sql`, append:

```sql
-- M6c: the training setup changes through adjust, re-planned quests with it.
create function lmu_test.test_adjust_training() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(51);
  setup jsonb := '{"equipment": ["gym"], "programStyle": "men"}';
begin
  perform levelmeup.adjust(a, lmu_test.ev(51), 1, 'training', setup, jsonb_build_object('training', setup));
  return next is((select equipment from levelmeup.profiles where user_id = a), array['gym'], 'the equipment changes');
  return next is((select program_style from levelmeup.profiles where user_id = a), 'men', 'the program style changes');
  return next is((select count(*) from levelmeup.events where user_id = a and type = 'training'), 1::bigint, 'the event is stored');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''training'', ''{}'', %L)', a, lmu_test.ev(52),
      '{"training": {"equipment": [], "programStyle": "unisex"}}'),
    '23514', null, 'an unknown program style is refused by the table');
  perform levelmeup.adjust(a, lmu_test.ev(53), 2, 'training', '{}',
    jsonb_build_object('training', '{"equipment": [], "programStyle": "none"}'::jsonb, 'day', jsonb_build_object('id', lmu_test.day_of(a)),
      'quests', jsonb_build_array(lmu_test.swapped(a, 'core'))));
  return next is((select template_id from levelmeup.quest_instances where id = lmu_test.quest(a, 'core')), 'mobility-0',
    'a training change can replace an open quest on the day it names');
  return next is((select equipment from levelmeup.profiles where user_id = a), '{}'::text[], 'and empty equipment means bodyweight');
end $$;
```

- [ ] **Step 2: Write migration 0009**

Create `supabase/migrations/0009_training.sql`. `start_player` and `adjust` are replaced with their 0003 and 0008
bodies plus the training parts (marked `-- M6c`):

```sql
-- M6c, Kaizen training (decisions 1, 8 and 12): the player's equipment and program style. Onboarding stores them
-- (start_player; an older phone that sends neither gets the defaults), and the `training` adjustment changes them
-- (adjust). A workout stores its planned exercises in quest_instances.condition (kind `session`): no schema change.

alter table levelmeup.profiles
  add column equipment text[] not null default '{}'
    check (equipment <@ array['bands', 'dumbbells', 'bench', 'pullup_bar', 'gym'] and cardinality(equipment) <= 5),
  add column program_style text not null default 'none' check (program_style in ('men', 'women', 'none'));

create or replace function levelmeup.start_player(p_user uuid, p_profile jsonb, p_character jsonb, p_ladders jsonb, p_day jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  day bigint;
begin
  -- Two onboarding requests at once: the second waits here, then sees the first one's profile.
  perform pg_advisory_xact_lock(hashtextextended('lmu-start:' || p_user::text, 0));
  if exists (select 1 from levelmeup.profiles where user_id = p_user) then raise exception 'lmu:already_started'; end if;
  if (p_day ->> 'dayNumber')::int <> 1 then raise exception 'lmu:out_of_order'; end if;

  insert into levelmeup.profiles (user_id, name, voice, class_id, time_zone, boundary_minutes, minutes_per_day, difficulty, goals,
    limitations, gentle_start, own_program, equipment, program_style, reveal)
  select p_user, btrim(p.name), p.voice, p."classId", p."timeZone", p."boundaryMinutes", p."minutesPerDay", p.difficulty, p.goals,
    coalesce(p.limitations, '{}'), p."gentleStart", p."ownProgram",
    coalesce(p.equipment, '{}'), coalesce(p."programStyle", 'none'), -- M6c
    p.reveal
  from jsonb_to_record(p_profile) as p(name text, voice text, "classId" text, "timeZone" text, "boundaryMinutes" int, "minutesPerDay" int,
    difficulty text, goals text[], limitations text[], "gentleStart" boolean, "ownProgram" boolean, equipment text[],
    "programStyle" text, reveal jsonb);

  insert into levelmeup.character_state (user_id, start_strength, start_vitality, start_wisdom, start_focus, start_discipline, version)
  select p_user, c.strength, c.vitality, c.wisdom, c.focus, c.discipline, 1
  from jsonb_to_record(p_character) as c(strength smallint, vitality smallint, wisdom smallint, focus smallint, discipline smallint);

  insert into levelmeup.ladder_states (user_id, ladder_id, state)
  select p_user, l.key, l.value from jsonb_each(coalesce(p_ladders, '{}')) l;

  day := levelmeup.insert_day(p_user, p_day);
  return jsonb_build_object('dayId', day, 'version', 1);
end $$;

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
begin
  v := levelmeup.lock_player(p_user);
  -- A repeat returns what it returned the first time, whatever has happened since; the same id for anything else is refused.
  select * into e from levelmeup.events where user_id = p_user and client_event_id = p_event;
  if found then
    if e.type <> p_type or e.payload <> p_payload then raise exception 'lmu:event_reused'; end if;
    return e.result;
  end if;
  if p_type not in ('swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training') then
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
  elsif jsonb_array_length(coalesce(p_change -> 'quests', '[]')) > 0 then
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

  if jsonb_typeof(p_change -> 'ability') = 'object' then
    if (p_change -> 'ability' ->> 'id') not in ('stillness', 'dawn_ritual') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.character_state
    set ability_last_used = ability_last_used || jsonb_build_object(p_change -> 'ability' ->> 'id', (p_change -> 'ability' ->> 'day')::int)
    where user_id = p_user;
  end if;

  v := levelmeup.bump(p_user);
  outcome := jsonb_build_object('type', p_type, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result) values (p_user, p_event, p_type, p_payload, outcome);
  return outcome;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.start_player(uuid, jsonb, jsonb, jsonb, jsonb) to lmu_service;
grant execute on function levelmeup.adjust(uuid, uuid, int, text, jsonb, jsonb) to lmu_service;
```

After writing it, diff the copied bodies against 0003 (`start_player`) and 0008 (`adjust`) so only the `-- M6c` parts
differ:

Run: `git diff --no-index --word-diff <(sed -n '/create function levelmeup.adjust/,/^end \$\$;/p' supabase/migrations/0008_adjust_day.sql) <(sed -n '/create or replace function levelmeup.adjust/,/^end \$\$;/p' supabase/migrations/0009_training.sql)`
Expected: only the `create or replace`, the `'training'` in the type list and the training block differ. The same for
`start_player` against 0003.

A `program_style` null (a `training` change without a style) fails the column's `not null`, so a malformed change can't
blank it.

- [ ] **Step 3: Run the local migration checks**

Run: `cd supabase && npx vitest run --project unit -- migrations`
Expected: PASS (numbering, no `public`, the revoke after functions).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0009_training.sql supabase/tests/db
git commit -m "M6c database: equipment and program style on profiles; start_player and adjust store them (0009)"
```

---

### Task 8: Server — the training setup, workouts done, sessions and the `training` event

**Files:**
- Modify: `supabase/functions/_shared/state.ts`, `db.ts`, `today.ts`, `advance.ts`, `onboarding.ts`, `events.ts`,
  `adjust.ts`
- Modify: `supabase/tests/unit/fixtures.ts`, `onboarding.test.ts`, `events.test.ts`, `adjust.test.ts`, `advance.test.ts`

- [ ] **Step 1: Fixtures with a training setup**

`supabase/tests/unit/fixtures.ts`:
- `choices()` gains `equipment: [], programStyle: 'none',` after `ownProgram: false,` (Choices gets the fields in
  Step 3).
- `profileRow()` gains `equipment: c.equipment, program_style: c.programStyle,` after `own_program: c.ownProgram,`.
- `afterDay1()` gains `workoutsDone: 0,` after `queued: false,`.
- `apps/mobile/test/support/fixtures.ts`: the `serverState()` snapshot gains `workoutsDone: 0,` after `painReports: 0,`
  (the phone's fixtures build a `Snapshot` too).
- `dayTwoSnapshot()` gains `workoutsDone: 0,` after `painReports: 0,`, and drafts a workout with its plan. Replace the
  `quests` mapping's inner draft with a helper defined above the function:

```ts
/** A template drafted for the default player, a workout with its plan (program day 0). */
function drafted(templateId: string, slot: Slot, why: WhyReason): InstanceDraft {
  const template = templateById(LIBRARY, templateId);
  const player = toProfile(profileRow(), startPoints(characterRow()), statXp(characterRow()));
  const moves = isWorkout(template) ? planWorkout(LIBRARY.training, template, player, 0) : null;
  return toDraft(LIBRARY, draftQuest(template, slot, why, { moves }));
}
```

  and use `drafted(slots[slot], slot, { code: 'balance', stat: 'vitality' })` for core and sides. Import `isWorkout`,
  `planWorkout` and the `WhyReason` type from the rules, `toProfile`, `startPoints`, `statXp` and the `InstanceDraft`
  type from `state.ts`.

- [ ] **Step 2: Write the failing tests**

`supabase/tests/unit/onboarding.test.ts`, add:

```ts
describe('the training setup (M6c decision 1)', () => {
  it('takes equipment and a program style, or the defaults from an older phone', () => {
    const set = parseOnboarding(onboardingBody({ equipment: ['dumbbells', 'bench'], programStyle: 'women' }));
    expect(set).toMatchObject({ equipment: ['dumbbells', 'bench'], programStyle: 'women' });
    expect(parseOnboarding(onboardingBody())).toMatchObject({ equipment: [], programStyle: 'none' });
  });

  it('refuses unknown or repeated equipment and an unknown style', () => {
    for (const body of [{ equipment: ['kettlebell'] }, { equipment: ['bands', 'bands'] }, { equipment: 'gym' }, { programStyle: 'unisex' }]) {
      expect(parseOnboarding(onboardingBody(body))).toMatchObject({ status: 400, code: 'bad_field' });
    }
  });

  it('stores the setup with the profile; day 1 stays light, so it has no workout', () => {
    const args = startArgs(choices({ equipment: ['gym'], programStyle: 'men' }), templateReveal(choices()), ONBOARDED, LIBRARY);
    expect(args.profile).toMatchObject({ equipment: ['gym'], programStyle: 'men' });
    expect(args.day.quests.some((q) => q.condition.kind === 'session')).toBe(false);
  });

  it('a player who trains most weeks starts the workout ladder one rung up', () => {
    const args = startArgs(choices({ training: 'most' }), templateReveal(choices()), ONBOARDED, LIBRARY);
    expect(args.ladders.workout).toMatchObject({ rung: 1 });
  });
});
```

`supabase/tests/unit/events.test.ts`, add (import `sessionCondition`, `planWorkout`, `templateById`, `newLadder` as needed
from the rules and `LIBRARY` from the content):

```ts
describe('the training event (M6c decision 12)', () => {
  const parse = (event: Record<string, unknown>) => parseSyncBody({ timeZone: 'Asia/Manila', events: [{ id: ID, ...event }] });

  it('carries the equipment and the program style', () => {
    expect(parse({ type: 'training', equipment: ['dumbbells', 'bench'], programStyle: 'women' })).toMatchObject({
      events: [{ type: 'training', equipment: ['dumbbells', 'bench'], programStyle: 'women' }], rejected: [],
    });
    expect(parse({ type: 'training', equipment: [], programStyle: 'none' })).toMatchObject({ rejected: [] });
  });

  it('refuses unknown or repeated equipment and an unknown style', () => {
    for (const bad of [
      { equipment: ['kettlebell'], programStyle: 'none' }, { equipment: ['gym', 'gym'], programStyle: 'none' },
      { equipment: 'gym', programStyle: 'none' }, { equipment: [], programStyle: 'unisex' }, { equipment: [] },
    ]) {
      expect(parse({ type: 'training', ...bad })).toMatchObject({ events: [], rejected: [{ code: 'bad_event' }] });
    }
  });
});

describe('a workout log (M6c decision 9)', () => {
  const template = templateById(LIBRARY, 'workout-0');
  const player = toProfile(profileRow(), startPoints(characterRow()), statXp(characterRow()));
  const moves = planWorkout(LIBRARY.training, template, player, 0)!;
  const workout = { completion: 'reps' as const, condition: sessionCondition(template, moves, false), minutes: 16 };
  const check = (instance: typeof workout, payload: unknown) => checkCompletionPayload(instance, DAY, payload, start + 60 * MIN);

  it('has exactly one entry per planned set', () => {
    expect(check(workout, { sets: [10, 10, 9, 8, 12, 12] })).toEqual({ payload: { sets: [10, 10, 9, 8, 12, 12] } });
    expect(check(workout, { sets: [10, 10, 9, 8, 12] })).toEqual({ code: 'bad_payload' });
    expect(check(workout, { sets: [10, 10, 9, 8, 12, 12, 1] })).toEqual({ code: 'bad_payload' });
  });

  it('a hard-day workout logs one set of each of its first two exercises', () => {
    const hard = { ...workout, condition: sessionCondition(template, moves, true), minutes: 7 };
    expect(check(hard, { sets: [12, 10] })).toEqual({ payload: { sets: [12, 10] } });
  });
});
```

`ID`, `DAY`, `start` and `MIN` are the file's own constants. Import `planWorkout`, `sessionCondition` and
`templateById` from the rules, `LIBRARY` from the content, `toProfile`, `startPoints`, `statXp` from `state.ts`, and
`profileRow`, `characterRow` from `./fixtures.ts`.

`supabase/tests/unit/adjust.test.ts`, add (the file's `plan(s, event)` helper and `NOW` apply):

```ts
describe('changing the training setup (M6c decision 12)', () => {
  const withWorkout = (over: Partial<Snapshot> = {}) => dayTwoSnapshot({ ...DAY_TWO_SLOTS, core: 'workout-0' }, over);

  it('stores the setup and re-plans today\'s open workout with it', () => {
    const s = withWorkout();
    const result = plan(s, { type: 'training', equipment: ['gym'], programStyle: 'men' });
    if (!('change' in result)) throw new Error(JSON.stringify(result));
    expect(result.change.training).toEqual({ equipment: ['gym'], programStyle: 'men' });
    const [core] = result.change.quests!;
    const template = templateById(LIBRARY, 'workout-0');
    const player: PlayerProfile = { ...toProfile(s.profile, startPoints(s.character), statXp(s.character)), equipment: ['gym'], programStyle: 'men' };
    expect(core).toMatchObject({ id: 200, templateId: 'workout-0', minutes: 16 });
    expect(core!.condition).toEqual(sessionCondition(template, planWorkout(LIBRARY.training, template, player, 0)!, false));
  });

  it('leaves a cleared workout, and every other quest, as it is', () => {
    const s = withWorkout();
    const cleared = { ...s, instances: s.instances.map((q) => (String(q.id) === '200' ? { ...q, completed_at: new Date(NOW - HOUR) } : q)) };
    expect(plan(cleared, { type: 'training', equipment: ['bands'], programStyle: 'none' })).toEqual({
      change: { training: { equipment: ['bands'], programStyle: 'none' } },
    });
    expect(plan(at(), { type: 'training', equipment: ['bands'], programStyle: 'none' })).toEqual({
      change: { training: { equipment: ['bands'], programStyle: 'none' } },
    });
  });

  it('after the day has ended, only the setup changes', () => {
    const late = planAdjust(withWorkout(), { id: 'e', type: 'training', equipment: [], programStyle: 'women' }, { nowMs: manilaDay(3).startsAt, library: LIBRARY });
    expect(late).toEqual({ change: { training: { equipment: [], programStyle: 'women' } } });
  });
});
```

Import `planWorkout`, `sessionCondition` and the `PlayerProfile` type from the rules and `toProfile`, `startPoints`,
`statXp` from `state.ts` in the test file.

`supabase/tests/unit/advance.test.ts`, add (import `planAdvance` if not imported, `planWorkout`, `sessionCondition`,
`templateById` from the rules, `CONTENT_VERSION` and `LIBRARY` from the content, and the state helpers):

```ts
describe('workouts on built days (M6c decision 5)', () => {
  it('the next strength day is a workout planned from the workouts done so far', () => {
    const s = dayTwoSnapshot({ core: 'walk-1', side1: 'reading-0', side2: 'focus-0' }, { workoutsDone: 1 });
    const outcome = planAdvance({ ...s, timeZone: 'Asia/Manila', nowMs: manilaDay(3).startsAt + HOUR, library: LIBRARY, contentVersion: CONTENT_VERSION });
    const core = outcome!.newDay!.quests.find((q) => q.slot === 'core')!;
    expect(core.templateId).toBe('workout-0');
    const template = templateById(LIBRARY, 'workout-0');
    const player = toProfile(s.profile, startPoints(s.character), statXp(s.character));
    expect(core.condition).toEqual(sessionCondition(template, planWorkout(LIBRARY.training, template, player, 1)!, false));
  });
});
```

(Day 3 is a Warrior's main-stat day, and day 2 had no strength quest, so its core is a workout.)

- [ ] **Step 3: Run them to see them fail**

Run: `cd supabase && npx vitest run --project unit`
Expected: FAIL (no training fields, no `training` event, no `workoutsDone`).

- [ ] **Step 4: State, snapshot and inputs**

`supabase/functions/_shared/state.ts`:
- Add `Equipment` and `ProgramStyle` to the rules type import.
- `ProfileRow`: after `own_program: boolean;` add `equipment: Equipment[];` and `program_style: ProgramStyle;`.
- `toProfile`: replace the Task 1 stop-gap with `equipment: p.equipment, programStyle: p.program_style,`.
- `Snapshot`: after `painReports` add

```ts
  /** Workouts completed so far (M6c): the program day of the next workout (rules: planWorkout). */
  workoutsDone: number;
```

- `stateView`'s `profile`: after `ownProgram: s.profile.own_program,` add
  `equipment: s.profile.equipment, programStyle: s.profile.program_style,`.

`supabase/functions/_shared/db.ts`, in `loadSnapshot`, after the `pain` query:

```ts
    const { workouts } = one(await tx<{ workouts: number }[]>`
      select count(*)::int as workouts from levelmeup.quest_instances
      where user_id = ${userId} and completed_at is not null and condition ->> 'kind' = 'session'`);
```

and return `workoutsDone: workouts` with the rest.

`supabase/functions/_shared/today.ts`, `todayInput`: `workoutsDone: s.workoutsDone,` (replacing the stop-gap).

`supabase/functions/_shared/advance.ts`: `AdvanceInput` gains

```ts
  /** Workouts completed so far, the days being closed included (Snapshot.workoutsDone). */
  workoutsDone: number;
```

and the `buildDay` input uses `workoutsDone: input.workoutsDone` (replacing the stop-gap). `lmu-sync` passes the
snapshot through (`{ ...snapshot, … }`), so it needs no change.

- [ ] **Step 5: Onboarding takes the setup**

`supabase/functions/_shared/onboarding.ts`:
- Import `EQUIPMENT`, `PROGRAM_STYLES` and the `Equipment`, `ProgramStyle` types from the rules.
- `OnboardingBody` gains, after `limitations`:

```ts
  /** M6c: what the player can train with; an older phone sends none (bodyweight). */
  equipment?: Equipment[];
  /** M6c: their program; an older phone sends none (no preference). */
  programStyle?: ProgramStyle;
```

- `Choices` gains `equipment: Equipment[];` and `programStyle: ProgramStyle;` after `ownProgram`.
- In `parseOnboarding`, before the `return`:

```ts
  const equipment = body.equipment ?? [];
  if (!Array.isArray(equipment) || new Set(equipment).size !== equipment.length || !equipment.every((e) => EQUIPMENT.includes(e as Equipment))) {
    return bad('equipment');
  }
  const programStyle = body.programStyle ?? 'none';
  if (!PROGRAM_STYLES.includes(programStyle as ProgramStyle)) return bad('programStyle');
```

  and add `equipment: equipment as Equipment[], programStyle: programStyle as ProgramStyle,` to the returned object.
- In `startArgs`: the `player` gets `equipment: choices.equipment, programStyle: choices.programStyle,` (replacing the
  stop-gap); the stored `profile` gets the same two fields after `ownProgram: choices.ownProgram,`.

- [ ] **Step 6: The `training` event and the session log**

`supabase/functions/_shared/events.ts`:
- Import `EQUIPMENT`, `PROGRAM_STYLES`, `sessionSets` and the `Equipment`, `ProgramStyle` types from the rules.
- Add the event type and put it in `AdjustEvent` and `ADJUST_TYPES`:

```ts
/** M6c: the player's training setup (Settings → Training); today's open workout is re-planned with it. */
export type TrainingEvent = { id: string; type: 'training'; equipment: Equipment[]; programStyle: ProgramStyle };
```

```ts
export type AdjustEvent =
  | SwapEvent | HardDayEvent | RestEvent | PainEvent | ResumeEvent | StepDownEvent | ClassChangeEvent | AbilityEvent | TrainingEvent;
```

```ts
export const ADJUST_TYPES: readonly AdjustEvent['type'][] = [
  'swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training',
];
```

- In `parseEvent`, before `default`:

```ts
    case 'training': {
      const equipment = raw.equipment;
      if (!Array.isArray(equipment) || new Set(equipment).size !== equipment.length) return bad;
      if (!equipment.every((e) => EQUIPMENT.includes(e as Equipment)) || !PROGRAM_STYLES.includes(raw.programStyle as ProgramStyle)) return bad;
      return { id, type: 'training', equipment: equipment as Equipment[], programStyle: raw.programStyle as ProgramStyle };
    }
```

- In `checkCompletionPayload`'s `'reps'` case, before `return { payload: { sets } };`:

```ts
      // A workout logs every planned set, in order (M6c decision 9).
      if (instance.condition.kind === 'session' && sets.length !== sessionSets(instance.condition)) return { code: 'bad_payload' };
```

`supabase/functions/_shared/adjust.ts`:
- Import `draftQuest`, `isWorkout`, `planWorkout` and the `Equipment`, `ProgramStyle` types from the rules.
- `Change` gains `training?: { equipment: Equipment[]; programStyle: ProgramStyle };`.
- In `plan`'s `switch`, add:

```ts
    case 'training': {
      // The setup always changes; today's open workouts are re-planned with it, same rung and reward (decision 12).
      const training = { equipment: event.equipment, programStyle: event.programStyle };
      const day = openDay(s);
      if (day === null || nowMs >= day.ends_at.getTime()) return { change: { training } };
      const input = todayInput(s, day);
      const player = { ...input.profile, ...training };
      const quests: QuestChange[] = [];
      for (const q of questsOf(s, day)) {
        if (q.completed_at !== null || !QUEST_SLOTS.includes(q.slot)) continue;
        const template = findTemplate(library, q.template_id);
        if (template === undefined || !isWorkout(template)) continue;
        const moves = planWorkout(library.training, template, player, input.workoutsDone);
        if (moves === null) continue; // too few exercises fit the new setup: today's plan stays
        quests.push(replace(library, q, draftQuest(template, q.slot, q.why, { hardDay: q.hard_day, book: q.book, moves })));
      }
      return { change: quests.length === 0 ? { training } : { training, day: { id: Number(day.id) }, quests } };
    }
```

- [ ] **Step 7: Run the server tests and the checks**

Run: `cd supabase && npx vitest run --project unit`
Expected: PASS.

Run: `npm test; npm run typecheck; npm run check:functions`
Expected: all pass (the app compiles against the new `stateView` profile fields).

- [ ] **Step 8: Commit**

```bash
git add -A supabase/functions supabase/tests/unit
git commit -m "M6c server: training setup in onboarding and state, workouts done, session logs, the training event"
```

---

### Task 9: Deploy (needs the owner's yes) and the live tests

**Files:**
- Modify: `supabase/tests/live/live.test.ts`

- [ ] **Step 1: Write the live tests**

Append to `supabase/tests/live/live.test.ts`:

```ts
describe('the training setup (M6c)', () => {
  let t: Player;

  it('onboarding stores the equipment and the program style', async () => {
    t = await newPlayer();
    const res = await call('lmu-onboarding', t.token, { ...ONBOARDING, equipment: ['dumbbells', 'bench'], programStyle: 'women' });
    expect(res.status).toBe(201);
    expect(res.body.state.profile).toMatchObject({ equipment: ['dumbbells', 'bench'], programStyle: 'women' });
  });

  it('a training event changes them; a repeat changes nothing; a bad one is refused', async () => {
    const change = { id: eventId(), type: 'training', equipment: ['gym'], programStyle: 'men' };
    const res = await sync(t, [change, { id: eventId(), type: 'training', equipment: ['kettlebell'], programStyle: 'men' }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(res.body.rejected).toEqual([expect.objectContaining({ code: 'bad_event' })]);
    expect(res.body.state.profile).toMatchObject({ equipment: ['gym'], programStyle: 'men' });
    const again = await sync(t, [change]);
    expect(again.body.results[0].result).toEqual(res.body.results[0].result);
  });
});
```

`sync`, `ONBOARDING`, `Player`, `newPlayer`, `call` and `eventId` are the file's own helpers; the `afterAll` that deletes
test players covers this one (check that new players are registered the way the M6b block's are).

Run locally only the type side: `npm run typecheck`. Do **not** run the live project without the yes (and never a
bare `npx vitest run` in `supabase/`).

- [ ] **Step 2: Ask the owner (batched)**

Ask Danny for one yes covering: `npm run db:deploy` (migration 0009: two profile columns with defaults, `start_player`
and `adjust` replaced), `npm run db:test`, `npm run deploy:functions` (the three functions), `npm run test:live`, and
the v3 art upload in Task 14. Nothing adds a monthly cost. Keep building Tasks 10–13 while waiting.

- [ ] **Step 3: Deploy and test (after the yes)**

Run, in order, stopping at the first failure:
1. `npm run db:deploy` — expect 0009 applied and the wedding's migration history unchanged (the runner checks).
2. `npm run db:test` — expect every file ok, including the new `test_start_player_training` and `test_adjust_training`.
3. `npm run deploy:functions` — expect `lmu-onboarding`, `lmu-sync`, `lmu-account-delete` deployed and ACTIVE.
4. `npm run test:live` — expect every live test to pass, the new ones included.
5. The read-only leftovers check (`scratchpad/leftovers.ts` via `scripts/sb.ts`): 0 test players left.

Record the results in `.claude/build-loop.local.md` and the plan's "As built".

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/live/live.test.ts
git commit -m "M6c live tests: the training setup in onboarding and the training event"
```

---

### Task 10: App — the Training step in onboarding

**Files:**
- Modify: `apps/mobile/src/onboarding/flow.ts`, `src/screens/onboarding/RhythmStep.tsx`, `test/support/fixtures.ts`
- Create: `apps/mobile/src/screens/onboarding/GearStep.tsx`, `apps/mobile/app/onboarding/gear.tsx`
- Modify: `apps/mobile/test/flow.test.ts`, `test/onboarding.test.tsx`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/support/fixtures.ts`: `READY_DRAFT` gains `equipment: [], noEquipment: true, programStyle: 'none',`
(a finished interview answered the Training step).

`apps/mobile/test/flow.test.ts`: import `toggleEquipment`; in 'goes to the next screen this player sees…', the step
after `body` for `READY` is now `STEP_PATH.gear`; add:

```ts
describe('the Training step (M6c decision 2)', () => {
  it('follows Body when strength work is possible; never for an own plan or a gentle start', () => {
    expect(stepsFor(READY)).toEqual(['awakening', 'voice', 'goals', 'body', 'gear', 'rhythm', 'slip']);
    expect(nextPath(READY, 'body')).toBe(STEP_PATH.gear);
    expect(stepsFor({ ...READY, training: 'own' })).not.toContain('gear');
    expect(stepsFor({ ...READY, safety: READY.safety.map((_, i) => i === 0) })).not.toContain('gear');
  });

  it('needs a program, and equipment or "Just my body"', () => {
    expect(complete({ ...READY, programStyle: null }, 'gear')).toBe(false);
    expect(complete({ ...READY, equipment: [], noEquipment: false }, 'gear')).toBe(false);
    expect(complete({ ...READY, equipment: ['bands'], noEquipment: false, programStyle: 'women' }, 'gear')).toBe(true);
    expect(complete({ ...READY, programStyle: 'men' }, 'gear')).toBe(true);
  });

  it('"Just my body" and equipment exclude each other', () => {
    expect(toggleEquipment({ ...READY, equipment: ['bands'], noEquipment: false }, 'nothing')).toEqual({ equipment: [], noEquipment: true });
    expect(toggleEquipment(READY, 'gym')).toEqual({ equipment: ['gym'], noEquipment: false });
    expect(toggleEquipment({ ...READY, equipment: ['gym'], noEquipment: false }, 'gym')).toEqual({ equipment: [], noEquipment: false });
  });

  it('sends the setup, or the defaults when the step was skipped; the server accepts both', () => {
    const asked = toRequest({ ...READY, equipment: ['dumbbells'], noEquipment: false, programStyle: 'women' }, 'Asia/Manila', false);
    expect(asked).toMatchObject({ equipment: ['dumbbells'], programStyle: 'women' });
    const own = toRequest({ ...READY, training: 'own', equipment: ['gym'], programStyle: 'men' }, 'Asia/Manila', false);
    expect(own).toMatchObject({ equipment: [], programStyle: 'none' });
    expect(isProblem(parseOnboarding(asked))).toBe(false);
    expect(isProblem(parseOnboarding(own))).toBe(false);
  });

  it('a draft saved before M6c comes back with the Training step unanswered', () => {
    const old = JSON.stringify({ ...READY, equipment: undefined, noEquipment: undefined, programStyle: undefined });
    expect(restoreDraft(old)).toMatchObject({ equipment: [], noEquipment: false, programStyle: null });
  });
});
```

`apps/mobile/test/onboarding.test.tsx`: import `GearStep` and `EQUIPMENT_NAMES, PROGRAM_STYLE_CHOICES`; add:

```tsx
describe('Training (M6c)', () => {
  it('waits for the equipment and a program, then goes on to Rhythm', async () => {
    const onNavigate = jest.fn();
    await show(<GearStep onNavigate={onNavigate} />, { ...READY_DRAFT, equipment: [], noEquipment: false, programStyle: null });
    for (const name of Object.values(EQUIPMENT_NAMES)) expect(screen.getByRole('checkbox', { name })).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: EQUIPMENT_NAMES.dumbbells }));
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    const women = PROGRAM_STYLE_CHOICES.women;
    await fireEvent.press(screen.getByRole('radio', { name: `${women.name}. ${women.line}` }));
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.rhythm);
  });
});
```

and in 'Rhythm and effort (O05)':

```tsx
  it('says when workouts won\'t fit: 10 or 15 minutes a day', async () => {
    await show(<RhythmStep onNavigate={() => {}} />, { ...READY_DRAFT, minutesPerDay: 15 });
    expect(screen.getByText(ONBOARDING_TEXT.rhythm.workouts)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '25 minutes a day' }));
    expect(screen.queryByText(ONBOARDING_TEXT.rhythm.workouts)).toBeNull();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w @levelmeup/mobile -- flow onboarding`
Expected: FAIL (no `gear` step).

- [ ] **Step 3: The flow**

`apps/mobile/src/onboarding/flow.ts`:
- Add `Equipment, ProgramStyle` to the rules type import.
- `Draft` gains, after `noLimits`:

```ts
  /** M6c: what the player can train with; empty with `noEquipment` means bodyweight only. */
  equipment: Equipment[];
  /** "Just my body" was picked (otherwise no equipment and "not answered yet" look the same). */
  noEquipment: boolean;
  programStyle: ProgramStyle | null;
```

- `NEW_DRAFT` gains `equipment: [], noEquipment: false, programStyle: null,`.
- `Step` gains `'gear'`; `STEP_PATH` gains `gear: '/onboarding/gear',`.
- Add, after `asksMind`:

```ts
/** The Training screen is for players who may get strength work: not their own plan, a clear safety check (M6c). */
export function asksGear(draft: Draft): boolean {
  return draft.training !== 'own' && !gentleStart(draft);
}
```

- `stepsFor` becomes:

```ts
export function stepsFor(draft: Draft): Step[] {
  return [
    'awakening', 'voice', 'goals', 'body', ...(asksGear(draft) ? (['gear'] as const) : []),
    ...(asksMind(draft) ? (['mind'] as const) : []), 'rhythm', 'slip',
  ];
}
```

- `complete` gains:

```ts
    case 'gear':
      return draft.programStyle !== null && (draft.noEquipment || draft.equipment.length > 0);
```

- After `toggleLimit`:

```ts
/** "Just my body" and the equipment exclude each other. */
export function toggleEquipment(draft: Draft, item: Equipment | 'nothing'): Pick<Draft, 'equipment' | 'noEquipment'> {
  if (item === 'nothing') return { equipment: [], noEquipment: !draft.noEquipment };
  const has = draft.equipment.includes(item);
  return { equipment: has ? draft.equipment.filter((e) => e !== item) : [...draft.equipment, item], noEquipment: false };
}
```

- `toRequest` gains, after `limitations`:

```ts
    equipment: asksGear(draft) ? draft.equipment : [],
    programStyle: asksGear(draft) ? (draft.programStyle ?? 'none') : 'none',
```

- `draftProfile`: replace the Task 1 stop-gap with
  `equipment: asksGear(draft) ? draft.equipment : [], programStyle: draft.programStyle ?? 'none',`.

`gentleStart` is declared below `asksGear` today; move `gentleStart` above `asksGear` if the linter complains about use
before definition (function declarations are hoisted, so it runs either way).

- [ ] **Step 4: The screen and its route**

Create `apps/mobile/src/screens/onboarding/GearStep.tsx`:

```tsx
// The Training step (M6c decisions 1–2): what the player can train with, and the program their workouts follow. Shown
// only when strength work is possible (not their own plan, a clear safety check); otherwise the defaults are sent.
import { EQUIPMENT_NAMES, ONBOARDING_TEXT, PROGRAM_STYLE_CHOICES } from '@levelmeup/content';
import { EQUIPMENT, PROGRAM_STYLES } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath, toggleEquipment } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label, Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.gear;

export function GearStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="gear" line={T.line} canContinue={complete(draft, 'gear')} onContinue={() => onNavigate(nextPath(draft, 'gear'))}>
      <View style={{ gap: 12 }}>
        <Label>{T.equipment}</Label>
        {EQUIPMENT.map((item) => (
          <OptionCard key={item} kind="checkbox" label={EQUIPMENT_NAMES[item]} selected={draft.equipment.includes(item)}
            onPress={() => editDraft(toggleEquipment(draft, item))} />
        ))}
        <OptionCard kind="checkbox" label={T.nothing} selected={draft.noEquipment} onPress={() => editDraft(toggleEquipment(draft, 'nothing'))} />
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.style}</Label>
        {PROGRAM_STYLES.map((style) => (
          <OptionCard key={style} label={PROGRAM_STYLE_CHOICES[style].name} detail={PROGRAM_STYLE_CHOICES[style].line}
            selected={draft.programStyle === style} onPress={() => editDraft({ programStyle: style })} />
        ))}
      </View>
      <Small>{T.note}</Small>
    </QuestionFrame>
  );
}
```

Create `apps/mobile/app/onboarding/gear.tsx`:

```tsx
import { router } from 'expo-router';
import { GearStep } from '../../src/screens/onboarding/GearStep.tsx';

export default function GearRoute() {
  return <GearStep onNavigate={(path) => router.push(path)} />;
}
```

`apps/mobile/src/screens/onboarding/RhythmStep.tsx`: import `workoutsFit` from the rules and add, after `noStrength`:

```tsx
  const noWorkouts = draft.training !== 'own' && !gentleStart(draft) && !workoutsFit(LIBRARY, draftProfile(draft));
```

and below the own-program note:

```tsx
        {noWorkouts && (
          <NightCard>
            <Small tone="chalk">{T.workouts}</Small>
          </NightCard>
        )}
```

Extend the file's header comment with "M6c: and a player at 10 or 15 minutes that workouts need 25."

- [ ] **Step 5: Run the tests**

Run: `npm test -w @levelmeup/mobile`
Expected: PASS (the Reveal's "Training, limits and the safety check" fix still opens Body, whose Continue now leads to
Training).

- [ ] **Step 6: Commit**

```bash
git add -A apps/mobile
git commit -m "M6c app: the Training step in onboarding (equipment and program), the workouts note on Rhythm"
```

---

### Task 11: App — a workout on the quest screen

**Files:**
- Modify: `apps/mobile/src/quest/payload.ts`, `src/screens/quest/RepLog.tsx` (export its stepper), `src/screens/Quest.tsx`,
  `app/quest/[id].tsx`
- Create: `apps/mobile/src/screens/quest/WorkoutLog.tsx`, `apps/mobile/app/dev/workout.tsx`
- Modify: `apps/mobile/app/dev/index.tsx`, `apps/mobile/test/support/fixtures.ts`, `test/payload.test.ts`,
  `test/quest.test.tsx`

- [ ] **Step 1: A workout fixture**

`apps/mobile/test/support/fixtures.ts`, add:

```ts
/** Day 2 with a workout (workout-0, planned for the default player) as its core quest, id 200. */
export function workoutState(over: Partial<Snapshot> = {}): ServerState {
  const snapshot = dayTwoSnapshot({ ...DAY_TWO_SLOTS, core: 'workout-0' }, over);
  return stateView(snapshot, dayOffers(snapshot, LIBRARY));
}
```

- [ ] **Step 2: Write the failing tests**

`apps/mobile/test/payload.test.ts`, add (import `sessionPayload, sessionValid, startingSession, moveUnit` from the
payload module, `checkCompletionPayload` from the server's events, and `planWorkout, sessionCondition, templateById`
from the rules if not imported):

```ts
describe('workout logs (M6c decision 9)', () => {
  const template = templateById(LIBRARY, 'workout-0');
  const moves = [
    { move: 'goblet-squat', unit: 'reps', min: 10, max: 15, perSide: false },
    { move: 'db-row', unit: 'reps', min: 8, max: 12, perSide: true },
    { move: 'plank', unit: 'seconds', min: 20, max: 40, perSide: false },
  ] as const;
  const condition = sessionCondition(template, moves, false);
  if (condition.kind !== 'session') throw new Error('not a session');

  it('start every set at the bottom of its range', () => {
    expect(startingSession(condition.moves)).toEqual([[10, 10], [8, 8], [20, 20]]);
    expect(moveUnit(condition.moves[1]!)).toBe('reps per side');
    expect(moveUnit(condition.moves[2]!)).toBe('seconds');
  });

  it('send every set in order, which the server accepts; a count that differs is refused', () => {
    const payload = sessionPayload([[12, 11], [9, 8], [30, 25]]);
    expect(payload).toEqual({ sets: [12, 11, 9, 8, 30, 25] });
    expect(sessionValid([[12, 11], [9, 8], [30, 25]])).toBe(true);
    expect(sessionValid([[0, 0], [0, 0], [0, 0]])).toBe(false);
    const day = { starts_at: new Date(0), ends_at: new Date(Date.UTC(2100, 0, 1)) };
    const instance = { completion: 'reps' as const, condition, minutes: 16 };
    expect(checkCompletionPayload(instance, day, payload, Date.UTC(2026, 9, 11))).toEqual({ payload });
    expect(checkCompletionPayload(instance, day, sessionPayload([[12, 11], [9, 8]]), Date.UTC(2026, 9, 11))).toEqual({ code: 'bad_payload' });
  });
});
```

`apps/mobile/test/quest.test.tsx`, add (import `WorkoutLog`, `workoutState`, `PLAY_TEXT` is imported):

```tsx
describe('a workout (M6c)', () => {
  const moves = [
    { move: 'goblet-squat', unit: 'reps', min: 10, max: 15, perSide: false, sets: 2 },
    { move: 'plank', unit: 'seconds', min: 20, max: 40, perSide: false, sets: 1 },
  ] as const;

  it('lists each exercise with its target, cue and progress line; the steps open on request', async () => {
    await render(<WorkoutLog moves={moves} disabled={false} onClaim={jest.fn()} />);
    expect(screen.getByText('Goblet squat')).toBeTruthy();
    expect(screen.getByText('2 sets of 10–15 reps')).toBeTruthy();
    expect(screen.getByText('1 hold of 20–40 seconds')).toBeTruthy();
    expect(screen.getByText(/go a little heavier next time/)).toBeTruthy();
    expect(screen.getByText(/hold a few seconds longer/)).toBeTruthy();
    expect(screen.getByText(/1\. Hold one dumbbell upright/)).toBeTruthy(); // the first exercise's steps start open
    await fireEvent.press(screen.getAllByRole('button', { name: PLAY_TEXT.workout.how })[0]!);
    expect(screen.getByText(/1\. Rest on your forearms/)).toBeTruthy();
  });

  it('logs every set, starting at the bottom of each range', async () => {
    const onClaim = jest.fn();
    await render(<WorkoutLog moves={moves} disabled={false} onClaim={onClaim} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Goblet squat, set 1, one more' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Forearm plank, set 1, one less' }));
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.workout.log }));
    expect(onClaim).toHaveBeenCalledWith({ sets: [11, 10, 19] });
  });

  it('the quest screen shows the workout and sends its log', async () => {
    const store = testStore({ phase: 'ready', server: workoutState(), view: project(workoutState(), []) });
    await render(withStore(store, <Quest questId={200} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onTraining={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(screen.getByRole('button', { name: PLAY_TEXT.workout.change })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.workout.log }));
    const sent = store.getState().pending.at(-1);
    expect(sent).toMatchObject({ type: 'complete', instanceId: 200 });
    expect((sent as { payload: { sets: number[] } }).payload.sets).toHaveLength(6);
  });
});
```

Match `testStore`'s options to how the file's other quest-screen tests build their store (they set the server state
and the projected view); copy that setup if it differs from the line above.

- [ ] **Step 3: Run them to see them fail**

Run: `npm test -w @levelmeup/mobile -- payload quest`
Expected: FAIL (no workout log).

- [ ] **Step 4: The payload helpers**

Append to `apps/mobile/src/quest/payload.ts` (import the `SessionMove` type from the rules):

```ts
/** A workout log starts each set at the bottom of its exercise's range (M6c decision 9). */
export function startingSession(moves: readonly SessionMove[]): number[][] {
  return moves.map((m) => Array<number>(m.sets).fill(m.min));
}

/** Every set, in order; the server checks the count against the plan. */
export const sessionPayload = (sets: readonly (readonly number[])[]) => ({ sets: sets.flat() });

export const sessionValid = (sets: readonly (readonly number[])[]): boolean => repsValid(sets.flat());

/** What a workout exercise counts, in content's words. */
export function moveUnit(move: Pick<SessionMove, 'unit' | 'perSide'>): string {
  const units = PLAY_TEXT.reps.units;
  if (move.unit === 'seconds') return move.perSide ? units.secondsPerSide : units.seconds;
  return move.perSide ? units.repsPerSide : units.reps;
}
```

- [ ] **Step 5: The workout log**

In `apps/mobile/src/screens/quest/RepLog.tsx`, export the stepper: `export function Step(…)`.

Create `apps/mobile/src/screens/quest/WorkoutLog.tsx`:

```tsx
// A workout's log (M6c decision 9): every exercise with its target, its form cue and how it gets harder, its steps on
// request (the first one's open), and a counter for each set starting at the bottom of the range. It sends every set
// in order; the server checks the count against the plan. Less than the target still counts (the honor system).
import { PLAY_TEXT, authoredMove, fillText, moveTarget, progressLine } from '@levelmeup/content';
import type { SessionMove } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { MAX_REPS, moveUnit, sessionPayload, sessionValid, startingSession } from '../../quest/payload.ts';
import { colors } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Body, Heading, Label, Small } from '../../ui/Text.tsx';
import { Step } from './RepLog.tsx';

const T = PLAY_TEXT.workout;

export function WorkoutLog({ moves, disabled, onClaim }: { moves: readonly SessionMove[]; disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  const [sets, setSets] = useState(() => startingSession(moves));
  const [open, setOpen] = useState<number | null>(0);
  const change = (m: number, s: number, by: number) =>
    setSets((all) => all.map((row, i) => (i !== m ? row : row.map((n, j) => (j === s ? Math.max(0, Math.min(MAX_REPS, n + by)) : n)))));
  return (
    <View style={{ gap: 16 }}>
      {moves.map((move, m) => {
        const words = authoredMove(move.move);
        const unit = moveUnit(move);
        const shown = open === m;
        return (
          <View key={move.move} style={{ gap: 8, padding: 12, borderWidth: 2, borderColor: colors.chalk }}>
            <Label tone="ember">{fillText(T.exercise, { n: m + 1, total: moves.length })}</Label>
            <Heading>{words.name}</Heading>
            <Body weight="medium">{moveTarget(move)}</Body>
            <Small>{words.cue}</Small>
            <Small>{progressLine(words)}</Small>
            <Button label={shown ? T.hide : T.how} variant="secondary" onPress={() => setOpen(shown ? null : m)} style={{ alignSelf: 'flex-start' }} />
            {shown && words.steps.map((step, i) => <Body key={i}>{`${i + 1}. ${step}`}</Body>)}
            {sets[m]!.map((n, s) => (
              <View key={s} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderWidth: 2, borderColor: colors.line }}>
                <Label style={{ flexGrow: 1, paddingHorizontal: 12, paddingVertical: 8 }}>{fillText(T.set, { n: s + 1 })}</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Step text="−" label={fillText(T.fewer, { name: words.name, n: s + 1 })} onPress={() => change(m, s, -1)} />
                  <Heading accessibilityLabel={`${n} ${unit}`} style={{ minWidth: 56, textAlign: 'center' }}>{String(n)}</Heading>
                  <Step text="+" label={fillText(T.more, { name: words.name, n: s + 1 })} onPress={() => change(m, s, 1)} />
                </View>
              </View>
            ))}
          </View>
        );
      })}
      <Small>{T.rest}</Small>
      <Small>{T.note}</Small>
      <Button label={T.log} variant="commitment" disabled={disabled || !sessionValid(sets)} onPress={() => onClaim(sessionPayload(sets))} />
    </View>
  );
}
```

(`colors.line` and `colors.chalk` are the kit's tokens; `Heading`, `Label`, `Body`, `Small` the kit's text components,
as RepLog uses them.)

- [ ] **Step 6: The quest screen**

`apps/mobile/src/screens/Quest.tsx`:
- `QuestProps` gains `/** A workout: change the equipment or program (M6c). */ onTraining?: () => void;`.
- Import `WorkoutLog`.
- In the panel chain, before `else if (quest.completion === 'reps')`:

```tsx
  } else if (quest.condition.kind === 'session') {
    panel = <WorkoutLog moves={quest.condition.moves} disabled={busy} onClaim={(payload) => void claim(payload)} />;
```

- After the swap button:

```tsx
      {quest.condition.kind === 'session' && onTraining !== undefined && (
        <Button label={PLAY_TEXT.workout.change} variant="secondary" onPress={onTraining} />
      )}
```

`apps/mobile/app/quest/[id].tsx`: pass `onTraining={() => router.push('/training')}` (the route exists from Task 12;
until then the button leads to an unmatched route, so land Task 12 in the same push).

- [ ] **Step 7: A development preview of the workout log**

A test character's first workout comes on its first strength day (day 3 for a Warrior), so the emulator check can't
reach one on day 1. A development-only preview plans a workout locally with the rules, for any setup, and shows the
log. Create `apps/mobile/app/dev/workout.tsx`:

```tsx
// Development only (M6c): a workout planned on the phone with the rules for any setup, shown in its log, so the screen
// can be checked on a device before a test character reaches a strength day. Nothing is sent.
import { EQUIPMENT_NAMES, LIBRARY, PROGRAM_STYLE_CHOICES } from '@levelmeup/content';
import { EQUIPMENT, PROGRAM_STYLES, ladderRungs, planWorkout, sessionCondition } from '@levelmeup/rules';
import type { Equipment, PlayerProfile, ProgramStyle } from '@levelmeup/rules';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutLog } from '../../src/screens/quest/WorkoutLog.tsx';
import { space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { Chip } from '../../src/ui/Chip.tsx';
import { ScreenScroll } from '../../src/ui/ScreenScroll.tsx';
import { Body, Title } from '../../src/ui/Text.tsx';

const PLAYER: PlayerProfile = {
  classId: 'warrior', level: 5, goals: ['body'], minutesPerDay: 40, difficulty: 'steady', limitations: [], gentleStart: false,
  ownProgram: false, equipment: [], programStyle: 'none', stats: { strength: 7, vitality: 5, wisdom: 5, focus: 5 }, book: null,
};

export default function WorkoutPreview() {
  const insets = useSafeAreaInsets();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [style, setStyle] = useState<ProgramStyle>('none');
  const [rung, setRung] = useState(0);
  const [day, setDay] = useState(0);
  const template = ladderRungs(LIBRARY, 'workout')[rung]!;
  const moves = planWorkout(LIBRARY.training, template, { ...PLAYER, equipment, programStyle: style }, day);
  const condition = moves === null ? null : sessionCondition(template, moves, false);
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Title>Workout preview</Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {EQUIPMENT.map((e) => (
          <Button key={e} label={`${equipment.includes(e) ? '• ' : ''}${EQUIPMENT_NAMES[e]}`} variant="secondary"
            onPress={() => setEquipment(equipment.includes(e) ? equipment.filter((x) => x !== e) : [...equipment, e])} />
        ))}
        {PROGRAM_STYLES.map((s) => (
          <Button key={s} label={`${style === s ? '• ' : ''}${PROGRAM_STYLE_CHOICES[s].name}`} variant="secondary" onPress={() => setStyle(s)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Button label={`Rung ${rung}`} variant="secondary" onPress={() => setRung((rung + 1) % 6)} />
        <Button label={`Program day ${day + 1}`} variant="secondary" onPress={() => setDay(day + 1)} />
        <Chip label={`${template.minutes} min`} kind="outline" />
      </View>
      {condition?.kind === 'session'
        ? <WorkoutLog key={JSON.stringify(condition)} moves={condition.moves} disabled={false} onClaim={() => {}} />
        : <Body>No workout fits this setup.</Body>}
    </ScreenScroll>
  );
}
```

`apps/mobile/app/dev/index.tsx`: add after the kit button:

```tsx
      <Button label="Workout preview" variant="secondary" onPress={() => router.push('/dev/workout')} />
```

(A bullet marks the picked options: `•` is in the font subset.)

- [ ] **Step 8: Run the tests**

Run: `npm test -w @levelmeup/mobile; npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit (together with Task 12, so the training route exists)**

Continue with Task 12 and commit both there.

---

### Task 12: App — Settings → Training, and the `training` event on the phone

**Files:**
- Create: `apps/mobile/src/screens/Training.tsx`, `apps/mobile/app/training.tsx`
- Modify: `apps/mobile/src/screens/Settings.tsx`, `app/settings.tsx`, `src/game/project.ts`, `src/data/local.ts`
- Modify: `packages/content/src/adjust.ts` (the screen's words)
- Modify: `apps/mobile/test/project.test.ts`, `test/screens.test.tsx` (or the file that tests ClassChange), `test/local.test.ts`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/project.test.ts`, in 'adjustments show at once (M6b)':

```ts
  it('a training change shows in the profile at once, and the open workout waits for the server (M6c)', () => {
    const server = workoutState();
    const shown = project(server, [{ id: 'e1', type: 'training', equipment: ['gym'], programStyle: 'men' }]);
    expect(shown.profile).toMatchObject({ equipment: ['gym'], programStyle: 'men' });
    expect(shown.waiting.has(200)).toBe(true);
    expect(shown.waiting.has(201)).toBe(false);
  });
```

`apps/mobile/test/local.test.ts`: the latest version is 4; add:

```ts
  it('drops a state cached before M6c, which has no training setup, and keeps the outbox', async () => {
    const { sql, local } = await fresh();
    await local.enqueue(complete('a'), 1);
    await local.acknowledge([], [], state(1), 1);
    await sql.exec('pragma user_version = 3'); // as an M6b install left it
    await migrate(sql);
    expect(await local.snapshot()).toEqual({ cached: null, pending: [complete('a')], notices: [] });
  });
```

In the file that tests the class-change screen (`test/screens.test.tsx` or `test/adjust.test.tsx`; use the same
render helpers), add:

```tsx
describe('Training (M6c decision 12)', () => {
  it('shows the current setup, saves a change once, and goes back', async () => {
    const store = testStore({ phase: 'ready', server: workoutState(), view: project(workoutState(), []) });
    const onDone = jest.fn();
    await render(withStore(store, <Training onDone={onDone} onBack={jest.fn()} />));
    const save = () => screen.getByRole('button', { name: ADJUST_TEXT.training.save });
    expect(screen.getByRole('checkbox', { name: ONBOARDING_TEXT.gear.nothing }).props.accessibilityState.checked).toBe(true);
    expect(save().props.accessibilityState.disabled).toBe(true); // nothing changed yet
    await fireEvent.press(screen.getByRole('checkbox', { name: EQUIPMENT_NAMES.bands }));
    await fireEvent.press(save());
    expect(store.getState().pending.at(-1)).toMatchObject({ type: 'training', equipment: ['bands'], programStyle: 'none' });
    expect(onDone).toHaveBeenCalled();
  });

  it('says when workouts don\'t fit the player\'s day', async () => {
    const server = workoutState({ profile: profileRow(undefined, { minutes_per_day: 15 }) });
    const store = testStore({ phase: 'ready', server, view: project(server, []) });
    await render(withStore(store, <Training onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(ADJUST_TEXT.training.noRoom)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w @levelmeup/mobile -- project local screens`
Expected: FAIL.

- [ ] **Step 3: The words**

`packages/content/src/adjust.ts`, add to `ADJUST_TEXT`:

```ts
  training: {
    title: 'Training',
    open: 'Training',
    line: 'Your workouts are built from what you have, in the program you pick.',
    today: "Today's open workout changes once this syncs; the next ones follow it.",
    save: 'Save training',
    noRoom: 'Workouts need 25 minutes a day or more, and they stay off on a gentle start or your own plan. Your setup is kept for when they fit.',
  },
```

- [ ] **Step 4: The screen, its route and the Settings link**

Create `apps/mobile/src/screens/Training.tsx`:

```tsx
// Settings → Training (M6c decision 12): the equipment and program the player's workouts follow. Saving sends one
// `training` event: the server re-plans today's open workout and the next days follow the new setup.
import { ADJUST_TEXT, EQUIPMENT_NAMES, LIBRARY, ONBOARDING_TEXT, PLAY_TEXT, PROGRAM_STYLE_CHOICES } from '@levelmeup/content';
import { EQUIPMENT, PROGRAM_STYLES, workoutsFit } from '@levelmeup/rules';
import type { Equipment, ProgramStyle } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label, Small, Title } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';

const T = ADJUST_TEXT.training;
const G = ONBOARDING_TEXT.gear;

const sameItems = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

export type TrainingProps = { onDone: () => void; onBack: () => void };

export function Training({ onDone, onBack }: TrainingProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [equipment, setEquipment] = useState<Equipment[] | null>(null);
  const [style, setStyle] = useState<ProgramStyle | null>(null);
  const [busy, setBusy] = useState(false);

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }
  const p = view.profile;
  const picked = equipment ?? p.equipment;
  const pickedStyle = style ?? p.programStyle;
  const changed = pickedStyle !== p.programStyle || !sameItems(picked, p.equipment);
  const fits = workoutsFit(LIBRARY, {
    classId: p.classId, level: view.character.level, goals: p.goals, minutesPerDay: p.minutesPerDay, difficulty: p.difficulty,
    limitations: p.limitations, gentleStart: p.gentleStart, ownProgram: p.ownProgram, equipment: picked, programStyle: pickedStyle,
    stats: { strength: 0, vitality: 0, wisdom: 0, focus: 0 }, book: p.book,
  });
  const toggle = (item: Equipment) => setEquipment(picked.includes(item) ? picked.filter((e) => e !== item) : [...picked, item]);
  const save = async (): Promise<void> => {
    if (!changed || busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'training', equipment: picked, programStyle: pickedStyle });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Title>{T.title}</Title>
      <Body>{T.line}</Body>
      <View style={{ gap: 12 }}>
        <Label>{G.equipment}</Label>
        {EQUIPMENT.map((item) => (
          <OptionCard key={item} kind="checkbox" label={EQUIPMENT_NAMES[item]} selected={picked.includes(item)} onPress={() => toggle(item)} />
        ))}
        <OptionCard kind="checkbox" label={G.nothing} selected={picked.length === 0} onPress={() => setEquipment([])} />
      </View>
      <View style={{ gap: 12 }}>
        <Label>{G.style}</Label>
        {PROGRAM_STYLES.map((s) => (
          <OptionCard key={s} label={PROGRAM_STYLE_CHOICES[s].name} detail={PROGRAM_STYLE_CHOICES[s].line} selected={pickedStyle === s}
            onPress={() => setStyle(s)} />
        ))}
      </View>
      {!fits && (
        <NightCard>
          <Small tone="chalk">{T.noRoom}</Small>
        </NightCard>
      )}
      <Small>{T.today}</Small>
      <Button label={T.save} variant="commitment" disabled={!changed || busy} onPress={() => void save()} />
    </ScreenScroll>
  );
}
```

(`workoutsFit` reads only the minutes, the gentle start, the own program and the limits; the placeholder stats don't
matter to it.)

Create `apps/mobile/app/training.tsx`:

```tsx
import { goBack } from '../src/lib/navigation.ts';
import { Training } from '../src/screens/Training.tsx';

export default function TrainingRoute() {
  return <Training onDone={goBack} onBack={goBack} />;
}
```

`apps/mobile/src/screens/Settings.tsx`: `SettingsProps` gains `onTraining: () => void`; after the Account section add:

```tsx
      <View style={{ gap: 12 }}>
        <SectionTitle title="Game" />
        <Button label={ADJUST_TEXT.training.open} variant="secondary" onPress={onTraining} />
      </View>
```

(import `ADJUST_TEXT` beside `GOOGLE_ERRORS`; update the header comment: "M6c: Training"). `apps/mobile/app/settings.tsx`
passes `onTraining={() => router.push('/training')}`. Update the Settings tests' props if they render it.

- [ ] **Step 5: The projection and the cache**

`apps/mobile/src/game/project.ts`, in the event loop, after the `resume` branch:

```ts
    if (event.type === 'training') {
      profile = { ...profile, equipment: event.equipment, programStyle: event.programStyle };
      // Today's open workout is re-planned by the server: it says "Will sync" until then.
      for (const q of quests) if (q.completedAt === null && q.condition.kind === 'session') waiting.add(q.id);
      continue;
    }
```

`apps/mobile/src/data/local.ts`, append to `MIGRATIONS`:

```ts
  // M6c: the profile gained the training setup and quests can be workouts; an older copy would break the Training
  // screen until the first sync, so it goes (the outbox stays).
  `delete from cache where key = 'state';`,
```

- [ ] **Step 6: Run everything**

Run: `npm test; npm run typecheck; npm run check:bundle`
Expected: all pass.

- [ ] **Step 7: Commit Tasks 11 and 12**

```bash
git add -A apps/mobile packages/content
git commit -m "M6c app: the workout log on the quest screen, Settings → Training, the training event, cache 4, dev preview"
```

---

### Task 13: Art — render, pick and stage the v3 set (local)

**Files:**
- Modify: `scripts/art/quest-art.py` (`OUT` → v3, `PICKS`), `docs/design/quest-art.md`
- Create: `art/quest/v3/` (34 pictures and `manifest.json`)

- [ ] **Step 1: Start ComfyUI**

Run (background): `D:\ai\ComfyUI\venv\Scripts\python.exe D:\ai\ComfyUI\run_noaudio.py` from `D:\ai\ComfyUI` (Windows
Application Control blocks `libtorchaudio.pyd`; `run_noaudio.py` stands in an empty torchaudio). Wait until
`http://127.0.0.1:8188` answers.

- [ ] **Step 2: Render the 14 new keys**

Run: `D:/ai/ComfyUI/venv/Scripts/python.exe scripts/art/quest-art.py render push-wall push-incline push-knee squat-chair squat-split core-dead-bug core-side-plank move-push move-press move-pull move-squat move-hinge move-core move-isolation --seeds 11 22 33`
Expected: 42 PNGs in `art/quest/renders/` (about a minute each on the RTX 4070).

- [ ] **Step 3: Pick**

Run: `D:/ai/ComfyUI/venv/Scripts/python.exe scripts/art/quest-art.py sheet` and look at every sheet. For each key pick
the render that shows the named exercise correctly: the right body position, the right equipment, believable hands
and feet, no text. Re-render a key whose three renders all miss with `--seeds 44 55 66` (and change its subject line
if the model keeps drawing the wrong exercise). Every existing key keeps its v2 pick.

- [ ] **Step 4: Stage v3**

In `scripts/art/quest-art.py`: `OUT = ROOT / "art" / "quest" / "v3"`, update the comment on `PICKS` ("The v3 set
(M6c)"), and add the 14 picks. Run `… quest-art.py pick`.
Expected: `art/quest/v3/` holds 34 `.webp` files and `manifest.json` listing 34 keys. If a v2 key's render is missing
from `art/quest/renders/` (renders are not in git), copy `art/quest/v2/<key>-1.webp` into `v3` and add the key to the
manifest by hand with count 1.

Check: `python -c "import json; m=json.load(open('art/quest/v3/manifest.json')); print(len(m['art']))"` → 34, and every
key of the content's `ART_KEYS` is in it (`node -e` with the content package, or compare by eye against the art test's
list).

- [ ] **Step 5: The brief**

In `docs/design/quest-art.md`, add a "v3 (M6c)" section listing the 14 new keys with their subjects and why (beginner
rungs show their own exercise; workouts show their first exercise's family).

- [ ] **Step 6: Stop ComfyUI and commit**

Stop the ComfyUI process. Then:

```bash
git add scripts/art/quest-art.py docs/design/quest-art.md art/quest/v3
git commit -m "M6c art: 14 new pictures (beginner rungs, workout families), the v3 set staged"
```

---

### Task 14: Art — publish v3 (needs the owner's yes) and point the app at it

**Files:**
- Modify: `apps/mobile/src/art/manifest.ts`, `apps/mobile/test/art.test.ts`

- [ ] **Step 1: Upload (after the yes)**

Upload every file of `art/quest/v3/` to the `lmu-art` bucket under `v3/` through the Supabase dashboard (Storage →
`lmu-art`), in the owner's Brave with Claude in Chrome, as M6a did for v2. Never overwrite or delete `v1` or `v2`.

- [ ] **Step 2: Verify byte for byte**

For each local file, download `https://knlgpcwoaaygncmlnbsm.supabase.co/storage/v1/object/public/lmu-art/v3/<file>`
into the scratchpad and compare SHA-256 with the local copy (a short Node or Python script).
Expected: 35 of 35 identical (34 pictures and the manifest), each answered 200.

- [ ] **Step 3: Point the app at v3**

`apps/mobile/src/art/manifest.ts`: `ART_BASE` ends in `/lmu-art/v3`; extend the header comment ("v2 → v3 when the
exercises got their own pictures, M6c"). `apps/mobile/test/art.test.ts`: expect the `v3` URL.

Run: `npm test -w @levelmeup/mobile -- art`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/art/manifest.ts apps/mobile/test/art.test.ts
git commit -m "M6c art: the app reads lmu-art/v3 (34 pictures, verified byte for byte)"
```

Without the yes, skip this task: the new keys draw the ink fallback, and the roadmap carries the upload forward.

---

### Task 15: The emulator check

**Files:**
- Modify: `docs/device-verification-checklist.md`

- [ ] **Step 1: Add the M6c rows**

Add an "M6c — Kaizen training" table to the checklist:

| # | Check | How |
|---|---|---|
| 1 | Onboarding shows Training after Body; Continue needs equipment (or "Just my body") and a program | New character, clear safety check |
| 2 | Training is skipped for "I follow my own plan" and after a safety "yes" | Two new characters, or Back and change the answers |
| 3 | Rhythm says workouts need 25 minutes at 10 or 15 | Rhythm step |
| 4 | Settings → Training shows the setup, saves a change once, and the profile shows it after a sync | Settings |
| 5 | The workout preview (Developer → Workout preview): every setup lists exercises that use the equipment; targets, cue, progress line; "How to do it" opens the steps; counters start at the bottom of the range; ± works | Dev preview |
| 6 | The workout log at the largest font size: nothing cut off, buttons at least 44 dp | Android font scale 2.0 |
| 7 | Titles without numbers: a hard day's walk or reading quest | Hard day on Today |
| 8 | A strength day's core quest is a workout: card with its exercises and minutes, its family picture (or the ink fallback before v3) | First strength day of a test character (day 3 for a Warrior) |
| 9 | Log a workout → Quest cleared, XP, rating; undo | Same day |
| 10 | Hard day on a workout day: one set of the first two exercises, 7 minutes, half XP | Same day, before logging |
| 11 | "I felt pain" on a workout: workouts rest ("Workouts" under resting exercises); Resume | Same day |
| 12 | The beginner rungs show their own pictures (wall, incline and knee push-ups; chair and split squats; dead bugs; side plank) | After Task 14 |

- [ ] **Step 2: Run rows 1–7 on the emulator**

Start the emulator (`LevelMeUp_Test`) and Metro (`--dev-client --localhost --port 8082`) as in M6b; create test
characters (record their names), run rows 1–7, fix anything found (test first), and write the results into the
table. Rows 8–11 need a test character's first strength day: keep one Warrior test character and run them when it
reaches day 3 (the loop's next milestones run long enough), or leave them for the owner's Find X9 pass; row 12 after
Task 14. Delete every other test character in the app (Developer → Delete test character) and run the read-only
leftovers check.

- [ ] **Step 3: Commit**

```bash
git add docs/device-verification-checklist.md
git commit -m "M6c device check: rows and results"
```

---

### Task 16: Docs, review, and the merge after M6b

**Files:**
- Modify: `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`, `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`,
  `…-architecture.md`, `apps/mobile/README.md`, this plan ("As built"), `.claude/build-loop.local.md`

- [ ] **Step 1: The docs**

- Roadmap: the M6c row says what was built and "Built 2026-10-1x; merges after M6b". Add "Carried forward from M6c":
  decision 16's list (load logging, planned deloads, a warm-up quest, a steps quest, an evening fatigue check-in,
  days a week, rest timers, demo videos); the art upload if Task 14 waited; rows 8–12 for the owner; the pacing result
  if anything was tuned; "a quest instance stores its plan, so a content change to a move's range applies to new days
  only".
- MVP spec: "Built in M6c" notes in §1.1 beat 4 (the Training step), §3.1 (workouts and the exercise library),
  §3.3 (the workout ladder), §3.5 (a hard-day workout).
- Architecture: §3 (`profiles.equipment`, `profiles.program_style`, the `session` condition), §4.1 (the `training`
  event).
- `apps/mobile/README.md`: an M6c paragraph (the Training step, the workout log, Settings → Training, the dev preview).
- The plan's "As built" section: what changed from the plan, the deploy and pacing results.

- [ ] **Step 2: Final checks**

Run: `npm test; npm run typecheck; npm run check:functions; npm run check:portable; npm run check:bundle; npm run pacing`
Expected: all pass; record the counts.

- [ ] **Step 3: Code review**

Use superpowers:requesting-code-review on `05531a3..HEAD` with this plan as the requirements. Fix Critical and
Important findings test first; note Minor ones in the roadmap. Ask the same reviewer to re-review the fixes.

- [ ] **Step 4: Commit and record**

```bash
git add -A docs .claude apps/mobile/README.md
git commit -m "M6c docs: roadmap, specs, README, as built"
```

Update `.claude/build-loop.local.md` (M6c complete, merge order M5 → M6a → M6b → M6c, next: M6d plan) and the memory
note. M6c merges after M6b (`git merge` of the base, re-run every check, finishing-a-development-branch with `--no-ff`).

---

## Self-review (2026-10-12)

- **Spec coverage:** equipment and program style (Tasks 1, 8, 10, 12); the exercise library from the research (4); the
  programs (4); workouts built from it (2, 3, 5); the pacing re-run (5); the carried items: per-exercise art (6, 13,
  14) and hard-day titles (6); the safety rules (decisions 11; Tasks 2, 4, 6).
- **Types:** `Equipment`, `ProgramStyle`, `Move`, `MoveSlot`, `MovePattern`, `MoveLevel`, `PlannedMove`, `SessionMove`,
  `TrainingLibrary` (workout.ts); `QuestDraft.moves`; `DayInput.workoutsDone`; `Snapshot.workoutsDone`;
  `AdvanceInput.workoutsDone`; `ProfileRow.equipment`, `program_style`; the `training` event `{ equipment,
  programStyle }` everywhere.
- **Numbers:** rungs 16/16/16/23/29/32 minutes, hard day 7 (`workoutMinutes`); 53 moves; 34 art keys; programs 3/3/2
  days of 6 slots.

## As built

### Changes from the plan

- **Search commands:** the plan's `npx rg` commands became `git grep -nE` (`npx rg` runs an unrelated npm package that
  writes a README; the stray file was removed).
- **Task 1 stop-gaps beyond the list:** `packages/content/src/format.ts` reads the two new conditions at once (the
  workout case as in Task 5; a session listed by move ids until Task 5 names them), the content library test's
  `COMPLETION_FOR` got its `workout`/`session` entries in Task 1, and `days.test.ts`'s `profiles()` literal got the
  default setup. Rules count 378 after Task 1: the portable test checks each source file, so `workout.ts` adds 2.
- **Task 5, tests the plan didn't list:** the art test's "one picture per ladder" skips the workout ladder and `ART_KEYS`
  leaves out workout templates (both from Task 6, brought forward so the count stays 20 until Task 6); the app's smoke
  test and the dev self-check (`src/dev/selfcheck.ts`) count 80 templates (was 74); the server's onboarding unit test
  expects `workout` among the "most weeks" starting ladders; the app's quest and Today tests call `questSummary(core)`.
- **Task 6:** the title renames ran through a helper that keeps each file's line endings (the plan's `Path.write_text`
  would rewrite them on Windows); the same changes and counts.
- **Task 7:** `lmu_test.day` has no defaults, so the start_player test passes the window `lmu_test.start` uses
  (`now() - 1 hour` to `now() + 10 hours`) instead of `lmu_test.day(1)`. The copied `start_player` and `adjust` bodies
  were diffed against 0003 and 0008: only the M6c parts differ.
- **Task 8:** two more `Snapshot` literals got `workoutsDone: 0` (`adjust.test.ts`'s restart test, `auth-state.test.ts`),
  and the projection's `training` branch (Task 12 Step 5) came forward: the app doesn't compile against the new event
  type without it. Server unit tests: 250.
- **Task 9:** a live run now creates up to 8 players (`MAX_PLAYERS`, as M6b raised it to 7); the client test signs up one
  more. The deploy waits for the owner's yes (asked 2026-10-12).
- **Tasks 10–12, tests:** the test store's `enqueue` is a mock that doesn't fill `pending`, so the quest-screen and Training
  tests assert on the `enqueue` call (as the class-change tests do) and build the store with `view` only; the flow tests
  that expected Rhythm after Body now expect Training. The Settings test also presses Game → Training. App tests: 491.

### Code review (2026-10-12): fixes

- **Critical — back limitation (amends decision 3):** bodyweight and split squats and the side plank ruled out a back
  limitation as quests but not as workout exercises. Every exercise now rules out at least what the same-named quest
  does, and every loaded squat rules out a back limitation too (a test checks both).
- **Important — no movement twice in a day (amends decision 7):** a workout keeps out of its day the strength ladders
  whose movement it trains (`Ladder.pattern`: push, squat, core) and the small strength quest; any other strength quest
  keeps the workouts out (`keptOutBy`, in the day builder and in swaps). Blocking every strength side quest instead made
  the Warrior's steady pace miss rank C within 180 days; the narrower rule misses it by one day (151, target 150).
  By decision 15 step 3 the rank C miss alone is recorded, not tuned: the campaign test accepts that exact line.
- **Important — the workout log and a new plan:** the log is keyed to its plan, so a re-plan from the server starts a
  fresh log (a bigger plan crashed the screen); while a `training` change waits to sync, the log is disabled with a note
  (the server re-plans first, so a log of the old plan would be refused or misfiled).
- **Minor, fixed:** "How to do it" names its exercise for screen readers (`Button` takes an `accessibilityLabel`); the
  workout lines name no exercise count; `draftProfile` sends No preference when the Training step is skipped, as
  `toRequest` does; migration 0009 refuses repeated equipment (`array_positions`; a repeat would stop every day of that
  player from being built); server tests for a hard-day re-plan and for a setup that leaves too few exercises.
- **Minor, carried forward (roadmap):** the Training and Rhythm notes don't say when the player's limits leave no
  workout; players onboarded before M6c are never asked the Training question (bodyweight, No preference until they
  open Settings → Training); a move id must never change (an unknown id stops the quest from showing); Settings →
  Training's save guard is state only, as M6b's Swap.

### Pacing re-run (Task 5, 400 runs, 2026-10-12): all targets met, no tuning

```
persona                    L2     L5    L10    L15    L20  rank C
warrior steady            1.0    5.9   17.4   39.4   72.4    134.6
warrior typical           1.3    7.1   23.3   52.1   94.0        —
warrior struggling        2.3   12.1   45.4  102.7      —        —
mage steady               1.0    5.9   18.2   40.4   73.1     55.9
mage typical              1.3    7.2   24.1   53.1   94.5     73.7
mage struggling           2.3   12.6   47.8  108.2      —        —
rogue steady              1.0    6.2   18.1   39.2   72.7    135.1
rogue typical             1.3    7.5   23.7   51.9   93.5        —
rogue struggling          2.3   12.6   46.7  105.5      —        —
monk steady               1.0    6.3   18.4   38.6   69.8     76.5
monk typical              1.3    7.6   24.1   51.8   92.0    104.0
monk struggling           2.3   12.8   47.1  106.4      —        —
```

Tightest margins: Mage struggling level 10 on day 47.8 (maximum 48) and Warrior steady level 10 on day 17.4 (minimum
16.8). The campaign test is seeded, so the margin is stable; M9's pilot data should confirm the struggling pace.
Experienced players (one rung up on day 1) also met every target (Warrior steady L10 17.4, Mage struggling L10 45.4).
