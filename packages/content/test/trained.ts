// The pacing personas as experienced players (M5 plan, decision 4): they train most weeks, read most days and focus
// half an hour or more, so onboarding starts every seeded ladder one rung up. Used by campaign.test.ts and the report.
import { startingLadders } from '../../rules/src/index.ts';
import type { LadderState, Persona, PlayerProfile } from '../../rules/src/index.ts';
import { LIBRARY } from '../src/library.ts';
import { SEEDS } from '../src/onboarding.ts';

export function trainedStart(persona: Persona): Record<string, LadderState> {
  const profile: PlayerProfile = {
    classId: persona.classId, level: 1, goals: persona.goals, minutesPerDay: persona.minutesPerDay, difficulty: persona.difficulty,
    limitations: [], gentleStart: false, ownProgram: false, equipment: [], programStyle: 'none', stats: { strength: 5, vitality: 5, wisdom: 5, focus: 5 }, book: null,
  };
  return startingLadders(LIBRARY, profile, { goals: persona.goals, training: 'most', reading: 'high', focus: 'high' }, SEEDS);
}
