/** @jest-environment node */
import { makeLocal, migrate } from '../src/data/local.ts';
import type { PhoneEvent, ServerState, SyncResponse } from '../src/game/types.ts';
import type { Call } from '../src/net/api.ts';
import { BATCH, MAX_BODY_BYTES, fitBody, syncOnce } from '../src/sync/engine.ts';
import type { SyncDeps } from '../src/sync/engine.ts';
import { nodeSql } from './support/nodeSql.ts';

const state = (marker: number) => ({ marker }) as unknown as ServerState;
const ev = (n: number): PhoneEvent => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, type: 'undo', instanceId: n });
type Reply = Call<SyncResponse> | ((events: readonly PhoneEvent[]) => Call<SyncResponse>);

/** Every event applied, the server's state echoing how many it has seen. */
const applyAll = (events: readonly PhoneEvent[]): Call<SyncResponse> => ({
  ok: true,
  body: { results: events.map((e) => ({ id: e.id, ok: true as const, result: {} })), rejected: [], newAchievements: [], state: state(events.length) },
});

async function setup(replies: Reply[], alive = true) {
  const sql = nodeSql();
  await migrate(sql);
  const local = makeLocal(sql);
  const sent: PhoneEvent[][] = [];
  const deps: SyncDeps = {
    local,
    api: {
      sync: async ({ events }) => {
        sent.push([...events]);
        const reply = replies.length > 1 ? replies.shift()! : replies[0]!;
        return typeof reply === 'function' ? reply(events) : reply;
      },
    },
    timeZone: () => 'Asia/Manila',
    now: () => 1000,
    sessionAlive: jest.fn(async () => alive),
  };
  return { local, sent, deps };
}

describe('one sync run', () => {
  it('with an empty outbox, asks for the state and stores it', async () => {
    const { local, sent, deps } = await setup([applyAll]);
    expect(await syncOnce(deps)).toEqual({ kind: 'synced', state: state(0), notices: [], newAchievements: [] });
    expect(sent).toEqual([[]]);
    expect(await local.load()).toEqual({ state: state(0), syncedAt: 1000 });
  });

  it('sends a long outbox in batches of 50, oldest first, until it is empty', async () => {
    const { local, sent, deps } = await setup([applyAll]);
    for (let n = 1; n <= 120; n++) await local.enqueue(ev(n), n);
    const outcome = await syncOnce(deps);
    expect(sent.map((batch) => batch.length)).toEqual([BATCH, BATCH, 20]);
    expect(sent.flat().map((e) => e.instanceId)).toEqual(Array.from({ length: 120 }, (_, i) => i + 1));
    expect(await local.pending(1000)).toEqual([]);
    expect(outcome).toMatchObject({ kind: 'synced', state: state(20) });
  });

  it('a refused event leaves the outbox and becomes a notice; a parser rejection too', async () => {
    const { local, deps } = await setup([
      {
        ok: true,
        body: {
          results: [{ id: ev(1).id, ok: false, code: 'day_closed' }],
          rejected: [{ id: ev(2).id, code: 'unsupported_event' }, { id: null, code: 'bad_event_id' }],
          newAchievements: ['first-trial'],
          state: state(1),
        },
      },
    ]);
    await local.enqueue(ev(1), 1);
    await local.enqueue(ev(2), 2);
    expect(await syncOnce(deps)).toEqual({
      kind: 'synced',
      state: state(1),
      notices: [{ eventId: ev(1).id, code: 'day_closed' }, { eventId: ev(2).id, code: 'unsupported_event' }],
      newAchievements: ['first-trial'],
    });
    expect(await local.pending(10)).toEqual([]);
    expect((await local.snapshot()).notices).toEqual([
      { eventId: ev(1).id, code: 'day_closed' },
      { eventId: ev(2).id, code: 'unsupported_event' },
    ]);
  });

  it('an event the reply does not mention stays in the outbox (the server is idempotent, it is safe to resend)', async () => {
    const { local, deps } = await setup([(events) => applyAll(events.slice(1))]);
    await local.enqueue(ev(1), 1);
    await local.enqueue(ev(2), 2);
    await syncOnce(deps);
    expect((await local.pending(10)).map((e) => e.instanceId)).toEqual([1]);
  });

  it.each([
    ['no connection', { ok: false, status: 0, code: 'network' }, { kind: 'offline' }],
    ['no character yet', { ok: false, status: 404, code: 'not_started' }, { kind: 'not_started' }],
    ['a stale token at the gateway', { ok: false, status: 401, code: 'http_401' }, { kind: 'retry', code: 'http_401' }],
    ['the server is busy', { ok: false, status: 503, code: 'busy' }, { kind: 'retry', code: 'busy' }],
    ['Auth is unavailable', { ok: false, status: 503, code: 'auth_unavailable' }, { kind: 'retry', code: 'auth_unavailable' }],
    ['a server error', { ok: false, status: 500, code: 'internal' }, { kind: 'retry', code: 'internal' }],
    ['a request the server calls bad (a bug)', { ok: false, status: 400, code: 'bad_body' }, { kind: 'failed', status: 400, code: 'bad_body' }],
  ] as const)('%s: keeps every event', async (_, reply, outcome) => {
    const { local, deps } = await setup([reply]);
    await local.enqueue(ev(1), 1);
    expect(await syncOnce(deps)).toEqual(outcome);
    expect(await local.pending(10)).toHaveLength(1);
  });

  it('session_ended only counts when Auth agrees the sign-in is gone', async () => {
    const ended = { ok: false, status: 401, code: 'session_ended' } as const;
    const stillThere = await setup([ended], true);
    expect(await syncOnce(stillThere.deps)).toEqual({ kind: 'retry', code: 'session_ended' });
    const gone = await setup([ended], false);
    expect(await syncOnce(gone.deps)).toEqual({ kind: 'session_ended' });
    expect(gone.deps.sessionAlive).toHaveBeenCalledTimes(1);
  });

  it('a state that cannot be stored leaves the outbox untouched and throws', async () => {
    const { local, deps } = await setup([applyAll]);
    await local.enqueue(ev(1), 1);
    deps.local = { ...local, acknowledge: async () => { throw new Error('disk full'); } };
    await expect(syncOnce(deps)).rejects.toThrow('disk full');
    expect(await local.pending(10)).toHaveLength(1);
  });
});

describe('request size (M4 code review: the server refuses bodies over 64 KB)', () => {
  const timer = (n: number): PhoneEvent => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    type: 'complete',
    instanceId: n,
    completedAt: Date.UTC(2026, 9, 11),
    rating: null,
    payload: { segments: Array.from({ length: 100 }, (_, i) => ({ start: 1_790_000_000_000 + i, end: 1_790_000_000_500 + i })) },
  });

  it('a batch of large events is cut to fit, oldest first; one event always goes', () => {
    const events = Array.from({ length: BATCH }, (_, i) => timer(i + 1));
    const fitted = fitBody(events, 'Asia/Manila');
    expect(fitted.length).toBeGreaterThan(0);
    expect(fitted.length).toBeLessThan(BATCH);
    expect(Buffer.byteLength(JSON.stringify({ timeZone: 'Asia/Manila', events: fitted }))).toBeLessThanOrEqual(MAX_BODY_BYTES);
    expect(fitted).toEqual(events.slice(0, fitted.length));
    expect(fitBody([timer(1)], 'Asia/Manila')).toHaveLength(1);
  });

  it('a 413 halves the batch and tries again instead of getting stuck', async () => {
    const { local, sent, deps } = await setup([{ ok: false, status: 413, code: 'too_large' }, applyAll]);
    for (let n = 1; n <= 4; n++) await local.enqueue(ev(n), n);
    expect(await syncOnce(deps)).toMatchObject({ kind: 'synced' });
    expect(sent.map((b) => b.length)).toEqual([4, 2, 2]);
    expect(await local.pending(10)).toEqual([]);
  });
});
