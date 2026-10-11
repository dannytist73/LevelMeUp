import { describe, expect, it } from 'vitest';
import { CLASSES, GOALS, HABITS, LIMITATIONS, SAFETY_QUESTIONS, SLIPS, TRAININGS, startingLadders, strengthClosed } from '../../rules/src/index.ts';
import type { Answers, ClassId, PlayerProfile } from '../../rules/src/index.ts';
import {
  CLASS_DAYS, DIFFICULTY_CHOICES, FOCUS_CHOICES, GOAL_CHOICES, GOOGLE_ERRORS, LIBRARY, ONBOARDING_TEXT, READING_CHOICES,
  SAFETY_CHECK, SEEDS, SLIP_CHOICES, SLIP_SUGGESTIONS, TRAINING_CHOICES, VOICE_NAMES, VOICE_SAMPLES, VOICES,
  analysisLine, boundaryLine, classStats, goalsCount, lintText, routineLine, voiceLine,
} from '../src/index.ts';

/** Every string reachable from a value. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(strings);
}

const profile = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({
  classId: 'warrior', level: 1, goals: ['body'], minutesPerDay: 25, difficulty: 'steady', limitations: [],
  gentleStart: false, ownProgram: false, stats: { strength: 5, vitality: 5, wisdom: 5, focus: 5 }, book: null, ...over,
});
const answers = (over: Partial<Answers> = {}): Answers => ({ goals: ['body'], training: 'most', reading: null, focus: null, ...over });

describe('the onboarding words', () => {
  const all = [
    ...strings(ONBOARDING_TEXT), ...strings(VOICE_NAMES), ...strings(VOICE_SAMPLES), ...strings(GOAL_CHOICES),
    ...strings(TRAINING_CHOICES), ...strings(READING_CHOICES), ...strings(FOCUS_CHOICES), ...strings(DIFFICULTY_CHOICES),
    ...strings(SLIP_CHOICES), ...strings(SLIP_SUGGESTIONS), ...SAFETY_CHECK, ...strings(CLASS_DAYS), ...strings(GOOGLE_ERRORS),
    voiceLine('Rin'), analysisLine('Rin'), boundaryLine('4:00 AM'), goalsCount(2),
    ...(Object.keys(CLASSES) as ClassId[]).flatMap((c) => [classStats(c), routineLine({ classId: c, minutesPerDay: 25, difficulty: 'steady', gentleStart: true })]),
  ];

  it('pass the lint', () => {
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('cover every answer the rules know', () => {
    expect(Object.keys(VOICE_NAMES)).toEqual([...VOICES]);
    expect(Object.keys(GOAL_CHOICES).sort()).toEqual([...GOALS].sort());
    expect(Object.keys(TRAINING_CHOICES)).toEqual([...TRAININGS]);
    expect(Object.keys(READING_CHOICES)).toEqual([...HABITS]);
    expect(Object.keys(FOCUS_CHOICES)).toEqual([...HABITS]);
    expect(Object.keys(SLIP_CHOICES)).toEqual([...SLIPS]);
    expect(Object.keys(SLIP_SUGGESTIONS)).toEqual([...SLIPS]);
    expect(SAFETY_CHECK).toHaveLength(SAFETY_QUESTIONS);
    expect(Object.keys(CLASS_DAYS).sort()).toEqual(Object.keys(CLASSES).sort());
  });

  it('suggest a pact only for real stakes, and never claim anything is on', () => {
    expect(SLIP_SUGGESTIONS.stakes).toMatch(/The Shadow \(level 1\)/);
    expect(SLIP_SUGGESTIONS.stakes).toMatch(/Nothing turns on until you sign it/);
    for (const slip of ['nudge', 'smaller', 'space'] as const) expect(SLIP_SUGGESTIONS[slip]).not.toMatch(/Shadow/);
  });

  it('ask the safety questions as yes-or-no questions', () => {
    for (const q of SAFETY_CHECK) expect(q).toMatch(/\?$/);
  });

  it('describe the starting routine from the rules\' numbers', () => {
    expect(routineLine({ classId: 'warrior', minutesPerDay: 25, difficulty: 'steady', gentleStart: false }))
      .toBe('25 min a day, steady. Your core quest trains Strength on most days and Vitality on others, with a balance quest once a week.');
    expect(routineLine({ classId: 'monk', minutesPerDay: 10, difficulty: 'gentle', gentleStart: true })).toMatch(/Exercise stays gentle/);
    expect(classStats('mage')).toBe('Wisdom · Focus');
  });
});

describe('the starting ladders on the real library', () => {
  it('every seed is a ladder', () => {
    for (const id of Object.keys(SEEDS)) expect(LIBRARY.ladders.some((l) => l.id === id)).toBe(true);
  });

  it('"most weeks" starts the training ladders one rung up; "now and then" starts them at 0', () => {
    const most = startingLadders(LIBRARY, profile(), answers(), SEEDS);
    expect(Object.keys(most).sort()).toEqual(['core', 'push', 'squat', 'walk']);
    expect(Object.values(most).every((l) => l.rung === 1 && l.highestRung === 1)).toBe(true);
    expect(startingLadders(LIBRARY, profile(), answers({ training: 'some' }), SEEDS)).toEqual({});
  });

  it('reading and focus habits start their own ladders', () => {
    const ladders = startingLadders(LIBRARY, profile({ goals: ['learn', 'focus'] }), answers({ goals: ['learn', 'focus'], training: 'none', reading: 'high', focus: 'high' }), SEEDS);
    expect(Object.keys(ladders).sort()).toEqual(['focus', 'reading']);
  });

  it('a gentle start keeps every training ladder at rung 0', () => {
    expect(startingLadders(LIBRARY, profile({ gentleStart: true }), answers(), SEEDS)).toEqual({});
  });

  it('an own program opens no strength ladder but walks', () => {
    const ladders = startingLadders(LIBRARY, profile({ ownProgram: true }), answers({ training: 'own' }), SEEDS);
    expect(Object.keys(ladders)).toEqual(['walk']);
  });

  it('never starts above what the player may train at', () => {
    for (const limitation of LIMITATIONS) {
      const p = profile({ limitations: [limitation] });
      for (const [id, state] of Object.entries(startingLadders(LIBRARY, p, answers(), SEEDS))) {
        const template = LIBRARY.templates.find((t) => t.ladder === id && t.rung === state.rung)!;
        expect(template.contraindications).not.toContain(limitation);
      }
    }
  });

  it('knows when an own program leaves no room for strength (10 or 15 minutes)', () => {
    expect(strengthClosed(LIBRARY, profile({ ownProgram: true, minutesPerDay: 15 }))).toBe(true);
    expect(strengthClosed(LIBRARY, profile({ ownProgram: true, minutesPerDay: 25 }))).toBe(false);
    expect(strengthClosed(LIBRARY, profile({ minutesPerDay: 10 }))).toBe(false);
  });
});
