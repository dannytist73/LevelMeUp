import { describe, expect, it } from 'vitest';
import { ABILITY_IDS, RANK_FLOORS, ladderRungs } from '../../rules/src/index.ts';
import { ACHIEVEMENTS } from '../src/achievements.ts';
import { LADDERS, LIBRARY } from '../src/library.ts';
import { lintText } from '../src/lint.ts';

describe('achievements (spec §2.6)', () => {
  it('has about 25, with unique ids, names and titles', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(30);
    const unique = (values: unknown[]) => new Set(values).size === values.length;
    expect(unique(ACHIEVEMENTS.map((a) => a.id))).toBe(true);
    expect(unique(ACHIEVEMENTS.map((a) => a.name))).toBe(true);
    expect(unique(ACHIEVEMENTS.flatMap((a) => (a.title ? [a.title] : [])))).toBe(true);
  });

  it('keeps the spec examples: Rise Again and The Unbroken', () => {
    expect(ACHIEVEMENTS.find((a) => a.name === 'Rise Again')?.criterion).toEqual({ kind: 'recoveries', count: 1 });
    expect(ACHIEVEMENTS.find((a) => a.title === 'The Unbroken')?.criterion).toEqual({ kind: 'streak', days: 30 });
  });

  it.each(ACHIEVEMENTS.map((a) => [a.id, a] as const))('%s is reachable and well written', (_id, a) => {
    const c = a.criterion;
    if (c.kind === 'rung') {
      const tops = (c.ladder === null ? LADDERS.map((l) => l.id) : [c.ladder]).map((id) => ladderRungs(LIBRARY, id).length - 1);
      expect(Math.max(...tops)).toBeGreaterThanOrEqual(c.rung);
    }
    if (c.kind === 'ability') expect(ABILITY_IDS).toContain(c.ability);
    if (c.kind === 'rank') expect(RANK_FLOORS.map(([rank]) => rank)).toContain(c.rank);
    if (c.kind === 'level') expect(c.level).toBeGreaterThanOrEqual(2);
    expect(a.name.length).toBeLessThanOrEqual(28);
    expect(a.description.length).toBeLessThanOrEqual(120);
    if (a.title) expect(a.title.length).toBeLessThanOrEqual(24);
    for (const text of [a.name, a.description, a.title ?? '']) expect(lintText(text)).toEqual([]);
  });
});
