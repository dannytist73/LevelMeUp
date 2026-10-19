// The phone's side of adjusting the day (M6b): an option put in a quest's slot, and the hard-day version of a quest,
// drafted with the rules and the server's own `toDraft`, so what shows at once matches what the server stores.
import { LIBRARY } from '@levelmeup/content';
import { draftQuest, findTemplate, painKey, plannedBlock, plannedMoves, templateById } from '@levelmeup/rules';
import type { Slot } from '@levelmeup/rules';
import { toDraft } from '../../../../supabase/functions/_shared/drafts.ts';
import type { QuestFields } from '../../../../supabase/functions/_shared/state.ts';
import type { QuestView } from './types.ts';

/** A quest's fields in their hard-day version (spec §3.5: lighter, half XP). */
export function hardFields(fields: QuestFields, slot: Slot): QuestFields {
  const draft = draftQuest(templateById(LIBRARY, fields.templateId), slot, fields.why, {
    hardDay: true, book: fields.book, moves: plannedMoves(fields.condition), block: plannedBlock(fields.condition), // M16
  });
  const { slot: _slot, ...hard } = toDraft(LIBRARY, draft);
  return hard;
}

/** An offered quest in this quest's slot; what the new quest offers in turn arrives with the next sync. */
export function withFields(quest: QuestView, fields: QuestFields): QuestView {
  return { ...quest, ...fields, swaps: [], gentle: null, canStepDown: false };
}

/** The quest asks for physical work, so it shows "I felt pain". */
export const isExercise = (quest: Pick<QuestFields, 'templateId'>): boolean =>
  (findTemplate(LIBRARY, quest.templateId)?.exercise ?? null) !== null;

/** The quest's exercise is resting after pain (the player's `paused`), so its card says so. */
export function isResting(quest: Pick<QuestFields, 'templateId'>, paused: readonly string[]): boolean {
  const template = findTemplate(LIBRARY, quest.templateId);
  return template !== undefined && template.exercise !== null && paused.includes(painKey(template));
}
