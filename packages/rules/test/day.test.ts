import { describe, expect, it } from 'vitest';
import { buildDay, draftQuest, questReward } from '../src/day.ts';
import type { BuiltDay, DayInput } from '../src/day.ts';
import { newLadder } from '../src/ladder.ts';
import { templateById } from '../src/library.ts';
import { planWorkout } from '../src/workout.ts';
import { FIXTURE, TRAINING, WORKOUT_FIXTURE, dayInput, workoutTemplate } from './fixtures/library.ts';

const ids = (day: BuiltDay): string[] => day.quests.map((q) => q.templateId);
const quest = (day: BuiltDay, slot: string) => day.quests.find((q) => q.slot === slot)!;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

describe('the shape of a day (spec §3.2)', () => {
  it('has a core quest, two side quests and the article, from different ladders, within the budget', () => {
    const day = buildDay(FIXTURE, dayInput());
    expect(day.quests.map((q) => q.slot)).toEqual(['core', 'side1', 'side2', 'article']);
    expect(ids(day)).toEqual(['walk-0', 'push-0', 'focus-0', 'article']);
    expect(day.budget).toBe(25);
    expect(day.articleId).toBe('article-1');
    expect(day.hardDay).toBe(false);
  });

  it('stores the reward from the rules tables', () => {
    const day = buildDay(FIXTURE, dayInput({ ladders: { walk: newLadder(1) } }));
    expect(quest(day, 'core').xp).toEqual({ vitality: 20 });
    expect(quest(day, 'article').xp).toEqual({ wisdom: 10 });
    expect(questReward(templateById(FIXTURE, 'recovery-walk'), false)).toEqual({ discipline: 5 });
  });

  it('day 1 is light: a 10-minute budget, and the core says so', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 1 }));
    expect(day.light).toBe(true);
    expect(day.budget).toBe(10);
    expect(ids(day)).toEqual(['push-0', 'mobility-0', 'micro-plan', 'article']);
    expect(quest(day, 'core').why).toEqual({ code: 'light_day' });
  });

  it('every budget is respected', () => {
    for (const minutesPerDay of [10, 15, 25, 40]) {
      for (let dayNumber = 1; dayNumber <= 14; dayNumber++) {
        const day = buildDay(FIXTURE, dayInput({ dayNumber }, { minutesPerDay }));
        const used = day.quests.filter((q) => q.slot !== 'article').reduce((sum, q) => sum + q.minutes, 0);
        expect(used).toBeLessThanOrEqual(day.budget);
      }
    }
  });
});

describe('the core quest follows the class (spec §2.5)', () => {
  it('main stat, second stat, then the weakest stat on balance days', () => {
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 2 })), 'core').why).toEqual({ code: 'class_second', stat: 'vitality' });
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 3 })), 'core').why).toEqual({ code: 'class_main', stat: 'strength' });
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 4 })), 'core').why).toEqual({ code: 'balance', stat: 'focus' });
  });

  it('after a strength core comes walking or mobility, and yesterday strength ladders rest', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 8, history: [{ dayNumber: 7, quests: { core: 'push-1', side1: 'squat-0' } }] }));
    expect(quest(day, 'core').templateId).toBe('walk-0');
    expect(quest(day, 'core').why).toEqual({ code: 'after_strength' });
    expect(day.quests.some((q) => q.ladder === 'push' || q.ladder === 'squat')).toBe(false);
  });

  it('yesterday strength ladders rest even when nothing else would keep them out', () => {
    // Walk is paused, so mobility is the core and the body goal has only strength ladders left.
    const history = [{ dayNumber: 7, quests: { core: 'push-1', side1: 'squat-0' } }];
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 8, history, ladders: { walk: { ...newLadder(), paused: true } } }));
    expect(quest(day, 'core').templateId).toBe('mobility-0');
    expect(day.quests.some((q) => q.ladder === 'push' || q.ladder === 'squat')).toBe(false);
  });

  it('a core that is not strength work is left alone after a strength day', () => {
    const mage = buildDay(FIXTURE, dayInput({ dayNumber: 8, history: [{ dayNumber: 7, quests: { core: 'push-0' } }] }, { classId: 'mage', goals: ['learn'] }));
    expect(quest(mage, 'core').templateId).toBe('reading-0');
    expect(quest(mage, 'core').why).toEqual({ code: 'class_main', stat: 'wisdom' });
  });

  it('the least recently built ladder comes first', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 5, history: [{ dayNumber: 3, quests: { core: 'push-0' } }] }));
    expect(quest(day, 'core').templateId).toBe('squat-0');
  });
});

describe('side quests', () => {
  it('side 1 serves the goals, which take turns leading', () => {
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 2 })), 'side1').why).toEqual({ code: 'goal', goal: 'body' });
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 3 })), 'side1').why).toEqual({ code: 'goal', goal: 'energy' });
  });

  it('side 2 is the weakest stat not already in the day', () => {
    const day = buildDay(FIXTURE, dayInput());
    expect(quest(day, 'side2').why).toEqual({ code: 'balance', stat: 'focus' });
  });
});

describe('fitting the player (spec §3.3, §3.4)', () => {
  it('a rung too long for the day is built lower, and says why', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: newLadder(2) } }, { minutesPerDay: 10 }));
    expect(quest(day, 'core').templateId).toBe('push-0');
    expect(quest(day, 'core').why).toEqual({ code: 'short_on_time', minutes: 10 });
  });

  it('a limitation caps a ladder and closes ladders whose first rung it rules out', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: newLadder(2) } }, { limitations: ['knee'] }));
    expect(quest(day, 'core').templateId).toBe('push-1');
    expect(quest(day, 'core').why).toEqual({ code: 'limits' });
    for (let dayNumber = 1; dayNumber <= 14; dayNumber++) {
      const later = buildDay(FIXTURE, dayInput({ dayNumber }, { limitations: ['knee'] }));
      expect(later.quests.some((q) => q.templateId.startsWith('squat') || q.templateId === 'micro-squats')).toBe(false);
    }
  });

  it('a gentle start gives only gentle walking and mobility as physical quests', () => {
    for (let dayNumber = 1; dayNumber <= 14; dayNumber++) {
      const day = buildDay(FIXTURE, dayInput({ dayNumber, ladders: { walk: newLadder(2) } }, { gentleStart: true }));
      for (const q of day.quests) {
        const template = templateById(FIXTURE, q.templateId);
        if (template.exercise === null) continue;
        expect(template.exercise === 'walk' || template.exercise === 'mobility').toBe(true);
        expect(template.gentle).toBe(true);
        expect(q.why).toEqual({ code: 'gentle_start' });
      }
    }
  });

  it('players with their own program get their own session as strength work', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 3 }, { ownProgram: true }));
    expect(quest(day, 'core').templateId).toBe('own-0');
    expect(quest(day, 'core').why).toEqual({ code: 'own_program' });
  });

  it('a ladder paused for pain is never built', () => {
    for (let dayNumber = 1; dayNumber <= 14; dayNumber++) {
      const day = buildDay(FIXTURE, dayInput({ dayNumber, ladders: { push: { ...newLadder(), paused: true } } }));
      expect(day.quests.some((q) => q.ladder === 'push')).toBe(false);
    }
  });
});

describe('why a quest was picked', () => {
  it('a rung reached by stepping up says what unlocked it; a starting rung does not', () => {
    const steppedUp = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: { ...newLadder(1), lastStepUpAt: 0 } } }));
    expect(quest(steppedUp, 'core').why).toEqual({ code: 'unlocked', previous: 'push-0' });
    const started = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: newLadder(1) } }));
    expect(quest(started, 'core').why).toEqual({ code: 'class_main', stat: 'strength' });
  });

  it('a ladder below its best rung says it stepped down', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: { ...newLadder(1), highestRung: 2 } } }));
    expect(quest(day, 'core').why).toEqual({ code: 'stepped_down' });
  });
});

describe("Scholar's Path (Mage level 10)", () => {
  it('reading quests carry the book from level 10', () => {
    const mage = { classId: 'mage' as const, goals: ['learn' as const], book: 'Meditations' };
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 1 }, { ...mage, level: 10 })), 'core').book).toBe('Meditations');
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 1 }, { ...mage, level: 9 })), 'core').book).toBe(null);
  });
});

describe('a pure function', () => {
  it('builds the same day from the same input and never changes the input', () => {
    const input: DayInput = deepFreeze(dayInput({ dayNumber: 9, ladders: { push: newLadder(1) }, history: [{ dayNumber: 8, quests: { core: 'walk-1' } }] }));
    expect(buildDay(FIXTURE, input)).toEqual(buildDay(FIXTURE, input));
  });

  it('ignores history it does not recognise', () => {
    expect(() => buildDay(FIXTURE, dayInput({ history: [{ dayNumber: 1, quests: { core: 'retired-quest' } }] }))).not.toThrow();
  });

  it('rejects input no day can be built from', () => {
    expect(() => buildDay(FIXTURE, dayInput({ dayNumber: 0 }))).toThrow(RangeError);
    expect(() => buildDay(FIXTURE, dayInput({}, { minutesPerDay: 12 }))).toThrow(RangeError);
  });
});

describe('workouts (M6c decisions 5–7)', () => {
  const strengthDay = (over: Partial<DayInput> = {}, profile: Parameters<typeof dayInput>[1] = {}) =>
    buildDay(WORKOUT_FIXTURE, dayInput({ dayNumber: 3, ...over }, profile));

  it('a strength core quest is a workout, planned for the player, at its rung\'s minutes and reward', () => {
    const core = quest(strengthDay(), 'core');
    expect(core.templateId).toBe('workout-0');
    expect(core.moves?.map((m) => m.move)).toEqual(['chair-squat', 'wall-push', 'bridge']);
    expect(core.minutes).toBe(16);
    expect(core.xp).toEqual({ strength: 20 });
  });

  it('follows the program: the next workout is the next day of it', () => {
    const core = quest(strengthDay({ workoutsDone: 1 }), 'core');
    expect(core.moves?.map((m) => m.move)).toEqual(['chair-squat', 'plank', 'wall-push']);
  });

  it('the day after a workout builds no strength ladder in any slot', () => {
    const day = buildDay(WORKOUT_FIXTURE, dayInput({ dayNumber: 4, history: [{ dayNumber: 3, quests: { core: 'workout-0' } }] }));
    for (const q of day.quests) expect(['push', 'squat', 'workout']).not.toContain(q.ladder);
  });

  it('no workout fits a 15-minute day, or a player who can do fewer than two exercises', () => {
    expect(quest(strengthDay({}, { minutesPerDay: 15 }), 'core').ladder).not.toBe('workout');
    const sparse = { ...WORKOUT_FIXTURE, training: { ...TRAINING, moves: TRAINING.moves.filter((m) => m.id === 'bridge') } };
    expect(quest(buildDay(sparse, dayInput({ dayNumber: 3 })), 'core').ladder).not.toBe('workout');
  });

  it('only a workout carries exercises, and it always does', () => {
    const workout = workoutTemplate(0, 1);
    expect(() => draftQuest(workout, 'core', { code: 'balance', stat: 'strength' })).toThrow(RangeError);
    const moves = planWorkout(TRAINING, workout, dayInput().profile, 0)!;
    expect(() => draftQuest(templateById(FIXTURE, 'push-0'), 'core', { code: 'balance', stat: 'strength' }, { moves })).toThrow(RangeError);
    expect(draftQuest(workout, 'core', { code: 'balance', stat: 'strength' }, { moves, hardDay: true })).toMatchObject({ minutes: 7, hardDay: true, moves });
  });

  it('refuses a negative or fractional count of workouts done', () => {
    expect(() => strengthDay({ workoutsDone: -1 })).toThrow(RangeError);
    expect(() => strengthDay({ workoutsDone: 1.5 })).toThrow(RangeError);
  });
});
