import { describe, expect, it } from 'vitest';
import { lintText } from '../src/lint.ts';
import { PLAY_TEXT, fillText } from '../src/play.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the words of quest play (M6a)', () => {
  it('pass the lint: plain, kind, no shaming', () => {
    const all = strings(PLAY_TEXT);
    expect(all.length).toBeGreaterThan(30);
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('fill their placeholders, and a missing value is a bug', () => {
    expect(fillText(PLAY_TEXT.cleared.streakDays, { from: 9, to: 10 })).toBe('9 → 10 DAYS');
    expect(fillText(PLAY_TEXT.timer.note, { at: '16:00' })).toContain('from 16:00');
    expect(fillText(PLAY_TEXT.celebration.level, { level: 7 })).toContain('Level 7');
    expect(() => fillText(PLAY_TEXT.cleared.streakDays, { from: 9 })).toThrow(/\{to\}/);
  });
});
