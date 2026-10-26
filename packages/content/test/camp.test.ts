import { describe, expect, it } from 'vitest';
import { APP_NAME, CAMP_TEXT } from '../src/camp.ts';
import { lintText } from '../src/lint.ts';

const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : typeof v === 'object' && v !== null ? Object.values(v).flatMap(strings) : []);

describe("the simpler day's words (docs/2026-10-26-simpler-day.md)", () => {
  it('pass the lint', () => {
    for (const text of [APP_NAME, ...strings(CAMP_TEXT)]) expect(lintText(text), text).toEqual([]);
  });

  it('never say LevelMeUp', () => {
    for (const text of strings(CAMP_TEXT)) expect(text).not.toMatch(/LevelMeUp/);
  });
});
