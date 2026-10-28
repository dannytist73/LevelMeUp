// The base app's store: one JSON record on the phone (expo-sqlite's key-value store), loaded at launch and saved after
// every change. The workout in progress is saved too, so closing the app mid-workout loses nothing.
import { createContext, createElement, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { LoggedSet, Place, Units } from '@levelmeup/rules';
import { baseMove } from '@levelmeup/content';
import { restFor, targetFor } from '@levelmeup/rules';
import { EMPTY, dayKey, defaultPlace, newExercises, place, plannedDay, weekDone } from './logic.ts';

const blockWeek6 = (w: { blockWeek: number }): boolean => w.blockWeek === 6;
import type { BaseData, FoodEntry, LookChoice, PlanSetup, Reminder, Targets, Workout } from './logic.ts';

export const BASE_KEY = 'base.v1';

/** The phone's key-value store (expo-sqlite/kv-store), or a fake in tests. */
export type Blobs = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };

export type BaseState = BaseData & {
  ready: boolean;
  /** When the rest between sets ends (ms), and how long it was. */
  restUntil: number | null;
  restTotal: number;
  load: () => Promise<void>;
  /** A new plan (`fresh`) clears kept swaps; an edited one keeps them. */
  setPlan: (plan: PlanSetup, fresh?: boolean) => void;
  setUnits: (units: Units) => void;
  setLook: (look: LookChoice) => void;
  setReminder: (reminder: Reminder) => void;
  setRestAlerts: (on: boolean) => void;
  /** Starts the next workout, or `day` (0 is A) when it isn't done yet this week; an open one comes back as it is. */
  startWorkout: (day?: number) => Workout | null;
  setSet: (ex: number, set: number, patch: Partial<LoggedSet>) => void;
  toggleSet: (ex: number, set: number) => boolean;
  addSet: (ex: number) => void;
  /** Moves the weight of every set not done yet by `delta` (one plate step), never below zero. */
  shiftWeight: (ex: number, delta: number) => void;
  removeSet: (ex: number, set: number) => void;
  switchPlace: (to: Place) => void;
  swap: (ex: number, move: string, keep: boolean) => void;
  skipExercise: (ex: number) => void;
  finishWorkout: () => Workout | null;
  /** Drops the open workout; returns it so Undo can bring it back (restoreActive). */
  discardWorkout: () => Workout | null;
  restoreActive: (w: Workout) => void;
  startRest: (seconds: number) => void;
  moveRest: (seconds: number) => void;
  endRest: () => void;
  chooseBook: (id: string) => void;
  readChapter: (id: string) => void;
  /** Where an unfinished chapter was left, so reopening it resumes there (research 2026-10-28 #12). */
  leaveChapter: (id: string, card: number) => void;
  /** Logs a food today, or on `day` (a past day's key, "2026-10-27") when it was forgotten. */
  addFood: (entry: Omit<FoodEntry, 'id' | 'day' | 'at'> & { day?: string }) => FoodEntry;
  removeFood: (id: string) => FoodEntry | null;
  /** Removes a finished workout logged by mistake; `restoreWorkout` puts it back (Undo). */
  removeWorkout: (id: string) => Workout | null;
  restoreWorkout: (w: Workout) => void;
  restoreFood: (entry: FoodEntry) => void;
  setTargets: (targets: Targets) => void;
  resetAll: () => void;
};

export type BaseDeps = { blobs: Blobs; now: () => number; newId: () => string };

const DATA_KEYS = Object.keys(EMPTY) as (keyof BaseData)[];

export function createBaseStore({ blobs, now, newId }: BaseDeps): StoreApi<BaseState> {
  let saving: Promise<void> = Promise.resolve();
  let blocked = false;
  const store = createStore<BaseState>()((set, get) => {
    /** Saves the data part after a change, one write at a time, in order. */
    const save = (): void => {
      if (blocked) return;
      const s = get();
      const data = Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as BaseData;
      saving = saving.then(() => blobs.setItem(BASE_KEY, JSON.stringify(data))).catch(() => undefined);
    };
    const change = (patch: Partial<BaseState>): void => {
      set(patch);
      save();
    };
    const editActive = (fn: (w: Workout) => Workout): void => {
      const w = get().active;
      if (w !== null) change({ active: fn(w) });
    };
    const editExercise = (ex: number, fn: (e: Workout['exercises'][number]) => Workout['exercises'][number]): void =>
      editActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => (i === ex ? fn(e) : e)) }));

    return {
      ...EMPTY,
      ready: false,
      restUntil: null,
      restTotal: 0,
      load: async () => {
        let raw: string | null;
        try {
          raw = await blobs.getItem(BASE_KEY);
        } catch {
          // The record couldn't be read: nothing is saved over it this session (review 2026-10-28).
          blocked = true;
          set({ ready: true });
          return;
        }
        let parsed: Partial<BaseData> | null = null;
        try {
          parsed = raw === null ? null : (JSON.parse(raw) as Partial<BaseData>);
        } catch {
          parsed = null;
        }
        if (raw !== null && parsed?.v !== 1) {
          // A record this version can't read is kept aside before anything new is saved.
          await blobs.setItem(`${BASE_KEY}.unread-${now()}`, raw).catch(() => {
            blocked = true;
          });
        }
        set({ ...EMPTY, ...(parsed?.v === 1 ? parsed : {}), ready: true });
      },
      setPlan: (plan, fresh = false) => change(fresh ? { plan, kept: {} } : { plan }),
      setUnits: (units) => {
        const s = get();
        if (s.units === units) return;
        // Stored weights change unit too: 0.5 steps in the new one.
        const factor = units === 'lb' ? 2.20462 : 0.453592;
        const conv = (w: number | null): number | null => (w === null ? null : Math.round(w * factor * 2) / 2);
        const sets = (xs: LoggedSet[]): LoggedSet[] => xs.map((x) => ({ ...x, weight: conv(x.weight) }));
        const workout = (w: Workout): Workout => ({ ...w, exercises: w.exercises.map((e) => ({ ...e, sets: sets(e.sets) })) });
        change({
          units,
          workouts: s.workouts.map(workout),
          active: s.active === null ? null : workout(s.active),
          targets: s.targets === null ? null : { ...s.targets, weight: conv(s.targets.weight) ?? s.targets.weight },
        });
      },
      setLook: (look) => change({ look }),
      setReminder: (reminder) => change({ reminder }),
      setRestAlerts: (restAlerts) => change({ restAlerts }),
      startWorkout: (pick) => {
        const s = get();
        if (s.active !== null) return s.active;
        if (s.plan === null) return null;
        const p = place(s, now());
        if (p === null || p.finished) return null;
        const at = defaultPlace(s.plan);
        const day = pick !== undefined && Number.isInteger(pick) && pick >= 0 && pick < s.plan.days && !weekDone(s, now()).includes(pick) ? pick : p.day;
        const workout: Workout = {
          id: newId(), startedAt: now(), finishedAt: null, day, week: p.week, blockWeek: p.blockWeek, place: at,
          exercises: newExercises(s, plannedDay(s.plan, s.kept, day, p.blockWeek, at), p.blockWeek),
        };
        change({ active: workout });
        return workout;
      },
      setSet: (ex, i, patch) => editExercise(ex, (e) => ({
        ...e,
        sets: e.sets.map((s, j) => {
          if (j === i) return { ...s, ...patch };
          // A weight typed into a set carries to the later sets not done yet that were empty or the same as it, so
          // straight sets need one entry (and typing "62.5" key by key never leaves a "6" behind).
          const was = e.sets[i]?.weight ?? null;
          if (j > i && !s.done && patch.weight !== undefined && (s.weight === null || s.weight === was)) return { ...s, weight: patch.weight };
          return s;
        }),
      })),
      toggleSet: (ex, i) => {
        const before = get().active?.exercises[ex]?.sets[i];
        if (before === undefined) return false;
        const done = !before.done;
        editExercise(ex, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, done } : s)) }));
        if (done) editActive((w) => ({ ...w, lastAt: now() }));
        return done;
      },
      addSet: (ex) => editExercise(ex, (e) => {
        const last = e.sets[e.sets.length - 1];
        return { ...e, skipped: false, sets: [...e.sets, { weight: last?.weight ?? null, reps: last?.reps ?? null, done: false }] };
      }),
      shiftWeight: (ex, delta) => editExercise(ex, (e) => ({
        ...e,
        sets: e.sets.map((x) => (x.done || x.weight === null ? x : { ...x, weight: Math.max(0, Math.round((x.weight + delta) * 100) / 100) })),
      })),
      removeSet: (ex, i) => editExercise(ex, (e) => ({ ...e, sets: e.sets.filter((_, j) => j !== i) })),
      switchPlace: (to) => {
        const s = get();
        const w = s.active;
        if (w === null || s.plan === null || w.place === to) return;
        // Exercises with a done set stay; the rest are picked again for the new place, in the same slots.
        const fresh = newExercises(s, plannedDay(s.plan, s.kept, w.day, w.blockWeek, to), w.blockWeek);
        const doneMoves = new Set(w.exercises.filter((e) => e.sets.some((x) => x.done)).map((e) => e.move));
        const exercises = w.exercises.map((e) => {
          if (e.sets.some((x) => x.done)) return e;
          const f = fresh.find((x) => x.slot === e.slot);
          // Never the same exercise twice (a swap with done sets keeps the old card).
          return f !== undefined && !doneMoves.has(f.move) ? f : e;
        });
        for (const f of fresh) if (!exercises.some((e) => e.slot === f.slot) && !doneMoves.has(f.move)) exercises.push(f);
        change({ active: { ...w, place: to, exercises: exercises.filter((e) => e.sets.some((x) => x.done) || fresh.some((f) => f.slot === e.slot)) } });
      },
      swap: (ex, move, keep) => {
        const s = get();
        const w = s.active;
        const old = w?.exercises[ex];
        if (w === null || old === undefined || s.plan === null) return;
        let next;
        try {
          next = baseMove(move);
        } catch {
          return;
        }
        const kept = keep ? { ...s.kept, [w.place]: { ...(s.kept[w.place] ?? {}), [old.slot]: move } } : s.kept;
        const count = blockWeek6(w) ? 2 : old.sets.length;
        const planned = { slot: old.slot, move, sets: count, target: targetFor(next, old.slot, ex === 0, w.blockWeek), restSeconds: restFor(next) };
        const replacement = newExercises(s, [planned], w.blockWeek)[0]!;
        const done = old.sets.filter((x) => x.done);
        // Sets already done stay with the exercise they were done on; the new one comes after it.
        const exercises = done.length > 0
          ? [...w.exercises.slice(0, ex), { ...old, sets: done }, replacement, ...w.exercises.slice(ex + 1)]
          : w.exercises.map((e, i) => (i === ex ? replacement : e));
        change({ kept, active: { ...w, exercises } });
      },
      skipExercise: (ex) => editExercise(ex, (e) => ({ ...e, skipped: true, sets: e.sets.filter((x) => x.done) })),
      finishWorkout: () => {
        const w = get().active;
        if (w === null) return null;
        // Finished hours after the last set (Finish forgotten until the next day): dated by that set.
        const end = w.lastAt !== undefined && now() - w.startedAt > 3 * 60 * 60 * 1000 ? w.lastAt : now();
        const done: Workout = { ...w, finishedAt: end, exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length > 0) };
        if (done.exercises.length === 0) {
          change({ active: null, restUntil: null });
          return null;
        }
        change({ active: null, workouts: [...get().workouts, done], restUntil: null });
        return done;
      },
      discardWorkout: () => {
        const w = get().active;
        change({ active: null, restUntil: null });
        return w;
      },
      restoreActive: (w) => {
        if (get().active === null) change({ active: w });
      },
      startRest: (seconds) => set({ restUntil: now() + seconds * 1000, restTotal: seconds }),
      moveRest: (seconds) => {
        const until = get().restUntil;
        if (until === null) return;
        const next = until + seconds * 1000;
        set(next <= now() ? { restUntil: null } : { restUntil: next, restTotal: Math.max(1, get().restTotal + seconds) });
      },
      endRest: () => set({ restUntil: null }),
      chooseBook: (id) => change({ reading: { ...get().reading, book: id } }),
      readChapter: (id) => {
        const r = get().reading;
        const { [id]: _left, ...at } = r.at ?? {};
        if (r.done[id] !== undefined) {
          if (_left !== undefined) change({ reading: { ...r, at } });
          return;
        }
        change({ reading: { ...r, at, done: { ...r.done, [id]: now() } } });
      },
      leaveChapter: (id, card) => {
        const r = get().reading;
        if ((r.at ?? {})[id] === card) return;
        change({ reading: { ...r, at: { ...(r.at ?? {}), [id]: card } } });
      },
      addFood: (entry) => {
        const at = now();
        const { day, ...rest } = entry;
        const full: FoodEntry = { ...rest, id: newId(), day: day ?? dayKey(at), at };
        change({ food: [...get().food, full] });
        return full;
      },
      removeFood: (id) => {
        const found = get().food.find((f) => f.id === id) ?? null;
        if (found !== null) change({ food: get().food.filter((f) => f.id !== id) });
        return found;
      },
      removeWorkout: (id) => {
        const found = get().workouts.find((w) => w.id === id) ?? null;
        if (found !== null) change({ workouts: get().workouts.filter((w) => w.id !== id) });
        return found;
      },
      restoreWorkout: (w) => get().workouts.some((x) => x.id === w.id) ? undefined : change({ workouts: [...get().workouts, w].sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0)) }),
      restoreFood: (entry) => get().food.some((x) => x.id === entry.id) ? undefined : change({ food: [...get().food, entry].sort((a, b) => a.at - b.at) }),
      setTargets: (targets) => change({ targets }),
      resetAll: () => change({ ...EMPTY, look: get().look, restUntil: null }),
    };
  });
  return store;
}

const BaseContext = createContext<StoreApi<BaseState> | null>(null);

export function BaseProvider({ store, children }: { store: StoreApi<BaseState>; children: ReactNode }) {
  return createElement(BaseContext.Provider, { value: store }, children);
}

export function useBase<T>(pick: (s: BaseState) => T): T {
  const store = useContext(BaseContext);
  if (store === null) throw new Error('useBase outside BaseProvider');
  return useStore(store, pick);
}

/** The store itself, for actions in event handlers. */
export function useBaseApi(): StoreApi<BaseState> {
  const store = useContext(BaseContext);
  if (store === null) throw new Error('useBaseApi outside BaseProvider');
  return store;
}

