/** @jest-environment node */
import type { SessionState } from '../src/auth/session.ts';
import { makeLocal, migrate } from '../src/data/local.ts';
import type { ServerState, SyncResponse } from '../src/game/types.ts';
import type { Api, Call } from '../src/net/api.ts';
import { NO_SESSION_TEXT, createGameStore } from '../src/state/store.ts';
import type { GameDeps } from '../src/state/store.ts';
import { nodeSql } from './support/nodeSql.ts';
import { serverState } from './support/fixtures.ts';

const SERVER = serverState();
const core = SERVER.today!.quests.find((q) => q.slot === 'core')!;
const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs to 20:00 UTC
const ok = (state: ServerState, extra: Partial<SyncResponse> = {}): Call<SyncResponse> => ({
  ok: true,
  body: { results: [], rejected: [], newAchievements: [], state, ...extra },
});
const completeCore = { type: 'complete', instanceId: core.id, completedAt: NOW, rating: null, payload: {} } as const;

type SyncReply = Call<SyncResponse> | (() => Promise<Call<SyncResponse>>);

async function setup(syncReplies: SyncReply[], over: Partial<GameDeps> = {}) {
  const sql = nodeSql();
  await migrate(sql);
  const local = makeLocal(sql);
  let ids = 0;
  const sent: string[][] = [];
  const api = {
    sync: jest.fn(async ({ events }: { events: readonly { id: string }[] }) => {
      sent.push(events.map((e) => e.id));
      const next = syncReplies.length > 1 ? syncReplies.shift()! : syncReplies[0]!;
      const reply = typeof next === 'function' ? await next() : next;
      if (!reply.ok) return reply;
      // Answers only for the events actually sent: a scripted result where one is given, otherwise applied.
      const results = events.map((e) => reply.body.results.find((r) => r.id === e.id) ?? { id: e.id, ok: true as const, result: {} });
      return { ok: true as const, body: { ...reply.body, results } };
    }),
    onboarding: jest.fn(async () => ({ ok: true as const, body: { reveal: { source: 'template' as const, narrative: 'n' }, state: SERVER } })),
    deleteAccount: jest.fn(async () => ({ ok: true as const, body: { deleted: {}, signIn: 'deleted' as const } })),
  } as unknown as Api & { sync: jest.Mock; onboarding: jest.Mock; deleteAccount: jest.Mock };
  const deps: GameDeps = {
    local,
    api,
    ensureSession: jest.fn(async (): Promise<SessionState> => 'signed_in'),
    sessionAlive: jest.fn(async () => false),
    signOut: jest.fn(async () => {}),
    timeZone: () => 'Asia/Manila',
    now: () => NOW,
    newId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
    ...over,
  };
  const store = createGameStore(deps);
  return { store, local, api, deps, sent };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('the game store', () => {
  it('shows the cached state before the network answers', async () => {
    const { store, local } = await setup([{ ok: false, status: 0, code: 'network' }]);
    await local.acknowledge([], [], SERVER, 42);
    await store.getState().boot();
    expect(store.getState()).toMatchObject({ phase: 'ready', lastSyncedAt: 42, status: 'offline' });
    expect(store.getState().view?.today?.id).toBe(SERVER.today!.id);
    store.getState().stop();
  });

  it('with nothing cached and no character, says so', async () => {
    const { store } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await store.getState().boot();
    expect(store.getState()).toMatchObject({ phase: 'not_started', view: null, status: 'idle' });
    store.getState().stop();
  });

  it('with nothing cached and offline, keeps loading (Today shows "preparing" with a retry)', async () => {
    const { store } = await setup([{ ok: false, status: 0, code: 'network' }]);
    await store.getState().boot();
    expect(store.getState()).toMatchObject({ phase: 'loading', status: 'offline' });
    store.getState().stop();
  });

  it('allows a new guest only on an empty phone', async () => {
    const empty = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await empty.store.getState().boot();
    expect(empty.deps.ensureSession).toHaveBeenLastCalledWith(true);
    empty.store.getState().stop();

    const holding = await setup([ok(SERVER)]);
    await holding.local.acknowledge([], [], SERVER, 1);
    await holding.store.getState().boot();
    expect(holding.deps.ensureSession).toHaveBeenLastCalledWith(false);
    holding.store.getState().stop();
  });

  it('a phone with a character but an unreadable sign-in keeps everything and says so (M4 code review)', async () => {
    const { store, local, api } = await setup([ok(SERVER)], { ensureSession: jest.fn(async (): Promise<SessionState> => 'no_session') });
    await local.acknowledge([], [], SERVER, 1);
    await local.enqueue({ ...completeCore, id: 'e1' }, 2);
    await store.getState().boot();
    expect(api.sync).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({ phase: 'ready', status: 'retrying', error: NO_SESSION_TEXT });
    expect((await local.snapshot()).pending).toHaveLength(1);
    store.getState().stop();
  });

  it('an action is sent with the next sync and leaves the outbox', async () => {
    const { store, local, api } = await setup([ok(SERVER)]);
    await store.getState().boot();
    await store.getState().enqueue(completeCore);
    await store.getState().syncNow();
    expect(api.sync).toHaveBeenCalledWith({ timeZone: 'Asia/Manila', events: [expect.objectContaining({ instanceId: core.id })] });
    expect(await local.pending(10)).toEqual([]);
    expect(store.getState()).toMatchObject({ status: 'idle', pending: [] });
    store.getState().stop();
  });

  it('an action queued while a sync is in flight is kept and sent next (M4 code review)', async () => {
    let answer: (() => void) | null = null;
    const slow = () => new Promise<Call<SyncResponse>>((resolve) => (answer = () => resolve(ok(SERVER))));
    const { store, local, sent } = await setup([slow, ok(SERVER)]);
    const booting = store.getState().boot();
    while (answer === null) await settle(); // the boot sync is waiting for the server
    await store.getState().enqueue(completeCore);
    (answer as () => void)();
    await booting;
    await store.getState().syncNow();
    expect(sent[0]).toEqual([]);
    expect(sent.flat()).toContain('00000000-0000-4000-8000-000000000001');
    expect(await local.pending(10)).toEqual([]);
    store.getState().stop();
  });

  it('a queued action projects onto the view while offline', async () => {
    const { store } = await setup([ok(SERVER), { ok: false, status: 0, code: 'network' }]);
    await store.getState().boot();
    await store.getState().enqueue(completeCore);
    await store.getState().syncNow();
    const view = store.getState().view!;
    expect(view.waiting.has(core.id)).toBe(true);
    expect(view.today!.quests.find((q) => q.id === core.id)!.completedAt).not.toBeNull();
    expect(store.getState().status).toBe('offline');
    store.getState().stop();
  });

  it('a refused action becomes a stored notice until it is dismissed', async () => {
    const refused = ok(SERVER, { results: [{ id: '00000000-0000-4000-8000-000000000001', ok: false, code: 'day_closed' }] });
    const { store, local } = await setup([refused]);
    await store.getState().enqueue({ type: 'undo', instanceId: core.id });
    await store.getState().syncNow();
    expect(store.getState().notices).toEqual([{ eventId: '00000000-0000-4000-8000-000000000001', code: 'day_closed' }]);
    await store.getState().dismissNotice('00000000-0000-4000-8000-000000000001');
    expect(store.getState().notices).toEqual([]);
    expect((await local.snapshot()).notices).toEqual([]);
    store.getState().stop();
  });

  it('when the sign-in is really gone: wipes, signs out and starts again as a new guest', async () => {
    const { store, local, deps } = await setup([{ ok: false, status: 401, code: 'session_ended' }, { ok: false, status: 404, code: 'not_started' }]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    await store.getState().syncNow();
    expect(deps.signOut).toHaveBeenCalled();
    expect(await local.load()).toBeNull();
    expect(store.getState()).toMatchObject({ phase: 'not_started', view: null });
    store.getState().stop();
  });

  it('a request the server calls a bug is shown as an error, nothing dropped', async () => {
    const { store, local } = await setup([{ ok: false, status: 400, code: 'bad_body' }]);
    await store.getState().enqueue({ type: 'undo', instanceId: 1 });
    await store.getState().syncNow();
    expect(store.getState().error).toBe('The server refused a sync (400 bad_body).');
    expect(await local.pending(10)).toHaveLength(1);
    store.getState().stop();
  });

  it('starts and deletes the developer test character', async () => {
    const { store, api, local, deps } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await store.getState().boot();
    expect(await store.getState().startTestCharacter({ name: 'Tester' })).toEqual({ ok: true, source: 'template' });
    expect(api.onboarding).toHaveBeenCalledWith({ name: 'Tester' });
    expect(store.getState()).toMatchObject({ phase: 'ready' });
    expect((await local.load())?.state).toEqual(SERVER);
    expect(await store.getState().deleteTestCharacter()).toEqual({ ok: true });
    expect(deps.signOut).toHaveBeenCalled();
    expect(await local.load()).toBeNull();
    expect(store.getState().phase).toBe('not_started');
    store.getState().stop();
  });

  it('a late "no character" answer can\'t wipe a character started meanwhile (M4 code review)', async () => {
    let answer: (() => void) | null = null;
    const late = () => new Promise<Call<SyncResponse>>((resolve) => (answer = () => resolve({ ok: false, status: 404, code: 'not_started' })));
    const { store, local } = await setup([late, ok(SERVER)]);
    const booting = store.getState().boot();
    while (answer === null) await settle();
    const starting = store.getState().startTestCharacter({ name: 'Tester' }); // waits for the sync in flight
    (answer as () => void)();
    await booting;
    expect(await starting).toEqual({ ok: true, source: 'template' });
    expect((await local.load())?.state).toEqual(SERVER);
    expect(store.getState().phase).toBe('ready');
    store.getState().stop();
  });

  it('starting over forgets this phone\'s data and sign-in', async () => {
    const { store, local, deps } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().startOver();
    expect(deps.signOut).toHaveBeenCalled();
    expect(await local.load()).toBeNull();
    expect(deps.ensureSession).toHaveBeenLastCalledWith(true);
    store.getState().stop();
  });

  it('asks for a sync shortly after today ends', async () => {
    let now = NOW;
    const { store, local, api } = await setup([ok(SERVER)], { now: () => now });
    await local.acknowledge([], [], SERVER, 1);
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      await store.getState().boot();
      const before = api.sync.mock.calls.length;
      now = Date.parse(SERVER.today!.endsAt!) + 2_000;
      await jest.advanceTimersByTimeAsync(Date.parse(SERVER.today!.endsAt!) - NOW + 2_000);
      for (let i = 0; i < 100 && api.sync.mock.calls.length === before; i++) await settle(); // the sync's own I/O
      expect(api.sync.mock.calls.length).toBeGreaterThan(before);
    } finally {
      store.getState().stop();
      jest.useRealTimers();
    }
  });
});
