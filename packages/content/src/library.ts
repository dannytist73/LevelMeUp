import type { Ladder, QuestLibrary } from '../../rules/src/index.ts';
import { MIND_LADDERS, MIND_TEMPLATES } from './quests/mind.ts';
import { SPECIAL_TEMPLATES } from './quests/special.ts';
import { STRENGTH_LADDERS, STRENGTH_TEMPLATES } from './quests/strength.ts';
import { VITALITY_LADDERS, VITALITY_TEMPLATES } from './quests/vitality.ts';
import { WORKOUT_LADDERS, WORKOUT_TEMPLATES } from './quests/workout.ts';
import { MOVES } from './training/moves.ts';
import { PROGRAMS } from './training/programs.ts';
import type { AuthoredTemplate } from './types.ts';

/** Bump when a template's meaning changes; each quest instance stores the version it was built from (architecture §3). */
export const CONTENT_VERSION = 1;

export const LADDERS: readonly Ladder[] = [...STRENGTH_LADDERS, ...WORKOUT_LADDERS, ...VITALITY_LADDERS, ...MIND_LADDERS];

export const TEMPLATES: readonly AuthoredTemplate[] = [
  ...STRENGTH_TEMPLATES,
  ...WORKOUT_TEMPLATES,
  ...VITALITY_TEMPLATES,
  ...MIND_TEMPLATES,
  ...SPECIAL_TEMPLATES,
];

export const LIBRARY: QuestLibrary = {
  ladders: LADDERS,
  templates: TEMPLATES,
  recovery: { warrior: 'recovery-walk', rogue: 'recovery-walk', mage: 'recovery-read', monk: 'recovery-breath' },
  training: { moves: MOVES, programs: PROGRAMS },
};

export function authoredTemplate(id: string): AuthoredTemplate {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw new RangeError(`unknown quest template ${id}`);
  return template;
}
