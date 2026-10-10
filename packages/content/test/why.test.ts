import { describe, expect, it } from 'vitest';
import { WHY_CODES } from '../../rules/src/index.ts';
import type { WhyReason } from '../../rules/src/index.ts';
import { lintText } from '../src/lint.ts';
import { VOICES } from '../src/types.ts';
import { WHY_PLACEHOLDERS, WHY_TEXT, renderWhy } from '../src/why.ts';

const CONTEXT = { classId: 'warrior' as const, minutesPerDay: 25 };

describe('why-lines (spec §3.2)', () => {
  it.each(WHY_CODES)('%s has a line in every voice, using only its placeholders', (code) => {
    for (const voice of VOICES) {
      const text = WHY_TEXT[code][voice];
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(140);
      expect(lintText(text)).toEqual([]);
      for (const [, key] of text.matchAll(/\{(\w+)\}/g)) expect(WHY_PLACEHOLDERS[code]).toContain(key);
    }
    expect(new Set(VOICES.map((v) => WHY_TEXT[code][v])).size).toBe(VOICES.length);
  });

  it('fills the placeholders', () => {
    expect(renderWhy({ code: 'balance', stat: 'focus' }, 'system', CONTEXT)).toBe('Balance quest: Focus is your lowest stat.');
    expect(renderWhy({ code: 'unlocked', previous: 'push-1' }, 'system', CONTEXT)).toBe('Unlocked: you cleared incline push-ups.');
    expect(renderWhy({ code: 'goal', goal: 'learn' }, 'system', CONTEXT)).toBe('Goal quest: reading and learning.');
    expect(renderWhy({ code: 'short_on_time' }, 'system', CONTEXT)).toBe('Shortened to fit 25 minutes a day.');
  });

  it('starts every sentence with a capital letter, even when a name opens it', () => {
    const line = renderWhy({ code: 'unlocked', previous: 'push-1' }, 'questmaster', CONTEXT);
    expect(line).toMatch(/^[A-Z]/);
    expect(line).not.toMatch(/[.!?] [a-z]/);
  });

  it('renders every reason in every voice without leftover braces', () => {
    const reasons: WhyReason[] = WHY_CODES.map((code) =>
      code === 'class_main' || code === 'class_second' || code === 'balance' ? { code, stat: 'wisdom' }
        : code === 'goal' ? { code, goal: 'body' }
          : code === 'unlocked' ? { code, previous: 'walk-0' }
            : ({ code } as WhyReason));
    for (const reason of reasons) {
      for (const voice of VOICES) expect(renderWhy(reason, voice, CONTEXT)).not.toMatch(/[{}]/);
    }
  });
});
