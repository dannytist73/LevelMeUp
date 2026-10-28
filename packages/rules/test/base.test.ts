import { describe, expect, it } from 'vitest';
import {
  advise, baseDays, baseMinutes, bestSet, clampWeeks, placeAt, planDay, planIndex, planPlace, slotChoices, targetFor, volume, weeksUntil,
} from '../src/base.ts';
import type { BaseDayLayouts } from '../src/base.ts';
import type { BlockDay, Move } from '../src/workout.ts';

const move = (over: Partial<Move> & Pick<Move, 'id'>): Move => ({
  slots: ['squat'], pattern: 'squat', needs: [], level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: [], ...over,
});

const MOVES: Move[] = [
  move({ id: 'barbell-squat', needs: ['gym'], level: 3, min: 6, max: 10 }),
  move({ id: 'goblet-squat', needs: ['dumbbells'], level: 2 }),
  move({ id: 'bodyweight-squat', level: 1, min: 10, max: 20 }),
  move({ id: 'leg-press', slots: ['squat', 'quads'], needs: ['gym'], level: 1, contraindications: ['knee'] }),
  move({ id: 'db-curl', slots: ['biceps'], pattern: 'isolation', needs: ['dumbbells'], level: 1 }),
  move({ id: 'band-curl', slots: ['biceps'], pattern: 'isolation', needs: ['bands'], level: 1, min: 15, max: 25 }),
  move({ id: 'plank', slots: ['abs'], pattern: 'core', unit: 'seconds', min: 20, max: 45 }),
];
const UP = [2, 3, 3, 4, 4];
const DAY: BlockDay = [{ slot: 'squat', sets: UP }, { slot: 'quads', sets: [2, 3, 3, 3, 3] }, { slot: 'biceps', sets: [2, 3, 3, 3, 3] }];

describe('plan length', () => {
  it('keeps a custom length between 4 and 52 weeks', () => {
    expect(clampWeeks(2)).toBe(4);
    expect(clampWeeks(10)).toBe(10);
    expect(clampWeeks(80)).toBe(52);
  });
  it('turns an end date into weeks, rounding up', () => {
    const day = 24 * 60 * 60 * 1000;
    expect(weeksUntil(0, 70 * day)).toBe(10);
    expect(weeksUntil(0, 71 * day)).toBe(11);
    expect(weeksUntil(0, 3 * day)).toBe(4);
  });
});

describe('planPlace', () => {
  it('moves the week on by workouts done, with every 6th week the easy one', () => {
    expect(planPlace(0, 3, { kind: 'weeks', weeks: 6 })).toEqual({ week: 1, blockWeek: 1, round: 1, day: 0, finished: false });
    expect(planPlace(4, 3, { kind: 'weeks', weeks: 6 })).toEqual({ week: 2, blockWeek: 2, round: 1, day: 1, finished: false });
    expect(planPlace(15, 3, { kind: 'weeks', weeks: 12 }).blockWeek).toBe(6);
    expect(planPlace(18, 3, { kind: 'weeks', weeks: 12 })).toMatchObject({ week: 7, blockWeek: 1, round: 2 });
  });
  it('finishes a plan with an end, never one without', () => {
    expect(planPlace(18, 3, { kind: 'weeks', weeks: 6 }).finished).toBe(true);
    expect(planPlace(17, 3, { kind: 'weeks', weeks: 6 }).finished).toBe(false);
    expect(planPlace(300, 5, { kind: 'open' }).finished).toBe(false);
  });
  it('carries weeks over and restarts the block after a break', () => {
    expect(planIndex(0, 0, 7, 3)).toBe(2);
    expect(planIndex(2, 0, 0, 4)).toBe(2);
    expect(planIndex(0, 25, 0, 3)).toBe(6);
    expect(planIndex(0, 25, 4, 3)).toBe(7);
    expect(planIndex(0, 13, 0, 3)).toBe(0);
    expect(placeAt(6, 0, { kind: 'weeks', weeks: 6 }).finished).toBe(true);
  });

  it('refuses a broken count', () => {
    expect(() => planPlace(-1, 3, { kind: 'open' })).toThrow(RangeError);
  });
});

describe('slotChoices and planDay', () => {
  it('picks gym versions at the gym and what you own at home', () => {
    expect(slotChoices(MOVES, 'squat', 'gym', [], [], 'regular')[0]!.id).toBe('barbell-squat');
    expect(slotChoices(MOVES, 'squat', 'home', ['dumbbells'], [], 'regular')[0]!.id).toBe('goblet-squat');
    expect(slotChoices(MOVES, 'squat', 'home', [], [], 'regular')[0]!.id).toBe('bodyweight-squat');
  });
  it('keeps new lifters off the hardest versions and skips moves that hurt a limitation', () => {
    expect(slotChoices(MOVES, 'squat', 'gym', [], [], 'new')[0]!.id).toBe('goblet-squat');
    expect(slotChoices(MOVES, 'quads', 'gym', [], ['knee'], 'regular')).toEqual([]);
  });
  it('plans the week: sets from the grid, 2 sets in the easy week, never the same move twice', () => {
    const week2 = planDay({ moves: MOVES, day: DAY, blockWeek: 2, place: 'gym', home: [], limitations: [], experience: 'regular' });
    expect(week2.map((e) => [e.move, e.sets])).toEqual([['barbell-squat', 3], ['leg-press', 3], ['db-curl', 3]]);
    expect(week2[0]!.target).toEqual({ kind: 'fixed', reps: 6 });
    expect(week2[2]!.restSeconds).toBe(90);
    const easy = planDay({ moves: MOVES, day: DAY, blockWeek: 6, place: 'gym', home: [], limitations: [], experience: 'regular' });
    expect(easy.every((e) => e.sets === 2)).toBe(true);
    expect(easy[0]!.target).toEqual({ kind: 'fixed', reps: 3 });
  });
  it('uses a kept swap for its place only, and leaves out what nothing fits', () => {
    const kept = { gym: { squat: 'goblet-squat' } };
    const gym = planDay({ moves: MOVES, day: DAY, blockWeek: 1, place: 'gym', home: [], limitations: [], experience: 'regular', kept });
    expect(gym[0]!.move).toBe('goblet-squat');
    const home = planDay({ moves: MOVES, day: DAY, blockWeek: 1, place: 'home', home: [], limitations: [], experience: 'regular', kept });
    expect(home.map((e) => e.move)).toEqual(['bodyweight-squat']);
  });
  it('keeps a swap from a neighbouring slot while it fits the place', () => {
    const day: BlockDay = [{ slot: 'quads', sets: UP }];
    expect(planDay({ moves: MOVES, day, blockWeek: 2, place: 'home', home: ['dumbbells'], limitations: [], experience: 'new' })[0]!.move).toBe('goblet-squat');
    const kept = { home: { quads: 'bodyweight-squat' } };
    expect(planDay({ moves: MOVES, day, blockWeek: 2, place: 'home', home: ['dumbbells'], limitations: [], experience: 'new', kept })[0]!.move).toBe('bodyweight-squat');
    const gone = { home: { quads: 'goblet-squat' } };
    expect(planDay({ moves: MOVES, day, blockWeek: 2, place: 'home', home: [], limitations: [], experience: 'new', kept: gone })[0]!.move).toBe('bodyweight-squat');
  });

  it('estimates minutes in steps of 5', () => {
    expect(baseMinutes([{ sets: 3, restSeconds: 150 }, { sets: 3, restSeconds: 90 }])).toBe(20);
  });
});

describe('targets and advice', () => {
  const squat = MOVES[0]!;
  const curl = MOVES[4]!;
  it('gives a main lift its fixed target only in the first slot', () => {
    expect(targetFor(squat, 'squat', true, 1)).toEqual({ kind: 'fixed', reps: 6 });
    expect(targetFor(squat, 'squat', false, 1)).toEqual({ kind: 'range', min: 6, max: 10, unit: 'reps' });
  });
  it('fixed: target + 2 on the last set adds a step, a short set takes one off', () => {
    const t = { kind: 'fixed', reps: 6 } as const;
    const s = (reps: number) => ({ weight: 60, reps, done: true });
    expect(advise(squat, t, [s(6), s(6), s(8)], 'kg')).toEqual({ kind: 'up', weight: 65 });
    expect(advise(squat, t, [s(6), s(5), s(7)], 'kg')).toEqual({ kind: 'down', weight: 55 });
    expect(advise(squat, t, [s(6), s(6), s(7)], 'kg')).toEqual({ kind: 'same', weight: 60 });
  });
  it('double progression: every set at the top adds a step', () => {
    const t = { kind: 'range', min: 8, max: 12, unit: 'reps' } as const;
    expect(advise(curl, t, [{ weight: 10, reps: 12, done: true }, { weight: 10, reps: 12, done: true }], 'kg')).toEqual({ kind: 'up', weight: 12.5 });
    expect(advise(curl, t, [{ weight: 25, reps: 12, done: true }], 'lb')).toEqual({ kind: 'up', weight: 30 });
    expect(advise(curl, t, [{ weight: 10, reps: 12, done: false }], 'kg')).toEqual({ kind: 'first' });
  });
  it('bands, bodyweight and holds', () => {
    expect(advise(MOVES[5]!, { kind: 'range', min: 15, max: 25, unit: 'reps' }, [{ weight: null, reps: 22, done: true }], 'kg')).toEqual({ kind: 'heavier_band' });
    expect(advise(MOVES[2]!, { kind: 'range', min: 10, max: 20, unit: 'reps' }, [{ weight: null, reps: 20, done: true }], 'kg')).toEqual({ kind: 'harder' });
    expect(advise(MOVES[6]!, { kind: 'range', min: 20, max: 45, unit: 'seconds' }, [{ weight: null, reps: 30, done: true }], 'kg')).toEqual({ kind: 'more_reps' });
  });
  it('best set and volume', () => {
    const sets = [{ weight: 60, reps: 6, done: true }, { weight: 62.5, reps: 5, done: true }, { weight: 70, reps: 3, done: false }];
    expect(bestSet(sets)).toEqual({ weight: 62.5, reps: 5, done: true });
    expect(volume(sets)).toBe(672.5);
  });
});

describe('baseDays', () => {
  const d = (n: number): BlockDay[] => Array.from({ length: n }, () => DAY);
  const layouts: BaseDayLayouts = { two: d(2), three: { men: d(3), women: d(3) }, four: { men: d(4), women: d(4) }, five: d(5) };
  it('has as many days as workouts a week', () => {
    for (const n of [2, 3, 4, 5] as const) expect(baseDays(layouts, 'women', n)).toHaveLength(n);
  });
});
