import { describe, expect, it } from 'vitest';
import { CLASSES, buildDay, newLadder } from '../../rules/src/index.ts';
import type { BuiltDay, ClassId, Goal, LadderState, Limitation, PastDay, PlayerProfile } from '../../rules/src/index.ts';
import { authoredTemplate, LADDERS, LIBRARY } from '../src/library.ts';
import { lintText } from '../src/lint.ts';
import { VOICES } from '../src/types.ts';
import { renderWhy } from '../src/why.ts';

const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
const GOAL_SETS: Goal[][] = [['body', 'energy'], ['learn', 'focus'], ['routine'], ['focus', 'routine']];
const LIMITS: Limitation[][] = [[], ['knee', 'back'], ['wrist', 'shoulder'], ['knee', 'back', 'shoulder', 'wrist']];
const STRENGTH_LADDERS = new Set(LADDERS.filter((l) => l.stat === 'strength').map((l) => l.id));

function statsFor(classId: ClassId): PlayerProfile['stats'] {
  return { strength: 5, vitality: 5, wisdom: 5, focus: 5, [CLASSES[classId].main]: 7 };
}

function profiles(): PlayerProfile[] {
  const all: PlayerProfile[] = [];
  for (const classId of CLASS_IDS)
    for (const minutesPerDay of [10, 15, 25, 40])
      for (const limitations of LIMITS)
        for (const gentleStart of [false, true])
          for (const ownProgram of [false, true])
            for (const goals of GOAL_SETS)
              all.push({ classId, level: 12, goals, minutesPerDay, difficulty: 'steady', limitations, gentleStart, ownProgram, stats: statsFor(classId), book: 'A book' });
  return all;
}

/** Plays `days` days in a row, every ladder at `rung`, and returns each day with the day before it. */
function play(profile: PlayerProfile, days: number, rung: number): Array<{ day: BuiltDay; yesterday: BuiltDay | null }> {
  const ladders: Record<string, LadderState> = Object.fromEntries(LADDERS.map((l) => [l.id, newLadder(rung)]));
  const history: PastDay[] = [];
  const played: Array<{ day: BuiltDay; yesterday: BuiltDay | null }> = [];
  for (let dayNumber = 1; dayNumber <= days; dayNumber++) {
    const day = buildDay(LIBRARY, { dayNumber, profile, ladders, history: history.slice(-7), light: false, articleId: 'a' });
    played.push({ day, yesterday: played.at(-1)?.day ?? null });
    history.push({ dayNumber, quests: Object.fromEntries(day.quests.map((q) => [q.slot, q.templateId])) });
  }
  return played;
}

const strengthLadders = (day: BuiltDay): string[] =>
  day.quests.flatMap((q) => (q.ladder !== null && STRENGTH_LADDERS.has(q.ladder) ? [q.ladder] : []));

describe('days built from the real library (spec §5 "Days and quests")', () => {
  const all = profiles();

  it('covers 1,024 player profiles', () => {
    expect(all).toHaveLength(1024);
  });

  it('every day has 1 core, 2 sides and the article, from different ladders, within the budget', () => {
    all.forEach((profile, i) => {
      for (const { day } of play(profile, 21, i % 4)) {
        expect(day.quests.map((q) => q.slot)).toEqual(['core', 'side1', 'side2', 'article']);
        const keys = day.quests.map((q) => q.ladder ?? q.templateId);
        expect(new Set(keys).size).toBe(keys.length);
        const minutes = day.quests.filter((q) => q.slot !== 'article').reduce((sum, q) => sum + authoredTemplate(q.templateId).minutes, 0);
        expect(minutes).toBeLessThanOrEqual(day.budget);
      }
    });
  });

  it('respects limitations, the safety check and own programs', () => {
    all.forEach((profile, i) => {
      for (const { day } of play(profile, 21, i % 4)) {
        for (const q of day.quests) {
          const t = authoredTemplate(q.templateId);
          for (const tag of t.contraindications) expect(profile.limitations).not.toContain(tag);
          if (profile.gentleStart && t.exercise !== null) {
            expect(['walk', 'mobility']).toContain(t.exercise);
            expect(t.gentle).toBe(true);
          }
          if (q.ladder !== null && STRENGTH_LADDERS.has(q.ladder)) expect(q.ladder === 'own-program').toBe(profile.ownProgram);
        }
      }
    });
  });

  it('never repeats a strength pattern on consecutive days, and walks or stretches after a strength core', () => {
    all.forEach((profile, i) => {
      for (const { day, yesterday } of play(profile, 21, i % 4)) {
        if (!yesterday) continue;
        for (const ladder of strengthLadders(day)) expect(strengthLadders(yesterday)).not.toContain(ladder);
        const yesterdayCore = authoredTemplate(yesterday.quests[0]!.templateId);
        if (yesterdayCore.exercise === 'strength') expect(authoredTemplate(day.quests[0]!.templateId).exercise).not.toBe('strength');
      }
    });
  });

  it('every quest says why, in every voice, in clean words; goal quests serve a chosen goal', () => {
    all.forEach((profile, i) => {
      if (i % 8 !== 0) return; // rendering is the same work for every profile; a sample is enough
      for (const { day } of play(profile, 21, i % 4)) {
        for (const q of day.quests) {
          if (q.why.code === 'goal') expect(profile.goals).toContain(q.why.goal);
          for (const voice of VOICES) {
            const line = renderWhy(q.why, voice, { classId: profile.classId, minutesPerDay: profile.minutesPerDay });
            expect(line).not.toMatch(/[{}]/);
            expect(lintText(line)).toEqual([]);
          }
        }
      }
    });
  });

  it('the core follows the class mix: about 4 main-stat days a week', () => {
    for (const classId of CLASS_IDS) {
      const profile: PlayerProfile = {
        classId, level: 3, goals: ['learn'], minutesPerDay: 25, difficulty: 'steady', limitations: [],
        gentleStart: false, ownProgram: false, stats: statsFor(classId), book: null,
      };
      const cores = play(profile, 28, 0).map(({ day }) => authoredTemplate(day.quests[0]!.templateId).stat);
      const main = cores.filter((s) => s === CLASSES[classId].main).length;
      // A Warrior gives one main day a week to the walk after back-to-back strength days.
      expect(main, classId).toBeGreaterThanOrEqual(classId === 'warrior' ? 12 : 15);
      expect(main, classId).toBeLessThanOrEqual(16);
      expect(cores.filter((s) => s === CLASSES[classId].second).length, classId).toBeGreaterThanOrEqual(8);
    }
  });
});
