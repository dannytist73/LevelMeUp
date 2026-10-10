import { describe, expect, it } from 'vitest';
import {
  addRecovery, applyDawnRitual, applyHardDay, applyStillness, applySwap, checkProvisionalDay, restAllowed, swapOptions,
} from '../src/adjust.ts';
import { buildDay, draftQuest } from '../src/day.ts';
import type { BuiltDay } from '../src/day.ts';
import { newLadder } from '../src/ladder.ts';
import { templateById } from '../src/library.ts';
import { FIXTURE, dayInput } from './fixtures/library.ts';

const quest = (day: BuiltDay, slot: string) => day.quests.find((q) => q.slot === slot)!;
const withQuest = (day: BuiltDay, slot: 'core' | 'side1' | 'side2', id: string): BuiltDay => ({
  ...day,
  quests: day.quests.map((q) => (q.slot === slot ? draftQuest(templateById(FIXTURE, id), slot, q.why) : q)),
});
const DAY_TWO = buildDay(FIXTURE, dayInput()); // walk-0, push-0, focus-0, article

describe('swap (spec §3.5)', () => {
  it('offers up to 2 quests of the same stat and 1 balance quest, each fitting the day', () => {
    const options = swapOptions(FIXTURE, dayInput(), DAY_TWO, 'side1');
    expect(options.map((q) => q.templateId)).toEqual(['squat-0', 'micro-squats', 'reading-0']);
    expect(options.every((q) => q.slot === 'side1' && q.why.code === 'swap')).toBe(true);
  });

  it('never offers strength for the core the day after a strength core, even as the balance quest', () => {
    const input = dayInput(
      { dayNumber: 8, history: [{ dayNumber: 7, quests: { core: 'push-1', side1: 'squat-0' } }] },
      { stats: { strength: 1, vitality: 5, wisdom: 5, focus: 4 } },
    );
    const day = withQuest(buildDay(FIXTURE, input), 'side2', 'reading-0'); // walk-0, mobility-0, reading-0
    const options = swapOptions(FIXTURE, input, day, 'core');
    expect(options.map((q) => q.templateId)).toEqual(['micro-water', 'focus-0']);
  });

  it('applies only an offered option, to an open core or side quest', () => {
    expect(quest(applySwap(FIXTURE, dayInput(), DAY_TWO, 'side1', 'reading-0', []), 'side1').templateId).toBe('reading-0');
    expect(() => applySwap(FIXTURE, dayInput(), DAY_TWO, 'side1', 'walk-1', [])).toThrow(RangeError);
    expect(() => applySwap(FIXTURE, dayInput(), DAY_TWO, 'side1', 'reading-0', ['side1'])).toThrow(RangeError);
    expect(() => applySwap(FIXTURE, dayInput(), DAY_TWO, 'article', 'reading-0', [])).toThrow(RangeError);
  });

  it('on a hard day the swapped-in quest is its hard-day version', () => {
    const hard = applyHardDay(FIXTURE, DAY_TWO, []);
    const swapped = quest(applySwap(FIXTURE, dayInput(), hard, 'side1', 'squat-0', []), 'side1');
    expect(swapped.hardDay).toBe(true);
    expect(swapped.minutes).toBe(3);
  });
});

describe('hard day (spec §3.5)', () => {
  it('turns open core and side quests into their hard-day versions for half XP', () => {
    const hard = applyHardDay(FIXTURE, DAY_TWO, []);
    expect(hard.hardDay).toBe(true);
    expect(quest(hard, 'core')).toMatchObject({ templateId: 'walk-0', hardDay: true, minutes: 3, xp: { vitality: 5 } });
    expect(quest(hard, 'side1').xp).toEqual({ strength: 5 });
    expect(quest(hard, 'article')).toEqual(quest(DAY_TWO, 'article'));
  });

  it('halves a standard quest to 10 XP', () => {
    const day = buildDay(FIXTURE, dayInput({ ladders: { walk: newLadder(1) } }));
    expect(quest(applyHardDay(FIXTURE, day, []), 'core')).toMatchObject({ minutes: 5, xp: { vitality: 10 } });
  });

  it('leaves completed quests alone and applies once', () => {
    const hard = applyHardDay(FIXTURE, DAY_TWO, ['core']);
    expect(quest(hard, 'core')).toEqual(quest(DAY_TWO, 'core'));
    expect(applyHardDay(FIXTURE, hard, [])).toBe(hard);
  });
});

describe('planned rest (spec §3.5)', () => {
  it('allows at most 2 rest days in any 7 consecutive quest days', () => {
    expect(restAllowed([3], 5)).toBe(true);
    expect(restAllowed([3, 5], 8)).toBe(false);
    expect(restAllowed([3, 5], 10)).toBe(true);
    expect(restAllowed([3, 5], 5)).toBe(true);
    expect(() => restAllowed([], 0)).toThrow(RangeError);
  });
});

describe('Monk abilities', () => {
  const monk = (level: number, dayNumber = 10) => dayInput({ dayNumber }, { classId: 'monk', level, goals: ['energy'] });

  it('Stillness replaces the core quest with restoration, once every 7 quest days', () => {
    const input = monk(5);
    const day = buildDay(FIXTURE, input);
    const still = applyStillness(FIXTURE, input, day, { lastUsedDay: null, completedSlots: [] });
    expect(quest(still, 'core')).toMatchObject({ templateId: 'stillness', why: { code: 'stillness' }, xp: { vitality: 10 } });
    expect(() => applyStillness(FIXTURE, input, day, { lastUsedDay: 7, completedSlots: [] })).toThrow(RangeError);
    expect(() => applyStillness(FIXTURE, input, day, { lastUsedDay: 3, completedSlots: [] })).not.toThrow();
    expect(() => applyStillness(FIXTURE, input, day, { lastUsedDay: null, completedSlots: ['core'] })).toThrow(RangeError);
    expect(() => applyStillness(FIXTURE, dayInput({ dayNumber: 10 }), day, { lastUsedDay: null, completedSlots: [] })).toThrow(RangeError);
  });

  it('Dawn Ritual counts as the core quest from level 10', () => {
    const day = buildDay(FIXTURE, monk(10));
    expect(quest(applyDawnRitual(FIXTURE, monk(10), day, []), 'core').templateId).toBe('dawn-ritual');
    expect(() => applyDawnRitual(FIXTURE, monk(9), day, [])).toThrow(RangeError);
  });
});

describe('the recovery quest (spec §3.7)', () => {
  it('adds the class 5-minute quest, worth Discipline only, once', () => {
    const day = addRecovery(FIXTURE, dayInput(), DAY_TWO, { kind: 'recovery' });
    expect(quest(day, 'recovery')).toMatchObject({ templateId: 'recovery-walk', xp: { discipline: 5 }, why: { code: 'recovery' } });
    expect(() => addRecovery(FIXTURE, dayInput(), day, { kind: 'recovery' })).toThrow(RangeError);
  });

  it('Second Wind redoes the missed core quest for its full XP plus the recovery Discipline', () => {
    const input = dayInput({ dayNumber: 10 }, { level: 5 });
    const day = buildDay(FIXTURE, input);
    const redo = addRecovery(FIXTURE, input, day, { kind: 'second_wind', missedCore: 'push-1', lastUsedDay: null });
    expect(quest(redo, 'recovery')).toMatchObject({ templateId: 'push-1', xp: { strength: 20, discipline: 5 }, why: { code: 'second_wind' } });
    expect(() => addRecovery(FIXTURE, input, day, { kind: 'second_wind', missedCore: 'push-1', lastUsedDay: 4 })).toThrow(RangeError);
    expect(() => addRecovery(FIXTURE, dayInput({ dayNumber: 10 }), day, { kind: 'second_wind', missedCore: 'push-1', lastUsedDay: null })).toThrow(RangeError);
    expect(() => addRecovery(FIXTURE, input, day, { kind: 'second_wind', missedCore: 'article', lastUsedDay: null })).toThrow(RangeError);
  });
});

describe('checking a day built offline (architecture §6)', () => {
  const has = (problems: string[], text: string) => problems.some((p) => p.includes(text));

  it('accepts a day the builder could have made', () => {
    expect(checkProvisionalDay(FIXTURE, dayInput(), DAY_TWO)).toEqual([]);
  });

  it('rejects quests above the player rung, closed ladders and repeats', () => {
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), withQuest(DAY_TWO, 'side1', 'push-2')), 'above')).toBe(true);
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), withQuest(DAY_TWO, 'core', 'own-0')), 'not open')).toBe(true);
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), withQuest(DAY_TWO, 'side2', 'push-0')), 'twice')).toBe(true);
  });

  it('rejects a strength ladder trained yesterday, extra slots, a hard day and the wrong day', () => {
    const history = [{ dayNumber: 1, quests: { core: 'push-0' } }];
    expect(has(checkProvisionalDay(FIXTURE, dayInput({ history }), DAY_TWO), 'yesterday')).toBe(true);
    const withRecovery = addRecovery(FIXTURE, dayInput(), DAY_TWO, { kind: 'recovery' });
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), withRecovery), 'slots')).toBe(true);
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), applyHardDay(FIXTURE, DAY_TWO, [])), 'normal day')).toBe(true);
    expect(has(checkProvisionalDay(FIXTURE, dayInput({ dayNumber: 3 }), DAY_TWO), 'day number')).toBe(true);
  });
});
