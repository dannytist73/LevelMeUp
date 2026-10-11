import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ART_KEYS, artKey } from '../src/art.ts';
import { LADDERS, TEMPLATES } from '../src/library.ts';

describe('quest art keys (M6a, decision 10)', () => {
  it('names each template by its ladder, by its stat for small quests, or by its role', () => {
    expect(artKey(TEMPLATES.find((t) => t.ladder === 'push')!)).toBe('ladder-push');
    expect(artKey(TEMPLATES.find((t) => t.role === 'micro' && t.stat === 'wisdom')!)).toBe('micro-wisdom');
    expect(artKey(TEMPLATES.find((t) => t.role === 'dawn_ritual')!)).toBe('dawn-ritual');
    expect(artKey(TEMPLATES.find((t) => t.role === 'article')!)).toBe('article');
    expect(artKey(TEMPLATES.find((t) => t.role === 'recovery')!)).toBe('recovery');
    for (const t of TEMPLATES) expect(artKey(t)).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('needs one picture per ladder, per small-quest stat and per special quest: 20 in all', () => {
    expect(ART_KEYS).toHaveLength(20);
    for (const ladder of LADDERS) expect(ART_KEYS).toContain(`ladder-${ladder.id}`);
    expect(ART_KEYS).toEqual(expect.arrayContaining([
      'micro-strength', 'micro-vitality', 'micro-wisdom', 'micro-focus', 'recovery', 'stillness', 'dawn-ritual', 'article',
    ]));
  });

  it('has a subject in the art script for every key, so the set can be rendered', () => {
    const script = readFileSync(fileURLToPath(new URL('../../../scripts/art/quest-art.py', import.meta.url)), 'utf8');
    for (const key of ART_KEYS) expect(script, key).toContain(`"${key}":`);
  });
});
