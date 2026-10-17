// A reading's takeaway being written, kept while the app runs (M12, audit 9): closing the Story Deck or the reader and
// coming back finds the line where it was left. Memory only: it is a draft, not something to store.
const drafts = new Map<string, string>();

export const takeawayDraft = (articleId: string): string => drafts.get(articleId) ?? '';

export function keepDraft(articleId: string, text: string): void {
  if (text === '') drafts.delete(articleId);
  else drafts.set(articleId, text);
}
