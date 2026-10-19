import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ART_KEYS, artKey } from '../src/art.ts';
import { LADDERS, TEMPLATES } from '../src/library.ts';
import { MOVES } from '../src/training/moves.ts';

describe('quest art keys (M6a, decision 10)', () => {
  it('names each template by its own picture, its ladder, its stat for small quests, or its role', () => {
    expect(artKey(TEMPLATES.find((t) => t.id === 'push-0')!)).toBe('push-wall');
    expect(artKey(TEMPLATES.find((t) => t.id === 'push-3')!)).toBe('ladder-push');
    expect(artKey(TEMPLATES.find((t) => t.id === 'squat-0')!)).toBe('micro-strength');
    expect(artKey(TEMPLATES.find((t) => t.role === 'micro' && t.stat === 'wisdom')!)).toBe('micro-wisdom');
    expect(artKey(TEMPLATES.find((t) => t.role === 'dawn_ritual')!)).toBe('dawn-ritual');
    expect(artKey(TEMPLATES.find((t) => t.role === 'article')!)).toBe('article');
    expect(artKey(TEMPLATES.find((t) => t.role === 'recovery')!)).toBe('recovery');
    for (const t of TEMPLATES) expect(artKey(t)).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('a workout shows its first exercise\'s family (M6c decision 13)', () => {
    const workout = TEMPLATES.find((t) => t.ladder === 'workout')!;
    const session = { kind: 'session', moves: [{ move: 'db-rdl', unit: 'reps', min: 8, max: 12, perSide: false, sets: 2 }] } as const;
    expect(artKey(workout, session)).toBe('move-hinge');
  });

  it('needs 33 pictures: ladders, own rung pictures, small-quest stats, special quests and exercise families', () => {
    expect(ART_KEYS).toHaveLength(33);
    for (const ladder of LADDERS.filter((l) => l.id !== 'workout' && l.id !== 'program')) expect(ART_KEYS).toContain(`ladder-${ladder.id}`);
    for (const pattern of new Set(MOVES.map((m) => m.pattern))) expect(ART_KEYS).toContain(`move-${pattern}`);
    expect(ART_KEYS).toEqual(expect.arrayContaining([
      'push-wall', 'push-incline', 'push-knee', 'squat-chair', 'squat-split', 'core-dead-bug',
      'micro-strength', 'micro-vitality', 'micro-wisdom', 'micro-focus', 'recovery', 'stillness', 'dawn-ritual', 'article',
    ]));
    expect(ART_KEYS).not.toContain('ladder-workout');
    expect(ART_KEYS).not.toContain('ladder-program'); // M16: a weekly workout shows its first exercise too
  });

  it('has a subject in the art script for every key, so the set can be rendered', () => {
    const script = readFileSync(fileURLToPath(new URL('../../../scripts/art/quest-art.py', import.meta.url)), 'utf8');
    for (const key of ART_KEYS) expect(script, key).toContain(`"${key}":`);
  });
});
