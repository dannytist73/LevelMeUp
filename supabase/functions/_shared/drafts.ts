// A built quest (rules: QuestDraft) as the database stores it: the template's completion type and the condition of
// the version in use are snapshotted with the XP, so a later content change never rewrites a day.
import { templateById } from '../../../packages/rules/src/index.ts';
import type { QuestDraft, QuestLibrary } from '../../../packages/rules/src/index.ts';
import type { InstanceDraft } from './state.ts';

export function toDraft(library: QuestLibrary, q: QuestDraft): InstanceDraft {
  const template = templateById(library, q.templateId);
  return {
    slot: q.slot,
    templateId: q.templateId,
    ladder: q.ladder,
    rung: q.rung,
    stat: q.stat,
    tier: q.tier,
    minutes: q.minutes,
    completion: template.completion,
    condition: q.hardDay ? template.hardDay.condition : template.condition,
    hardDay: q.hardDay,
    xp: q.xp,
    why: q.why,
    book: q.book,
  };
}
