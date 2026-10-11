import { describe, expect, it } from 'vitest';
import { newLadder } from '../src/ladder.ts';
import {
  allowedTopRung, coreAllowance, effectiveRung, ladderAllowed, ladderById, ladderExercise, ladderRungs, maxRungFor,
  specialTemplate, templateAllowed, templateById, validateProfile,
} from '../src/library.ts';
import type { PlayerProfile } from '../src/library.ts';
import { FIXTURE, PROFILE } from './fixtures/library.ts';

const profile = (p: Partial<PlayerProfile> = {}): PlayerProfile => ({ ...PROFILE, ...p });

describe('looking things up', () => {
  it('finds templates, ladders and the special quests', () => {
    expect(templateById(FIXTURE, 'push-1').minutes).toBe(8);
    expect(ladderById(FIXTURE, 'walk').stat).toBe('vitality');
    expect(specialTemplate(FIXTURE, 'article').id).toBe('article');
    expect(() => templateById(FIXTURE, 'nope')).toThrow(RangeError);
    expect(() => ladderById(FIXTURE, 'nope')).toThrow(RangeError);
  });

  it('lists a ladder easiest first and knows its exercise', () => {
    expect(ladderRungs(FIXTURE, 'push').map((t) => t.id)).toEqual(['push-0', 'push-1', 'push-2']);
    expect(ladderExercise(FIXTURE, 'mobility')).toBe('mobility');
    expect(ladderExercise(FIXTURE, 'reading')).toBe(null);
  });
});

describe('what a player may be given (spec §3.4)', () => {
  it('a reported limitation excludes templates tagged with it', () => {
    const knee = profile({ limitations: ['knee'] });
    expect(templateAllowed(templateById(FIXTURE, 'squat-0'), knee)).toBe(false);
    expect(templateAllowed(templateById(FIXTURE, 'push-1'), knee)).toBe(true);
  });

  it('a gentle start allows only gentle walking and mobility among exercise quests', () => {
    const gentle = profile({ gentleStart: true });
    expect(templateAllowed(templateById(FIXTURE, 'push-0'), gentle)).toBe(false);
    expect(templateAllowed(templateById(FIXTURE, 'walk-1'), gentle)).toBe(true);
    expect(templateAllowed(templateById(FIXTURE, 'walk-2'), gentle)).toBe(false);
    expect(templateAllowed(templateById(FIXTURE, 'reading-2'), gentle)).toBe(true);
  });

  it('players with their own program get its ladder instead of the strength ladders', () => {
    const own = profile({ ownProgram: true });
    expect(ladderAllowed(ladderById(FIXTURE, 'own'), own)).toBe(true);
    expect(ladderAllowed(ladderById(FIXTURE, 'push'), own)).toBe(false);
    expect(ladderAllowed(ladderById(FIXTURE, 'walk'), own)).toBe(true);
    expect(ladderAllowed(ladderById(FIXTURE, 'own'), profile())).toBe(false);
  });
});

describe('rungs', () => {
  it('allowed rungs stop at the first excluded one', () => {
    expect(allowedTopRung(FIXTURE, 'push', profile())).toBe(2);
    expect(allowedTopRung(FIXTURE, 'push', profile({ limitations: ['knee'] }))).toBe(1);
    expect(allowedTopRung(FIXTURE, 'squat', profile({ limitations: ['knee'] }))).toBe(-1);
    expect(allowedTopRung(FIXTURE, 'walk', profile({ gentleStart: true }))).toBe(1);
  });

  it('the core may take the budget minus 2 minutes for each side quest', () => {
    expect(coreAllowance(10)).toBe(6);
    expect(coreAllowance(40)).toBe(36);
  });

  it('a quest is built at the player rung, lowered to fit the limits and the minutes', () => {
    const state = newLadder(2);
    expect(effectiveRung(FIXTURE, 'push', profile(), state, 21)).toBe(2);
    expect(effectiveRung(FIXTURE, 'push', profile(), state, 9)).toBe(1);
    expect(effectiveRung(FIXTURE, 'push', profile({ limitations: ['knee'] }), state, 21)).toBe(1);
    expect(effectiveRung(FIXTURE, 'push', profile(), state, 4)).toBe(-1);
  });

  it('progression stops at the highest allowed rung that fits a normal day core', () => {
    expect(maxRungFor(FIXTURE, 'push', profile({ minutesPerDay: 25 }))).toBe(2);
    expect(maxRungFor(FIXTURE, 'push', profile({ minutesPerDay: 10 }))).toBe(0);
    expect(maxRungFor(FIXTURE, 'walk', profile({ gentleStart: true }))).toBe(1);
    expect(maxRungFor(FIXTURE, 'squat', profile({ limitations: ['knee'] }))).toBe(-1);
  });
});

describe('validating a profile', () => {
  it.each([
    ['an unknown class', { classId: 'bard' }],
    ['level 0', { level: 0 }],
    ['no goals', { goals: [] }],
    ['three goals', { goals: ['body', 'energy', 'learn'] }],
    ['a repeated goal', { goals: ['body', 'body'] }],
    ['an unknown goal', { goals: ['fame'] }],
    ['12 minutes', { minutesPerDay: 12 }],
    ['an unknown difficulty', { difficulty: 'brutal' }],
    ['an unknown limitation', { limitations: ['neck'] }],
    ['a missing stat', { stats: { strength: 5, vitality: 5, wisdom: 5 } }],
  ])('rejects %s', (_name, bad) => {
    expect(() => validateProfile(profile(bad as unknown as Partial<PlayerProfile>))).toThrow(RangeError);
  });

  it('accepts the default profile', () => {
    expect(() => validateProfile(profile())).not.toThrow();
  });
});

describe('the training setup (M6c)', () => {
  it('accepts no equipment, any mix of equipment and every program style', () => {
    expect(() => validateProfile(profile({ equipment: [] }))).not.toThrow();
    expect(() => validateProfile(profile({ equipment: ['bands', 'dumbbells', 'bench', 'pullup_bar', 'gym'] }))).not.toThrow();
    for (const programStyle of ['men', 'women', 'none'] as const) expect(() => validateProfile(profile({ programStyle }))).not.toThrow();
  });

  it('refuses unknown or repeated equipment and an unknown program style', () => {
    expect(() => validateProfile(profile({ equipment: ['kettlebell' as never] }))).toThrow(RangeError);
    expect(() => validateProfile(profile({ equipment: ['bands', 'bands'] }))).toThrow(RangeError);
    expect(() => validateProfile(profile({ programStyle: 'unisex' as never }))).toThrow(RangeError);
  });
});
