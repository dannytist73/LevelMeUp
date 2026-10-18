/** @jest-environment node */
import { LIBRARY } from '@levelmeup/content';
import { stateView } from '../../../supabase/functions/_shared/state.ts';
import { dayOffers } from '../../../supabase/functions/_shared/today.ts';
import { dayTwoSnapshot, historyOf } from '../../../supabase/tests/unit/fixtures.ts';
import type { Account, GoogleResult } from '../src/auth/google.ts';
import type { SessionState } from '../src/auth/session.ts';
import { makeLocal, migrate } from '../src/data/local.ts';
import { SAMPLE_ARTICLE } from '../src/dev/sampleArticle.ts';
import type { PhoneEvent, ServerState, SyncResponse } from '../src/game/types.ts';
import type { Api, Call } from '../src/net/api.ts';
import { DEFAULT_NOTIFY, NOTIFY_KEY } from '../src/notify/settings.ts';
import type { NoteOs, Permission, PlannedNote } from '../src/notify/types.ts';
import { NEW_DRAFT, toRequest } from '../src/onboarding/flow.ts';
import {
  ART_KEY, CHECKIN_RESULT_KEY, CODEX_KEY, DRAFT_KEY, FRAME_KEY, HAPTICS_KEY, THEME_KEY, LAST_SETS_KEY, PORTRAIT_KEY, SHADOW_KEY, SIGN_IN_LOST_TEXT, TIMERS_KEY, TRAINING_NOTICE_KEY, TRIAL_KEY, VOW_KEY, createGameStore,
} from '../src/state/store.ts';
import type { GameDeps } from '../src/state/store.ts';
import { NOT_PLUS } from '../src/plus/plus.ts';
import * as purchases from '../src/plus/purchases.ts';
import { setBuzzing } from '../src/ui/haptics.ts';
import { nodeSql } from './support/nodeSql.ts';
import { DAY_TWO_NOW, READY_DRAFT, REVEAL, adjustState, serverState } from './support/fixtures.ts';

const SERVER = serverState();
const core = SERVER.today!.quests.find((q) => q.slot === 'core')!;
const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs to 20:00 UTC
const ok = (state: ServerState, extra: Partial<SyncResponse> = {}): Call<SyncResponse> => ({
  ok: true,
  body: { results: [], rejected: [], newAchievements: [], state, ...extra },
});
const completeCore = { type: 'complete', instanceId: core.id, completedAt: NOW, rating: null, payload: {} } as const;

type SyncReply = Call<SyncResponse> | (() => Promise<Call<SyncResponse>>);

/** Stores the tests made; each is stopped after its test, so a day-end timer can't keep Jest running (review). */
const made: { getState: () => { stop: () => void } }[] = [];
afterEach(() => {
  for (const store of made.splice(0)) store.getState().stop();
});

/** The phone's notifications as the store sees them (M7d): granted unless a test says otherwise. */
function fakeNotes(permission: Permission = 'granted') {
  return {
    permission: jest.fn(async (): Promise<Permission> => permission),
    ask: jest.fn(async (): Promise<Permission> => 'granted'),
    replace: jest.fn(async (_notes: readonly PlannedNote[]) => {}),
    cancelAll: jest.fn(async () => {}),
    openSettings: jest.fn(async () => {}),
  } satisfies NoteOs;
}

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
    plus: jest.fn(async () => ({ ok: true as const, body: { plus: { ...NOT_PLUS, active: true, source: 'play', product: 'plus_yearly' } } })),
  } as unknown as Api & { sync: jest.Mock; onboarding: jest.Mock; deleteAccount: jest.Mock; plus: jest.Mock };
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
    artManifest: jest.fn(async (): Promise<unknown> => ({ version: 1, art: { 'ladder-push': 2 } })),
    notes: fakeNotes(),
    playerId: jest.fn(async () => '00000000-0000-4000-8000-0000000000aa'),
    ...over,
  };
  const store = createGameStore(deps);
  made.push(store);
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
      expect(await store.getState().deleteCharacter()).toEqual({ ok: true });
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
    expect(api.sync).toHaveBeenCalledWith({ timeZone: 'Asia/Manila', events: [expect.objectContaining({ instanceId: core.id })], have: [], want: [] });
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

  it('a past reading asked for while a sync is in flight goes with the next one, and is asked for once (M8b review)', async () => {
    let answer: (() => void) | null = null;
    const slow = () => new Promise<Call<SyncResponse>>((resolve) => (answer = () => resolve(ok(SERVER))));
    const { store, api } = await setup([slow, ok(SERVER)]);
    const booting = store.getState().boot();
    while (answer === null) await settle(); // the boot sync is waiting for the server
    store.getState().fetchArticle('article-9');
    (answer as () => void)();
    await booting;
    await store.getState().syncNow();
    await store.getState().syncNow();
    const wants = api.sync.mock.calls.map((c) => (c[0] as { want: string[] }).want);
    expect(wants[0]).toEqual([]);
    expect(wants.filter((w) => w.includes('article-9'))).toHaveLength(1);
    expect(wants.at(-1)).toEqual([]);
    store.getState().stop();
  });

  it('a reading held from before its Story Deck is asked for again, once a launch (M11 review)', async () => {
    const withReading: ServerState = {
      ...SERVER, readings: [{ id: 'article-9', cluster: 'sleep', title: 'Wake time', minutes: 6, dayNumber: 0, date: '2026-10-09', takeaway: null }],
    };
    const { store, local, api } = await setup([ok(withReading)]);
    await local.acknowledge([], [], withReading, 1, [{ ...SAMPLE_ARTICLE, id: 'article-9', deck: null }]);
    await store.getState().boot();
    expect(store.getState().articles['article-9']).toBeDefined();
    store.getState().fetchArticle('article-9');
    await store.getState().syncNow();
    store.getState().fetchArticle('article-9'); // the server had no deck for it either: not asked again
    await store.getState().syncNow();
    const requests = api.sync.mock.calls.map((c) => c[0] as { want: string[]; have: string[] });
    expect(requests.filter((r) => r.want.includes('article-9'))).toHaveLength(1);
    expect(requests.some((r) => r.have.includes('article-9'))).toBe(false);
    store.getState().stop();
  });

  it('more than 3 past readings asked for at once go over the following runs, each once (M8b re-review)', async () => {
    const { store, api } = await setup([ok(SERVER)]);
    await store.getState().boot();
    for (const id of ['article-1', 'article-2', 'article-3', 'article-4']) store.getState().fetchArticle(id);
    await store.getState().syncNow(); // each request made during a run makes the scheduler run once more
    const asked = api.sync.mock.calls.flatMap((c) => (c[0] as { want: string[] }).want);
    expect(asked.sort()).toEqual(['article-1', 'article-2', 'article-3', 'article-4']);
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

  it('an app too old for the server (M9b): the update card, nothing dropped, no offline day, cleared by a later sync', async () => {
    let old = true;
    const { store, local } = await setup([
      async () => (old ? ({ ok: false, status: 426, code: 'update_required' } as const) : ok(SERVER)),
    ]);
    await store.getState().enqueue({ type: 'undo', instanceId: 1 });
    await store.getState().syncNow();
    expect(store.getState()).toMatchObject({ updateRequired: true, error: null, status: 'idle' });
    expect(await local.pending(10)).toHaveLength(1);
    expect(store.getState().view?.offline ?? false).toBe(false);
    old = false;
    await store.getState().syncNow();
    expect(store.getState().updateRequired).toBe(false);
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
    // M12 decision 8 (review): enrolled for the set-up cards the moment the character exists, not at Accept.
    expect(store.getState().offers).toContain('setup');
    expect((await local.load())?.state).toEqual(SERVER);
    expect(await store.getState().deleteCharacter()).toEqual({ ok: true });
    expect(store.getState().offers).toEqual([]); // the next character gets its own
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

  it('reads the vow at boot and shows a new one at once (M6d)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(VOW_KEY, 'I will rise.');
    expect(store.getState().vow).toBeNull();
    await store.getState().boot();
    expect(store.getState().vow).toBe('I will rise.');
    await store.getState().saveVow(' I rise ');
    expect(store.getState().vow).toBe('I rise');
    await store.getState().saveVow('   ');
    expect(store.getState().vow).toBeNull();
    store.getState().stop();
  });

  it('keeps the portrait figure on the phone and reads it at boot (M9a decision 5)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(PORTRAIT_KEY, 'b');
    expect(store.getState().portrait).toBeNull();
    await store.getState().boot();
    expect(store.getState().portrait).toBe('b');
    await store.getState().setPortrait('a');
    expect(store.getState().portrait).toBe('a');
    expect(kv.get(PORTRAIT_KEY)).toBe('a');
    expect(await local.pending(10)).toEqual([]); // cosmetic: nothing goes to the server (decision 5)
    store.getState().stop();
  });

  it('reads an unreadable figure as no choice (M9a)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(PORTRAIT_KEY, 'zz');
    await store.getState().boot();
    expect(store.getState().portrait).toBeNull();
    store.getState().stop();
  });

  it('forgets the figure with the character (M9a decision 5)', async () => {
    const { store, local, kv } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().setPortrait('b');
    await store.getState().startOver();
    expect(kv.has(PORTRAIT_KEY)).toBe(false);
    expect(store.getState().portrait).toBeNull();
    store.getState().stop();
  });

  it('keeps the last logged sets on the phone, merges new ones, reads them at boot, and forgets them with the character (M10c decision 7)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(LAST_SETS_KEY, JSON.stringify({ 'move:plank': [30] }));
    await store.getState().boot();
    expect(store.getState().lastSets).toEqual({ 'move:plank': [30] });
    await store.getState().rememberSets({ 'move:goblet-squat': [12, 11] });
    expect(store.getState().lastSets).toEqual({ 'move:plank': [30], 'move:goblet-squat': [12, 11] });
    expect(JSON.parse(kv.get(LAST_SETS_KEY)!)).toEqual({ 'move:plank': [30], 'move:goblet-squat': [12, 11] });
    expect(await local.pending(10)).toEqual([]); // kept on the phone: nothing goes to the server
    await store.getState().startOver();
    expect(kv.has(LAST_SETS_KEY)).toBe(false);
    expect(store.getState().lastSets).toEqual({});
    store.getState().stop();
  });

  it('keeps the kept lessons on the phone, reads them at boot, and forgets them with the character (M11 decision 7)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(CODEX_KEY, JSON.stringify([{ articleId: 'article-1', title: 'One', lesson: 'Lesson one.', keptAt: 1 }]));
    await store.getState().boot();
    expect(store.getState().codex.map((e) => e.articleId)).toEqual(['article-1']);
    await store.getState().toggleKeep({ articleId: 'article-2', title: 'Two', lesson: 'Lesson two.', keptAt: 2 });
    expect((JSON.parse(kv.get(CODEX_KEY)!) as { articleId: string }[]).map((e) => e.articleId)).toEqual(['article-2', 'article-1']);
    expect(await local.pending(10)).toEqual([]); // kept on the phone: nothing goes to the server
    await store.getState().startOver();
    expect(kv.has(CODEX_KEY)).toBe(false);
    expect(store.getState().codex).toEqual([]);
    store.getState().stop();
  });

  it('keeps the Haptics switch on the phone, applies it at once, and reads it at boot (M10b decision 4)', async () => {
    (setBuzzing as jest.Mock).mockClear(); // a jest.fn keeps its calls from earlier tests (review)
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    expect(store.getState().haptics).toBe(true);
    kv.set(HAPTICS_KEY, 'off');
    await store.getState().boot();
    expect(store.getState().haptics).toBe(false);
    expect(setBuzzing).toHaveBeenLastCalledWith(false);
    await store.getState().setHaptics(true);
    expect(store.getState().haptics).toBe(true);
    expect(setBuzzing).toHaveBeenLastCalledWith(true);
    expect(kv.get(HAPTICS_KEY)).toBe('on');
    expect(await local.pending(10)).toEqual([]); // the phone's: nothing goes to the server
    store.getState().stop();
  });

  it('is on when nothing is kept, or the phone cannot read it (M10b decision 4)', async () => {
    (setBuzzing as jest.Mock).mockClear();
    const { store, local, deps } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    (deps.kv.getItem as jest.Mock).mockImplementation(async (k: string) => {
      if (k === HAPTICS_KEY) throw new Error('storage');
      return null;
    });
    await store.getState().boot();
    expect(store.getState().haptics).toBe(true);
    expect(setBuzzing).toHaveBeenCalledTimes(1);
    expect(setBuzzing).toHaveBeenLastCalledWith(true);
    store.getState().stop();
  });

  it('a switch the phone cannot store still applies (M10b decision 4)', async () => {
    (setBuzzing as jest.Mock).mockClear();
    const { store, deps } = await setup([ok(SERVER)]);
    (deps.kv.setItem as jest.Mock).mockRejectedValueOnce(new Error('storage'));
    await store.getState().setHaptics(false);
    expect(store.getState().haptics).toBe(false);
    expect(setBuzzing).toHaveBeenCalledWith(false);
    store.getState().stop();
  });

  it("deleting the character keeps the switch: it is the phone's (M10b plan decision 3)", async () => {
    const { store, local, kv } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().setHaptics(false);
    await store.getState().startOver();
    expect(kv.get(HAPTICS_KEY)).toBe('off');
    expect(store.getState().haptics).toBe(false);
    store.getState().stop();
  });

  it('shows the training notice once, until it is dismissed (M6d decision 13)', async () => {
    const first = await setup([ok(SERVER)]);
    await first.local.acknowledge([], [], SERVER, 1);
    expect(first.store.getState().trainingNoticeSeen).toBe(true); // nothing flashes before boot reads the phone
    await first.store.getState().boot();
    expect(first.store.getState().trainingNoticeSeen).toBe(false);
    await first.store.getState().dismissTrainingNotice();
    expect(first.store.getState().trainingNoticeSeen).toBe(true);
    expect(first.kv.get(TRAINING_NOTICE_KEY)).toBe('seen');
    first.store.getState().stop();
    const second = await setup([ok(SERVER)]);
    await second.local.acknowledge([], [], SERVER, 1);
    second.kv.set(TRAINING_NOTICE_KEY, 'seen');
    await second.store.getState().boot();
    expect(second.store.getState().trainingNoticeSeen).toBe(true);
    second.store.getState().stop();
  });

  it('a new player never gets the training notice: making the character marks it seen (review)', async () => {
    const { store, kv } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await store.getState().boot();
    expect(store.getState().trainingNoticeSeen).toBe(false);
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: true });
    expect(store.getState().trainingNoticeSeen).toBe(true);
    expect(kv.get(TRAINING_NOTICE_KEY)).toBe('seen');
    store.getState().stop();
  });

  it('a character restored with Google keeps the notice: leaving the onboarding alone does not mark it (review)', async () => {
    const { store, kv } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await store.getState().boot();
    await store.getState().finishOnboarding();
    expect(store.getState().trainingNoticeSeen).toBe(false);
    expect(kv.has(TRAINING_NOTICE_KEY)).toBe(false);
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
    await store.getState().dismissTrainingNotice();
    kv.set(DRAFT_KEY, '{}');
    await store.getState().startOver();
    expect(deps.signOut).toHaveBeenCalled();
    expect(await local.load()).toBeNull();
    expect(kv.has(VOW_KEY)).toBe(false); // the next player on this phone never sees it (review)
    expect(store.getState().vow).toBeNull();
    expect(kv.has(TRAINING_NOTICE_KEY)).toBe(false); // M6d
    expect(store.getState().trainingNoticeSeen).toBe(false);
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

describe('celebrations (M6a decision 8)', () => {
  it('a level-up the server confirms is celebrated once, with the new level', async () => {
    const higher = serverState([], { xp_strength: 400 });
    expect(higher.character.level).toBeGreaterThan(SERVER.character.level);
    const { store } = await setup([ok(SERVER), ok(higher)]);
    await store.getState().boot();
    expect(store.getState().celebrations).toEqual([]);
    await store.getState().syncNow();
    expect(store.getState().celebrations).toEqual([{ kind: 'level', level: higher.character.level, from: SERVER.character.level }]);
    store.getState().dismissCelebration();
    expect(store.getState().celebrations).toEqual([]);
  });

  it('still celebrates when something reloads the screen between the sync storing the state and its result', async () => {
    const higher = serverState([], { xp_strength: 400 });
    const { store, local } = await setup([ok(SERVER), ok(higher)]);
    await store.getState().boot();
    const acknowledge = local.acknowledge;
    local.acknowledge = async (...args) => {
      const done = await acknowledge(...args);
      await store.getState().dismissNotice('none'); // reloads what the phone holds, the new state included
      return done;
    };
    await store.getState().syncNow();
    expect(store.getState().celebrations).toEqual([{ kind: 'level', level: higher.character.level, from: SERVER.character.level }]);
  });

  it('celebrates a level crossed between the analysis and its first sync (review)', async () => {
    const higher = serverState([], { xp_strength: 400 });
    const { store } = await setup([ok(higher)], { ensureSession: guestSession() });
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: true }); // the analysis stores SERVER (level 1)
    await store.getState().syncNow();
    expect(store.getState().celebrations).toEqual([{ kind: 'level', level: higher.character.level, from: SERVER.character.level }]);
  });

  it('queues the reply\'s new achievements', async () => {
    const { store } = await setup([ok(SERVER, { newAchievements: ['first-trial', 'level-5'] })]);
    await store.getState().boot();
    expect(store.getState().celebrations).toEqual([{ kind: 'achievement', id: 'first-trial' }, { kind: 'achievement', id: 'level-5' }]);
  });

  it('celebrates nothing on the first state a phone ever receives', async () => {
    const { store } = await setup([ok(serverState([], { xp_strength: 400 }))]);
    await store.getState().boot();
    expect(store.getState().celebrations).toEqual([]);
  });
});

describe('the art manifest (M6a decision 10)', () => {
  it('is fetched after the first sync of a launch, kept on the phone, and read back at the next launch', async () => {
    const { store, deps, kv } = await setup([ok(SERVER)]);
    await store.getState().boot();
    await settle();
    expect(store.getState().art).toEqual({ version: 1, art: { 'ladder-push': 2 } });
    await store.getState().syncNow();
    await settle();
    expect(deps.artManifest).toHaveBeenCalledTimes(1);
    expect(JSON.parse(kv.get(ART_KEY)!)).toEqual({ version: 1, art: { 'ladder-push': 2 } });
    const next = createGameStore({ ...deps, artManifest: jest.fn(async () => null) });
    made.push(next);
    await next.getState().boot();
    expect(next.getState().art).toEqual({ version: 1, art: { 'ladder-push': 2 } });
  });

  it('a manifest it can\'t read changes nothing, and the kept one stays', async () => {
    const { store, deps, kv } = await setup([ok(SERVER)], { artManifest: jest.fn(async () => ({ version: 9 })) });
    kv.set(ART_KEY, JSON.stringify({ version: 1, art: { 'ladder-walk': 1 } }));
    await store.getState().boot();
    await settle();
    expect(deps.artManifest).toHaveBeenCalledTimes(1);
    expect(store.getState().art).toEqual({ version: 1, art: { 'ladder-walk': 1 } });
    expect(JSON.parse(kv.get(ART_KEY)!)).toEqual({ version: 1, art: { 'ladder-walk': 1 } });
  });

  it("is fetched for a new player too, whose first launch never synced a character (M6e device check)", async () => {
    const { store, deps } = await setup([{ ok: false, status: 404, code: 'not_started' }], { ensureSession: guestSession() });
    await store.getState().boot();
    await settle();
    expect(deps.artManifest).not.toHaveBeenCalled();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: true });
    await settle();
    expect(deps.artManifest).toHaveBeenCalledTimes(1);
    expect(store.getState().art).toEqual({ version: 1, art: { 'ladder-push': 2 } });
  });
});

describe('quest timers (M6a decision 3)', () => {
  const running = { segments: [], runningSince: NOW };
  const paused = { segments: [{ start: NOW, end: NOW + 60_000 }], runningSince: null };

  it('are kept per quest, pruned to today\'s quests, and forgotten on request', async () => {
    const { store, kv } = await setup([ok(SERVER)]);
    await store.getState().boot();
    kv.set(TIMERS_KEY, JSON.stringify({ 999999: running })); // a quest from another day
    await store.getState().saveTimer(core.id, running);
    expect(await store.getState().timer(core.id)).toEqual(running);
    expect(JSON.parse(kv.get(TIMERS_KEY)!)).toEqual({ [core.id]: running });
    await store.getState().saveTimer(core.id, null);
    expect(await store.getState().timer(core.id)).toBeNull();
  });

  it('saves in the order they were asked for, so a quick start and pause keeps the pause', async () => {
    const { store, deps, kv } = await setup([ok(SERVER)]);
    await store.getState().boot();
    // The first save's read is slow: without the queue, the second save would write first and be overwritten.
    (deps.kv.getItem as jest.Mock).mockImplementationOnce(async (k: string) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return kv.get(k) ?? null;
    });
    await Promise.all([store.getState().saveTimer(core.id, running), store.getState().saveTimer(core.id, paused)]);
    expect(await store.getState().timer(core.id)).toEqual(paused);
  });

  it('reads a timer only after the saves on their way (review)', async () => {
    const { store, deps, kv } = await setup([ok(SERVER)]);
    await store.getState().boot();
    (deps.kv.setItem as jest.Mock).mockImplementationOnce(async (k: string, v: string) => {
      await new Promise((resolve) => setTimeout(resolve, 20)); // the save's write is slow
      kv.set(k, v);
    });
    const saving = store.getState().saveTimer(core.id, paused);
    expect(await store.getState().timer(core.id)).toEqual(paused);
    await saving;
  });

  it('are forgotten with everything else when the phone starts over', async () => {
    const { store, kv } = await setup([ok(SERVER)]);
    await store.getState().boot();
    await store.getState().saveTimer(core.id, running);
    await store.getState().startOver();
    expect(kv.has(TIMERS_KEY)).toBe(false);
    expect(store.getState().celebrations).toEqual([]);
  });
});

describe('adjustments and quest timers (M6b)', () => {
  it("a swap drops the replaced quest's stored timer; a hard day keeps it (its time still counts)", async () => {
    const day2 = adjustState();
    const { store } = await setup([ok(day2)], { now: () => DAY_TWO_NOW });
    await store.getState().boot();
    const running = { segments: [], runningSince: DAY_TWO_NOW };
    await store.getState().saveTimer(201, running); // walk-1, a timer quest
    await store.getState().enqueue({ type: 'hard_day', dayId: 2 });
    expect(await store.getState().timer(201)).toEqual(running);
    const option = day2.today!.quests.find((q) => q.id === 201)!.swaps[0]!;
    await store.getState().enqueue({ type: 'swap', instanceId: 201, templateId: option.templateId });
    expect(await store.getState().timer(201)).toBeNull();
  });
});

describe('a day built offline (M6e)', () => {
  const END = Date.parse(SERVER.today!.endsAt!);
  const HOUR = 3_600_000;
  const offline = { ok: false as const, status: 0, code: 'network' };

  it("when today has ended and the server can't be reached, builds the next day and shows it", async () => {
    const { store, local } = await setup([ok(SERVER), offline], { now: () => END + HOUR });
    await store.getState().boot();
    await store.getState().syncNow();
    const { view, pending } = store.getState();
    expect(view!.offline).toBe(true);
    expect(view!.today!.dayNumber).toBe(2);
    expect(pending.map((e) => e.type)).toEqual(['provisional_day']);
    expect(await local.pending(10)).toHaveLength(1);
    // Another failed sync builds nothing more: one offline day at a time.
    await store.getState().syncNow();
    expect(store.getState().pending).toHaveLength(1);
  });

  it('an app too old for the server (M9b) builds no day either, though today has ended (review)', async () => {
    const { store, local } = await setup([ok(SERVER), { ok: false, status: 426, code: 'update_required' }], { now: () => END + HOUR });
    await store.getState().boot();
    await store.getState().syncNow();
    expect(store.getState()).toMatchObject({ updateRequired: true, pending: [] });
    expect(store.getState().view!.offline).toBe(false);
    expect(await local.pending(10)).toEqual([]);
  });

  it('builds nothing while the day still runs', async () => {
    const { store } = await setup([ok(SERVER), offline]);
    await store.getState().boot();
    await store.getState().syncNow();
    expect(store.getState().pending).toEqual([]);
    expect(store.getState().view!.offline).toBe(false);
  });

  it('a completion on the offline day names its quest by day and slot', async () => {
    const { store } = await setup([ok(SERVER), offline], { now: () => END + HOUR });
    await store.getState().boot();
    await store.getState().syncNow();
    const core = store.getState().view!.today!.quests[0]!;
    await store.getState().enqueue({ type: 'complete', instanceId: core.id, completedAt: END + 2 * HOUR, rating: null, payload: {} });
    expect(store.getState().pending.at(-1)).toMatchObject({
      type: 'complete', instanceId: null, ref: { dayNumber: 2, slot: 'core', templateId: core.templateId },
    });
    expect(store.getState().view!.today!.quests[0]!.completedAt).not.toBeNull();
  });

  it("a timer started on an offline quest moves to the server's quest in its slot after the sync", async () => {
    const replies: Parameters<typeof setup>[0] = [ok(SERVER), offline];
    const { store, kv } = await setup(replies, { now: () => END + HOUR });
    await store.getState().boot();
    await store.getState().syncNow();
    const built = store.getState().pending[0] as Extract<PhoneEvent, { type: 'provisional_day' }>;
    const timer = { segments: [{ start: END + HOUR, end: END + HOUR + 60_000 }], runningSince: null };
    await store.getState().saveTimer(-1, timer);
    const slots = Object.fromEntries(built.quests.map((q) => [q.slot, q.templateId])) as { core: string; side1: string; side2: string };
    const snapshot = dayTwoSnapshot(slots);
    replies.length = 0;
    replies.push(ok(stateView(snapshot, dayOffers(snapshot, LIBRARY), historyOf(snapshot))));
    await store.getState().syncNow();
    await settle();
    expect(store.getState().view!.offline).toBe(false);
    expect(JSON.parse(kv.get(TIMERS_KEY)!)).toEqual({ 200: timer });
  });
});

describe('the check-in on this phone (M7a decision 10)', () => {
  it('"Later" hides a check-in until the app is opened again', async () => {
    const { store } = await setup([ok(SERVER)]);
    expect(store.getState().checkinLater).toBeNull();
    store.getState().answerLater(7);
    expect(store.getState().checkinLater).toBe(7);
    store.getState().reopen();
    expect(store.getState().checkinLater).toBeNull();
  });

  it('a result the player has seen stays seen after a restart, and goes with the character', async () => {
    const first = await setup([ok(SERVER)]);
    await first.local.acknowledge([], [], SERVER, 1);
    await first.store.getState().boot();
    expect(first.store.getState().checkinResultSeen).toBeNull();
    await first.store.getState().dismissCheckinResult(9);
    expect(first.store.getState().checkinResultSeen).toBe(9);
    expect(first.kv.get(CHECKIN_RESULT_KEY)).toBe('9');
    const replies: SessionState[] = ['signed_in', 'no_session', 'signed_in'];
    const ensureSession = jest.fn(async (): Promise<SessionState> => replies.shift() ?? 'signed_in');
    const second = await setup([ok(SERVER), { ok: false, status: 404, code: 'not_started' }], { ensureSession });
    await second.local.acknowledge([], [], SERVER, 1);
    second.kv.set(CHECKIN_RESULT_KEY, '9');
    await second.store.getState().boot();
    expect(second.store.getState().checkinResultSeen).toBe(9);
    await second.store.getState().startOver();
    expect(second.kv.has(CHECKIN_RESULT_KEY)).toBe(false);
    expect(second.store.getState().checkinResultSeen).toBeNull();
  });
});

describe('Settings (M7b)', () => {
  it("a rest and a pain report carry when they were tapped (decision 6); other events don't", async () => {
    const { store, local } = await setup([{ ok: false, status: 0, code: 'network' }]);
    await store.getState().enqueue({ type: 'plan_rest', dayId: 1 });
    await store.getState().enqueue({ type: 'pain', instanceId: core.id, choice: 'rest' });
    await store.getState().enqueue({ type: 'hard_day', dayId: 1 });
    const [rest, pain, hard] = await local.pending(10);
    expect(rest).toMatchObject({ type: 'plan_rest', at: NOW });
    expect(pain).toMatchObject({ type: 'pain', at: NOW });
    expect('at' in hard!).toBe(false);
  });

  it('the analysis on a phone that cannot keep a sign-in makes nothing and keeps the answers (decision 8)', async () => {
    const ensureSession = jest.fn(async (): Promise<SessionState> => 'storage_failed');
    const { store, api } = await setup([{ ok: false, status: 404, code: 'not_started' }], { ensureSession });
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: false, code: 'storage' });
    expect(api.onboarding).not.toHaveBeenCalled();
    expect(store.getState().draft).toEqual(READY_DRAFT);
  });
});

describe('the pact on the phone (M7c)', () => {
  it("the Shadow's scene stays shown and the focus minutes stay after a restart, and both go with the character", async () => {
    const { store, kv, local } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(SHADOW_KEY, '7');
    await store.getState().boot();
    expect(store.getState().shadowSeen).toBe(7);
    await store.getState().seeShadow(8);
    expect(kv.get(SHADOW_KEY)).toBe('8');
    await store.getState().saveTrialMs(8, 61_500.4);
    expect(await store.getState().trialMs(8)).toBe(61_500);
    expect(await store.getState().trialMs(9)).toBe(0); // another check-in's minutes never count
    kv.set(TRIAL_KEY, 'not json');
    expect(await store.getState().trialMs(8)).toBe(0);
    await store.getState().startOver();
    expect(kv.has(SHADOW_KEY)).toBe(false);
    expect(kv.has(TRIAL_KEY)).toBe(false);
    expect(store.getState().shadowSeen).toBeNull();
  });

  it('a pact signed on the reveal is sent when the onboarding ends (decision 10)', async () => {
    const { store, local, api } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    store.getState().editDraft({ pact: 1 });
    await store.getState().finishOnboarding();
    expect(store.getState().draft.pact).toBeNull();
    const sentPact = () => api.sync.mock.calls.some((c) => (c[0] as { events: PhoneEvent[] }).events.some((e) => e.type === 'accountability_set'));
    for (let i = 0; i < 100 && !sentPact(); i++) await settle();
    expect(sentPact()).toBe(true);
    store.getState().stop();
  });
});

describe('notifications (M7d)', () => {
  const BRIEFING_ON = JSON.stringify({ ...DEFAULT_NOTIFY, optedIn: true, briefing: { on: true, minutes: 7 * 60 + 30 } });
  const OPTED_IN = JSON.stringify({ ...DEFAULT_NOTIFY, optedIn: true });
  const ready = async (notes = fakeNotes(), kept: string | null = BRIEFING_ON, replies: SyncReply[] = [ok(SERVER)]) => {
    const made = await setup(replies, { notes });
    if (kept !== null) made.kv.set(NOTIFY_KEY, kept);
    await made.local.acknowledge([], [], SERVER, 42);
    await made.store.getState().boot();
    await made.store.getState().checkNotify(); // waits for the plans already on their way
    return { ...made, notes };
  };

  it('plans from the kept settings once the phone allows it, and tells the phone only of changes', async () => {
    const { store, notes } = await ready();
    expect(store.getState().notify.briefing.on).toBe(true);
    expect(store.getState().planned[0]!.id).toBe('briefing:2'); // day 1 (20:00 to 04:00) has no 07:30: day 2's is first
    expect(notes.replace).toHaveBeenLastCalledWith(store.getState().planned);
    const told = notes.replace.mock.calls.length;
    await store.getState().checkNotify();
    expect(notes.replace).toHaveBeenCalledTimes(told);
  });

  it('plans nothing, and clears the phone, while notifications are not allowed', async () => {
    const { store, notes } = await ready(fakeNotes('ask'));
    expect(store.getState()).toMatchObject({ permission: 'ask', planned: [] });
    expect(notes.replace).toHaveBeenLastCalledWith([]);
  });

  it("leaves the phone alone while it can't say whether they are allowed", async () => {
    const notes = fakeNotes();
    notes.permission.mockRejectedValue(new Error('no module'));
    const { store } = await ready(notes);
    expect(store.getState().permission).toBe('unknown');
    expect(notes.replace).not.toHaveBeenCalled();
  });

  it('plans nothing before the player turned one on, even with the phone allowing them (Android 12 and older)', async () => {
    const { store, notes } = await ready(fakeNotes(), null);
    const side = SERVER.today!.quests.find((q) => q.slot === 'side1')!;
    await store.getState().saveTimer(side.id, { segments: [], runningSince: NOW });
    await store.getState().checkNotify();
    expect(store.getState().planned).toEqual([]);
    expect(notes.replace).toHaveBeenLastCalledWith([]);
  });

  it('adds a running timer, and drops it when the timer is paused', async () => {
    const { store } = await ready(fakeNotes(), OPTED_IN); // timer alerts are on by default
    const side = SERVER.today!.quests.find((q) => q.slot === 'side1')!;
    await store.getState().saveTimer(side.id, { segments: [], runningSince: NOW });
    await store.getState().checkNotify();
    expect(store.getState().planned.map((n) => n.id)).toEqual([`timer:${side.id}`]);
    await store.getState().saveTimer(side.id, { segments: [{ start: NOW, end: NOW + 1_000 }], runningSince: null });
    await store.getState().checkNotify();
    expect(store.getState().planned).toEqual([]);
  });

  it("drops today's evening reminder once the core quest is cleared", async () => {
    // Day 1 runs from 20:00 to 04:00 in Manila and NOW is 21:00: a 22:00 reminder is still ahead.
    const evening = JSON.stringify({ ...DEFAULT_NOTIFY, optedIn: true, evening: { on: true, minutes: 22 * 60 } });
    // Offline after the completion: the phone's own projection drops it, not the server's answer (review).
    const { store } = await ready(fakeNotes(), evening, [ok(SERVER), { ok: false, status: 0, code: 'network' }]);
    expect(store.getState().planned.map((n) => n.id)).toEqual(['evening:1', 'evening:2']);
    await store.getState().enqueue(completeCore);
    await store.getState().checkNotify();
    expect(store.getState().planned.map((n) => n.id)).toEqual(['evening:2']);
  });

  it('keeps a change on the phone and plans with it', async () => {
    const { store, kv, notes } = await ready(fakeNotes(), null);
    await store.getState().setNotify({ ...DEFAULT_NOTIFY, optedIn: true, briefing: { on: true, minutes: 8 * 60 } });
    expect(JSON.parse(kv.get(NOTIFY_KEY)!)).toMatchObject({ briefing: { on: true, minutes: 480 } });
    expect(notes.replace).toHaveBeenLastCalledWith(store.getState().planned);
    expect(store.getState().planned[0]!.id).toBe('briefing:2');
  });

  it("asks the phone only when told to, and plans with the answer", async () => {
    const notes = fakeNotes('ask');
    const { store } = await ready(notes);
    expect(notes.ask).not.toHaveBeenCalled();
    expect(await store.getState().allowNotify()).toBe('granted');
    expect(store.getState().permission).toBe('granted');
    expect(store.getState().planned.length).toBeGreaterThan(0);
  });

  it('coming back to the app reads the permission again (it may have changed in the phone settings)', async () => {
    const notes = fakeNotes('ask');
    const { store } = await ready(notes);
    notes.permission.mockResolvedValue('granted');
    store.getState().reopen();
    await store.getState().checkNotify();
    expect(store.getState().permission).toBe('granted');
    expect(store.getState().planned.length).toBeGreaterThan(0);
  });

  it('starting over cancels every notification and forgets the settings', async () => {
    const { store, kv, notes } = await ready();
    void store.getState().checkNotify(); // a plan on its way while the player starts over
    await store.getState().startOver();
    await store.getState().checkNotify();
    expect(notes.cancelAll).toHaveBeenCalled();
    expect(notes.replace).toHaveBeenLastCalledWith([]); // nothing of the last player's reaches the phone after the cancel
    expect(kv.has(NOTIFY_KEY)).toBe(false);
    expect(store.getState()).toMatchObject({ notify: DEFAULT_NOTIFY, planned: [] });
  });
});

describe('LevelMeUp Plus in the store (M13)', () => {
  const PLAN = { kind: 'yearly' as const, price: '₱699.00', trialDays: 7, pkg: {} };
  const SUBSCRIBED = serverState([], {}, [{
    source: 'play', product: 'plus_yearly', starts_at: new Date(NOW - 86_400_000), ends_at: new Date(NOW + 30 * 86_400_000), trial: false,
    will_renew: true, manage_url: null, checked_at: new Date(NOW),
  }]);

  it('a look is the phone\'s and stays for the next character; a frame is the character\'s and goes with it', async () => {
    const { store, kv } = await setup([ok(SUBSCRIBED)]);
    await store.getState().boot();
    await store.getState().setTheme('mintNight');
    await store.getState().setFrame('moon');
    expect(store.getState()).toMatchObject({ theme: 'mintNight', look: 'mintNight', frame: 'moon', themeReturn: true });
    expect([kv.get(THEME_KEY), kv.get(FRAME_KEY)]).toEqual(['mintNight', 'moon']);
    await store.getState().startOver();
    expect(store.getState()).toMatchObject({ theme: 'mintNight', frame: 'none' });
    expect(kv.has(FRAME_KEY)).toBe(false);
    store.getState().stop();
  });

  it('without Plus, a picked Plus look is kept for later but the app stays in Moonlight (review)', async () => {
    const { store } = await setup([ok(SERVER)]);
    await store.getState().boot();
    await store.getState().setTheme('systemBlue');
    expect(store.getState()).toMatchObject({ theme: 'systemBlue', look: 'moonlight', themeReturn: false, lookReady: true });
    store.getState().stop();
  });

  it('reads both back at launch, and ignores what it does not know', async () => {
    const { store, kv } = await setup([ok(SERVER)]);
    kv.set(THEME_KEY, 'systemBlue');
    kv.set(FRAME_KEY, 'golden');
    await store.getState().boot();
    expect(store.getState()).toMatchObject({ theme: 'systemBlue', frame: 'none', themeReturn: false });
    store.getState().stop();
  });

  it('a purchase Google Play completes is confirmed by the server before Plus counts', async () => {
    jest.spyOn(purchases, 'buy').mockResolvedValue('bought');
    const { store, api } = await setup([ok(SERVER)]);
    await store.getState().boot();
    expect(await store.getState().buyPlus(PLAN)).toBe('on');
    expect(purchases.buy).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000aa', PLAN);
    expect(api.plus).toHaveBeenCalledTimes(1);
    store.getState().stop();
  });

  it('a cancelled purchase asks the server nothing; one the server can\'t confirm yet says so', async () => {
    const { store, api } = await setup([ok(SERVER)]);
    await store.getState().boot();
    jest.spyOn(purchases, 'buy').mockResolvedValue('cancelled');
    expect(await store.getState().buyPlus(PLAN)).toBe('cancelled');
    expect(api.plus).not.toHaveBeenCalled();
    jest.spyOn(purchases, 'buy').mockResolvedValue('bought');
    api.plus.mockResolvedValueOnce({ ok: false, status: 0, code: 'network' });
    expect(await store.getState().buyPlus(PLAN)).toBe('server_late');
    store.getState().stop();
  });

  it('a restore that finds nothing still lets the server look (a refund ends there too)', async () => {
    jest.spyOn(purchases, 'restore').mockResolvedValue('none');
    const { store, api } = await setup([ok(SERVER)]);
    await store.getState().boot();
    expect(await store.getState().restorePlus()).toBe('none');
    expect(api.plus).toHaveBeenCalledTimes(1);
    store.getState().stop();
  });

  it('at launch, asks the server again only when RevenueCat and the server disagree', async () => {
    jest.spyOn(purchases, 'purchasesSetUp').mockReturnValue(true);
    const says = jest.spyOn(purchases, 'storeSaysPlus').mockResolvedValue(true);
    const agree = await setup([ok(SUBSCRIBED)]);
    await agree.store.getState().boot();
    await settle();
    expect(says).toHaveBeenCalled();
    expect(agree.api.plus).not.toHaveBeenCalled();
    agree.store.getState().stop();

    const differ = await setup([ok(SERVER)]);
    await differ.store.getState().boot();
    await settle();
    expect(differ.api.plus).toHaveBeenCalledTimes(1);
    differ.store.getState().stop();
  });

  it('never reaches RevenueCat while Plus isn\'t set up', async () => {
    const says = jest.spyOn(purchases, 'storeSaysPlus');
    const { store, api } = await setup([ok(SERVER)]);
    await store.getState().boot();
    await settle();
    expect(says).not.toHaveBeenCalled();
    expect(api.plus).not.toHaveBeenCalled();
    store.getState().stop();
  });
});
