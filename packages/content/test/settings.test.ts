import { describe, expect, it } from 'vitest';
import { ADJUST_TEXT } from '../src/adjust.ts';
import { lintText } from '../src/lint.ts';
import { ONBOARDING_TEXT } from '../src/onboarding.ts';
import { SETTINGS_TEXT } from '../src/settings.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('the Settings words (M7b)', () => {
  const all = [
    ...strings(SETTINGS_TEXT), ADJUST_TEXT.rest.tomorrow, ADJUST_TEXT.rest.tomorrowBanner, ONBOARDING_TEXT.analysis.storage,
  ];

  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('say what deleting does, and that a Google sign-in stays (M3 owner decision)', () => {
    expect(SETTINGS_TEXT.delete.what).toMatch(/can't be undone/);
    expect(SETTINGS_TEXT.delete.google).toMatch(/Google sign-in/);
    expect(SETTINGS_TEXT.delete.google).toMatch(/only your Grumble Camp data/);
  });

  it('never blame the player for a phone that cannot keep a sign-in', () => {
    expect(ONBOARDING_TEXT.analysis.storage).toMatch(/answers are kept/);
  });
});
