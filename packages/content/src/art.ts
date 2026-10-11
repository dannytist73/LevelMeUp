// Quest pictures (M6a decisions 1 and 10; M6c decision 13): a fixed art set covers every quest. A workout shows its first
// exercise's family; a rung whose exercise differs from its ladder's picture has its own key; other rungs show their
// ladder's, small quests their stat's, and special quests their role's. The app shows a key's picture when the art
// manifest online lists it, otherwise an ink fallback (apps/mobile/src/art/manifest.ts). The art brief,
// docs/design/quest-art.md, describes a picture for every key.
import type { Condition, QuestTemplate } from '../../rules/src/index.ts';
import { TEMPLATES } from './library.ts';
import { MOVES, authoredMove } from './training/moves.ts';

export function artKey(template: Pick<QuestTemplate, 'role' | 'ladder' | 'stat'> & { art?: string }, condition?: Condition): string {
  if (condition?.kind === 'session' && condition.moves.length > 0) return `move-${authoredMove(condition.moves[0]!.move).pattern}`;
  if (template.art !== undefined) return template.art;
  if (template.role === 'ladder' && template.ladder !== null) return `ladder-${template.ladder}`;
  if (template.role === 'micro') return `micro-${template.stat}`;
  return template.role.replace('_', '-');
}

/** Every key the quest library uses: what the art set has to cover. A workout template's own key is never shown. */
export const ART_KEYS: readonly string[] = [
  ...new Set([
    ...TEMPLATES.filter((t) => t.condition.kind !== 'workout').map((t) => artKey(t)),
    ...MOVES.map((m) => `move-${m.pattern}`),
  ]),
].sort();
