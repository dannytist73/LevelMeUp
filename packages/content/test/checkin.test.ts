import { describe, expect, it } from 'vitest';
import { CHECKIN_TEXT, LIGHTER_TEXT } from '../src/checkin.ts';
import { lintText } from '../src/lint.ts';
import { PLAY_TEXT } from '../src/play.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('the check-in words (M7a)', () => {
  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of [...strings(CHECKIN_TEXT), ...strings(LIGHTER_TEXT), PLAY_TEXT.cleared.recovered]) {
      expect(lintText(text), text).toEqual([]);
    }
  });

  it('keep the board F1 lines', () => {
    expect(CHECKIN_TEXT.title).toBe('The day closed. What happened?');
    expect(CHECKIN_TEXT.answers.sick_or_injured.label).toBe('I was sick or injured');
    expect(CHECKIN_TEXT.answers.just_didnt.outcome).toBe('A 5-minute recovery quest today keeps your streak');
    expect(CHECKIN_TEXT.laterNote).toBe('Your streak stays paused until you answer.');
  });

  it('never call a day a failure', () => {
    for (const text of strings(CHECKIN_TEXT)) expect(text.toLowerCase()).not.toMatch(/\bfail|\bmissed\b/);
  });
});
