import { describe, expect, it } from 'vitest';
import { ABOUT_TEXT, PRIVACY_TEXT, UPDATE_TEXT } from '../src/about.ts';
import { lintText } from '../src/lint.ts';
import { ONBOARDING_TEXT } from '../src/onboarding.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('About, privacy and the update card (M9b)', () => {
  const all = [...strings(ABOUT_TEXT), ...strings(PRIVACY_TEXT), ...strings(UPDATE_TEXT), ONBOARDING_TEXT.analysis.update];

  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('name every place the data goes, and what is never kept (decision 6)', () => {
    const privacy = strings(PRIVACY_TEXT).join(' ');
    for (const fact of ['Singapore', 'Claude', 'Anthropic', 'Google', 'safety questions', 'No ads', 'Delete my character', 'about a week']) {
      expect(privacy).toContain(fact);
    }
  });

  it('say the person running the pilot sees totals, never names or notes', () => {
    expect(strings(PRIVACY_TEXT).join(' ')).toMatch(/totals.*never.*names or notes/);
  });

  it('the update card keeps the character and says how long what is logged waits (decision 5)', () => {
    expect(UPDATE_TEXT.line).toMatch(/too old/);
    expect(UPDATE_TEXT.line).toMatch(/character is safe/);
    expect(UPDATE_TEXT.line).toMatch(/two days/);
    expect(ONBOARDING_TEXT.analysis.update).toMatch(/answers are kept/);
  });
});
