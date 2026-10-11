// A built quest (rules: QuestDraft) as the database stores it: the template's completion type and the condition of
// the version in use are snapshotted with the XP, so a later content change never rewrites a day. A workout stores its
// planned exercises and their sets (M6c). The rules' `storedQuest` does it, so the phone shows a day it built offline the
// same way (M6e).
import { storedQuest } from '../../../packages/rules/src/index.ts';
import type { QuestDraft, QuestLibrary } from '../../../packages/rules/src/index.ts';
import type { InstanceDraft } from './state.ts';

export function toDraft(library: QuestLibrary, q: QuestDraft): InstanceDraft {
  return storedQuest(library, q);
}
