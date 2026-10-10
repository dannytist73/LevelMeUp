import { describe, expect, it } from 'vitest';
import { CLASSES, MINUTES_OPTIONS, TIER_MIN_MINUTES, coreAllowance, ladderRungs } from '../../rules/src/index.ts';
import type { Condition } from '../../rules/src/index.ts';
import { LADDERS, LIBRARY, TEMPLATES } from '../src/library.ts';

const MAX_CORE = coreAllowance(Math.max(...MINUTES_OPTIONS));
const ID = /^[a-z]+(-[a-z0-9]+)*$/;
const COMPLETION_FOR: Record<Condition['kind'], readonly string[]> = {
  reps: ['reps'],
  hold: ['reps'],
  minutes: ['tap', 'timer'],
  habit: ['tap'],
  sentence: ['text'],
};

/** How much a condition asks for, so a hard-day version can be checked to ask for less. */
function volume(condition: Condition): number {
  switch (condition.kind) {
    case 'reps':
      return condition.sets * condition.reps * (condition.perSide ? 2 : 1);
    case 'hold':
      return condition.sets * condition.seconds * (condition.perSide ? 2 : 1);
    case 'minutes':
      return condition.minutes;
    default:
      return 0;
  }
}

describe('templates', () => {
  it('have unique kebab-case ids', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(ID);
  });

  describe.each(TEMPLATES.map((t) => [t.id, t] as const))('%s', (_id, t) => {
    it('is a ladder rung exactly when its role says so, with the ladder stat', () => {
      expect(t.role === 'ladder').toBe(t.ladder !== null && t.rung !== null);
      if (t.ladder !== null) expect(LADDERS.find((l) => l.id === t.ladder)?.stat).toBe(t.stat);
    });

    it('takes whole minutes that support its tier', () => {
      expect(Number.isInteger(t.minutes) && t.minutes >= 1).toBe(true);
      expect(t.minutes).toBeGreaterThanOrEqual(TIER_MIN_MINUTES[t.tier]);
      if (t.role === 'ladder') expect(t.minutes).toBeLessThanOrEqual(MAX_CORE);
    });

    it('is marked done the way its condition is measured', () => {
      expect(COMPLETION_FOR[t.condition.kind]).toContain(t.completion);
      if (t.condition.kind === 'minutes') expect(t.condition.minutes).toBe(t.minutes);
    });

    it('has a smaller hard-day version of the same kind', () => {
      const hard = t.hardDay;
      expect(hard.condition.kind).toBe(t.condition.kind);
      expect(hard.minutes).toBeGreaterThanOrEqual(1);
      expect(hard.minutes).toBeLessThanOrEqual(Math.max(2, Math.ceil(t.minutes / 2)));
      expect(volume(hard.condition)).toBeLessThanOrEqual(volume(t.condition));
      if (hard.condition.kind === 'minutes') expect(hard.condition.minutes).toBe(hard.minutes);
    });

    it('is gentle only if it is walking or mobility', () => {
      if (t.gentle) expect(['walk', 'mobility']).toContain(t.exercise);
    });

    it('trains Discipline exactly when it is a recovery quest', () => {
      expect(t.stat === 'discipline').toBe(t.role === 'recovery');
    });
  });
});

describe('ladders', () => {
  describe.each(LADDERS.map((l) => [l.id, l] as const))('%s', (id, ladder) => {
    const rungs = ladderRungs(LIBRARY, id);

    it('has at least 3 rungs, numbered from 0, never getting shorter', () => {
      expect(rungs.length).toBeGreaterThanOrEqual(3);
      expect(rungs.map((r) => r.rung)).toEqual(rungs.map((_, i) => i));
      for (let i = 1; i < rungs.length; i++) expect(rungs[i]!.minutes).toBeGreaterThanOrEqual(rungs[i - 1]!.minutes);
    });

    it('trains one kind of exercise, with any gentle rungs first', () => {
      expect(new Set(rungs.map((r) => r.exercise)).size).toBe(1);
      const firstHard = rungs.findIndex((r) => !r.gentle);
      if (firstHard >= 0) expect(rungs.slice(firstHard).every((r) => !r.gentle)).toBe(true);
    });

    it('serves a goal and names real classes', () => {
      expect(ladder.goals.length).toBeGreaterThan(0);
      for (const classId of ladder.affinity) expect(Object.keys(CLASSES)).toContain(classId);
    });
  });
});
