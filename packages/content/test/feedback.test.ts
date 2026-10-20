import { describe, expect, it } from 'vitest';
import { CHECKIN_TEXT } from '../src/checkin.ts';
import { FEEDBACK_TEXT } from '../src/feedback.ts';
import { fillText } from '../src/play.ts';
import { lintText } from '../src/lint.ts';
import { NOTICE_OTHER, NOTICE_TEXT } from '../src/notices.ts';
import { SETTINGS_TEXT } from '../src/settings.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('what the System says once an action worked (premium pass B)', () => {
  // Premium pass C4: the notices, the account box and the sync words moved here from the app, so the lint covers them.
  const all = [
    ...strings(FEEDBACK_TEXT), ...strings(SETTINGS_TEXT.signInLost), ...strings(NOTICE_TEXT), NOTICE_OTHER,
    ...strings(SETTINGS_TEXT.google), ...strings(SETTINGS_TEXT.sync),
  ];

  it('passes the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('keeps every line short enough for a note at the bottom of the screen', () => {
    for (const text of strings(FEEDBACK_TEXT)) expect(text.length, text).toBeLessThanOrEqual(110);
  });

  it('reads as one sentence with each check-in outcome', () => {
    for (const answer of Object.values(CHECKIN_TEXT.answers)) {
      const line = fillText(FEEDBACK_TEXT.answered, { outcome: answer.outcome });
      expect(line).toMatch(/^Noted: .+\.$/);
      expect(line).not.toMatch(/\.\.$/);
    }
  });
});
