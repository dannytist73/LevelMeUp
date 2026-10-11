import { describe, expect, it } from 'vitest';
import {
  addRecovery, applyDawnRitual, applyHardDay, applyStillness, applySwap, checkProvisionalDay, painKey, painOption, restAllowed,
  seeProfessional, swapOptions,
} from '../src/adjust.ts';
import { buildDay, draftQuest } from '../src/day.ts';
import type { BuiltDay, DayInput } from '../src/day.ts';
import { newLadder } from '../src/ladder.ts';
import type { LadderState } from '../src/ladder.ts';
import { templateById } from '../src/library.ts';
import type { PlayerProfile } from '../src/library.ts';
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

  it("never offers the recovery quest's ladder", () => {
    const day = withQuest(DAY_TWO, 'core', 'mobility-0'); // mobility-0, push-0, focus-0
    expect(swapOptions(FIXTURE, dayInput(), day, 'core').map((q) => q.templateId)).toContain('walk-0');
    const withRecovery = { ...day, quests: [...day.quests, draftQuest(templateById(FIXTURE, 'walk-0'), 'recovery', { code: 'second_wind' })] };
    expect(swapOptions(FIXTURE, dayInput(), withRecovery, 'core').some((q) => q.templateId.startsWith('walk-'))).toBe(false);
  });

  it('offers nothing when no other quest fits the minutes left (the app then hides the swap)', () => {
    const others = ['core', 'side2'].map((slot) => templateById(FIXTURE, quest(DAY_TWO, slot).templateId).minutes);
    expect(swapOptions(FIXTURE, dayInput(), { ...DAY_TWO, budget: others[0]! + others[1]! }, 'side1')).toEqual([]);
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
    // Only the weeks around the day count: old rest days never block rest again, planned ones ahead do.
    expect(restAllowed([1, 2, 3], 20)).toBe(true);
    expect(restAllowed([21, 22], 20)).toBe(false);
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

  // A Warrior at level 5 who missed push-1 as yesterday's core, with the push ladder at rung 1.
  const missedPush = (core = 'push-1', ladder: Partial<LadderState> = {}, profile: Partial<PlayerProfile> = {}): DayInput =>
    dayInput(
      { dayNumber: 10, history: [{ dayNumber: 9, quests: { core } }], ladders: { push: { ...newLadder(), rung: 1, ...ladder } } },
      { level: 5, ...profile },
    );
  const secondWind = (input: DayInput, missedCore = 'push-1', day = buildDay(FIXTURE, input)) =>
    addRecovery(FIXTURE, input, day, { kind: 'second_wind', missedCore, lastUsedDay: null });

  it('Second Wind redoes the missed core quest for its full XP plus the recovery Discipline', () => {
    const input = missedPush();
    const day = buildDay(FIXTURE, input);
    expect(quest(secondWind(input), 'recovery')).toMatchObject({ templateId: 'push-1', xp: { strength: 20, discipline: 5 }, why: { code: 'second_wind' } });
    expect(() => addRecovery(FIXTURE, input, day, { kind: 'second_wind', missedCore: 'push-1', lastUsedDay: 4 })).toThrow(RangeError);
    expect(() => secondWind(missedPush('push-1', {}, { level: 4 }))).toThrow(RangeError);
    expect(() => secondWind(missedPush('article'), 'article')).toThrow(RangeError);
  });

  it("Second Wind redoes only yesterday's core quest", () => {
    expect(() => secondWind(missedPush('squat-0'))).toThrow(/yesterday/);
    expect(() => secondWind({ ...missedPush(), history: [] })).toThrow(/yesterday/);
  });

  it('Second Wind refuses a ladder paused for pain or closed to the player', () => {
    expect(() => secondWind(missedPush('push-1', { paused: true }))).toThrow(RangeError);
    expect(() => secondWind(missedPush('push-1', {}, { limitations: ['wrist'] }))).toThrow(RangeError);
    expect(() => secondWind(missedPush('squat-1', {}, { ownProgram: true }), 'squat-1')).toThrow(RangeError);
  });

  it('Second Wind redoes the missed quest at the rung the ladder allows today', () => {
    // A limitation added since caps the ladder below the missed rung (push-2 is tagged for knees).
    expect(quest(secondWind(missedPush('push-2', { rung: 2 }, { limitations: ['knee'] }), 'push-2'), 'recovery').templateId).toBe('push-1');
    // Yesterday's miss stepped the ladder down.
    expect(quest(secondWind(missedPush('push-1', { rung: 0 })), 'recovery').templateId).toBe('push-0');
  });

  it("Second Wind refuses a ladder already in today's quests", () => {
    const input = dayInput({ dayNumber: 10, history: [{ dayNumber: 9, quests: { core: 'walk-0' } }] }, { level: 5 });
    const day = withQuest(buildDay(FIXTURE, input), 'side1', 'walk-0');
    expect(() => secondWind(input, 'walk-0', day)).toThrow(/already/);
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

describe('"I felt pain" (spec §3.3, §3.4)', () => {
  it('offers gentle movement: the first rung of another kind of movement that fits the slot', () => {
    // DAY_TWO is walk-0, push-0, focus-0. Push hurt, and walking is already in the day: mobility.
    expect(painOption(FIXTURE, dayInput(), DAY_TWO, 'side1')).toMatchObject({
      slot: 'side1', templateId: 'mobility-0', why: { code: 'pain' }, hardDay: false,
    });
    // The walk hurt: another kind of movement first.
    expect(painOption(FIXTURE, dayInput(), DAY_TWO, 'core')?.templateId).toBe('mobility-0');
  });

  it('never offers a paused ladder, and offers nothing when nothing fits (rest is then the offer)', () => {
    const pausedMobility = dayInput({ ladders: { mobility: { ...newLadder(), paused: true } } });
    expect(painOption(FIXTURE, pausedMobility, DAY_TWO, 'side1')).toBeNull();
    // The other two quests take 10 minutes; 2 are left and mobility-0 takes 3.
    expect(painOption(FIXTURE, dayInput(), { ...DAY_TWO, budget: 12 }, 'side1')).toBeNull();
    expect(painOption(FIXTURE, dayInput(), DAY_TWO, 'article')).toBeNull();
  });

  it('on a hard day the gentle quest is its hard-day version', () => {
    const hard = applyHardDay(FIXTURE, DAY_TWO, []);
    expect(painOption(FIXTURE, dayInput(), hard, 'side1')).toMatchObject({ templateId: 'mobility-0', hardDay: true });
  });

  it('is only for exercise quests', () => {
    expect(() => painOption(FIXTURE, dayInput(), DAY_TWO, 'side2')).toThrow(RangeError); // focus-0
  });

  it('pauses the ladder, or a standalone exercise quest by its own id', () => {
    expect(painKey(templateById(FIXTURE, 'push-1'))).toBe('push');
    expect(painKey(templateById(FIXTURE, 'micro-squats'))).toBe('micro-squats');
    expect(() => painKey(templateById(FIXTURE, 'reading-0'))).toThrow(RangeError);
  });

  it('a standalone exercise quest resting after pain is never built or offered', () => {
    const input = dayInput({ ladders: { 'micro-squats': { ...newLadder(), paused: true } } });
    expect(swapOptions(FIXTURE, input, DAY_TWO, 'side1').map((q) => q.templateId)).toEqual(['squat-0', 'reading-0']);
    expect(checkProvisionalDay(FIXTURE, input, withQuest(DAY_TWO, 'side1', 'micro-squats'))).toContain(
      'micro-squats is resting after pain',
    );
  });

  it('leads with "see a doctor or physiotherapist" from the second report in 14 days', () => {
    expect(seeProfessional(1)).toBe(false);
    expect(seeProfessional(2)).toBe(true);
  });
});
