// The game store the screens read (M4 plan, Task 11): the cached server state, the outbox, the notices, what to show,
// how the last sync went, and the onboarding (M5): the interview's draft, the reveal and the account. Every action goes
// through the outbox first, then a sync is requested.
// M6a adds the celebration queue, the quest-art manifest and the quest timers.
// M6b: adjustments go through the same outbox; a quest replaced by a swap, gentle movement or an ability loses its stored
// timer.
// M6e: when today has ended and the server can't be reached, the store builds the next day (`offlineDay`) and queues it;
// events on its quests name them by day and slot; their timers move to the server's quests.
import { createContext, createElement, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { parseArtManifest } from '../art/manifest.ts';
import type { ArtManifest } from '../art/manifest.ts';
import type { Account, GoogleProblem, GoogleResult } from '../auth/google.ts';
import type { SessionState } from '../auth/session.ts';
import type { Blobs } from '../auth/sessionStorage.ts';
import type { Cached, Local } from '../data/local.ts';
import { carriedTimers, withRef } from '../game/offline.ts';
import { offlineDay, offlineView } from '../game/offlineDay.ts';
import { project } from '../game/project.ts';
import type { Shown } from '../game/project.ts';
import type { PhoneEvent, Reveal } from '../game/types.ts';
import type { Api } from '../net/api.ts';
import { NEW_DRAFT, complete, persistable, restoreDraft, stepsFor, toRequest } from '../onboarding/flow.ts';
import type { Draft } from '../onboarding/flow.ts';
import { parseTimers } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
import { syncOnce } from '../sync/engine.ts';
import type { Notice, SyncOutcome } from '../sync/engine.ts';
import { makeScheduler } from '../sync/scheduler.ts';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewEvent = DistributiveOmit<PhoneEvent, 'id'>;

export type GameDeps = {
  local: Local;
  api: Api;
  /** A guest sign-in; a new guest only when `allowNewGuest()` says so at that moment: the onboarding's analysis, on an empty phone. */
  ensureSession: (allowNewGuest: () => boolean) => Promise<SessionState>;
  sessionAlive: () => Promise<boolean>;
  signOut: () => Promise<void>;
  timeZone: () => string;
  now: () => number;
  newId: () => string;
  /** Small values kept on the phone: the interview's draft and the vow (expo-sqlite's key-value store). */
  kv: Blobs;
  /** Who is signed in, read from the stored session. */
  account: () => Promise<Account>;
  google: { link: () => Promise<GoogleResult>; signIn: () => Promise<GoogleResult> };
  /** The quest-art manifest from the art bucket (M6a); whatever arrives is checked, null when it can't be fetched. */
  artManifest: () => Promise<unknown>;
};

/** `loading`: nothing cached yet; `not_started`: signed in, but no character. */
export type Phase = 'loading' | 'ready' | 'not_started';
export type Status = 'idle' | 'syncing' | 'offline' | 'retrying';

export const SIGN_IN_LOST_TEXT =
  "This phone lost its guest sign-in, so the System can't reach your character any more. You can start again as a new " +
  "guest; the progress kept on this phone can't be recovered.";

export const DRAFT_KEY = 'lmu.onboarding-draft';
export const VOW_KEY = 'lmu.vow';
export const TIMERS_KEY = 'lmu.timers';
export const ART_KEY = 'lmu.art-manifest';
export const TRAINING_NOTICE_KEY = 'lmu.training-notice';
/** M7a: the last check-in result the player dismissed (decision 10). */
export const CHECKIN_RESULT_KEY = 'lmu.checkin-result';

/** A level-up or a new achievement, confirmed by the server (M6a decision 8). */
export type Celebration = { kind: 'level'; level: number } | { kind: 'achievement'; id: string };

export type StartResult = { ok: true } | { ok: false; code: string };
/** `found: 'unknown'`: signed in, but the sync that would find the character didn't finish (no connection). */
export type RestoreResult = { ok: true; found: boolean | 'unknown' } | { ok: false; code: GoogleProblem };

export type GameState = {
  phase: Phase;
  cached: Cached | null;
  pending: PhoneEvent[];
  view: Shown | null;
  status: Status;
  lastSyncedAt: number | null;
  notices: Notice[];
  /** The phone holds data but its guest sign-in is gone for good: only the player can choose to start again. */
  signInLost: boolean;
  /** Shown on Settings: a sync the server refused as malformed (a bug). */
  error: string | null;
  /** The interview so far (M5). */
  draft: Draft;
  /** The words of the reveal the last analysis returned. */
  reveal: Reveal | null;
  account: Account;
  /** Level-ups and achievements the server confirmed, shown one at a time. */
  celebrations: Celebration[];
  /** Which quest pictures exist online. */
  art: ArtManifest | null;
  /** The vow sworn in onboarding, kept on the phone (M5 owner decision 3); shown on Character (M6d). */
  vow: string | null;
  /** The one-time "set up your training" note has been shown and dismissed (M6d decision 13). */
  trainingNoticeSeen: boolean;
  /** M7a: the check-in put off with "Later": hidden until the app is next opened (decision 10). */
  checkinLater: number | null;
  /** M7a: the last check-in result the player dismissed (kept on the phone). */
  checkinResultSeen: number | null;
  boot: () => Promise<void>;
  enqueue: (event: NewEvent) => Promise<void>;
  syncNow: () => Promise<void>;
  editDraft: (patch: Partial<Draft>) => void;
  /** The analysis: makes the character from the draft, or makes it again (redo) when this phone already holds one. */
  startCharacter: () => Promise<StartResult>;
  /** Leaving the onboarding: the draft is forgotten. */
  finishOnboarding: () => Promise<void>;
  /** The vow stays on the phone (owner decision 3, 2026-10-11); Character shows it (M6d). */
  saveVow: (text: string) => Promise<void>;
  dismissTrainingNotice: () => Promise<void>;
  answerLater: (checkinId: number) => void;
  /** The app came back to the foreground: a check-in put off with "Later" shows again. */
  reopen: () => void;
  dismissCheckinResult: (checkinId: number) => Promise<void>;
  saveWithGoogle: () => Promise<GoogleResult>;
  /** "Saved a character before?": only on a phone that holds none. */
  signInWithGoogle: () => Promise<RestoreResult>;
  deleteTestCharacter: () => Promise<{ ok: true } | { ok: false; code: string }>;
  /** Forget this phone's character and sign-in and start as a new guest (after the player confirms). */
  startOver: () => Promise<void>;
  dismissNotice: (eventId: string) => Promise<void>;
  dismissCelebration: () => void;
  /** A quest's stored timer, or null. */
  timer: (questId: number) => Promise<TimerState | null>;
  /** Stores a quest's timer (null forgets it); timers of quests no longer today's are dropped. */
  saveTimer: (questId: number, state: TimerState | null) => Promise<void>;
  stop: () => void;
};

/** A sync shortly after today ends, so the next day appears while the app is open. */
const DAY_END_GRACE_MS = 2_000;
const MAX_TIMER_MS = 2_147_483_647;

const readVow = (text: string | null): string | null => (text === null || text.trim() === '' ? null : text);
const readSeen = (text: string | null): number | null => {
  const n = Number(text);
  return text !== null && Number.isSafeInteger(n) ? n : null;
};

function readKeptArt(text: string | null): ArtManifest | null {
  if (text === null) return null;
  try {
    return parseArtManifest(JSON.parse(text));
  } catch {
    return null;
  }
}

/** The quest a new event replaces with another (M6b): its stored timer belongs to the old quest. */
function replacedQuest(event: NewEvent, view: Shown | null): number | null {
  if (event.type === 'swap') return event.instanceId;
  if (event.type === 'pain' && event.choice === 'gentle') return event.instanceId;
  if (event.type === 'ability') return view?.today?.quests.find((q) => q.slot === 'core')?.id ?? null;
  return null;
}

export function createGameStore(deps: GameDeps): StoreApi<GameState> {
  return createStore<GameState>()((set, get) => {
    let dayEnd: ReturnType<typeof setTimeout> | null = null;
    /** After stop(), a refresh still finishing must not arm a new day-end timer (it kept test runs alive). */
    let stopped = false;

    const watchDayEnd = (view: Shown | null): void => {
      if (dayEnd !== null) clearTimeout(dayEnd);
      dayEnd = null;
      if (stopped) return;
      const endsAt = view?.today?.endsAt;
      if (endsAt === undefined || endsAt === null) return;
      const wait = Date.parse(endsAt) - deps.now() + DAY_END_GRACE_MS;
      if (wait > 0 && wait < MAX_TIMER_MS) dayEnd = setTimeout(() => void scheduler.request(), wait);
    };

    /** Reloads what the phone holds (one consistent read) and recomputes what to show. */
    const refresh = async (patch: Partial<GameState> = {}): Promise<void> => {
      const before = get().view;
      const { cached, pending, notices } = await deps.local.snapshot();
      const view = cached === null ? null : project(cached.state, pending);
      set({ ...patch, cached, pending, notices, view, lastSyncedAt: cached?.syncedAt ?? null });
      watchDayEnd(view);
      // M6e: the server's state has the offline day now, whatever refreshed first (review): its timers move along.
      if (before?.offline === true && view?.offline !== true) void moveTimers(before);
    };

    /**
     * M6e: the day on screen has ended and the server can't be reached: build the next one here and queue it. No new sync
     * is asked for; the scheduler's back-off keeps trying (decision 10).
     */
    const buildOffline = async (): Promise<void> => {
      const { cached, pending } = get();
      if (cached === null) return;
      const event = offlineDay(cached.state, offlineView(cached.state, pending), deps.now(), deps.timeZone());
      if (event === null) return;
      await deps.local.enqueue({ ...event, id: deps.newId() }, deps.now());
      await refresh();
    };

    /**
     * Each run gets a number, and every exclusive section moves it on: a run the scheduler gave up on (its deadline
     * passed) may not write, or make a guest, when it wakes up (M4 re-review).
     */
    let generation = 0;

    /** The art manifest is fetched once per launch, after the first sync (or a new player's onboarding). */
    let artChecked = false;
    const checkArt = (): void => {
      if (artChecked) return;
      artChecked = true;
      void refreshArt();
    };
    const refreshArt = async (): Promise<void> => {
      const manifest = parseArtManifest(await deps.artManifest().catch(() => null));
      if (manifest === null) return;
      set({ art: manifest });
      await deps.kv.setItem(ART_KEY, JSON.stringify(manifest)).catch(() => {});
    };

    /**
     * The level of the last state a sync confirmed. Not the cached state: anything that reloads the screen while a sync
     * finishes reads the new state early, and the level-up would be missed.
     */
    let confirmedLevel: number | null = null;

    /** Timer saves run one after another, so a quick start and pause can't overwrite each other's read. */
    let timerWrites: Promise<void> = Promise.resolve();

    /** M6e: a timer running on an offline quest moves to the server's quest in its slot once that day arrives. */
    const moveTimers = (before: Shown | null): Promise<void> => {
      const write = async (): Promise<void> => {
        const next = carriedTimers(parseTimers(await deps.kv.getItem(TIMERS_KEY).catch(() => null)), before, get().view);
        if (next !== null) await deps.kv.setItem(TIMERS_KEY, JSON.stringify(next));
      };
      const done = timerWrites.then(write);
      timerWrites = done.catch(() => {});
      return done;
    };

    const run = async (): Promise<SyncOutcome> => {
      const mine = ++generation;
      set({ status: 'syncing' });
      const held = await deps.local.snapshot();
      const empty = held.cached === null && held.pending.length === 0;
      // A sync never makes a guest (M5, decision 10): an empty phone without a sign-in is a new player.
      const session = await deps.ensureSession(() => false);
      if (session === 'offline') return { kind: 'offline' };
      if (session === 'no_session') return empty ? { kind: 'fresh' } : { kind: 'sign_in_lost' };
      const local = {
        pending: deps.local.pending,
        acknowledge: async (...args: Parameters<Local['acknowledge']>) => {
          if (mine !== generation) throw new Error('abandoned'); // a newer run owns the cache now; resending is safe
          return deps.local.acknowledge(...args);
        },
      };
      return syncOnce({ local, api: deps.api, timeZone: deps.timeZone, now: deps.now, sessionAlive: deps.sessionAlive });
    };

    /** Forgets this phone's data, sign-in and interview; the onboarding makes the next guest. */
    const forget = async (): Promise<void> => {
      await deps.local.wipe();
      await deps.signOut();
      await deps.kv.removeItem(DRAFT_KEY);
      await deps.kv.removeItem(VOW_KEY); // the next player on this phone never sees it (M5 review)
      await deps.kv.removeItem(TIMERS_KEY);
      await deps.kv.removeItem(TRAINING_NOTICE_KEY);
      await deps.kv.removeItem(CHECKIN_RESULT_KEY);
      confirmedLevel = null;
      set({
        draft: NEW_DRAFT, reveal: null, celebrations: [], vow: null, trainingNoticeSeen: false, checkinResultSeen: null, checkinLater: null,
        account: await deps.account(),
      });
      await refresh({ phase: 'loading', status: 'idle', error: null, signInLost: false });
    };

    /** Exclusive work (no sync in flight) that also shuts out any sync abandoned at its deadline. */
    const fenced = <T,>(fn: () => Promise<T>): Promise<T> =>
      scheduler.exclusive(async () => {
        generation++;
        return fn();
      });

    const handle = async (outcome: SyncOutcome): Promise<void> => {
      switch (outcome.kind) {
        case 'synced': {
          const before = confirmedLevel;
          await refresh({ phase: 'ready', status: 'idle', error: null });
          const after = get().cached?.state.character.level ?? null;
          confirmedLevel = after;
          const found: Celebration[] = [];
          // Only a level the server confirms (M3: an undo can take one back); nothing on a phone's first state.
          if (before !== null && after !== null && after > before) found.push({ kind: 'level', level: after });
          for (const id of outcome.newAchievements) found.push({ kind: 'achievement', id });
          if (found.length > 0) set({ celebrations: [...get().celebrations, ...found] });
          checkArt();
          return;
        }
        case 'not_started':
          // A new guest is only made on an empty phone, so this is the same sign-in: its character is gone on the
          // server, and anything cached is stale.
          await deps.local.wipe();
          confirmedLevel = null;
          await refresh({ phase: 'not_started', status: 'idle', error: null });
          return;
        case 'session_ended':
          // Auth confirmed the sign-in is gone: start over as a new guest.
          await forget();
          void scheduler.request();
          return;
        case 'fresh':
          await refresh({ phase: 'not_started', status: 'idle', error: null });
          return;
        case 'offline':
          set({ status: 'offline' });
          await buildOffline();
          return;
        case 'retry':
          set({ status: 'retrying' });
          await buildOffline();
          return;
        case 'sign_in_lost':
          set({ status: 'idle', signInLost: true });
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
      signInLost: false,
      error: null,
      draft: NEW_DRAFT,
      reveal: null,
      account: { kind: 'none' },
      celebrations: [],
      art: null,
      vow: null,
      trainingNoticeSeen: true, // nothing flashes before boot reads the phone
      checkinLater: null,
      checkinResultSeen: null,

      boot: async () => {
        const [saved, account, keptArt, vowText, notice, seen] = await Promise.all([
          deps.kv.getItem(DRAFT_KEY).catch(() => null),
          deps.account(),
          deps.kv.getItem(ART_KEY).catch(() => null),
          deps.kv.getItem(VOW_KEY).catch(() => null),
          deps.kv.getItem(TRAINING_NOTICE_KEY).catch(() => null),
          deps.kv.getItem(CHECKIN_RESULT_KEY).catch(() => null),
        ]);
        await refresh();
        confirmedLevel = get().cached?.state.character.level ?? null;
        const holding = get().cached !== null;
        // A character already exists, so the onboarding is over: its draft (a name, goals, limits) isn't kept (M5 review).
        if (holding && saved !== null) await deps.kv.removeItem(DRAFT_KEY).catch(() => {});
        set({
          draft: holding ? NEW_DRAFT : restoreDraft(saved), account, phase: holding ? 'ready' : 'loading', art: readKeptArt(keptArt),
          vow: readVow(vowText), trainingNoticeSeen: notice !== null, checkinResultSeen: readSeen(seen), checkinLater: null,
        });
        await scheduler.request();
      },

      enqueue: async (event) => {
        const view = get().view;
        const replaced = replacedQuest(event, view);
        // A quest of the offline day is named by day and slot (M6e decision 7).
        await deps.local.enqueue({ ...withRef(event, view), id: deps.newId() } as PhoneEvent, deps.now());
        if (replaced !== null) await get().saveTimer(replaced, null).catch(() => {});
        await refresh();
        void scheduler.request();
      },

      syncNow: () => scheduler.request(),

      editDraft: (patch) => {
        const draft = { ...get().draft, ...patch };
        set({ draft });
        // A convenience: if it can't be written, a restart asks the questions again; nothing else depends on it.
        void deps.kv.setItem(DRAFT_KEY, persistable(draft)).catch(() => {});
      },

      startCharacter: async () => {
        const result = await fenced(async (): Promise<StartResult> => {
          const draft = get().draft;
          // Never an unfinished interview: an unanswered safety question must not travel as a "no" (M5 review).
          if (!stepsFor(draft).every((step) => complete(draft, step))) return { ok: false, code: 'incomplete' };
          const ask = async (redo: boolean): Promise<StartResult> => {
            const signedIn = await deps.ensureSession(() => !redo && get().cached === null && get().pending.length === 0);
            if (signedIn !== 'signed_in') return { ok: false, code: signedIn === 'offline' ? 'network' : 'no_session' };
            const started = await deps.api.onboarding(toRequest(get().draft, deps.timeZone(), redo));
            if (!started.ok) {
              // Decision 11: the first answer was lost on the way back, so the untouched character is built again. Never
              // over a Google account: its "already started" is a saved character, never rebuilt (M5 review).
              if (!redo && started.code === 'already_started' && get().account.kind !== 'saved') return ask(true);
              return { ok: false, code: started.code };
            }
            await deps.local.acknowledge([], [], started.body.state, deps.now());
            confirmedLevel = started.body.state.character.level; // the server's own first state (review)
            // A new player just answered the Training step: the note for players from before M6c is never theirs (M6d).
            await deps.kv.setItem(TRAINING_NOTICE_KEY, 'seen').catch(() => {});
            await refresh({
              phase: 'ready', status: 'idle', error: null, reveal: started.body.reveal, account: await deps.account(), trainingNoticeSeen: true,
            });
            // A new player's first launch never synced a character, so the quest art is fetched now (M6e device check).
            checkArt();
            return { ok: true };
          };
          const holding = get().cached !== null;
          // Only a character this phone's analysis made may be redone: one that arrived by a sync (a Google restore) is
          // a saved character, never rebuilt by an interview (M5 re-review).
          if (holding && get().reveal === null) return { ok: false, code: 'already_started' };
          return ask(holding);
        });
        // The server already holds this player's character: fetch it, so "Go to Today" finds it (M5 review).
        if (!result.ok && (result.code === 'locked' || result.code === 'already_started')) void scheduler.request();
        return result;
      },

      finishOnboarding: async () => {
        await deps.kv.removeItem(DRAFT_KEY).catch(() => {});
        set({ draft: NEW_DRAFT, reveal: null });
      },

      saveVow: async (text) => {
        const vow = text.trim();
        await deps.kv.setItem(VOW_KEY, vow);
        set({ vow: vow === '' ? null : vow });
      },

      dismissTrainingNotice: async () => {
        set({ trainingNoticeSeen: true });
        await deps.kv.setItem(TRAINING_NOTICE_KEY, 'seen').catch(() => {});
      },

      answerLater: (checkinId) => set({ checkinLater: checkinId }),

      reopen: () => set({ checkinLater: null }),

      dismissCheckinResult: async (checkinId) => {
        set({ checkinResultSeen: checkinId });
        await deps.kv.setItem(CHECKIN_RESULT_KEY, String(checkinId)).catch(() => {});
      },

      saveWithGoogle: async () => {
        const result = await deps.google.link();
        set({ account: await deps.account() });
        return result;
      },

      signInWithGoogle: async () => {
        const result = await fenced(
          async (): Promise<GoogleResult> =>
            get().cached !== null || get().pending.length > 0 ? { ok: false, code: 'failed' } : deps.google.signIn(),
        );
        set({ account: await deps.account() });
        if (!result.ok) return result;
        await scheduler.request();
        const { phase, status, error } = get();
        if (phase === 'ready') return { ok: true, found: true };
        // Only a sync that finished can say there is no character (M5 review).
        return { ok: true, found: phase === 'not_started' && status === 'idle' && error === null ? false : 'unknown' };
      },

      deleteTestCharacter: async () => {
        const result = await fenced(async () => {
          const deleted = await deps.api.deleteAccount();
          if (!deleted.ok) return { ok: false as const, code: deleted.code };
          await forget();
          return { ok: true as const };
        });
        if (result.ok) await scheduler.request();
        return result;
      },

      startOver: async () => {
        await fenced(forget);
        await scheduler.request();
      },

      dismissNotice: async (eventId) => {
        await deps.local.dismissNotice(eventId);
        await refresh();
      },

      dismissCelebration: () => set({ celebrations: get().celebrations.slice(1) }),

      // After the saves on their way, so a pause still being written isn't read stale (review).
      timer: (questId) =>
        timerWrites.then(async () => parseTimers(await deps.kv.getItem(TIMERS_KEY).catch(() => null))[questId] ?? null),

      saveTimer: (questId, state) => {
        const write = async (): Promise<void> => {
          const today = new Set((get().view?.today?.quests ?? []).map((q) => q.id));
          const kept: Record<number, TimerState> = Object.fromEntries(
            Object.entries(parseTimers(await deps.kv.getItem(TIMERS_KEY).catch(() => null)))
              .filter(([id]) => today.has(Number(id)) && Number(id) !== questId),
          );
          if (state !== null) kept[questId] = state;
          await deps.kv.setItem(TIMERS_KEY, JSON.stringify(kept));
        };
        const next = timerWrites.then(write);
        timerWrites = next.catch(() => {}); // a failed save doesn't hold up the next one
        return next;
      },

      stop: () => {
        stopped = true;
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
