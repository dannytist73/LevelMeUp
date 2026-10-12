import { describe, expect, it } from 'vitest';
import { lintShadowLine, lintText } from '../src/lint.ts';
import { PACT_TEXT, SHADOW_TEXT } from '../src/pact.ts';
import { SHADOW_LINES, retreatLine } from '../src/shadow.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('the Pact and the Shadow on screen (M7c, boards F2–F5)', () => {
  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of [...strings(PACT_TEXT), ...strings(SHADOW_TEXT)]) expect(lintText(text), text).toEqual([]);
  });

  it('name the five rules of the board, in order', () => {
    expect(PACT_TEXT.rules).toHaveLength(5);
    expect(PACT_TEXT.rules[0]).toMatch(/"I just didn't"/);
    expect(PACT_TEXT.rules[1]).toMatch(/Never a crash, a failed sync/);
    expect(PACT_TEXT.rules[2]).toMatch(/After 3 in 7 days it pauses/);
    expect(PACT_TEXT.rules[3]).toMatch(/never today's/);
    expect(PACT_TEXT.rules[4]).toMatch(/never touches your progress/);
  });

  it('name the evening reminder at level 2 only, with notifications on (M7d)', () => {
    expect(PACT_TEXT.levels[2].line).toMatch(/With notifications on, a second, sterner reminder comes that evening\./);
    const others = { ...PACT_TEXT, levels: { 0: PACT_TEXT.levels[0], 1: PACT_TEXT.levels[1] } };
    for (const text of strings(others)) expect(text).not.toMatch(/reminder/i);
  });

  it('say that the core quest, the recovery quest and the article are never sealed', () => {
    expect(PACT_TEXT.levels[2].line).toMatch(/core quest, the recovery quest and the article are never sealed/);
    expect(SHADOW_TEXT.trial.line).toMatch(/core quest, the recovery quest and the article are never sealed/);
  });

  it("the Shadow's retreat mentions the lighter plan only when the System offers one", () => {
    expect(retreatLine(true)).toMatch(/lighter plan/);
    expect(retreatLine(false)).not.toMatch(/lighter plan/);
    for (const line of [retreatLine(true), retreatLine(false)]) expect(SHADOW_LINES.retreat).toContain(line);
    for (const line of [retreatLine(true), retreatLine(false)]) expect(lintShadowLine(line)).toEqual([]);
  });
});
