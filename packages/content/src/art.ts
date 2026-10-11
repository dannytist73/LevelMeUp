// Quest pictures (M6a, owner decision 1 and decision 10): one key per kind of quest, so a fixed art set covers every
// quest. The app shows a key's picture when the art manifest online lists it, otherwise an ink fallback
// (apps/mobile/src/art/manifest.ts). The art brief, docs/design/quest-art.md, describes a picture for every key.
import type { QuestTemplate } from '../../rules/src/index.ts';
import { TEMPLATES } from './library.ts';

export function artKey(template: Pick<QuestTemplate, 'role' | 'ladder' | 'stat'>): string {
  if (template.role === 'ladder' && template.ladder !== null) return `ladder-${template.ladder}`;
  if (template.role === 'micro') return `micro-${template.stat}`;
  return template.role.replace('_', '-');
}

/** Every key the quest library uses: what the art set has to cover. A workout template's own key is never shown. */
export const ART_KEYS: readonly string[] = [...new Set(TEMPLATES.filter((t) => t.condition.kind !== 'workout').map(artKey))].sort();
