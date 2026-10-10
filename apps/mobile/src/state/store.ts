// The game store the screens read (M4 plan, Task 11): the cached server state, the outbox, the notices, what to show,
// and how the last sync went. Every action goes through the outbox first, then a sync is requested.
import { createContext, createElement, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { SessionState } from '../auth/session.ts';
import type { Cached, Local } from '../data/local.ts';
import { project } from '../game/project.ts';
import type { Shown } from '../game/project.ts';
import type { PhoneEvent } from '../game/types.ts';
import type { Api } from '../net/api.ts';
import { syncOnce } from '../sync/engine.ts';
import type { Notice, SyncOutcome } from '../sync/engine.ts';
import { makeScheduler } from '../sync/scheduler.ts';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewEvent = DistributiveOmit<PhoneEvent, 'id'>;

export type GameDeps = {
  local: Local;
  api: Api;
  /** A guest sign-in; a new guest only when `allowNewGuest` (this phone holds no character and nothing unsent). */
  ensureSession: (allowNewGuest: boolean) => Promise<SessionState>;
  sessionAlive: () => Promise<boolean>;
  signOut: () => Promise<void>;
  timeZone: () => string;
  now: () => number;
  newId: () => string;
};

/** `loading`: nothing cached yet; `not_started`: signed in, but no character. */
export type Phase = 'loading' | 'ready' | 'not_started';
export type Status = 'idle' | 'syncing' | 'offline' | 'retrying';

export const NO_SESSION_TEXT =
  "This phone can't read its guest sign-in right now. Your progress stays here, and LevelMeUp keeps trying.";

export type GameState = {
  phase: Phase;
  cached: Cached | null;
  pending: PhoneEvent[];
  view: Shown | null;
  status: Status;
  lastSyncedAt: number | null;
  notices: Notice[];
  /** Shown on Settings: a sync the server refused as malformed (a bug), or a sign-in that can't be read. */
  error: string | null;
  boot: () => Promise<void>;
  enqueue: (event: NewEvent) => Promise<void>;
  syncNow: () => Promise<void>;
  startTestCharacter: (choices: unknown) => Promise<{ ok: true; source: 'claude' | 'template' } | { ok: false; code: string }>;
  deleteTestCharacter: () => Promise<{ ok: true } | { ok: false; code: string }>;
  /** Development builds: forget this phone's character and sign-in and start as a new guest. */
  startOver: () => Promise<void>;
  dismissNotice: (eventId: string) => Promise<void>;
  stop: () => void;
};

/** A sync shortly after today ends, so the next day appears while the app is open. */
const DAY_END_GRACE_MS = 2_000;
const MAX_TIMER_MS = 2_147_483_647;

export function createGameStore(deps: GameDeps): StoreApi<GameState> {
  return createStore<GameState>()((set, get) => {
    let dayEnd: ReturnType<typeof setTimeout> | null = null;

    const watchDayEnd = (view: Shown | null): void => {
      if (dayEnd !== null) clearTimeout(dayEnd);
      dayEnd = null;
      const endsAt = view?.today?.endsAt;
      if (endsAt === undefined || endsAt === null) return;
      const wait = Date.parse(endsAt) - deps.now() + DAY_END_GRACE_MS;
      if (wait > 0 && wait < MAX_TIMER_MS) dayEnd = setTimeout(() => void scheduler.request(), wait);
    };

    /** Reloads what the phone holds (one consistent read) and recomputes what to show. */
    const refresh = async (patch: Partial<GameState> = {}): Promise<void> => {
      const { cached, pending, notices } = await deps.local.snapshot();
      const view = cached === null ? null : project(cached.state, pending);
      set({ ...patch, cached, pending, notices, view, lastSyncedAt: cached?.syncedAt ?? null });
      watchDayEnd(view);
    };

    /** Each run gets a number; a run the scheduler gave up on (its deadline passed) may not write when it wakes up. */
    let generation = 0;

    const run = async (): Promise<SyncOutcome> => {
      const mine = ++generation;
      set({ status: 'syncing' });
      const held = await deps.local.snapshot();
      const session = await deps.ensureSession(held.cached === null && held.pending.length === 0);
      if (session === 'offline') return { kind: 'offline' };
      if (session === 'no_session') return { kind: 'retry', code: 'no_session' };
      const local = {
        pending: deps.local.pending,
        acknowledge: async (...args: Parameters<Local['acknowledge']>) => {
          if (mine !== generation) throw new Error('abandoned'); // a newer run owns the cache now; resending is safe
          return deps.local.acknowledge(...args);
        },
      };
      return syncOnce({ local, api: deps.api, timeZone: deps.timeZone, now: deps.now, sessionAlive: deps.sessionAlive });
    };

    /** Forgets this phone's data and sign-in; the next sync starts a new guest. */
    const forget = async (): Promise<void> => {
      await deps.local.wipe();
      await deps.signOut();
      await refresh({ phase: 'loading', status: 'idle', error: null });
    };

    const handle = async (outcome: SyncOutcome): Promise<void> => {
      switch (outcome.kind) {
        case 'synced':
          await refresh({ phase: 'ready', status: 'idle', error: null });
          return;
        case 'not_started':
          // A new guest is only made on an empty phone, so this is the same sign-in: its character is gone on the
          // server, and anything cached is stale.
          await deps.local.wipe();
          await refresh({ phase: 'not_started', status: 'idle', error: null });
          return;
        case 'session_ended':
          // Auth confirmed the sign-in is gone: start over as a new guest.
          await forget();
          void scheduler.request();
          return;
        case 'offline':
          set({ status: 'offline' });
          return;
        case 'retry':
          set({ status: 'retrying', error: outcome.code === 'no_session' ? NO_SESSION_TEXT : get().error });
          return;
        case 'failed':
          set({ status: 'idle', error: `The server refused a sync (${outcome.status} ${outcome.code}).` });
      }
    };

    const scheduler = makeScheduler(run, handle);

    return {
      phase: 'loading',
      cached: null,
      pending: [],
      view: null,
      status: 'idle',
      lastSyncedAt: null,
      notices: [],
      error: null,

      boot: async () => {
        await refresh();
        set({ phase: get().cached === null ? 'loading' : 'ready' });
        await scheduler.request();
      },

      enqueue: async (event) => {
        await deps.local.enqueue({ ...event, id: deps.newId() } as PhoneEvent, deps.now());
        await refresh();
        void scheduler.request();
      },

      syncNow: () => scheduler.request(),

      startTestCharacter: (choices) =>
        scheduler.exclusive(async () => {
          const signedIn = await deps.ensureSession(get().cached === null && get().pending.length === 0);
          if (signedIn !== 'signed_in') return { ok: false as const, code: signedIn === 'offline' ? 'network' : 'no_session' };
          const started = await deps.api.onboarding(choices);
          if (!started.ok) return { ok: false as const, code: started.code };
          await deps.local.acknowledge([], [], started.body.state, deps.now());
          await refresh({ phase: 'ready', status: 'idle' });
          return { ok: true as const, source: started.body.reveal.source };
        }),

      deleteTestCharacter: async () => {
        const result = await scheduler.exclusive(async () => {
          const deleted = await deps.api.deleteAccount();
          if (!deleted.ok) return { ok: false as const, code: deleted.code };
          await forget();
          return { ok: true as const };
        });
        if (result.ok) await scheduler.request();
        return result;
      },

      startOver: async () => {
        await scheduler.exclusive(forget);
        await scheduler.request();
      },

      dismissNotice: async (eventId) => {
        await deps.local.dismissNotice(eventId);
        await refresh();
      },

      stop: () => {
        scheduler.stop();
        if (dayEnd !== null) clearTimeout(dayEnd);
      },
    };
  });
}

const GameContext = createContext<StoreApi<GameState> | null>(null);

export function GameProvider({ store, children }: { store: StoreApi<GameState>; children: ReactNode }) {
  return createElement(GameContext.Provider, { value: store }, children);
}

export function useGame<T>(selector: (state: GameState) => T): T {
  const store = useContext(GameContext);
  if (store === null) throw new Error('useGame needs a GameProvider');
  return useStore(store, selector);
}
