import { describe, expect, it } from 'vitest';
import { lintShadowLine } from '../src/lint.ts';
import { SHADOW_LINES, SHADOW_MOMENTS, shadowLine } from '../src/shadow.ts';

describe('the Shadow (spec §4.3, visual design §3)', () => {
  it('keeps the two approved lines word for word', () => {
    expect(SHADOW_LINES.claim).toContain('The day closed in silence, so I took it.');
    expect(SHADOW_LINES.mark).toContain('It stays mine until you clear the recovery quest. Five minutes. Come and take it back.');
  });

  it.each(SHADOW_MOMENTS)('%s has at least 2 short lines that pass the Shadow lint', (moment) => {
    expect(SHADOW_LINES[moment].length).toBeGreaterThanOrEqual(2);
    for (const line of SHADOW_LINES[moment]) {
      expect(line.length).toBeLessThanOrEqual(120);
      expect(lintShadowLine(line)).toEqual([]);
    }
  });

  it('picks a line by day number, the same one every time', () => {
    expect(shadowLine('claim', 1)).toBe(SHADOW_LINES.claim[0]);
    expect(shadowLine('claim', 1 + SHADOW_LINES.claim.length)).toBe(SHADOW_LINES.claim[0]);
    expect(() => shadowLine('claim', 0)).toThrow(RangeError);
  });
});
