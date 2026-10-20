import { describe, expect, it } from 'vitest';
import { lintText } from '../src/lint.ts';
import { PLAY_TEXT, TODAY_TEXT, fillText } from '../src/play.ts';
import { WIDGET_TEXT } from '../src/widget.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the words of quest play (M6a)', () => {
  it('pass the lint: plain, kind, no shaming', () => {
    const all = strings(PLAY_TEXT);
    expect(all.length).toBeGreaterThan(30);
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('fill their placeholders, and a missing value is a bug', () => {
    expect(fillText(PLAY_TEXT.cleared.streakDays, { from: 9, to: 10 })).toBe('9 → 10 days');
    expect(fillText(PLAY_TEXT.timer.note, { at: '16:00' })).toContain('from 16:00');
    expect(fillText(PLAY_TEXT.celebration.level, { level: 7 })).toContain('Level 7');
    expect(() => fillText(PLAY_TEXT.cleared.streakDays, { from: 9 })).toThrow(/\{to\}/);
  });
});

describe("M10c: Today's words and the widget's", () => {
  it('pass the lint', () => {
    for (const text of [...strings(TODAY_TEXT), ...strings(WIDGET_TEXT), ...strings(PLAY_TEXT.rest)]) expect(lintText(text), text).toEqual([]);
  });

  it('fill their placeholders', () => {
    expect(fillText(TODAY_TEXT.dayCleared, { day: 6 })).toBe('Day 6 cleared');
    expect(fillText(TODAY_TEXT.markDone, { title: 'Walk 10 minutes' })).toBe('Mark Walk 10 minutes cleared');
    expect(fillText(TODAY_TEXT.doneToday, { n: 2 })).toBe('Done today · 2');
    expect(fillText(WIDGET_TEXT.progress, { done: 2, total: 4 })).toBe('2 of 4 cleared');
    expect(fillText(PLAY_TEXT.rest.left, { time: '1:45' })).toBe('Rest 1:45');
    expect(fillText(PLAY_TEXT.workout.lastTime, { sets: '10 · 9' })).toBe('Last time: 10 · 9');
  });
});
