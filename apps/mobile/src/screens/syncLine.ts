// The quiet sync mark (spec §1.4): never red, never "error". Offline just means "will sync".
import { clockTime } from '../lib/dates.ts';
import type { Status } from '../state/store.ts';

export function syncMark(status: Status): string | null {
  switch (status) {
    case 'syncing':
      return 'Syncing…';
    case 'offline':
      return 'Offline · will sync';
    case 'retrying':
      return 'Will sync soon';
    case 'idle':
      return null;
  }
}

/** "Last synced 07:40" while the phone can't reach the server (Character, Chronicle, Settings). */
export function lastSynced(lastSyncedAt: number | null, timeZone: string): string {
  return lastSyncedAt === null ? 'Not synced yet' : `Last synced ${clockTime(new Date(lastSyncedAt).toISOString(), timeZone)}`;
}
