// A small library for unit tests. Every template uses a minutes condition; the real library is in packages/content.
import type { DayInput } from '../../src/day.ts';
import type { Exercise, Ladder, PlayerProfile, QuestLibrary, QuestTemplate, TemplateRole } from '../../src/library.ts';
import type { Limitation, Stat, Tier } from '../../src/types.ts';

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

export const FIXTURE: QuestLibrary = {
  ladders: [
    ladder('push', 'strength', ['body'], ['warrior']),
    ladder('squat', 'strength', ['body'], ['warrior']),
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
    articleId: 'article-1',
    ...overrides,
  };
}
