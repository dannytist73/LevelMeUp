import { describe, expect, it } from 'vitest';
import { lintText } from '../src/lint.ts';
import { TEMPLATES } from '../src/library.ts';
import { VOICES } from '../src/types.ts';

const bangs = (text: string): number => text.split('!').length - 1;

describe.each(TEMPLATES.map((t) => [t.id, t] as const))('%s words', (_id, t) => {
  it('has a plain name, 1–5 short steps, and safety notes on exercise', () => {
    expect(t.name.length).toBeGreaterThan(0);
    expect(t.name.length).toBeLessThanOrEqual(40);
    expect(t.steps.length).toBeGreaterThanOrEqual(1);
    expect(t.steps.length).toBeLessThanOrEqual(5);
    for (const line of [...t.steps, ...t.safety]) {
      expect(line.length).toBeGreaterThan(0);
      expect(line.length).toBeLessThanOrEqual(160);
    }
    if (t.exercise !== null) expect(t.safety.length).toBeGreaterThan(0);
  });

  it('speaks in all three voices, differently and briefly, without reward numbers', () => {
    const lines = VOICES.map((voice) => t.voice[voice].line);
    expect(new Set(lines).size).toBe(VOICES.length);
    for (const voice of VOICES) {
      const { title, line } = t.voice[voice];
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(40);
      expect(line.length).toBeGreaterThan(0);
      expect(line.length).toBeLessThanOrEqual(160);
      expect(`${title} ${line}`).not.toMatch(/\bXP\b/i);
      expect(bangs(`${title} ${line}`)).toBeLessThanOrEqual(voice === 'system' ? 0 : 1);
    }
  });

  it('passes the lint', () => {
    const texts = [t.name, ...t.steps, ...t.safety, ...VOICES.flatMap((v) => [t.voice[v].title, t.voice[v].line])];
    for (const text of texts) expect(lintText(text), text).toEqual([]);
  });
});
