import { describe, expect, it } from 'vitest';
import {
  CLASSES, GOALS, MINUTES_OPTIONS, MIN_SIDE_MINUTES, TIER_MIN_MINUTES, coreAllowance, ladderRungs, workoutMinutes,
} from '../../rules/src/index.ts';
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
  workout: ['reps'],
  session: [],
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
    case 'workout':
      return condition.sets.reduce((sum, n) => sum + n, 0);
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
      // A habit or a single sentence is already the smallest step; anything counted gets smaller.
      if (t.condition.kind !== 'habit' && t.condition.kind !== 'sentence') {
        expect(hard.minutes < t.minutes || volume(hard.condition) < volume(t.condition), 'not smaller').toBe(true);
      }
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

describe('the whole library', () => {
  it('has the 13 ladders and about 80 templates', () => {
    expect(LADDERS.map((l) => l.id)).toEqual([
      'push', 'squat', 'core', 'own-program', 'workout', 'walk', 'mobility', 'sleep', 'breathing', 'reading', 'insight', 'focus',
      'phone-free',
    ]);
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(65);
    expect(TEMPLATES.length).toBeLessThanOrEqual(90);
  });

  it('every workout rung takes the minutes its sets take, and its hard day is one set of the first two exercises', () => {
    const rungs = ladderRungs(LIBRARY, 'workout');
    expect(rungs.map((t) => t.condition)).toEqual([
      { kind: 'workout', sets: [2, 2, 2], level: 1 },
      { kind: 'workout', sets: [2, 2, 2], level: 2 },
      { kind: 'workout', sets: [2, 2, 2], level: 3 },
      { kind: 'workout', sets: [3, 3, 3], level: 3 },
      { kind: 'workout', sets: [3, 3, 3, 3], level: 3 },
      { kind: 'workout', sets: [4, 3, 3, 3], level: 3 },
    ]);
    for (const t of rungs) {
      if (t.condition.kind !== 'workout' || t.hardDay.condition.kind !== 'workout') throw new Error(t.id);
      expect(t.minutes, t.id).toBe(workoutMinutes(t.condition.sets));
      expect(t.hardDay.condition, t.id).toEqual({ kind: 'workout', sets: [1, 1], level: t.condition.level });
      expect(t.hardDay.minutes, t.id).toBe(workoutMinutes([1, 1]));
      expect(t.contraindications, t.id).toEqual([]);
    }
  });

  it('the workout lines name no exercise count: limits can leave fewer exercises (review)', () => {
    for (const t of TEMPLATES.filter((x) => x.ladder === 'workout')) {
      for (const v of Object.values(t.voice)) expect(v.line, t.id).not.toMatch(/\b(two|three|four) (exercises|trials)\b/i);
    }
  });

  it('only the workout ladder has a class affinity among the strength ladders, besides an own program (decision 7)', () => {
    const strength = LADDERS.filter((l) => l.stat === 'strength' && !l.ownProgram);
    expect(strength.filter((l) => l.affinity.length > 0).map((l) => l.id)).toEqual(['workout']);
  });

  it('has exactly one Stillness, Dawn Ritual and article quest, and a recovery quest for every class', () => {
    for (const role of ['stillness', 'dawn_ritual', 'article'] as const) {
      expect(TEMPLATES.filter((t) => t.role === role)).toHaveLength(1);
    }
    for (const classId of Object.keys(CLASSES) as (keyof typeof CLASSES)[]) {
      expect(TEMPLATES.find((t) => t.id === LIBRARY.recovery[classId])?.role).toBe('recovery');
    }
  });

  it('recovery quests take 5 minutes and suit every player', () => {
    for (const t of TEMPLATES.filter((x) => x.role === 'recovery')) {
      expect(t.minutes).toBeLessThanOrEqual(5);
      expect(t.contraindications).toEqual([]);
      expect(t.exercise === null || t.gentle).toBe(true);
    }
  });

  it('Stillness and the Dawn Ritual fit even a 10-minute day', () => {
    for (const t of TEMPLATES.filter((x) => x.role === 'stillness' || x.role === 'dawn_ritual')) {
      expect(t.minutes).toBeLessThanOrEqual(coreAllowance(10));
    }
  });

  it('always has short side quests nobody is excluded from, in at least 3 stats', () => {
    const open = TEMPLATES.filter((t) =>
      (t.role === 'micro' || t.rung === 0) && t.minutes <= MIN_SIDE_MINUTES && t.exercise === null && t.contraindications.length === 0);
    expect(new Set(open.map((t) => t.stat)).size).toBeGreaterThanOrEqual(3);
  });

  it('serves every goal, and gives every class affinity ladders for its main stat', () => {
    for (const goal of GOALS) expect(LADDERS.some((l) => l.goals.includes(goal))).toBe(true);
    for (const [classId, { main }] of Object.entries(CLASSES)) {
      const own = LADDERS.filter((l) => l.stat === main && l.affinity.includes(classId as keyof typeof CLASSES));
      expect(own.length, `${classId} ${main}`).toBeGreaterThan(0);
    }
  });
});
