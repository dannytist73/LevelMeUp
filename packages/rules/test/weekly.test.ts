// M15, the weekly program (plan 2026-10-20-m15-weekly-program.md): the block, the plan of a weekly workout, its days,
// and the adjustments that re-draft it.
import { describe, expect, it } from 'vitest';
import { addRecovery, applyHardDay, provisionalDay, swapOptions } from '../src/adjust.ts';
import { DAY_MS } from '../src/constants.ts';
import { buildDay, storedQuest } from '../src/day.ts';
import type { BuiltDay, DayInput, PastDay } from '../src/day.ts';
import { newLadder } from '../src/ladder.ts';
import { maxRungFor, templateById, validateProfile } from '../src/library.ts';
import type { PlayerProfile } from '../src/library.ts';
import {
  isProgram, isWorkout, planProgram, plannedBlock, plannedMoves, programBlock, programRun, sameMoves, sessionCondition, sessionMinutes,
} from '../src/workout.ts';
import { PROFILE, TRAINING, WEEKLY_FIXTURE, dayInput, programTemplate, workoutTemplate } from './fixtures/library.ts';

const weekly = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({ ...PROFILE, trainingPlan: 'weekly', ...over });
const ids = (moves: readonly { move: string }[] | null): string[] | null => moves?.map((m) => m.move) ?? null;
const sets = (moves: readonly { sets?: number }[] | null): (number | undefined)[] | null => moves?.map((m) => m.sets) ?? null;
const core = (day: BuiltDay) => day.quests.find((q) => q.slot === 'core')!;
const strengthIn = (day: BuiltDay): string[] =>
  day.quests.filter((q) => q.stat === 'strength').map((q) => q.templateId);

describe('the block (decision 3)', () => {
  it('moves a week on when the week\'s workouts are done, round the program\'s days, and starts again after week 6', () => {
    expect([0, 1, 2, 3, 4, 5].map((d) => programBlock(d, 3, 3))).toEqual([
      { week: 1, day: 0 }, { week: 1, day: 1 }, { week: 1, day: 2 }, { week: 2, day: 0 }, { week: 2, day: 1 }, { week: 2, day: 2 },
    ]);
    // No preference at 3 a week alternates its two days; 2 a week moves a week on every 2.
    expect([0, 1, 2, 3].map((d) => programBlock(d, 3, 2))).toEqual([{ week: 1, day: 0 }, { week: 1, day: 1 }, { week: 1, day: 0 }, { week: 2, day: 1 }]);
    expect([0, 1, 2].map((d) => programBlock(d, 2, 2))).toEqual([{ week: 1, day: 0 }, { week: 1, day: 1 }, { week: 2, day: 0 }]);
    expect(programBlock(15, 3, 3)).toEqual({ week: 6, day: 0 });
    expect(programBlock(18, 3, 3)).toEqual({ week: 1, day: 0 });
    expect(() => programBlock(-1, 3, 3)).toThrow(RangeError);
  });

  it('counts the run\'s workouts; 14 days without one starts it again, and a run that long ago is over', () => {
    const at = (day: number) => day * DAY_MS;
    expect(programRun([], at(1))).toBe(0);
    expect(programRun([at(5), at(1), at(3)], at(6))).toBe(3);
    expect(programRun([at(1), at(3), at(17)], at(18))).toBe(3); // exactly 14 days: the run goes on
    expect(programRun([at(1), at(3), at(18)], at(19))).toBe(1);
    expect(programRun([at(1), at(3)], at(17))).toBe(2);
    expect(programRun([at(1), at(3)], at(18))).toBe(0);
  });
});

describe('planning a weekly workout (decisions 2, 6)', () => {
  const t1 = programTemplate(0, 1);

  it('takes every slot of the program day, with the week\'s sets', () => {
    const men = weekly({ programStyle: 'men' });
    expect(ids(planProgram(TRAINING, t1, men, 0))).toEqual(['wall-push', 'y-raise', 'plank']);
    expect(sets(planProgram(TRAINING, t1, men, 0))).toEqual([2, 2, 2]);
    expect(sets(planProgram(TRAINING, t1, men, 3))).toEqual([3, 3, 2]); // week 2: abs stays at 2, as the grid says
    expect(sets(planProgram(TRAINING, t1, men, 9))).toEqual([4, 3, 3]); // week 4: 4 sets on the priority slot
  });

  it("a slot nothing fits takes a move from the next days' slots, else is left out; below 2 exercises, no workout", () => {
    // Day B: no pull-up bar for the vertical pull, so day C's abs stand in.
    expect(ids(planProgram(TRAINING, t1, weekly({ programStyle: 'men' }), 1))).toEqual(['chair-squat', 'bridge', 'plank']);
    expect(sets(planProgram(TRAINING, t1, weekly({ programStyle: 'men' }), 4))).toEqual([3, 3, 3]); // the stand-in takes its slot's sets
    // A knee limit: day C's abs and day A's push stand in for the squat and the pull, in the slots' order.
    expect(ids(planProgram(TRAINING, t1, weekly({ programStyle: 'men', limitations: ['knee'] }), 1))).toEqual(['plank', 'bridge', 'wall-push']);
    const sparse = (moves: string[]) => ({ ...TRAINING, moves: TRAINING.moves.filter((m) => moves.includes(m.id)) });
    expect(ids(planProgram(sparse(['bridge', 'plank']), t1, weekly({ programStyle: 'men' }), 1))).toEqual(['plank', 'bridge']);
    expect(planProgram(sparse(['bridge']), t1, weekly({ programStyle: 'men' }), 1)).toBeNull();
  });

  it('the easy week is 2 sets of everything at half the reps, rounded up', () => {
    const plan = planProgram(TRAINING, t1, weekly({ programStyle: 'men' }), 15)!;
    expect(plan).toEqual([
      { move: 'wall-push', unit: 'reps', min: 4, max: 6, perSide: false, sets: 2 },
      { move: 'y-raise', unit: 'reps', min: 4, max: 6, perSide: false, sets: 2 },
      { move: 'plank', unit: 'seconds', min: 10, max: 20, perSide: false, sets: 2 },
    ]);
  });

  it('follows the rung\'s level and the equipment, as workouts do', () => {
    const gym = weekly({ programStyle: 'men', equipment: ['gym'] });
    expect(ids(planProgram(TRAINING, programTemplate(2, 3), gym, 0))).toEqual(['db-press', 'bb-row', 'plank']);
    expect(ids(planProgram(TRAINING, programTemplate(1, 2), weekly({ programStyle: 'men' }), 0))).toEqual(['incline-push', 'y-raise', 'plank']);
  });

  it('2 a week uses the shared 2-day layout, whatever the program', () => {
    expect(ids(planProgram(TRAINING, t1, weekly({ programStyle: 'women', programDays: 2 }), 0))).toEqual(['wall-push', 'y-raise', 'chair-squat']);
    expect(ids(planProgram(TRAINING, t1, weekly({ programStyle: 'women', programDays: 2 }), 1))).toEqual(['chair-squat', 'bridge', 'plank']);
  });

  it('is a workout, stored with its sets and block; the hard day is one set of the first two', () => {
    expect(isWorkout(t1) && isProgram(t1)).toBe(true);
    expect(isProgram(workoutTemplate(0, 1))).toBe(false);
    const plan = planProgram(TRAINING, t1, weekly({ programStyle: 'men' }), 9)!;
    const block = { week: 4, day: 0 };
    const full = sessionCondition(t1, plan, false, block);
    expect(full).toEqual({ kind: 'session', moves: plan.map((m) => ({ ...m, sets: m.sets })), block });
    expect(sessionCondition(t1, plan, true, block)).toEqual({ kind: 'session', moves: plan.slice(0, 2).map((m) => ({ ...m, sets: 1 })), block });
    expect(sessionMinutes(t1, plan, false)).toBe(25); // 10 sets: 2 + 22.5, rounded up
    expect(sessionMinutes(t1, plan, true)).toBe(7);
    expect(() => sessionCondition(t1, plan, false)).toThrow(RangeError);
    expect(() => sessionCondition(workoutTemplate(0, 1), plan.slice(0, 3), false, block)).toThrow(RangeError);
    // Drafting it again keeps a weekly workout's sets and block; a growing workout's sets come from its template.
    expect(plannedMoves(full)).toEqual(plan);
    expect(plannedBlock(full)).toEqual(block);
    const growing = sessionCondition(workoutTemplate(0, 1), plan.slice(0, 3), false);
    expect(plannedMoves(growing)!.every((m) => m.sets === undefined)).toBe(true);
    expect(plannedBlock(growing)).toBeNull();
    expect(sameMoves(plan, plan.map((m) => ({ ...m, sets: 1 })))).toBe(false);
  });
});

describe('the profile (decision 1)', () => {
  it('takes a known plan and 2 or 3 workouts a week', () => {
    expect(() => validateProfile(weekly())).not.toThrow();
    expect(() => validateProfile(weekly({ trainingPlan: 'daily' as never }))).toThrow(RangeError);
    expect(() => validateProfile(weekly({ programDays: 4 }))).toThrow(RangeError);
  });
});

/** Builds `days` days in a row, each completed: the history, and a weekly workout done for each one built. */
function run(profile: PlayerProfile, days: number, over: (day: number) => Partial<DayInput> = () => ({})): BuiltDay[] {
  const history: PastDay[] = [];
  const built: BuiltDay[] = [];
  let programDone = 0;
  for (let n = 1; n <= days; n++) {
    const day = buildDay(WEEKLY_FIXTURE, dayInput({ dayNumber: n, history: history.slice(-7), programDone, ...over(n) }, profile));
    built.push(day);
    history.push({ dayNumber: n, quests: Object.fromEntries(day.quests.map((q) => [q.slot, q.templateId])) });
    if (core(day).templateId.startsWith('program-')) programDone++;
  }
  return built;
}

const programDays = (days: BuiltDay[]): number[] => days.filter((d) => core(d).templateId.startsWith('program-')).map((d) => d.dayNumber);

describe('weekly workout days (decision 4)', () => {
  it('a weekly workout leads its day, with its why and block, outside the daily minutes', () => {
    const day = buildDay(WEEKLY_FIXTURE, dayInput({ dayNumber: 2 }, { trainingPlan: 'weekly', minutesPerDay: 10 }));
    const workout = core(day);
    expect(workout).toMatchObject({ templateId: 'program-0', why: { code: 'program' }, block: { week: 1, day: 0 }, tier: 'major' });
    expect(ids(workout.moves)).toEqual(['wall-push', 'chair-squat']);
    expect(storedQuest(WEEKLY_FIXTURE, workout).condition).toEqual({
      kind: 'session', moves: workout.moves!.map((m) => ({ ...m, sets: 2 })), block: { week: 1, day: 0 },
    });
    // The side quests get their minimum.
    expect(day.quests.filter((q) => q.slot === 'side1' || q.slot === 'side2').every((q) => q.minutes <= 2)).toBe(true);
  });

  it('3 a week: never two days running, at most 3 in any 7 days, and none on the light day 1', () => {
    const days = run(weekly(), 28);
    const on = programDays(days);
    expect(on).toEqual([2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25, 27]);
    for (let i = 1; i < on.length; i++) expect(on[i]! - on[i - 1]!).toBeGreaterThanOrEqual(2);
  });

  it('2 a week: two days between, at most 2 in any 7 days', () => {
    const on = programDays(run(weekly({ programDays: 2 }), 21));
    expect(on).toEqual([2, 5, 9, 12, 16, 19]);
  });

  it('the program moves on with each workout done, and its week shows in the plan', () => {
    const days = run(weekly({ programStyle: 'men' }), 28);
    const workouts = days.map(core).filter((q) => q.templateId.startsWith('program-'));
    expect(workouts.map((q) => q.block)).toEqual([
      { week: 1, day: 0 }, { week: 1, day: 1 }, { week: 1, day: 2 }, { week: 2, day: 0 }, { week: 2, day: 1 }, { week: 2, day: 2 },
      { week: 3, day: 0 }, { week: 3, day: 1 }, { week: 3, day: 2 }, { week: 4, day: 0 }, { week: 4, day: 1 }, { week: 4, day: 2 },
    ]);
  });

  it('the weekly plan has no other strength work: not between workouts, not beside them', () => {
    for (const day of run(weekly({ classId: 'warrior' }), 21)) {
      const strength = strengthIn(day);
      expect(strength.every((id) => id.startsWith('program-'))).toBe(true);
      expect(strength.length).toBeLessThanOrEqual(1);
    }
  });

  it('not on a light day, a planned rest day, a gentle start, an own program, or while it rests after pain', () => {
    const at = (over: Partial<DayInput>, profile: Partial<PlayerProfile> = {}) =>
      core(buildDay(WEEKLY_FIXTURE, dayInput({ dayNumber: 2, ...over }, { trainingPlan: 'weekly', ...profile }))).templateId;
    expect(at({})).toBe('program-0');
    expect(at({ light: true })).not.toMatch(/^program/);
    expect(at({ rest: true })).not.toMatch(/^program/);
    expect(at({}, { gentleStart: true })).not.toMatch(/^program/);
    expect(at({}, { ownProgram: true })).not.toMatch(/^program/);
    expect(at({ ladders: { program: { ...newLadder(), paused: true } } })).not.toMatch(/^program/);
  });

  it('builds at the program ladder\'s rung, and never on the step-by-step plan', () => {
    const day = buildDay(WEEKLY_FIXTURE, dayInput({ dayNumber: 2, ladders: { program: newLadder(2) } }, { trainingPlan: 'weekly' }));
    expect(core(day).templateId).toBe('program-2');
    for (const d of run({ ...PROFILE }, 21)) expect(d.quests.some((q) => q.templateId.startsWith('program-'))).toBe(false);
  });

  it('its rung cap ignores the daily minutes', () => {
    expect(maxRungFor(WEEKLY_FIXTURE, 'program', weekly({ minutesPerDay: 10 }))).toBe(2);
    expect(maxRungFor(WEEKLY_FIXTURE, 'program', { ...PROFILE })).toBe(-1);
  });
});

describe('adjusting a weekly workout day', () => {
  const input = dayInput({ dayNumber: 2 }, { trainingPlan: 'weekly', programStyle: 'men', level: 5 });
  const day = buildDay(WEEKLY_FIXTURE, input);

  it('a hard day keeps one set of the first two exercises, and the block', () => {
    const hard = core(applyHardDay(WEEKLY_FIXTURE, day, []));
    expect(hard.minutes).toBe(7);
    expect(storedQuest(WEEKLY_FIXTURE, hard).condition).toEqual({
      kind: 'session', moves: core(day).moves!.slice(0, 2).map((m) => ({ ...m, sets: 1 })), block: { week: 1, day: 0 },
    });
  });

  it('a swap offers no strength work in its place', () => {
    const offers = swapOptions(WEEKLY_FIXTURE, input, day, 'core');
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((q) => q.stat !== 'strength')).toBe(true);
  });

  it('the phone\'s offline day is kept as the server drafts it, over the daily minutes', () => {
    const tight = dayInput({ dayNumber: 2 }, { trainingPlan: 'weekly', minutesPerDay: 10 });
    const built = buildDay(WEEKLY_FIXTURE, tight);
    const kept = provisionalDay(WEEKLY_FIXTURE, tight, 2, built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: q.moves })));
    expect(kept.problems).toEqual([]);
    expect(core(kept.day!)).toEqual(core(built));
    const wrong = built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: q.moves?.map((m) => ({ ...m, sets: 4 })) ?? null }));
    expect(provisionalDay(WEEKLY_FIXTURE, tight, 2, wrong).day).toBeNull();
  });

  it('Second Wind redoes a missed weekly workout as the program\'s next one', () => {
    const next = dayInput(
      { dayNumber: 3, history: [{ dayNumber: 2, quests: { core: 'program-0' } }], programDone: 0 },
      { trainingPlan: 'weekly', programStyle: 'men', level: 5 },
    );
    const redo = addRecovery(WEEKLY_FIXTURE, next, buildDay(WEEKLY_FIXTURE, next), { kind: 'second_wind', missedCore: 'program-0', lastUsedDay: null });
    const quest = redo.quests.find((q) => q.slot === 'recovery')!;
    expect(quest).toMatchObject({ templateId: 'program-0', block: { week: 1, day: 0 }, why: { code: 'second_wind' } });
    expect(storedQuest(WEEKLY_FIXTURE, quest).condition).toMatchObject({ kind: 'session', block: { week: 1, day: 0 } });
    expect(templateById(WEEKLY_FIXTURE, quest.templateId).tier).toBe('major');
  });
});
