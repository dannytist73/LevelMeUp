// A small library for unit tests. Every template uses a minutes condition; the real library is in packages/content.
import type { DayInput } from '../../src/day.ts';
import type { Exercise, Ladder, PlayerProfile, QuestLibrary, QuestTemplate, TemplateRole } from '../../src/library.ts';
import type { Limitation, Stat, Tier } from '../../src/types.ts';
import type { Move, MoveLevel, MoveSlot, TrainingLibrary } from '../../src/workout.ts';
import { workoutMinutes } from '../../src/workout.ts';

type Spec = {
  id: string;
  stat: Stat;
  minutes: number;
  tier?: Tier;
  role?: TemplateRole;
  ladder?: string;
  rung?: number;
  exercise?: Exercise | null;
  gentle?: boolean;
  contraindications?: Limitation[];
};

export function template(spec: Spec): QuestTemplate {
  const half = Math.max(1, Math.ceil(spec.minutes / 2));
  return {
    id: spec.id,
    role: spec.role ?? (spec.ladder ? 'ladder' : 'micro'),
    ladder: spec.ladder ?? null,
    rung: spec.rung ?? null,
    stat: spec.stat,
    split: null,
    tier: spec.tier ?? (spec.minutes >= 23 ? 'major' : spec.minutes >= 8 ? 'standard' : 'minor'),
    minutes: spec.minutes,
    completion: 'tap',
    condition: { kind: 'minutes', minutes: spec.minutes },
    exercise: spec.exercise ?? null,
    gentle: spec.gentle ?? false,
    contraindications: spec.contraindications ?? [],
    hardDay: { minutes: half, condition: { kind: 'minutes', minutes: half } },
  };
}

const ladder = (id: string, stat: Ladder['stat'], goals: Ladder['goals'], affinity: Ladder['affinity'], extra: Partial<Ladder> = {}): Ladder =>
  ({ id, stat, goals, affinity, ownProgram: false, tracksBook: false, ...extra });

const rungs = (id: string, stat: Stat, minutes: number[], extra: (rung: number) => Partial<Spec> = () => ({})): QuestTemplate[] =>
  minutes.map((m, rung) => template({ id: `${id}-${rung}`, ladder: id, rung, stat, minutes: m, ...extra(rung) }));

/** No exercises and no programs: the fixture library has no workouts (the workout fixture in Task 2 has). */
export const NO_TRAINING: TrainingLibrary = {
  moves: [], programs: { men: [], women: [], none: [] }, weekly: { three: { men: [], women: [], none: [] }, two: [] },
};

export const FIXTURE: QuestLibrary = {
  ladders: [
    ladder('push', 'strength', ['body'], ['warrior'], { pattern: 'push' }),
    ladder('squat', 'strength', ['body'], ['warrior'], { pattern: 'squat' }),
    ladder('own', 'strength', ['body'], ['warrior'], { ownProgram: true }),
    ladder('walk', 'vitality', ['energy', 'body'], ['warrior', 'rogue', 'mage', 'monk']),
    ladder('mobility', 'vitality', ['energy', 'body'], ['warrior', 'monk']),
    ladder('reading', 'wisdom', ['learn'], ['mage'], { tracksBook: true }),
    ladder('focus', 'focus', ['focus'], ['rogue']),
  ],
  templates: [
    ...rungs('push', 'strength', [5, 8, 10], (r) => ({ exercise: 'strength', contraindications: r === 2 ? ['wrist', 'knee'] : ['wrist'] })),
    ...rungs('squat', 'strength', [5, 8], () => ({ exercise: 'strength', contraindications: ['knee'] })),
    ...rungs('own', 'strength', [20], () => ({ exercise: 'strength' })),
    ...rungs('walk', 'vitality', [5, 10, 15], (r) => ({ exercise: 'walk', gentle: r <= 1 })),
    ...rungs('mobility', 'vitality', [3, 8], (r) => ({ exercise: 'mobility', gentle: r === 0 })),
    ...rungs('reading', 'wisdom', [5, 10, 20]),
    ...rungs('focus', 'focus', [5, 10]),
    template({ id: 'micro-squats', stat: 'strength', minutes: 2, exercise: 'strength', contraindications: ['knee'] }),
    template({ id: 'micro-water', stat: 'vitality', minutes: 1 }),
    template({ id: 'micro-page', stat: 'wisdom', minutes: 2 }),
    template({ id: 'micro-plan', stat: 'focus', minutes: 2 }),
    template({ id: 'recovery-walk', role: 'recovery', stat: 'discipline', minutes: 5, exercise: 'walk', gentle: true }),
    template({ id: 'recovery-read', role: 'recovery', stat: 'discipline', minutes: 5 }),
    template({ id: 'stillness', role: 'stillness', stat: 'vitality', minutes: 6, exercise: 'mobility', gentle: true }),
    template({ id: 'dawn-ritual', role: 'dawn_ritual', stat: 'vitality', minutes: 6, exercise: 'mobility', gentle: true }),
    template({ id: 'article', role: 'article', stat: 'wisdom', minutes: 6 }),
  ],
  recovery: { warrior: 'recovery-walk', rogue: 'recovery-walk', mage: 'recovery-read', monk: 'recovery-read' },
  training: NO_TRAINING,
};

export const PROFILE: PlayerProfile = {
  classId: 'warrior',
  level: 3,
  goals: ['body', 'energy'],
  minutesPerDay: 25,
  difficulty: 'steady',
  limitations: [],
  gentleStart: false,
  ownProgram: false,
  equipment: [],
  programStyle: 'none',
  trainingPlan: 'build',
  programDays: 3,
  stats: { strength: 7, vitality: 5, wisdom: 5, focus: 4 },
  book: null,
};

/** Day 2 of the default Warrior unless overridden. */
export function dayInput(overrides: Partial<DayInput> = {}, profile: Partial<PlayerProfile> = {}): DayInput {
  return {
    dayNumber: 2,
    profile: { ...PROFILE, ...profile },
    ladders: {},
    history: [],
    light: false,
    workoutsDone: 0,
    programDone: 0,
    articleId: 'article-1',
    ...overrides,
  };
}

const move = (id: string, slots: MoveSlot[], level: MoveLevel, extra: Partial<Move> = {}): Move => ({
  id, slots, pattern: 'push', needs: [], level, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: [], ...extra,
});

/** A small exercise library: bodyweight moves at each level, a few that need equipment, and two programs. */
export const TRAINING: TrainingLibrary = {
  moves: [
    move('db-press', ['horizontal_push'], 1, { needs: ['dumbbells'] }),
    move('wall-push', ['horizontal_push'], 1, { contraindications: ['wrist'] }),
    move('incline-push', ['horizontal_push'], 2, { contraindications: ['wrist'] }),
    move('push-up', ['horizontal_push'], 3, { contraindications: ['wrist'] }),
    move('bb-row', ['horizontal_pull'], 3, { needs: ['gym'], pattern: 'pull' }),
    move('y-raise', ['horizontal_pull'], 1, { pattern: 'pull' }),
    move('chair-squat', ['squat', 'quads'], 1, { pattern: 'squat', contraindications: ['knee'] }),
    move('split-squat', ['squat', 'quads'], 2, { pattern: 'squat', contraindications: ['knee'], perSide: true }),
    move('bridge', ['hip_hinge'], 1, { pattern: 'hinge' }),
    move('plank', ['abs'], 1, { pattern: 'core', unit: 'seconds', min: 20, max: 40 }),
    move('chin-up', ['vertical_pull'], 3, { needs: ['pullup_bar'], pattern: 'pull' }),
  ],
  programs: {
    men: [['horizontal_push', 'horizontal_pull', 'squat', 'abs'], ['vertical_pull', 'hip_hinge', 'quads', 'abs']],
    women: [['hip_hinge', 'quads', 'horizontal_pull', 'abs']],
    none: [['squat', 'horizontal_push', 'hip_hinge', 'horizontal_pull'], ['quads', 'vertical_pull', 'abs', 'horizontal_push']],
  },
  // M16: small weekly layouts in the builder's shape (sets in weeks 1–5).
  weekly: {
    three: {
      men: [
        [{ slot: 'horizontal_push', sets: [2, 3, 3, 4, 4] }, { slot: 'horizontal_pull', sets: [2, 3, 3, 3, 3] }, { slot: 'abs', sets: [2, 2, 3, 3, 3] }],
        [{ slot: 'squat', sets: [2, 3, 3, 4, 4] }, { slot: 'hip_hinge', sets: [2, 3, 3, 3, 3] }, { slot: 'vertical_pull', sets: [2, 3, 3, 3, 3] }],
        [{ slot: 'hip_hinge', sets: [2, 3, 3, 4, 4] }, { slot: 'quads', sets: [2, 3, 3, 3, 3] }, { slot: 'abs', sets: [2, 3, 3, 3, 3] }],
      ],
      women: [
        [{ slot: 'hip_hinge', sets: [2, 3, 3, 4, 4] }, { slot: 'quads', sets: [2, 3, 3, 3, 3] }],
        [{ slot: 'squat', sets: [2, 3, 3, 4, 4] }, { slot: 'horizontal_pull', sets: [2, 3, 3, 3, 3] }],
        [{ slot: 'quads', sets: [2, 3, 3, 3, 3] }, { slot: 'abs', sets: [2, 3, 3, 4, 4] }],
      ],
      none: [
        [{ slot: 'horizontal_push', sets: [2, 3, 3, 4, 4] }, { slot: 'squat', sets: [2, 3, 3, 3, 3] }],
        [{ slot: 'hip_hinge', sets: [2, 3, 3, 4, 4] }, { slot: 'horizontal_pull', sets: [2, 3, 3, 3, 3] }],
      ],
    },
    two: [
      [{ slot: 'horizontal_push', sets: [2, 3, 3, 4, 4] }, { slot: 'horizontal_pull', sets: [2, 3, 3, 4, 4] }, { slot: 'quads', sets: [2, 3, 3, 3, 3] }],
      [{ slot: 'squat', sets: [2, 3, 3, 4, 4] }, { slot: 'hip_hinge', sets: [2, 3, 3, 4, 4] }, { slot: 'abs', sets: [2, 3, 3, 3, 3] }],
    ],
  },
};

/** A workout template: 3 exercises of 2 sets at `level`, or the given shape. */
export function workoutTemplate(rung: number, level: MoveLevel, sets: number[] = [2, 2, 2]): QuestTemplate {
  return {
    ...template({ id: `workout-${rung}`, ladder: 'workout', rung, stat: 'strength', minutes: workoutMinutes(sets), exercise: 'strength' }),
    completion: 'reps',
    condition: { kind: 'workout', sets, level },
    hardDay: { minutes: workoutMinutes([1, 1]), condition: { kind: 'workout', sets: [1, 1], level } },
  };
}

/** FIXTURE plus a workout ladder (rungs: level 1, 2, 3, then 3 × 3 sets) that every class prefers; push and squat lose
 * their class affinity, as in the content (decision 7). */
export const WORKOUT_FIXTURE: QuestLibrary = {
  ...FIXTURE,
  ladders: [
    ...FIXTURE.ladders.map((l) => (l.id === 'push' || l.id === 'squat' ? { ...l, affinity: [] } : l)),
    ladder('workout', 'strength', ['body'], ['warrior', 'mage', 'rogue', 'monk']),
  ],
  templates: [...FIXTURE.templates, workoutTemplate(0, 1), workoutTemplate(1, 2), workoutTemplate(2, 3), workoutTemplate(3, 3, [3, 3, 3])],
  training: TRAINING,
};

/** A weekly program rung (M16): exercises up to `level`; the block gives them and their sets. */
export function programTemplate(rung: number, level: MoveLevel): QuestTemplate {
  return {
    ...template({ id: `program-${rung}`, ladder: 'program', rung, stat: 'strength', minutes: 29, tier: 'major', exercise: 'strength' }),
    completion: 'reps',
    condition: { kind: 'program', level },
    hardDay: { minutes: workoutMinutes([1, 1]), condition: { kind: 'program', level } },
  };
}

/** WORKOUT_FIXTURE plus the weekly program's ladder (rungs: levels 1, 2, 3). */
export const WEEKLY_FIXTURE: QuestLibrary = {
  ...WORKOUT_FIXTURE,
  ladders: [...WORKOUT_FIXTURE.ladders, ladder('program', 'strength', ['body'], ['warrior', 'mage', 'rogue', 'monk'], { weekly: true })],
  templates: [...WORKOUT_FIXTURE.templates, programTemplate(0, 1), programTemplate(1, 2), programTemplate(2, 3)],
};
