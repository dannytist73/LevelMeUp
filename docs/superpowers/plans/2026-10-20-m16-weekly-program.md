# M16 — The weekly program — Plan

**Goal:** an opt-in weekly program for players who want full workouts: the owner's Kaizen workout builder's 6-week
block (2 sets in week 1, 3 in weeks 2–3, 4 on the main lifts in weeks 4–5, an easy week 6), with the builder's full
5–6-exercise days, 2 or 3 workouts a week. The M6c workouts stay the default ("Step by step").

**Owner's ask (2026-10-20):** "proceed with the full workout. Perhaps we also ask our users if they want that kind of
workout? It's basically just a weekly workout, with ease of starting because it's 2 sets, and then there will be a
deload week, etc. You can refer to our workout builder how that's set up week by week … go ahead and build that if
you think it's a good addition."

**Source:** `docs/research/kaizen-training.md` §3.4–3.6 and Appendix A (the builder's set scheme per slot).

**Tech:** as M14. No new dependencies, no native module; one migration (0019; 0018 is the daily studio's, M15, applied from its own branch), the functions, and an APK.

---

## Plain summary

- **Asked, not forced.** Settings → Training gains "How do you want to train?": *Step by step* (today's workouts: they
  grow on readiness, 3–4 exercises, 16–32 minutes) or *Weekly program*. Today offers the weekly program once, after
  the player's third workout. A gentle start or an own program can't pick it (as workouts today).
- **The weekly program**: 3 workouts a week (Men's / Women's 3-day days; No preference alternates its 2 full-body
  days), or 2 a week (the builder's 2-day full-body days, for every program). Each day is the builder's day in full:
  its 5–6 slots, each filled with the best exercise the player can do (equipment, limits, level), as workouts are.
- **The block**: week 1 is 2 sets of everything; weeks 2–3 are 3 sets; weeks 4–5 are 4 sets on each day's priority
  slots and 3 on the rest (the builder's grid); week 6 is the easy week: 2 sets at half the reps, the same weight.
  Then the block starts again.
- **A week moves on when its workouts are done**, not by the calendar: a missed workout comes back next time, and a
  missed week never jumps the player to more sets. After 14 days without a weekly workout the block starts again at
  week 1 (2 sets).
- **Workout days** come every other day at most, 3 (or 2) in any 7 days. They take 29 to about 50 minutes, outside
  the daily minutes (the choice says so): that day's side quests are small. The other days have no strength quests
  at all, so the program is the whole strength training.
- **Harder exercises still come on readiness**, as now: the program has its own ladder of 3 rungs (exercise levels 1,
  2, 3; 3 good workouts in 14 days step up, "too hard" offers a step down, pain rests it). Switching to the program
  starts it at the level the player's workouts had reached.
- **The quest** shows "Week 2 of 6 · Workout B", what the week asks for, and in the easy week why it is easy.

## Decisions

1. **The setting:** `trainingPlan` `build` | `weekly` and `programDays` 2 | 3 (profile; defaults `build`, 3). Sent by
   the `training` event with equipment and program style (an older phone sends neither: they stay). The server keeps
   `program_since` (when the weekly program was last switched on).
2. **Layouts** (`packages/content/src/training/programs.ts`, `WEEKLY`): the builder's Men's 3x, Women's 3x and the
   shared 2x days, each slot with its sets in weeks 1–5 (Appendix A, e.g. Men's day 1 triceps 2-2-3-3-3). 3 a week with
   No preference alternates the 2-day layout; 2 a week uses the 2-day layout for every program style.
3. **Where the program stands:** `programDone` = full (not hard-day) weekly workouts completed in the current run and
   not rated "too hard" (CLAUDE.md: difficulty rises on demonstrated readiness, never the calendar: a workout that was
   too hard comes back before the sets grow); a run starts when the program is switched on, and again after 14 days
   without one (`BLOCK_RESTART_MS`). Week =
   ⌊done ÷ per week⌋ mod 6 + 1; program day = done mod the layout's days. The server counts it (like `workoutsDone`);
   the phone adds what it completed offline.
4. **Which days:** a weekly workout is the core quest when the plan is weekly, the day isn't light or a planned rest
   day, none was built in the last ⌊7 ÷ per week⌋ − 1 days (a day between at 3 a week, two at 2), and fewer than the
   per-week number were built in the last 6 days. Its why-line is a new code, `program`.
5. **Templates:** a `program` ladder (strength, every class, goal body) with rungs 0–2 at exercise levels 1–3; its
   condition is `{ kind: 'program', level }`, its hard-day version one set of the first two exercises (7 minutes),
   tier major (30 XP). Only the due-day rule builds it (never a swap, side quest or balance pick), and its rung cap
   ignores the daily minutes.
6. **Stored as a session** with the block: `{ kind: 'session', moves (each with its sets), block: { week, day } }`.
   Planned moves of a weekly workout carry their sets (the template doesn't know them); the easy week halves each
   range (rounded up, at least 1).
7. **Weekly mode closes the other strength quests** (the step-by-step workouts, the single-exercise strength ladders and
   the small strength quests), so a rest day is a rest day for the muscles; the day after a weekly workout is never
   strength anyway.
8. **Switching:** the `training` event writes the plan; switching to weekly with no program ladder yet starts it at
   the level the workout ladder reached (rung 0–2) and sets `program_since`. Today's open workout is re-planned only
   when the plan stays the same (equipment or program changes, as M6c); a new plan starts tomorrow (the screen says).
9. **The offer:** a one-time card on Today (after the core quest is cleared, like the set-up cards) once 3 workouts are
   done on the step-by-step plan, strength work is possible, and the card wasn't shown before: "See the weekly program"
   opens Settings → Training; "Not now" closes it. Free for everyone (Plus is unchanged).
10. **What waits:** 4 and 5 days a week, picking weekdays, loads per exercise, a rest timer per exercise's rest range,
    and weekly workouts in the campaign pacing personas.

## Remote steps (each needs the owner's yes)

Migration 0019 (`levelmeup` only), the functions deploy, the live tests, and the 0.8.0 APK.

## As built (2026-10-20)

Branch `m16-weekly-program` (from `m14-story-lessons`): rules and content `be21f29`, server `7e6d4f7`, phone `9008d3d`
(0.8.0, versionCode 10), the old-app guard `7dba1df`.

**Changes from the plan**

- **Stand-in slots** (decision 6): without equipment some program days had empty slots (Men's day A at level 1 kept only
  2 exercises: no bodyweight incline push, shoulder or arm move). A slot nothing fits now takes a move from the
  program's next days' slots, in order, after the day's own slots are filled, and keeps the empty slot's sets
  (`planProgram`). Every setup in the content check (7 equipment sets × 3 programs × 2 or 3 a week × levels 1–3 × 18
  workouts) plans 4–6 exercises; a gym always 6.
- **The hard-day version** is `{ kind: 'program', level }` like the full one (the library's "same kind" check), and the
  rules give it one set of the first two exercises (`PROGRAM_HARD_DAY_SETS`).
- **Old apps:** an app before 0.8.0 doesn't know the weekly quests (`program-0..2`, the `program` why-line), so
  `lmu-sync` answers it 426 `update_required` when the character is on the weekly program (`WEEKLY_MIN_APP_VERSION`);
  step-by-step characters sync from any app as before. `MIN_APP_VERSION` stays 0.1.0.

**Minutes** (gym, Men's 3 a week): weeks 1 and 6 take 29 minutes, weeks 2–3 38–43, weeks 4–5 47–50.

**Tests:** rules 471 (21 new, `packages/rules/test/weekly.test.ts`), content 1,170 (7 new: the builder's grids, every
setup, the minutes, 28 days for every class and daily time), server unit 579 (the training change, the parser, the
version floor), pgTAP `test_adjust_weekly_program` (not run yet: needs the owner's yes), app 1,169 (10 new,
`apps/mobile/test/weekly.test.tsx`). Typecheck, the portable check and the Deno check pass.
- **Renumbered M15 → M16** the same day: the daily studio (another session, branch `m15-daily-studio`) took M15 and
  applied migration 0018 (`0018_article_studio.sql`) to the live project first. This branch carries that file unchanged
  (the runner needs every applied migration) and its own is 0019. The first three commits' messages still say M15.
- **Merging with the daily studio** (agreed with its session 2026-10-20): it deploys only `lmu-articles-studio` and
  numbers anything new 0020 or later; redeploying `lmu-articles-tick` from this branch is safe (its `_shared/articles`
  changes are a type, a new export, an exported helper and a comment). When the branches merge, `package.json`'s
  `check:functions` and `deploy:functions` lists need `lmu-articles-studio` added.
