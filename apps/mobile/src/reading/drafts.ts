// A reading's takeaway being written (M12, audit 9): closing the Story Deck or the reader and coming back finds the line
// where it was left. Premium pass A1: kept on the phone too (state/drafts.ts), so closing the app doesn't lose it.
import { readDraft, writeDraft } from '../state/drafts.ts';

export const takeawayDraft = (articleId: string): string => readDraft<string>(`takeaway:${articleId}`) ?? '';

export function keepDraft(articleId: string, text: string): void {
  writeDraft(`takeaway:${articleId}`, text);
}
