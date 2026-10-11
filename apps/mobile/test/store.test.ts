/** @jest-environment node */
import type { Account, GoogleResult } from '../src/auth/google.ts';
import type { SessionState } from '../src/auth/session.ts';
import { makeLocal, migrate } from '../src/data/local.ts';
import type { ServerState, SyncResponse } from '../src/game/types.ts';
import type { Api, Call } from '../src/net/api.ts';
import { NEW_DRAFT, toRequest } from '../src/onboarding/flow.ts';
import { DRAFT_KEY, SIGN_IN_LOST_TEXT, VOW_KEY, createGameStore } from '../src/state/store.ts';
import type { GameDeps } from '../src/state/store.ts';
import { nodeSql } from './support/nodeSql.ts';
import { READY_DRAFT, REVEAL, serverState } from './support/fixtures.ts';

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
  const kv = new Map<string, string>();
  const blobs = {
    getItem: jest.fn(async (k: string) => kv.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void kv.set(k, v)),
    removeItem: jest.fn(async (k: string) => void kv.delete(k)),
  };
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
    onboarding: jest.fn(async () => ({ ok: true as const, body: { reveal: REVEAL, state: SERVER } })),
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
    kv: blobs,
    account: jest.fn(async (): Promise<Account> => ({ kind: 'guest' })),
    google: { link: jest.fn(async (): Promise<GoogleResult> => ({ ok: true })), signIn: jest.fn(async (): Promise<GoogleResult> => ({ ok: true })) },
    ...over,
  };
  const store = createGameStore(deps);
  return { store, local, api, deps, sent, kv };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));
/** Like ensureSession: a session once made stays; a new one only when the store allows it. */
function guestSession(signedIn = false) {
  const fn = jest.fn(async (allowNewGuest: () => boolean): Promise<SessionState> => {
    if (signedIn) return 'signed_in';
    if (!allowNewGuest()) return 'no_session';
    signedIn = true;
    return 'signed_in';
  });
  return Object.assign(fn, { signIn: () => void (signedIn = true), signedIn: () => signedIn });
}
/** What the store answered, at the last sign-in, to "may a new guest be made?". */
const lastAllowNewGuest = (deps: GameDeps) => ((deps.ensureSession as jest.Mock).mock.calls.at(-1)![0] as () => boolean)();

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

  it('a sync never makes a guest: an empty phone without a sign-in goes straight to the onboarding', async () => {
    const { store, api, deps } = await setup([ok(SERVER)], { ensureSession: guestSession() });
    await store.getState().boot();
    expect(store.getState()).toMatchObject({ phase: 'not_started', status: 'idle', signInLost: false });
    expect(lastAllowNewGuest(deps)).toBe(false);
    expect(api.sync).not.toHaveBeenCalled();
    store.getState().stop();
  });

  it('a phone with a character whose sign-in is gone for good keeps everything, stops retrying, and leaves the choice to the player', async () => {
    const ensureSession = jest.fn(async (): Promise<SessionState> => 'no_session');
    const { store, local, api } = await setup([ok(SERVER)], { ensureSession });
    await local.acknowledge([], [], SERVER, 1);
    await local.enqueue({ ...completeCore, id: 'e1' }, 2);
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      await store.getState().boot();
      expect(store.getState()).toMatchObject({ phase: 'ready', status: 'idle', signInLost: true });
      await jest.advanceTimersByTimeAsync(3_600_000);
      expect(ensureSession).toHaveBeenCalledTimes(1); // no endless retry
      expect(api.sync).not.toHaveBeenCalled();
      expect((await local.snapshot()).pending).toHaveLength(1);
      expect(SIGN_IN_LOST_TEXT).toMatch(/start again/);
    } finally {
      store.getState().stop();
      jest.useRealTimers();
    }
  });

  it('starting again (the player chose it) clears the lost state and makes a new guest', async () => {
    const replies: SessionState[] = ['no_session', 'signed_in'];
    const ensureSession = jest.fn(async (): Promise<SessionState> => replies.shift() ?? 'signed_in');
    const { store, local } = await setup([{ ok: false, status: 404, code: 'not_started' }], { ensureSession });
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    expect(store.getState().signInLost).toBe(true);
    await store.getState().startOver();
    expect(store.getState()).toMatchObject({ signInLost: false, phase: 'not_started' });
    expect(await local.load()).toBeNull();
    store.getState().stop();
  });

  it('a sync abandoned at its deadline can\'t write back a character deleted meanwhile (M4 re-review)', async () => {
    let lateAnswer: (() => void) | null = null;
    const hung = () => new Promise<Call<SyncResponse>>((resolve) => (lateAnswer = () => resolve(ok(SERVER))));
    // A sign-in like the real one: gone after sign-out, and a new guest only when the store allows it.
    let signedIn = true;
    const ensureSession = jest.fn(async (allowNewGuest: () => boolean): Promise<SessionState> => {
      if (signedIn) return 'signed_in';
      if (!allowNewGuest()) return 'no_session';
      signedIn = true;
      return 'signed_in';
    });
    // The old run wakes up at the worst moment: after the wipe, before the next sync starts (during sign-out).
    const signOut = jest.fn(async () => {
      signedIn = false;
      (lateAnswer as () => void)();
      for (let i = 0; i < 20; i++) await settle();
    });
    const { store, local } = await setup([hung, { ok: false, status: 404, code: 'not_started' }], { signOut, ensureSession });
    await local.acknowledge([], [], SERVER, 1);
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      const booting = store.getState().boot();
      while (lateAnswer === null) await settle();
      await jest.advanceTimersByTimeAsync(120_000); // the scheduler gives up on the hung run
      await booting;
      expect(await store.getState().deleteTestCharacter()).toEqual({ ok: true });
      expect(await local.load()).toBeNull();
      expect(store.getState()).toMatchObject({ signInLost: false, phase: 'not_started' });
    } finally {
      store.getState().stop();
      jest.useRealTimers();
    }
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

  it('when the sign-in is really gone: wipes, signs out and the onboarding starts again', async () => {
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

  it('the analysis signs a guest in on an empty phone, then stores the character and the reveal', async () => {
    const session = guestSession();
    const { store, api, local, deps } = await setup([{ ok: false, status: 404, code: 'not_started' }], { ensureSession: session });
    await store.getState().boot();
    expect(session.signedIn()).toBe(false); // the sync made no guest
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: true });
    expect(session.signedIn()).toBe(true); // the analysis did
    expect(api.onboarding).toHaveBeenCalledWith(toRequest(READY_DRAFT, 'Asia/Manila', false));
    expect(store.getState()).toMatchObject({ phase: 'ready', reveal: REVEAL });
    expect((await local.load())?.state).toEqual(SERVER);
    expect(await store.getState().deleteTestCharacter()).toEqual({ ok: true });
    expect(deps.signOut).toHaveBeenCalled();
    expect(await local.load()).toBeNull();
    expect(store.getState()).toMatchObject({ phase: 'not_started', draft: NEW_DRAFT, reveal: null });
    store.getState().stop();
  });

  it('a correction on the reveal asks again with redo, and never makes a guest', async () => {
    const { store, api, deps } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: true }); // the analysis
    store.getState().editDraft({ classId: 'monk' });
    expect(await store.getState().startCharacter()).toEqual({ ok: true }); // "Change class"
    expect(api.onboarding).toHaveBeenLastCalledWith(expect.objectContaining({ classId: 'monk', redo: true }));
    expect(lastAllowNewGuest(deps)).toBe(false);
    store.getState().stop();
  });

  it('a character this interview didn\'t make (a Google restore) is never rebuilt (re-review)', async () => {
    const { store, api, local } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1); // arrived by a sync, not by this phone's analysis
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: false, code: 'already_started' });
    expect(api.onboarding).not.toHaveBeenCalled();
    store.getState().stop();
  });

  it('a first answer lost on the way back: "already started" is asked again with redo (decision 11)', async () => {
    const { store, api } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    api.onboarding.mockResolvedValueOnce({ ok: false, status: 409, code: 'already_started' });
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: true });
    expect(api.onboarding.mock.calls.map((c) => (c[0] as { redo: boolean }).redo)).toEqual([false, true]);
    store.getState().stop();
  });

  it('offline, the analysis says so and keeps the answers', async () => {
    const ensureSession = jest.fn(async (): Promise<SessionState> => 'offline');
    const { store, api } = await setup([{ ok: false, status: 0, code: 'network' }], { ensureSession });
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: false, code: 'network' });
    expect(api.onboarding).not.toHaveBeenCalled();
    expect(store.getState().draft).toEqual(READY_DRAFT);
    store.getState().stop();
  });

  it('keeps the draft on the phone without the safety answers, restores it, and forgets it when the onboarding ends', async () => {
    const first = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    first.store.getState().editDraft({ ...READY_DRAFT, safety: READY_DRAFT.safety.map(() => true) });
    await settle();
    const saved = first.kv.get(DRAFT_KEY)!;
    expect(saved).not.toContain('safety');
    first.store.getState().stop();

    const second = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    second.kv.set(DRAFT_KEY, saved);
    await second.store.getState().boot();
    expect(second.store.getState().draft).toEqual({ ...READY_DRAFT, safety: NEW_DRAFT.safety });
    await second.store.getState().finishOnboarding();
    expect(second.kv.has(DRAFT_KEY)).toBe(false);
    expect(second.store.getState().draft).toEqual(NEW_DRAFT);
    second.store.getState().stop();
  });

  it('keeps the vow on the phone (owner decision 3)', async () => {
    const { store, kv } = await setup([ok(SERVER)]);
    await store.getState().saveVow('  I will rise.  ');
    expect(kv.get(VOW_KEY)).toBe('I will rise.');
    store.getState().stop();
  });

  it('saving with Google links the account and changes nothing else', async () => {
    const { store, local, deps } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    (deps.account as jest.Mock).mockResolvedValue({ kind: 'saved', email: 'rin@example.com' });
    expect(await store.getState().saveWithGoogle()).toEqual({ ok: true });
    expect(store.getState().account).toEqual({ kind: 'saved', email: 'rin@example.com' });
    expect((await local.load())?.state).toEqual(SERVER);
    expect(deps.signOut).not.toHaveBeenCalled();
    store.getState().stop();
  });

  it('signing in with Google on an empty phone finds a saved character, or lets the onboarding go on', async () => {
    const session = guestSession();
    const found = await setup([ok(SERVER)], { ensureSession: session });
    (found.deps.google.signIn as jest.Mock).mockImplementation(async () => (session.signIn(), { ok: true }));
    await found.store.getState().boot();
    expect(await found.store.getState().signInWithGoogle()).toEqual({ ok: true, found: true });
    expect(found.store.getState().phase).toBe('ready');
    found.store.getState().stop();

    const none = guestSession();
    const empty = await setup([{ ok: false, status: 404, code: 'not_started' }], { ensureSession: none });
    (empty.deps.google.signIn as jest.Mock).mockImplementation(async () => (none.signIn(), { ok: true }));
    await empty.store.getState().boot();
    expect(await empty.store.getState().signInWithGoogle()).toEqual({ ok: true, found: false });
    expect(empty.store.getState().phase).toBe('not_started');
    empty.store.getState().stop();
  });

  it('never signs in over a character this phone holds', async () => {
    const { store, local, deps } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    expect(await store.getState().signInWithGoogle()).toEqual({ ok: false, code: 'failed' });
    expect(deps.google.signIn).not.toHaveBeenCalled();
    store.getState().stop();
  });

  it('a Google sign-in whose sync can\'t finish never claims there is no character (review)', async () => {
    const session = guestSession();
    const { store, deps } = await setup([{ ok: false, status: 0, code: 'network' }], { ensureSession: session });
    (deps.google.signIn as jest.Mock).mockImplementation(async () => (session.signIn(), { ok: true }));
    await store.getState().boot();
    expect(await store.getState().signInWithGoogle()).toEqual({ ok: true, found: 'unknown' });
    expect(store.getState().phase).not.toBe('ready');
    store.getState().stop();
  });

  it('with a Google account, "already started" fetches the character instead of rebuilding it (review)', async () => {
    const { store, api } = await setup([{ ok: false, status: 404, code: 'not_started' }, ok(SERVER)], {
      account: jest.fn(async (): Promise<Account> => ({ kind: 'saved', email: null })),
    });
    api.onboarding.mockResolvedValue({ ok: false, status: 409, code: 'already_started' });
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: false, code: 'already_started' });
    expect(api.onboarding).toHaveBeenCalledTimes(1); // no redo over a saved character
    await store.getState().syncNow();
    expect(store.getState().phase).toBe('ready');
    store.getState().stop();
  });

  it('never sends an unfinished interview: an unanswered safety question is not a "no" (review)', async () => {
    const { store, api } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await store.getState().boot();
    store.getState().editDraft({ ...READY_DRAFT, safety: NEW_DRAFT.safety });
    expect(await store.getState().startCharacter()).toEqual({ ok: false, code: 'incomplete' });
    expect(api.onboarding).not.toHaveBeenCalled();
    store.getState().stop();
  });

  it('a phone that already holds a character forgets a leftover draft at boot (review)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(DRAFT_KEY, JSON.stringify(READY_DRAFT));
    await store.getState().boot();
    expect(kv.has(DRAFT_KEY)).toBe(false);
    expect(store.getState().draft).toEqual(NEW_DRAFT);
    store.getState().stop();
  });

  it('a late "no character" answer can\'t wipe a character started meanwhile (M4 code review)', async () => {
    let answer: (() => void) | null = null;
    const late = () => new Promise<Call<SyncResponse>>((resolve) => (answer = () => resolve({ ok: false, status: 404, code: 'not_started' })));
    const { store, local } = await setup([late, ok(SERVER)]);
    const booting = store.getState().boot();
    while (answer === null) await settle();
    store.getState().editDraft(READY_DRAFT);
    const starting = store.getState().startCharacter(); // waits for the sync in flight
    (answer as () => void)();
    await booting;
    expect(await starting).toEqual({ ok: true });
    expect((await local.load())?.state).toEqual(SERVER);
    expect(store.getState().phase).toBe('ready');
    store.getState().stop();
  });

  it('a run given up after its deadline can\'t write its late answer over a newer one', async () => {
    let lateAnswer: (() => void) | null = null;
    const hung = () => new Promise<Call<SyncResponse>>((resolve) => (lateAnswer = () => resolve(ok({ ...SERVER, achievements: ['stale'] }))));
    const { store, local } = await setup([hung, ok(SERVER)]);
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      const first = store.getState().boot();
      while (lateAnswer === null) await settle();
      await jest.advanceTimersByTimeAsync(120_000); // the scheduler gives up on the hung run
      await first;
      await store.getState().syncNow(); // a newer run stores the current state
      expect((await local.load())?.state.achievements).toEqual([]);
      (lateAnswer as () => void)(); // the old run wakes up
      for (let i = 0; i < 20; i++) await settle();
      expect((await local.load())?.state.achievements).toEqual([]);
    } finally {
      store.getState().stop();
      jest.useRealTimers();
    }
  });

  it('starting over forgets this phone\'s data, sign-in, draft and vow', async () => {
    const { store, local, deps, kv } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().saveVow('I will rise.');
    kv.set(DRAFT_KEY, '{}');
    await store.getState().startOver();
    expect(deps.signOut).toHaveBeenCalled();
    expect(await local.load()).toBeNull();
    expect(kv.has(VOW_KEY)).toBe(false); // the next player on this phone never sees it (review)
    expect(kv.has(DRAFT_KEY)).toBe(false);
    expect(lastAllowNewGuest(deps)).toBe(false); // the onboarding makes the next guest
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
