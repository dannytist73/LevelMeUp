import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/achievements.ts';
import { ABILITIES_LATER, BOOK_TEXT, CHARACTER_TEXT, CHRONICLE_TEXT, growthLine, latestTitle } from '../src/character.ts';
import { lintText } from '../src/lint.ts';
import { fillText } from '../src/play.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the words of Character, Chronicle and Scholar\'s Path (M6d)', () => {
  it('pass the lint', () => {
    const all = [...strings(CHARACTER_TEXT), ...strings(CHRONICLE_TEXT), ...strings(BOOK_TEXT)];
    expect(all.length).toBeGreaterThan(40);
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('fill their blanks', () => {
    expect(fillText(CHARACTER_TEXT.stats.toNext, { xp: 10, next: 12 })).toBe('10 XP to 12');
    expect(fillText(CHARACTER_TEXT.path.locked, { level: 10, left: 4 })).toBe('Level 10 · 4 to go');
    expect(fillText(CHRONICLE_TEXT.since, { date: 'Tue 29 Sep' })).toBe('Since day 1 · Tue 29 Sep');
    expect(fillText(BOOK_TEXT.questLine, { title: 'Dune' })).toBe('Reading: Dune');
  });

  it('every ability works now: Insight arrived with the readings (M8b)', () => {
    expect(ABILITIES_LATER).toEqual([]);
  });

  it('the title is the latest earned achievement that has one', () => {
    expect(latestTitle([])).toBeNull();
    expect(latestTitle(['first-trial', 'level-5'])).toBeNull();
    expect(latestTitle(['trials-100', 'streak-30', 'level-10'])).toBe('The Unbroken');
    expect(latestTitle(['streak-30', 'trials-100'])).toBe('The Tireless');
    expect(latestTitle(['retired-achievement'])).toBeNull();
    expect(ACHIEVEMENTS.some((a) => a.title !== null)).toBe(true);
  });

  it('says the growth in plain words, singular and plural', () => {
    expect(growthLine({ levels: 5, quests: 21, rungs: 1 })).toBe('5 levels gained, 21 quests cleared, 1 new rung reached.');
    expect(growthLine({ levels: 1, quests: 1, rungs: 0 })).toBe('1 level gained, 1 quest cleared, no new rungs yet.');
    expect(growthLine({ levels: 0, quests: 0, rungs: 0 })).toBe('Your first quests are waiting.');
  });
});
