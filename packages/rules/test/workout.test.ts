import { describe, expect, it } from 'vitest';
import { MIN_WORKOUT_MOVES } from '../src/constants.ts';
import {
  hasEquipment, isWorkout, planWorkout, plannedMoves, sameMoves, sessionCondition, sessionMinutes, sessionSets, workoutMinutes,
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
