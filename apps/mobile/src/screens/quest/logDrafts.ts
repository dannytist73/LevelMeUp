// M17 (UX audit): a workout or a rep log being filled in: Back to Today and in again finds the sets and the ticks where
// they were left (they reset to last time's numbers before). Premium pass A1: kept on the phone too (state/drafts.ts),
// so the app closing mid-workout loses nothing.
import { readDraft, restoredDraft, writeDraft } from '../../state/drafts.ts';

export type LogDraft = { sets: unknown; done: unknown };

const named = (key: string): string => `log:${key}`;

export function logDraft<T extends LogDraft>(key: string | undefined): T | undefined {
  return key === undefined ? undefined : readDraft<T>(named(key));
}

/** True while the log is the one the phone kept from before the app last closed. */
export function logRestored(key: string | undefined): boolean {
  return key !== undefined && restoredDraft(named(key));
}

export function keepLogDraft(key: string | undefined, draft: LogDraft): void {
  if (key !== undefined) writeDraft(named(key), draft);
}
