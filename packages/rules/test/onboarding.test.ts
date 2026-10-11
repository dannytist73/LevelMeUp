import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/constants.ts';
import {
  GOAL_CLASS, HABITS, PERSONA_ESTIMATES, SLIPS, TRAININGS, boundaryFromSleep, onboardingEstimates, suggestedClass,
  suggestedPactLevel,
} from '../src/index.ts';
import type { Goal } from '../src/index.ts';

describe('the suggested class (spec §2.5)', () => {
  it.each([
    [['body'], 'warrior'], [['energy'], 'monk'], [['learn'], 'mage'], [['focus'], 'rogue'], [['routine'], 'monk'],
    [['body', 'learn'], 'warrior'], [['learn', 'body'], 'mage'], [['routine', 'focus'], 'monk'],
  ] as const)('%j → %s (the first goal picked decides)', (goals, classId) => {
    expect(suggestedClass(goals as readonly Goal[])).toBe(classId);
  });

  it('covers every goal, and needs one', () => {
    expect(Object.keys(GOAL_CLASS).sort()).toEqual([...GOALS].sort());
    expect(() => suggestedClass([])).toThrow(RangeError);
  });
});

describe('the starting estimates (spec §2.1)', () => {
  it('the average answers give the pacing personas\' estimates, so pacing holds', () => {
    expect(onboardingEstimates({ goals: ['body'], training: 'some', reading: null, focus: null })).toEqual(PERSONA_ESTIMATES);
  });

  it('training moves Strength and Vitality; reading and focus move their own stats', () => {
    expect(onboardingEstimates({ goals: ['learn', 'focus'], training: 'none', reading: 'high', focus: 'low' }))
      .toEqual({ strength: 4, vitality: 4, wisdom: 6, focus: 4, discipline: 4 });
    expect(onboardingEstimates({ goals: ['body'], training: 'own', reading: null, focus: null }))
      .toMatchObject({ strength: 6, vitality: 6, wisdom: 5, focus: 5 });
  });

  it('stays inside the 3–8 band for every answer', () => {
    for (const training of TRAININGS) {
      for (const habit of [...HABITS, null]) {
        const estimates = onboardingEstimates({ goals: ['learn', 'focus'], training, reading: habit, focus: habit });
        expect(Object.values(estimates).every((v) => v >= 3 && v <= 8)).toBe(true);
      }
    }
  });
});

describe('the day boundary from sleep and wake times (spec §1.1 beat 5)', () => {
  const t = (h: number, m = 0) => h * 60 + m;

  it.each([
    ['asleep at 4 AM: 4 AM', t(23), t(7), t(4)],
    ['a late sleeper still asleep at 4: 4 AM', t(2), t(10), t(4)],
    ['a night-shift worker: the middle of their sleep', t(8), t(16), t(12)],
    ['an early riser awake at 4: the middle, past midnight', t(22), t(3), t(0, 30)],
    ['in bed at 5 AM: the middle of their sleep', t(5), t(13), t(9)],
    ['rounds to the half hour', t(23, 10), t(3, 20), t(1, 30)],
  ])('%s', (_name, sleep, wake, boundary) => {
    expect(boundaryFromSleep(sleep, wake)).toBe(boundary);
  });

  it('refuses times that aren\'t whole minutes of one day, and equal times', () => {
    for (const [sleep, wake] of [[-1, 60], [0, 1440], [1.5, 60], [60, 60]] as const) {
      expect(() => boundaryFromSleep(sleep, wake)).toThrow(RangeError);
    }
  });
});

describe('the suggested pact (spec §4.3)', () => {
  it('only "real stakes" suggests The Shadow; nothing turns on', () => {
    expect(SLIPS.map(suggestedPactLevel)).toEqual([0, 0, 1, 0]);
  });
});
