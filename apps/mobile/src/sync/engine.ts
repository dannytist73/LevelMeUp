// One sync run (architecture §6, M4 plan decision 6): send the outbox oldest first in batches, store the server's
// state, and drop exactly the events the server acknowledged (applied or refused). Refusals are stored as notices in
// the same transaction. Failures keep every event: the server is idempotent per event id, so resending is always safe.
import type { Local } from '../data/local.ts';
import type { PhoneEvent, ServerState } from '../game/types.ts';
import type { Api } from '../net/api.ts';

export const BATCH = 50;
/** The server refuses bodies over 64 KB (supabase/functions/_shared/http.ts); batches stay under this. */
export const MAX_BODY_BYTES = 60_000;
const MAX_ROUNDS = 10;

export type Notice = { eventId: string; code: string };
export type SyncOutcome =
  | { kind: 'synced'; state: ServerState; notices: Notice[]; newAchievements: string[] }
  | { kind: 'not_started' }
  | { kind: 'session_ended' }
  | { kind: 'offline' }
  | { kind: 'retry'; code: string }
  | { kind: 'failed'; status: number; code: string }
  /** Set by the store, not by syncOnce: this phone holds data but its sign-in is gone for good (no retry). */
  | { kind: 'sign_in_lost' }
  /** Set by the store, not by syncOnce: an empty phone with no sign-in, a new player (M5: no guest until the analysis). */
  | { kind: 'fresh' };

export type SyncDeps = {
  local: Pick<Local, 'pending' | 'acknowledge'>;
  api: Pick<Api, 'sync'>;
  timeZone: () => string;
  now: () => number;
  /** Refreshes the session; false only when Auth says the sign-in is gone. */
  sessionAlive: () => Promise<boolean>;
};

function utf8Bytes(text: string): number {
  let n = 0;
  for (const char of text) {
    const c = char.codePointAt(0)!;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}

/** The oldest events that fit in one request body (always at least one). */
export function fitBody(events: readonly PhoneEvent[], timeZone: string): PhoneEvent[] {
  const fitted: PhoneEvent[] = [];
  for (const event of events) {
    if (fitted.length > 0 && utf8Bytes(JSON.stringify({ timeZone, events: [...fitted, event] })) > MAX_BODY_BYTES) break;
    fitted.push(event);
  }
  return fitted;
}

export async function syncOnce(deps: SyncDeps): Promise<SyncOutcome> {
  const notices: Notice[] = [];
  const newAchievements: string[] = [];
  let state: ServerState | null = null;
  let limit = BATCH;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const timeZone = deps.timeZone();
    const events = fitBody(await deps.local.pending(limit), timeZone);
    const call = await deps.api.sync({ timeZone, events });
    if (!call.ok) {
      if (call.code === 'network') return { kind: 'offline' };
      if (call.status === 413 && events.length > 1) {
        limit = Math.ceil(events.length / 2); // too big after all: send half and try again
        continue;
      }
      if (call.status === 404 && call.code === 'not_started') return { kind: 'not_started' };
      if (call.status === 401 && call.code === 'session_ended' && !(await deps.sessionAlive())) return { kind: 'session_ended' };
      if (call.status === 401 || call.status >= 500) return { kind: 'retry', code: call.code };
      return { kind: 'failed', status: call.status, code: call.code };
    }
    const acknowledged = new Set<string>();
    const refused: Notice[] = [];
    for (const r of call.body.results) {
      if (r.id === null) continue;
      acknowledged.add(r.id);
      if (!r.ok) refused.push({ eventId: r.id, code: r.code });
      // M7b decision 7: applied, with a word for the player (a pain report whose day couldn't change any more).
      else if (typeof r.notice === 'string') refused.push({ eventId: r.id, code: r.notice });
    }
    for (const r of call.body.rejected) {
      if (r.id === null) continue;
      acknowledged.add(r.id);
      refused.push({ eventId: r.id, code: r.code });
    }
    await deps.local.acknowledge([...acknowledged], refused, call.body.state, deps.now());
    notices.push(...refused);
    newAchievements.push(...call.body.newAchievements);
    state = call.body.state;
    if (acknowledged.size === 0 || (await deps.local.pending(1)).length === 0) break;
  }
  if (state === null) return { kind: 'failed', status: 413, code: 'too_large' };
  return { kind: 'synced', state, notices, newAchievements };
}
