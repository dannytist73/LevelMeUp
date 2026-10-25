// The game store the screens read (M4 plan, Task 11): the cached server state, the outbox, the notices, what to show,
// how the last sync went, and the onboarding (M5): the interview's draft, the reveal and the account. Every action goes
// through the outbox first, then a sync is requested.
// M6a adds the celebration queue, the quest-art manifest (gone in Monster Week) and the quest timers.
// M6b: adjustments go through the same outbox; a quest replaced by a swap, gentle movement or an ability loses its stored
// timer.
// M6e: when today has ended and the server can't be reached, the store builds the next day (`nextOfflineDay`) and queues it;
// events on its quests name them by day and slot; their timers move to the server's quests.
// M7c: the Shadow's scene shown once and the Trial's minutes are kept on the phone; a pact signed on the reveal goes when
// the onboarding ends.
// M7d: the notifications: their settings kept on the phone, the permission, and a plan made again after every change.
import { createContext, createElement, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { Account, GoogleProblem, GoogleResult } from '../auth/google.ts';
import type { SessionState } from '../auth/session.ts';
import type { Blobs } from '../auth/sessionStorage.ts';
import type { Cached, Local } from '../data/local.ts';
import { carriedTimers, withRef } from '../game/offline.ts';
import { nextOfflineDay } from '../game/offlineDay.ts';
import { project } from '../game/project.ts';
import type { Shown } from '../game/project.ts';
import type { ArticleBody, PhoneEvent, Reveal, ServerState } from '../game/types.ts';
import type { Api } from '../net/api.ts';
import { makeApplier } from '../notify/apply.ts';
import { setLiveAllowed, syncLive } from '../notify/live.ts';
import { planInput, planLive, planNotes } from '../notify/plan.ts';
import { DEFAULT_NOTIFY, NOTIFY_KEY, readNotify } from '../notify/settings.ts';
import type { NoteOs, NotifySettings, Permission, PlannedNote } from '../notify/types.ts';
import { NEW_DRAFT, complete, persistable, restoreDraft, stepsFor, toRequest } from '../onboarding/flow.ts';
import { buy, forgetPurchases, purchasesSetUp, restore, shop, storeSaysPlus } from '../plus/purchases.ts';
import type { Plan, Shop } from '../plus/purchases.ts';
import { asFrame, plusOf, shownTheme } from '../plus/plus.ts';
import type { FrameName } from '../plus/plus.ts';
import { FREE_THEME, asTheme } from '../theme/palettes.ts';
import type { ThemeName } from '../theme/palettes.ts';
import type { Draft } from '../onboarding/flow.ts';
import { readLastSets } from '../quest/lastSets.ts';
import { readCodex, toggled } from '../reading/codex.ts';
import { hasStoryDeck } from '../reading/deck.ts';
import type { CodexEntry } from '../reading/codex.ts';
import type { LastSets } from '../quest/lastSets.ts';
import { parseTimers } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
import { syncOnce } from '../sync/engine.ts';
import type { Notice, SyncOutcome } from '../sync/engine.ts';
import { makeScheduler } from '../sync/scheduler.ts';
import { setBuzzing } from '../ui/haptics.ts';
import { setSounding } from '../ui/sound.ts';
import { DRAFTS_KEY, forgetDrafts, startDrafts } from './drafts.ts';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewEvent = DistributiveOmit<PhoneEvent, 'id'>;

export type GameDeps = {
  local: Local;
  api: Api;
  /** A guest sign-in; a new guest only when `allowNewGuest()` says so at that moment: the onboarding's analysis, on an empty phone. */
  ensureSession: (allowNewGuest: () => boolean) => Promise<SessionState>;
  sessionAlive: () => Promise<boolean>;
  /** M17: each sync round's time, in development builds (the app's store passes Metro's log). */
  syncLog?: (line: string) => void;
  signOut: () => Promise<void>;
  timeZone: () => string;
  now: () => number;
  newId: () => string;
  /** Small values kept on the phone: the interview's draft and the vow (expo-sqlite's key-value store). */
  kv: Blobs;
  /** Who is signed in, read from the stored session. */
  account: () => Promise<Account>;
  google: { link: () => Promise<GoogleResult>; signIn: () => Promise<GoogleResult> };
  /** M7d: the phone's notifications (`src/notify/os.ts`); the store's only way to them. */
  notes: NoteOs;
  /** M13: the signed-in player's id (RevenueCat's customer id for them), or null without a sign-in. */
  playerId: () => Promise<string | null>;
};

/** `loading`: nothing cached yet; `not_started`: signed in, but no character. */
export type Phase = 'loading' | 'ready' | 'not_started';
export type Status = 'idle' | 'syncing' | 'offline' | 'retrying';

export const DRAFT_KEY = 'lmu.onboarding-draft';
export const VOW_KEY = 'lmu.vow';
export const TIMERS_KEY = 'lmu.timers';
export const TRAINING_NOTICE_KEY = 'lmu.training-notice';
/** M7a: the last check-in result the player dismissed (decision 10). */
export const CHECKIN_RESULT_KEY = 'lmu.checkin-result';
/** M7c: the last check-in whose Shadow scene was shown (decision 5). */
export const SHADOW_KEY = 'lmu.shadow-seen';
/** M7c: the Trial's focus minutes so far, for one check-in (decision 7). */
export const TRIAL_KEY = 'lmu.trial';
/** M9a: the portrait's figure the player chose (decision 5). Monster Week: no longer kept; cleared with the character,
 * so an older install's choice goes too. */
export const PORTRAIT_KEY = 'lmu.portrait';
/** M10b: the Haptics switch, kept as 'on' or 'off' (spec decision 4); anything else, or nothing, counts as on. */
export const HAPTICS_KEY = 'lmu.haptics';
/** M12: the Sounds switch, kept as 'on' or 'off'; anything else, or nothing, counts as on. Like Haptics, the phone's. */
export const SOUNDS_KEY = 'lmu.sounds';
/** M10c decision 7: each exercise's and rep-log quest's last logged sets, kept on this phone. */
export const LAST_SETS_KEY = 'lmu.lastSets';
/** M11 decision 7: the lessons kept from the Story Decks, on this phone. */
export const CODEX_KEY = 'lmu.codex';
/** M12 decisions 8–9: the one-time offers already shown (the reminder, the set-up cards), as a JSON list of names. */
export const OFFERS_KEY = 'lmu.offers';
/** M13: the look picked (a Plus theme shows only while Plus is on). The phone's, like Haptics: it stays for the next character. */
export const THEME_KEY = 'lmu.theme';
/** M13: the portrait frame picked: the character's, so it goes with it. */
export const FRAME_KEY = 'lmu.frame';

/**
 * M13: what a purchase or a restore came to. `on`: the server confirmed Plus. `server_late`: Google Play took it but the
 * System couldn't confirm yet (it asks again at the next launch). `none`: a restore found nothing.
 */
export type PlusOutcome = 'on' | 'pending' | 'cancelled' | 'none' | 'failed' | 'not_set_up' | 'server_late' | 'owned';

/**
 * The one-time offers (M12): each shows once, then lives in Settings. `setup` marks a character that onboarded after M12,
 * so only it gets the set-up cards of days 1 to 3 (an older character answered them in its onboarding).
 */
export type Offer =
  | 'reminder' | 'setup' | `setup:${'save' | 'voice' | 'gear' | 'slip' | 'vow'}` | 'live-timer' | `plus:${'intro' | 'day7' | 'trial'}`
  /** M16: the weekly program's one-time offer. */
  | 'program'
  /** M17: the week's recap, shown, for the week starting that Monday. */
  | `week:${string}`
  /** Monster Week: the one-time card that explains it, and the latest decided battle's moment (game/battle.ts resultKey). */
  | 'monster:intro' | `battle:${string}`;

const readOffers = (text: string | null): Offer[] => {
  try {
    const value: unknown = text === null ? [] : JSON.parse(text);
    return Array.isArray(value) ? value.filter((v): v is Offer => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

/** A level-up or a new achievement, confirmed by the server (M6a decision 8). */
/** A level-up carries the level it came from: one sync can cross more than one (the portrait's tier, M9a review). */
export type Celebration = { kind: 'level'; level: number; from: number } | { kind: 'achievement'; id: string };

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
  /** M8b: the articles this phone holds, by id (today's, the next day's, the readings'). */
  articles: Readonly<Record<string, ArticleBody>>;
  /** M8b: asks the next sync for an article this phone doesn't hold (a past reading, decision 7), and syncs. */
  fetchArticle: (id: string) => void;
  /** The phone holds data but its guest sign-in is gone for good: only the player can choose to start again. */
  signInLost: boolean;
  /** M9b decision 5: the server asked this app to update; Today and Settings say so, and nothing is dropped. */
  updateRequired: boolean;
  /** Shown on Settings: a sync the server refused as malformed (a bug). */
  error: string | null;
  /** The interview so far (M5). */
  draft: Draft;
  /** The words of the reveal the last analysis returned. */
  reveal: Reveal | null;
  account: Account;
  /**
   * M17: whether `account` has been read. Reading it can wait on a token refresh over the network, so launch no longer
   * waits for it (perf audit 2026-10-20: a blank screen after the splash on most morning launches); what depends on it
   * (the "save your character" card) waits instead.
   */
  accountKnown: boolean;
  /**
   * M17 (review): the last sync couldn't reach the server (offline or retrying). Unlike `status`, it doesn't change when
   * a retry starts, so the tabs that show "Last synced" don't redraw on every retry.
   */
  unreachable: boolean;
  /** Level-ups and achievements the server confirmed, shown one at a time. */
  celebrations: Celebration[];
  /** The vow sworn in onboarding, kept on the phone (M5 owner decision 3); shown on Character (M6d). */
  vow: string | null;
  /** The one-time "set up your training" note has been shown and dismissed (M6d decision 13). */
  trainingNoticeSeen: boolean;
  /** M7a: the check-in put off with "Later": hidden until the app is next opened (decision 10). */
  checkinLater: number | null;
  /** M7a: the last check-in result the player dismissed (kept on the phone). */
  checkinResultSeen: number | null;
  /** M7c: the last check-in whose Shadow scene was shown (kept on the phone, decision 5). */
  shadowSeen: number | null;
  /** M7d: Settings → Notifications, kept on this phone (decision 2). */
  notify: NotifySettings;
  /** M7d: whether the phone lets LevelMeUp notify; `unknown` until it is read. */
  permission: Permission;
  /** M7d: the notifications planned now (the developer screen lists them). */
  planned: readonly PlannedNote[];
  /** M10b: the Haptics switch (Settings → Game), kept on this phone; on unless turned off. */
  haptics: boolean;
  /** M12: the Sounds switch (Settings), kept on this phone; on unless turned off. */
  sounds: boolean;
  /** M10c decision 7: the last logged sets, by exercise and rep-log quest, kept on this phone. */
  lastSets: LastSets;
  /** M11: the lessons kept from the Story Decks, newest first. */
  codex: CodexEntry[];
  /** M12: the one-time offers already shown on this phone. */
  offers: Offer[];
  /** M11: keeps a deck's lesson in the Codex, or takes it out; shown at once, even if the phone can't store it. */
  toggleKeep: (entry: CodexEntry) => Promise<void>;
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
  /** M10b: keeps the switch on the phone; it applies at once, even if the phone can't store it. */
  setHaptics: (on: boolean) => Promise<void>;
  /** M12: keeps the switch on the phone; it applies at once, even if the phone can't store it. */
  setSounds: (on: boolean) => Promise<void>;
  /** M10c: remembers logged sets (merged over what's kept); shown at once, even if the phone can't store them. */
  rememberSets: (sets: Readonly<Record<string, readonly number[]>>) => Promise<void>;
  dismissTrainingNotice: () => Promise<void>;
  /** M12: an offer was shown and answered; it never shows again on this phone for this character. */
  markOffer: (offer: Offer) => Promise<void>;
  answerLater: (checkinId: number) => void;
  /** The app came back to the foreground: a check-in put off with "Later" shows again. */
  reopen: () => void;
  dismissCheckinResult: (checkinId: number) => Promise<void>;
  seeShadow: (checkinId: number) => Promise<void>;
  /** M7c: the Trial's focus minutes so far for this check-in, in ms (0 for any other; decision 7). */
  trialMs: (checkinId: number) => Promise<number>;
  saveTrialMs: (checkinId: number, ms: number) => Promise<void>;
  saveWithGoogle: () => Promise<GoogleResult>;
  /** "Saved a character before?": only on a phone that holds none. */
  signInWithGoogle: () => Promise<RestoreResult>;
  /**
   * Premium pass A2: a Google-saved player whose sign-in ended on this phone signs in again; only once that worked does
   * the phone's copy go (the character comes back from the System). A sign-in that doesn't finish changes nothing.
   */
  signInAgain: () => Promise<RestoreResult>;
  /** Deletes the character on the server and forgets this phone's (M7b decision 3; the developer screen's button too). */
  deleteCharacter: () => Promise<{ ok: true } | { ok: false; code: string }>;
  /** Forget this phone's character and sign-in and start as a new guest (after the player confirms). */
  startOver: () => Promise<void>;
  dismissNotice: (eventId: string) => Promise<void>;
  dismissCelebration: () => void;
  /** A quest's stored timer, or null. */
  timer: (questId: number) => Promise<TimerState | null>;
  /** Stores a quest's timer (null forgets it); timers of quests no longer today's are dropped. */
  saveTimer: (questId: number, state: TimerState | null) => Promise<void>;
  /** M7d: keeps the settings on the phone and plans again. */
  setNotify: (next: NotifySettings) => Promise<void>;
  /** M7d: the phone's own prompt; only Settings → Notifications calls it, after the player turns one on (decision 5). */
  allowNotify: () => Promise<Permission>;
  /** M7d: reads the permission again and plans again (the app came back to the foreground). */
  checkNotify: () => Promise<void>;
  /** M13: the look picked, and the portrait frame (shown only while they are the player's to use: plus.ts). */
  theme: ThemeName;
  frame: FrameName;
  /** M13: a new look redraws the whole app from Today; this sends the player back to Your look once (Look's own flag). */
  themeReturn: boolean;
  /**
   * M13 (review): the look the app is drawn in. Set once at launch (from the stored choice and Plus) and when the
   * player picks one, never in the middle of a screen because Plus started or ended; `lookReady` once it is known.
   */
  look: ThemeName;
  lookReady: boolean;
  setTheme: (theme: ThemeName) => Promise<void>;
  setFrame: (frame: FrameName) => Promise<void>;
  clearThemeReturn: () => void;
  /** M13: Plus's plans as Google Play prices them for this player. */
  plusShop: () => Promise<Shop>;
  buyPlus: (plan: Plan) => Promise<PlusOutcome>;
  restorePlus: () => Promise<PlusOutcome>;
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

/** M7c: the focus minutes kept for this check-in; another check-in's, or anything unreadable, count as none. */
function readTrial(text: string | null, checkinId: number): number {
  if (text === null) return 0;
  try {
    const kept: unknown = JSON.parse(text);
    if (typeof kept !== 'object' || kept === null) return 0;
    const { checkinId: id, ms } = kept as { checkinId?: unknown; ms?: unknown };
    return id === checkinId && Number.isSafeInteger(ms) && (ms as number) >= 0 ? (ms as number) : 0;
  } catch {
    return 0;
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

    /**
     * M17 (perf audit 2026-10-20): what the screens were last given. A refresh that finds the same state, the same waiting
     * events and the same notices keeps them, so a sync that changes nothing redraws nothing (each tap used to redraw every
     * open screen about three times).
     */
    let shown: { state: ServerState; pendingKey: string; pending: PhoneEvent[]; view: Shown } | null = null;
    let lastNotices: { key: string; notices: Notice[] } | null = null;

    /** Reloads what the phone holds (one consistent read) and recomputes what to show. */
    const refresh = async (patch: Partial<GameState> = {}): Promise<void> => {
      const before = get().view;
      const read = await deps.local.snapshot();
      const { cached, articles } = read;
      const pendingKey = read.pending.map((e) => e.id).join(',');
      if (cached !== null && (shown === null || shown.state !== cached.state || shown.pendingKey !== pendingKey)) {
        shown = { state: cached.state, pendingKey, pending: read.pending, view: project(cached.state, read.pending) };
      }
      const view = cached === null ? null : shown!.view;
      const pending = cached === null ? read.pending : shown!.pending;
      const noticeKey = read.notices.map((n) => `${n.eventId}:${n.code}`).join(',');
      if (lastNotices?.key !== noticeKey) lastNotices = { key: noticeKey, notices: read.notices };
      const notices = lastNotices.notices;
      set({ ...patch, cached, pending, notices, articles, view, lastSyncedAt: cached?.syncedAt ?? null });
      watchDayEnd(view);
      void replan();
      // M6e: the server's state has the offline day now, whatever refreshed first (review): its timers move along, and
      // their alerts with them (M7d).
      if (before?.offline === true && view?.offline !== true) void moveTimers(before).then(replan, replan);
    };

    /**
     * M6e: the day on screen has ended and the server can't be reached: build the next one here and queue it. No new sync
     * is asked for; the scheduler's back-off keeps trying (decision 10).
     */
    const buildOffline = async (): Promise<void> => {
      const { cached, pending } = get();
      if (cached === null) return;
      // Premium pass A6: after the server's day, or after one this phone built (a day at a time, up to the late window).
      const event = nextOfflineDay(cached.state, pending, deps.now(), deps.timeZone());
      if (event === null) return;
      await deps.local.enqueue({ ...event, id: deps.newId() }, deps.now());
      // Premium pass (review): a day built here reuses the last one's quest ids (-1 to -5), so that day's timers go, or the
      // new day's timer quest would open at the old time, already at its target.
      const dropBuilt = async (): Promise<void> => {
        const kept = Object.entries(parseTimers(await deps.kv.getItem(TIMERS_KEY).catch(() => null))).filter(([id]) => Number(id) > 0);
        await deps.kv.setItem(TIMERS_KEY, JSON.stringify(Object.fromEntries(kept)));
      };
      const dropped = timerWrites.then(dropBuilt);
      timerWrites = dropped.catch(() => {});
      await dropped.catch(() => {});
      await refresh();
    };

    /**
     * Each run gets a number, and every exclusive section moves it on: a run the scheduler gave up on (its deadline
     * passed) may not write, or make a guest, when it wakes up (M4 re-review).
     */
    let generation = 0;

    /** M8b: articles a screen asked for; the next sync names them, then they are forgotten (the screen asks again). */
    const wanted = new Set<string>();
    /** M11 (review): bodies held from before their Story Deck, asked for once a launch so Read again gets the cards. */
    const deckAsked = new Set<string>();

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

    /** M7d: nothing is planned before the settings and the permission are read, so a launch never clears the phone. */
    let notifyLoaded = false;
    const applier = makeApplier(deps.notes);
    let planning: Promise<void> = Promise.resolve();

    /**
     * M7d (decisions 3–4): plans from the view, the stored timers, the settings and the clock; the phone hears only of a
     * change. Plans run one after another; a failed one leaves the next to try again.
     */
    const replan = (): Promise<void> => {
      const run = async (): Promise<void> => {
        if (!notifyLoaded || stopped) return;
        await timerWrites;
        const timers = parseTimers(await deps.kv.getItem(TIMERS_KEY).catch(() => null));
        const { view, notify, permission } = get();
        if (permission === 'unknown') return;
        const input = view === null || permission !== 'granted' ? null : planInput(view, timers, notify, deps.now());
        const planned = input === null ? [] : planNotes(input);
        set({ planned });
        // M12 decision 12: live countdowns of the running timers, only where the timer notes may come.
        setLiveAllowed(permission === 'granted' && notify.optedIn && notify.timers);
        syncLive(input === null ? [] : planLive(input), deps.now());
        await applier.apply(planned);
      };
      const done = planning.then(run);
      planning = done.catch(() => {});
      return planning;
    };

    const run = async (): Promise<SyncOutcome> => {
      const mine = ++generation;
      set({ status: 'syncing' });
      const held = await deps.local.snapshot();
      const empty = held.cached === null && held.pending.length === 0;
      // A sync never makes a guest (M5, decision 10): an empty phone without a sign-in is a new player.
      const session = await deps.ensureSession(() => false);
      // A sync never makes a guest, so its storage is never checked here (`storage_failed` can't come back).
      if (session === 'offline' || session === 'storage_failed') return { kind: 'offline' };
      if (session === 'no_session') return empty ? { kind: 'fresh' } : { kind: 'sign_in_lost' };
      const local = {
        pending: deps.local.pending,
        articleIds: deps.local.articleIds,
        acknowledge: async (...args: Parameters<Local['acknowledge']>) => {
          if (mine !== generation) throw new Error('abandoned'); // a newer run owns the cache now; resending is safe
          return deps.local.acknowledge(...args);
        },
      };
      return syncOnce({
        local, api: deps.api, timeZone: deps.timeZone, now: deps.now, sessionAlive: deps.sessionAlive, wanted: () => [...wanted], keep: () => get().codex.map((e) => e.articleId),
        ...(deps.syncLog === undefined ? {} : { log: deps.syncLog }),
      });
    };

    /** Forgets this phone's data, sign-in and interview; the onboarding makes the next guest. */
    /** M13: after Google Play takes a purchase, the server asks RevenueCat and stores it; then a sync brings state.plus. */
    const confirmPlus = async (): Promise<PlusOutcome> => {
      const checked = await deps.api.plus().catch(() => null);
      if (checked === null || !checked.ok) return 'server_late';
      // Shown at once (review): the sync that follows brings the rest of the state.
      const view = get().view;
      if (view !== null) set({ view: { ...view, plus: checked.body.plus } });
      void scheduler.request();
      return checked.body.plus.active ? 'on' : 'server_late';
    };

    /**
     * M13: once a launch, when RevenueCat's word on this phone and the server's differ (a renewal, a refund, a purchase
     * the server never heard of), the server asks RevenueCat again. A Founder's Plus is the server's own, never checked.
     */
    const checkPlus = async (): Promise<void> => {
      if (!purchasesSetUp() || get().view === null) return;
      const id = await deps.playerId().catch(() => null);
      if (id === null) return;
      const plus = plusOf(get().view);
      const says = await storeSaysPlus(id);
      if (says === plus.active || (!says && plus.source === 'beta_founder')) return;
      const checked = await deps.api.plus().catch(() => null);
      if (checked !== null && checked.ok) void scheduler.request();
    };

    /** `keepSignIn`: a sign-in made just now stays (premium pass A2); otherwise the sign-in goes with the rest. */
    const forget = async (keepSignIn = false): Promise<void> => {
      // M7d decision 9: first, so nothing below can keep the last player's notifications on the phone.
      await deps.notes.cancelAll().catch(() => {});
      // Premium pass (review): the player's own words and numbers go first too, before anything below can throw.
      await forgetDrafts();
      applier.forget();
      wanted.clear();
      deckAsked.clear();
      await deps.local.wipe();
      if (!keepSignIn) await deps.signOut();
      await forgetPurchases(); // M13 (review): RevenueCat no longer speaks for the deleted player
      await deps.kv.removeItem(DRAFT_KEY);
      await deps.kv.removeItem(VOW_KEY); // the next player on this phone never sees it (M5 review)
      await deps.kv.removeItem(TIMERS_KEY);
      await deps.kv.removeItem(TRAINING_NOTICE_KEY);
      await deps.kv.removeItem(CHECKIN_RESULT_KEY);
      await deps.kv.removeItem(SHADOW_KEY);
      await deps.kv.removeItem(TRIAL_KEY);
      await deps.kv.removeItem(NOTIFY_KEY);
      await deps.kv.removeItem(PORTRAIT_KEY);
      await deps.kv.removeItem(LAST_SETS_KEY); // M10c: the character's workouts, not the phone's
      await deps.kv.removeItem(CODEX_KEY); // M11: the character's kept lessons go with it
      await deps.kv.removeItem(OFFERS_KEY); // M12: the next character gets its own offers
      await deps.kv.removeItem(FRAME_KEY); // M13: the frame is the character's; the look (theme) is the phone's
      // The Haptics switch stays: it is the phone's, not the character's (M10b plan decision 3).
      confirmedLevel = null;
      set({
        draft: NEW_DRAFT, reveal: null, celebrations: [], vow: null, trainingNoticeSeen: false, checkinResultSeen: null, checkinLater: null,
        shadowSeen: null, notify: DEFAULT_NOTIFY, planned: [], lastSets: {}, codex: [], offers: [], frame: 'none',
        account: await deps.account(), accountKnown: true,
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
          await refresh({ phase: 'ready', status: 'idle', error: null, updateRequired: false, unreachable: false });
          // Forget only what this run asked for or what arrived: one asked for meanwhile goes with the next run (review).
          for (const id of outcome.asked) wanted.delete(id);
          for (const id of [...wanted]) if (get().articles[id] !== undefined && !deckAsked.has(id)) wanted.delete(id);
          const after = get().cached?.state.character.level ?? null;
          confirmedLevel = after;
          const found: Celebration[] = [];
          // Only a level the server confirms (M3: an undo can take one back); nothing on a phone's first state.
          if (before !== null && after !== null && after > before) found.push({ kind: 'level', level: after, from: before });
          for (const id of outcome.newAchievements) found.push({ kind: 'achievement', id });
          if (found.length > 0) set({ celebrations: [...get().celebrations, ...found] });
          return;
        }
        case 'not_started':
          // A new guest is only made on an empty phone, so this is the same sign-in: its character is gone on the
          // server, and anything cached is stale.
          await deps.local.wipe();
          await forgetDrafts(); // premium pass (review): the gone character's drafts with it
          wanted.clear(); // the old character's readings (re-review)
          deckAsked.clear();
          confirmedLevel = null;
          await refresh({ phase: 'not_started', status: 'idle', error: null });
          return;
        case 'session_ended':
          // Auth confirmed the sign-in is gone. Premium pass A2: nothing is wiped unasked (it was, silently, with any unsent
          // actions); Today says what happened, and the player chooses: Google again, or a new guest.
          set({ status: 'idle', signInLost: true });
          return;
        case 'fresh':
          await refresh({ phase: 'not_started', status: 'idle', error: null });
          return;
        case 'offline':
          set({ status: 'offline', unreachable: true });
          await buildOffline();
          return;
        case 'retry':
          set({ status: 'retrying', unreachable: true });
          await buildOffline();
          return;
        case 'sign_in_lost':
          set({ status: 'idle', signInLost: true });
          return;
        case 'update_required':
          set({ status: 'idle', updateRequired: true });
          return;
        case 'failed':
          set({ status: 'idle', error: `The server refused a sync (${outcome.status} ${outcome.code}).` });
      }
    };

    /** M17 (review): boot's read of the account, so what depends on it can wait for it. */
    let accountReading: Promise<void> = Promise.resolve();
    const scheduler = makeScheduler(run, handle);

    return {
      phase: 'loading',
      cached: null,
      pending: [],
      view: null,
      status: 'idle',
      lastSyncedAt: null,
      notices: [],
      articles: {},
      signInLost: false,
      updateRequired: false,
      error: null,
      draft: NEW_DRAFT,
      reveal: null,
      account: { kind: 'none' },
      accountKnown: false,
      unreachable: false,
      celebrations: [],
      vow: null,
      trainingNoticeSeen: true, // nothing flashes before boot reads the phone
      checkinLater: null,
      checkinResultSeen: null,
      shadowSeen: null,
      notify: DEFAULT_NOTIFY,
      permission: 'unknown',
      planned: [],
      haptics: true,
      sounds: true,
      lastSets: {},
      codex: [],
      offers: [],
      theme: FREE_THEME,
      frame: 'none',
      themeReturn: false,
      look: FREE_THEME,
      lookReady: false,

      boot: async () => {
        // M17: asked now, waited for after the first screen (see `accountKnown`).
        const accountRead = deps.account().catch((): Account => ({ kind: 'none' }));
        // Review: never over an account something newer already set (a sign-in, a save, a fresh start). Chained here, not
        // after the records are read: if that read fails, the account still becomes known (M17: Settings waited forever).
        accountReading = accountRead.then((account) => {
          if (!get().accountKnown) set({ account, accountKnown: true });
        });
        const [saved, vowText, notice, seen, shadow, notifyText, permission, hapticsText, setsText, codexText, offersText, soundsText, themeText, frameText, draftsText] = await Promise.all([
          deps.kv.getItem(DRAFT_KEY).catch(() => null),
          deps.kv.getItem(VOW_KEY).catch(() => null),
          deps.kv.getItem(TRAINING_NOTICE_KEY).catch(() => null),
          deps.kv.getItem(CHECKIN_RESULT_KEY).catch(() => null),
          deps.kv.getItem(SHADOW_KEY).catch(() => null),
          deps.kv.getItem(NOTIFY_KEY).catch(() => null),
          deps.notes.permission().catch((): Permission => 'unknown'),
          deps.kv.getItem(HAPTICS_KEY).catch(() => null),
          deps.kv.getItem(LAST_SETS_KEY).catch(() => null),
          deps.kv.getItem(CODEX_KEY).catch(() => null),
          deps.kv.getItem(OFFERS_KEY).catch(() => null),
          deps.kv.getItem(SOUNDS_KEY).catch(() => null),
          deps.kv.getItem(THEME_KEY).catch(() => null),
          deps.kv.getItem(FRAME_KEY).catch(() => null),
          deps.kv.getItem(DRAFTS_KEY).catch(() => null),
        ]);
        startDrafts(deps.kv, draftsText); // premium pass A1: sets, lines and notes being written when the app last closed
        const haptics = hapticsText !== 'off';
        setBuzzing(haptics);
        const sounds = soundsText !== 'off';
        setSounding(sounds);
        // M17 (review): the phone's own records first, before the snapshot that can fail; Today's cards read `offers` once
        // the account is known, and an answered card must stay answered.
        set({
          notify: readNotify(notifyText), permission, haptics, sounds, vow: readVow(vowText),
          trainingNoticeSeen: notice !== null, checkinResultSeen: readSeen(seen), checkinLater: null, shadowSeen: readSeen(shadow),
          lastSets: readLastSets(setsText), codex: readCodex(codexText),
          offers: readOffers(offersText), theme: asTheme(themeText), frame: asFrame(frameText),
        });
        notifyLoaded = true;
        try {
          await refresh();
        } finally {
          // M13: the look is known before anything is drawn in it, even if the phone's records can't be read.
          set({ look: shownTheme(asTheme(themeText), plusOf(get().view)), lookReady: true });
        }
        confirmedLevel = get().cached?.state.character.level ?? null;
        const holding = get().cached !== null;
        // A character already exists, so the onboarding is over: its draft (a name, goals, limits) isn't kept (M5 review).
        if (holding && saved !== null) await deps.kv.removeItem(DRAFT_KEY).catch(() => {});
        set({ draft: holding ? NEW_DRAFT : restoreDraft(saved), phase: holding ? 'ready' : 'loading' });
        await scheduler.request();
        void checkPlus();
      },

      enqueue: async (event) => {
        const view = get().view;
        const replaced = replacedQuest(event, view);
        // M7b decision 6: a rest or a pain report carries when it was tapped, so it still counts for its day if it syncs late.
        const stamped: NewEvent = (event.type === 'plan_rest' || event.type === 'pain') && event.at === undefined ? { ...event, at: deps.now() } : event;
        // A quest of the offline day is named by day and slot (M6e decision 7).
        await deps.local.enqueue({ ...withRef(stamped, view), id: deps.newId() } as PhoneEvent, deps.now());
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
        await accountReading; // review: the redo guard below reads the account
        const result = await fenced(async (): Promise<StartResult> => {
          const draft = get().draft;
          // Never an unfinished interview: an unanswered safety question must not travel as a "no" (M5 review).
          if (!stepsFor(draft).every((step) => complete(draft, step))) return { ok: false, code: 'incomplete' };
          const ask = async (redo: boolean): Promise<StartResult> => {
            const signedIn = await deps.ensureSession(() => !redo && get().cached === null && get().pending.length === 0);
            if (signedIn !== 'signed_in') {
              return { ok: false, code: signedIn === 'offline' ? 'network' : signedIn === 'storage_failed' ? 'storage' : 'no_session' };
            }
            const started = await deps.api.onboarding(toRequest(get().draft, deps.timeZone(), redo));
            if (!started.ok) {
              // Decision 11: the first answer was lost on the way back, so the untouched character is built again. Never
              // over a Google account: its "already started" is a saved character, never rebuilt (M5 review).
              if (!redo && started.code === 'already_started' && get().account.kind !== 'saved') return ask(true);
              return { ok: false, code: started.code };
            }
            await deps.local.acknowledge([], [], started.body.state, deps.now(), started.body.articles ?? []);
            confirmedLevel = started.body.state.character.level; // the server's own first state (review)
            // A new player just answered the Training step: the note for players from before M6c is never theirs (M6d).
            await deps.kv.setItem(TRAINING_NOTICE_KEY, 'seen').catch(() => {});
            // M12 decision 8: a character made here gets the set-up cards of days 1 to 3, even if the app closes on the
            // reveal (review); a character restored with Google never comes this way.
            await get().markOffer('setup');
            await refresh({
              phase: 'ready', status: 'idle', error: null, reveal: started.body.reveal, account: await deps.account(), accountKnown: true, trainingNoticeSeen: true,
            });
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
        const { pact } = get().draft;
        await deps.kv.removeItem(DRAFT_KEY).catch(() => {});
        set({ draft: NEW_DRAFT, reveal: null });
        // M7c decision 10: a pact signed on the reveal goes now, with the character; the server starts it with day 2.
        if (pact !== null && get().cached !== null) await get().enqueue({ type: 'accountability_set', level: pact });
      },

      saveVow: async (text) => {
        const vow = text.trim();
        await deps.kv.setItem(VOW_KEY, vow);
        set({ vow: vow === '' ? null : vow });
      },

      setHaptics: async (on) => {
        setBuzzing(on);
        set({ haptics: on });
        await deps.kv.setItem(HAPTICS_KEY, on ? 'on' : 'off').catch(() => {});
      },

      setSounds: async (on) => {
        setSounding(on);
        set({ sounds: on });
        await deps.kv.setItem(SOUNDS_KEY, on ? 'on' : 'off').catch(() => {});
      },

      setTheme: async (theme) => {
        const look = shownTheme(theme, plusOf(get().view));
        set({ theme, look, themeReturn: look !== get().look });
        await deps.kv.setItem(THEME_KEY, theme).catch(() => {});
      },

      setFrame: async (frame) => {
        set({ frame });
        await deps.kv.setItem(FRAME_KEY, frame).catch(() => {});
      },

      clearThemeReturn: () => set({ themeReturn: false }),

      plusShop: async () => {
        const id = await deps.playerId();
        return id === null ? { ok: false, reason: purchasesSetUp() ? 'unavailable' : 'not_set_up' } : shop(id);
      },

      buyPlus: async (plan) => {
        const id = await deps.playerId();
        if (id === null) return 'failed';
        const bought = await buy(id, plan);
        if (bought !== 'bought') return bought;
        return confirmPlus();
      },

      restorePlus: async () => {
        const id = await deps.playerId();
        if (id === null) return 'failed';
        const found = await restore(id);
        if (found === 'found') return confirmPlus();
        // Nothing to restore: the server still asks, so a refunded purchase ends there too.
        if (found === 'none') await deps.api.plus().catch(() => null);
        return found;
      },

      rememberSets: async (sets) => {
        const lastSets = { ...get().lastSets, ...sets };
        set({ lastSets });
        await deps.kv.setItem(LAST_SETS_KEY, JSON.stringify(lastSets)).catch(() => {});
      },

      toggleKeep: async (entry) => {
        const codex = toggled(get().codex, entry);
        set({ codex });
        await deps.kv.setItem(CODEX_KEY, JSON.stringify(codex)).catch(() => {});
      },

      dismissTrainingNotice: async () => {
        set({ trainingNoticeSeen: true });
        await deps.kv.setItem(TRAINING_NOTICE_KEY, 'seen').catch(() => {});
      },

      markOffer: async (offer) => {
        if (get().offers.includes(offer)) return;
        // M17 (review): a week's recap replaces last week's, so the list doesn't grow by one every week.
        // Monster Week: likewise, only the latest battle's moment is kept.
        const prefix = offer.startsWith('week:') ? 'week:' : offer.startsWith('battle:') ? 'battle:' : null;
        const kept = prefix === null ? get().offers : get().offers.filter((o) => !o.startsWith(prefix));
        const offers = [...kept, offer];
        set({ offers });
        await deps.kv.setItem(OFFERS_KEY, JSON.stringify(offers)).catch(() => {});
      },

      answerLater: (checkinId) => set({ checkinLater: checkinId }),

      reopen: () => {
        set({ checkinLater: null });
        void get().checkNotify(); // M7d: the permission may have changed in the phone's settings
        void checkPlus(); // M13 (review): a renewal, a refund or a pending payment that finished while away
      },

      dismissCheckinResult: async (checkinId) => {
        set({ checkinResultSeen: checkinId });
        await deps.kv.setItem(CHECKIN_RESULT_KEY, String(checkinId)).catch(() => {});
      },

      seeShadow: async (checkinId) => {
        set({ shadowSeen: checkinId });
        await deps.kv.setItem(SHADOW_KEY, String(checkinId)).catch(() => {});
      },

      trialMs: async (checkinId) => readTrial(await deps.kv.getItem(TRIAL_KEY).catch(() => null), checkinId),

      saveTrialMs: async (checkinId, ms) => {
        await deps.kv.setItem(TRIAL_KEY, JSON.stringify({ checkinId, ms: Math.max(0, Math.round(ms)) })).catch(() => {});
      },

      saveWithGoogle: async () => {
        const result = await deps.google.link();
        set({ account: await deps.account(), accountKnown: true });
        return result;
      },

      signInWithGoogle: async () => {
        const result = await fenced(
          async (): Promise<GoogleResult> =>
            get().cached !== null || get().pending.length > 0 ? { ok: false, code: 'failed' } : deps.google.signIn(),
        );
        set({ account: await deps.account(), accountKnown: true });
        if (!result.ok) return result;
        await scheduler.request();
        const { phase, status, error } = get();
        if (phase === 'ready') return { ok: true, found: true };
        // Only a sync that finished can say there is no character (M5 review).
        return { ok: true, found: phase === 'not_started' && status === 'idle' && error === null ? false : 'unknown' };
      },

      signInAgain: async () => {
        const result = await fenced(async (): Promise<GoogleResult> => {
          const signed = await deps.google.signIn();
          if (signed.ok) await forget(true);
          return signed;
        });
        // Review: a sign-in that didn't finish changes nothing, the account the card read included.
        if (!result.ok) return result;
        set({ account: await deps.account(), accountKnown: true });
        await scheduler.request();
        const { phase, status, error } = get();
        if (phase === 'ready') return { ok: true, found: true };
        return { ok: true, found: phase === 'not_started' && status === 'idle' && error === null ? false : 'unknown' };
      },

      deleteCharacter: async () => {
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

      fetchArticle: (id) => {
        const held = get().articles[id];
        // M14: a reading held with a deck from before the stories is asked for once more, like one held without a deck.
        if (wanted.has(id) || (held !== undefined && (hasStoryDeck(held.deck) || deckAsked.has(id)))) return;
        if (held !== undefined) deckAsked.add(id);
        wanted.add(id);
        void scheduler.request();
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
        void next.then(replan, () => {}); // M7d: a running timer's alert, or its end
        return next;
      },

      setNotify: async (next) => {
        set({ notify: next });
        await deps.kv.setItem(NOTIFY_KEY, JSON.stringify(next)).catch(() => {});
        await replan();
      },

      allowNotify: async () => {
        const permission = await deps.notes.ask().catch(() => get().permission);
        set({ permission });
        await replan();
        return permission;
      },

      checkNotify: async () => {
        const permission = await deps.notes.permission().catch(() => get().permission);
        if (permission !== get().permission) set({ permission });
        await replan();
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

/** The store itself, for the developer screens (M10a's motion bench queues a sample celebration). */
export function useGameStore(): StoreApi<GameState> {
  const store = useContext(GameContext);
  if (store === null) throw new Error('useGame needs a GameProvider');
  return store;
}

export function useGame<T>(selector: (state: GameState) => T): T {
  return useStore(useGameStore(), selector);
}
