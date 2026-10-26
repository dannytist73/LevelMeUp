// Plain words (the owner, 2026-10-26): the checks that hold a story lesson to what a high-school student follows.
import { describe, expect, it } from 'vitest';
import { PLAIN, plainProblems, readingGrade, sentences, syllables } from '../../functions/_shared/articles/plain.ts';

describe('plain words', () => {
  it('splits sentences at a full stop, question or exclamation mark, but not inside a number', () => {
    expect(sentences('He walks 4.5 miles. Is it far? "Not really." She laughs!')).toEqual(['He walks 4.5 miles.', 'Is it far?', '"Not really."', 'She laughs!']);
  });

  it('counts syllables closely enough for a grade', () => {
    expect([syllables('walk'), syllables('people'), syllables('motivation'), syllables('the')]).toEqual([1, 2, 4, 1]);
  });

  it('grades a plain story low and a textbook line high', () => {
    expect(readingGrade('Jonah walks after lunch. He feels better. He does it again the next day.')).toBeLessThan(3);
    expect(readingGrade('Physiological adaptation predominantly materialises during subsequent recovery intervals.')).toBeGreaterThan(PLAIN.whyGrade);
  });

  it('names each problem so a rewrite knows what to change', () => {
    expect(plainProblems('Jonah walks after lunch, and he feels better.')).toEqual([]);
    expect(plainProblems('The goal sits there like a wall.')[0]).toBe('say it plainly, without the comparison "like a": "The goal sits there like a wall."');
    expect(plainProblems('It feels as if the day is gone.')[0]).toMatch(/^say it plainly, without the comparison "as if the"/);
    expect(plainProblems('Studies of sleep cohorts found more REM sleep.')).toContain('"cohorts" is jargon: say what it means in everyday words');
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone.';
    expect(plainProblems(long)[0]).toMatch(/^a sentence has 21 words \(at most 20\), so split it/);
  });

  it('leaves everyday "like" alone', () => {
    expect(plainProblems('His legs feel like his own again. He would like to rest.')).toEqual([]);
  });
});
