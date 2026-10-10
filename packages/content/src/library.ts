import type { Ladder, QuestLibrary } from '../../rules/src/index.ts';
import { STRENGTH_LADDERS, STRENGTH_TEMPLATES } from './quests/strength.ts';
import type { AuthoredTemplate } from './types.ts';

/** Bump when a template's meaning changes; each quest instance stores the version it was built from (architecture §3). */
export const CONTENT_VERSION = 1;

export const LADDERS: readonly Ladder[] = [...STRENGTH_LADDERS];

export const TEMPLATES: readonly AuthoredTemplate[] = [...STRENGTH_TEMPLATES];

export const LIBRARY: QuestLibrary = {
  ladders: LADDERS,
  templates: TEMPLATES,
  recovery: { warrior: 'recovery-walk', rogue: 'recovery-walk', mage: 'recovery-read', monk: 'recovery-breath' },
};

export function authoredTemplate(id: string): AuthoredTemplate {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw new RangeError(`unknown quest template ${id}`);
  return template;
}
