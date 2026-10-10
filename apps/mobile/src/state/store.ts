// The game store the screens read (M4 plan, Task 11): the cached server state, the outbox, what to show, and how the
// last sync went. Every action goes through the outbox first, then a sync is requested.
import { createContext, createElement, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
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
  /** Signs in as a guest when there's no session; false when that failed (offline). */
  ensureSession: () => Promise<boolean>;
  sessionAlive: () => Promise<boolean>;
  signOut: () => Promise<void>;
  timeZone: () => string;
  now: () => number;
  newId: () => string;
};

/** `loading`: nothing cached yet; `not_started`: signed in, but no character. */
export type Phase = 'loading' | 'ready' | 'not_started';
export type Status = 'idle' | 'syncing' | 'offline' | 'retrying';

export type GameState = {
  phase: Phase;
  cached: Cached | null;
  pending: PhoneEvent[];
  view: Shown | null;
  status: Status;
  lastSyncedAt: number | null;
  notices: Notice[];
  /** A sync the server refused as malformed (a bug): shown on Settings, nothing dropped. */
  error: string | null;
  boot: () => Promise<void>;
  enqueue: (event: NewEvent) => Promise<void>;
  syncNow: () => Promise<void>;
  startTestCharacter: (choices: unknown) => Promise<{ ok: true; source: 'claude' | 'template' } | { ok: false; code: string }>;
  deleteTestCharacter: () => Promise<{ ok: true } | { ok: false; code: string }>;
  dismissNotice: (eventId: string) => void;
  stop: () => void;
};

const OUTBOX_VIEW_LIMIT = 1000;

export function createGameStore(deps: GameDeps): StoreApi<GameState> {
  const store = createStore<GameState>()((set, get) => {
    /** Reloads what the phone holds and recomputes what to show. */
    const refresh = async (patch: Partial<GameState> = {}): Promise<void> => {
      const cached = await deps.local.load();
      const pending = await deps.local.pending(OUTBOX_VIEW_LIMIT);
      set({ ...patch, cached, pending, view: cached === null ? null : project(cached.state, pending), lastSyncedAt: cached?.syncedAt ?? null });
    };

    const run = async (): Promise<SyncOutcome> => {
      set({ status: 'syncing' });
      if (!(await deps.ensureSession())) return { kind: 'offline' };
      return syncOnce({ local: deps.local, api: deps.api, timeZone: deps.timeZone, now: deps.now, sessionAlive: deps.sessionAlive });
    };

    const handle = async (outcome: SyncOutcome): Promise<void> => {
      switch (outcome.kind) {
        case 'synced':
          await refresh({ phase: 'ready', status: 'idle', error: null, notices: [...get().notices, ...outcome.notices] });
          return;
        case 'not_started':
          // The server has no character for this sign-in, so anything cached is stale.
          await deps.local.wipe();
          await refresh({ phase: 'not_started', status: 'idle' });
          return;
        case 'session_ended':
          // Auth confirmed the sign-in is gone: start over as a new guest.
          await deps.local.wipe();
          await deps.signOut();
          await refresh({ phase: 'loading', status: 'idle', notices: [] });
          void scheduler.request();
          return;
        case 'offline':
          set({ status: 'offline' });
          return;
        case 'retry':
          set({ status: 'retrying' });
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

      startTestCharacter: async (choices) => {
        if (!(await deps.ensureSession())) return { ok: false, code: 'network' };
        const started = await deps.api.onboarding(choices);
        if (!started.ok) return { ok: false, code: started.code };
        await deps.local.acknowledge([], started.body.state, deps.now());
        await refresh({ phase: 'ready', status: 'idle' });
        return { ok: true, source: started.body.reveal.source };
      },

      deleteTestCharacter: async () => {
        const deleted = await deps.api.deleteAccount();
        if (!deleted.ok) return { ok: false, code: deleted.code };
        await deps.local.wipe();
        await deps.signOut();
        await refresh({ phase: 'loading', status: 'idle', notices: [] });
        await scheduler.request();
        return { ok: true };
      },

      dismissNotice: (eventId) => set({ notices: get().notices.filter((n) => n.eventId !== eventId) }),

      stop: () => scheduler.stop(),
    };
  });
  return store;
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
