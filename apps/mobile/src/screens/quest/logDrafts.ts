// M17 (UX audit): a workout or a rep log being filled in, kept while the app runs: Back to Today and in again finds the
// sets and the ticks where they were left (they reset to last time's numbers before). Memory only, like a reading's
// takeaway (reading/drafts.ts): a draft, not something to store.
export type LogDraft = { sets: unknown; done: unknown };
const drafts = new Map<string, LogDraft>();

export function logDraft<T extends LogDraft>(key: string | undefined): T | undefined {
  return key === undefined ? undefined : (drafts.get(key) as T | undefined);
}

export function keepLogDraft(key: string | undefined, draft: LogDraft): void {
  if (key !== undefined) drafts.set(key, draft);
}

/** Claimed: the log starts fresh if the claim is undone (review). */
export function dropLogDraft(key: string): void {
  drafts.delete(key);
}
