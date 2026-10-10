// One sync run (architecture §6, M4 plan decision 6): send the outbox oldest first in batches, store the server's
// state, and drop exactly the events the server acknowledged (applied or refused). Refusals become notices. Failures
// keep every event: the server is idempotent per event id, so resending is always safe.
import type { Local } from '../data/local.ts';
import type { ServerState } from '../game/types.ts';
import type { Api } from '../net/api.ts';

export const BATCH = 50;
const MAX_ROUNDS = 10;

export type Notice = { eventId: string; code: string };
export type SyncOutcome =
  | { kind: 'synced'; state: ServerState; notices: Notice[]; newAchievements: string[] }
  | { kind: 'not_started' }
  | { kind: 'session_ended' }
  | { kind: 'offline' }
  | { kind: 'retry'; code: string }
  | { kind: 'failed'; status: number; code: string };

export type SyncDeps = {
  local: Pick<Local, 'pending' | 'acknowledge'>;
  api: Pick<Api, 'sync'>;
  timeZone: () => string;
  now: () => number;
  /** Refreshes the session; false only when Auth says the sign-in is gone. */
  sessionAlive: () => Promise<boolean>;
};

export async function syncOnce(deps: SyncDeps): Promise<SyncOutcome> {
  const notices: Notice[] = [];
  const newAchievements: string[] = [];
  let state: ServerState | null = null;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const events = await deps.local.pending(BATCH);
    const call = await deps.api.sync({ timeZone: deps.timeZone(), events });
    if (!call.ok) {
      if (call.code === 'network') return { kind: 'offline' };
      if (call.status === 404 && call.code === 'not_started') return { kind: 'not_started' };
      if (call.status === 401 && call.code === 'session_ended' && !(await deps.sessionAlive())) return { kind: 'session_ended' };
      if (call.status === 401 || call.status >= 500) return { kind: 'retry', code: call.code };
      return { kind: 'failed', status: call.status, code: call.code };
    }
    const acknowledged = new Set<string>();
    for (const r of call.body.results) {
      if (r.id === null) continue;
      acknowledged.add(r.id);
      if (!r.ok) notices.push({ eventId: r.id, code: r.code });
    }
    for (const r of call.body.rejected) {
      if (r.id === null) continue;
      acknowledged.add(r.id);
      notices.push({ eventId: r.id, code: r.code });
    }
    await deps.local.acknowledge([...acknowledged], call.body.state, deps.now());
    newAchievements.push(...call.body.newAchievements);
    state = call.body.state;
    if (events.length < BATCH || acknowledged.size === 0) break;
  }
  return { kind: 'synced', state: state!, notices, newAchievements };
}
