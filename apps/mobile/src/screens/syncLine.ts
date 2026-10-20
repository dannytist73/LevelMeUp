// The quiet sync mark (spec §1.4): never red, never "error". Offline just means "will sync". Premium pass C4: the words
// are the content package's.
import { SETTINGS_TEXT, fillText } from '@levelmeup/content';
import { clockTime } from '../lib/dates.ts';
import type { Status } from '../state/store.ts';

export function syncMark(status: Status): string | null {
  switch (status) {
    case 'syncing':
      return SETTINGS_TEXT.sync.syncing;
    case 'offline':
      return SETTINGS_TEXT.sync.offline;
    case 'retrying':
      return SETTINGS_TEXT.sync.retrying;
    case 'idle':
      return null;
  }
}

/**
 * M17 (perf audit 2026-10-20): what a tab needs to know about syncing, as one value that only changes when the phone
 * loses or finds the server: undefined while it's reachable, else when it last synced (null: never). The tabs used to
 * read the status and the last sync time, so every sync redrew them behind Today.
 */
export function staleSince(s: { unreachable: boolean; lastSyncedAt: number | null }): number | null | undefined {
  return s.unreachable ? s.lastSyncedAt : undefined;
}

/** "Last synced 7:40 AM" while the phone can't reach the server (Character, Chronicle, Settings). */
export function lastSynced(lastSyncedAt: number | null, timeZone: string): string {
  return lastSyncedAt === null ? SETTINGS_TEXT.sync.never : fillText(SETTINGS_TEXT.sync.last, { time: clockTime(new Date(lastSyncedAt).toISOString(), timeZone) });
}
