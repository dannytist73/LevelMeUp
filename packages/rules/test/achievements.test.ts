import { describe, expect, it } from 'vitest';
import { meetsCriterion, newAchievements } from '../src/achievements.ts';
import type { AchievementCriterion, AchievementProgress } from '../src/achievements.ts';

const START: AchievementProgress = {
  questsCleared: 0,
  level: 1,
  bestStreak: 0,
  highestRungs: {},
  articlesRead: 0,
  recoveriesCleared: 0,
  hardDaysCleared: 0,
  comebacks: 0,
  bestRank: 'E',
  abilitiesUsed: [],
};

describe('achievement criteria (spec §2.6)', () => {
  it.each<[AchievementCriterion, Partial<AchievementProgress>]>([
    [{ kind: 'quests', count: 10 }, { questsCleared: 10 }],
    [{ kind: 'level', level: 5 }, { level: 6 }],
    [{ kind: 'streak', days: 30 }, { bestStreak: 30 }],
    [{ kind: 'rung', ladder: 'push', rung: 3 }, { highestRungs: { push: 3 } }],
    [{ kind: 'rung', ladder: null, rung: 2 }, { highestRungs: { walk: 1, reading: 2 } }],
    [{ kind: 'articles', count: 1 }, { articlesRead: 1 }],
    [{ kind: 'recoveries', count: 1 }, { recoveriesCleared: 1 }],
    [{ kind: 'hard_days', count: 1 }, { hardDaysCleared: 1 }],
    [{ kind: 'comebacks', count: 1 }, { comebacks: 1 }],
    [{ kind: 'rank', rank: 'C' }, { bestRank: 'B' }],
    [{ kind: 'ability', ability: 'stillness' }, { abilitiesUsed: ['stillness'] }],
  ])('%o is met by %o and not at the start', (criterion, progress) => {
    expect(meetsCriterion(criterion, { ...START, ...progress })).toBe(true);
    expect(meetsCriterion(criterion, START)).toBe(false);
  });

  it('a named ladder needs that ladder', () => {
    expect(meetsCriterion({ kind: 'rung', ladder: 'push', rung: 3 }, { ...START, highestRungs: { squat: 5 } })).toBe(false);
  });

  it('rejects an unknown criterion', () => {
    expect(() => meetsCriterion({ kind: 'fame' } as unknown as AchievementCriterion, START)).toThrow(RangeError);
  });
});

describe('newly earned achievements', () => {
  const rules = [
    { id: 'first', criterion: { kind: 'quests', count: 1 } },
    { id: 'ten', criterion: { kind: 'quests', count: 10 } },
  ] as const;

  it('lists those met and not yet earned, in definition order', () => {
    expect(newAchievements(rules, { ...START, questsCleared: 12 }, [])).toEqual(['first', 'ten']);
    expect(newAchievements(rules, { ...START, questsCleared: 12 }, ['first'])).toEqual(['ten']);
    expect(newAchievements(rules, START, [])).toEqual([]);
  });
});
