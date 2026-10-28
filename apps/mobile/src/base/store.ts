// The base app's store: one JSON record on the phone (expo-sqlite's key-value store), loaded at launch and saved after
// every change. The workout in progress is saved too, so closing the app mid-workout loses nothing.
import { createContext, createElement, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { LoggedSet, Place, Units } from '@levelmeup/rules';
import { EMPTY, dayKey, defaultPlace, newExercises, place, plannedDay } from './logic.ts';
import type { BaseData, FoodEntry, PlanSetup, Reminder, Targets, Workout } from './logic.ts';

export const BASE_KEY = 'base.v1';

/** The phone's key-value store (expo-sqlite/kv-store), or a fake in tests. */
export type Blobs = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };

export type BaseState = BaseData & {
  ready: boolean;
  /** When the rest between sets ends (ms), and how long it was. */
  restUntil: number | null;
  restTotal: number;
  load: () => Promise<void>;
  setPlan: (plan: PlanSetup) => void;
  setUnits: (units: Units) => void;
  setReminder: (reminder: Reminder) => void;
  startWorkout: () => Workout | null;
  setSet: (ex: number, set: number, patch: Partial<LoggedSet>) => void;
  toggleSet: (ex: number, set: number) => boolean;
  addSet: (ex: number) => void;
  removeSet: (ex: number, set: number) => void;
  switchPlace: (to: Place) => void;
  swap: (ex: number, move: string, keep: boolean) => void;
  skipExercise: (ex: number) => void;
  finishWorkout: () => Workout | null;
  discardWorkout: () => void;
  startRest: (seconds: number) => void;
  moveRest: (seconds: number) => void;
  endRest: () => void;
  chooseBook: (id: string) => void;
  readChapter: (id: string) => void;
  addFood: (entry: Omit<FoodEntry, 'id' | 'day' | 'at'>) => FoodEntry;
  removeFood: (id: string) => FoodEntry | null;
  restoreFood: (entry: FoodEntry) => void;
  setTargets: (targets: Targets) => void;
  resetAll: () => void;
};

export type BaseDeps = { blobs: Blobs; now: () => number; newId: () => string };

const DATA_KEYS = Object.keys(EMPTY) as (keyof BaseData)[];

export function createBaseStore({ blobs, now, newId }: BaseDeps): StoreApi<BaseState> {
  let saving: Promise<void> = Promise.resolve();
  const store = createStore<BaseState>()((set, get) => {
    /** Saves the data part after a change, one write at a time, in order. */
    const save = (): void => {
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
        try {
          const raw = await blobs.getItem(BASE_KEY);
          const parsed = raw === null ? null : (JSON.parse(raw) as Partial<BaseData>);
          set({ ...EMPTY, ...(parsed?.v === 1 ? parsed : {}), ready: true });
        } catch {
          set({ ready: true });
        }
      },
      setPlan: (plan) => change({ plan, kept: {} }),
      setUnits: (units) => change({ units }),
      setReminder: (reminder) => change({ reminder }),
      startWorkout: () => {
        const s = get();
        if (s.active !== null) return s.active;
        if (s.plan === null) return null;
        const p = place(s, now());
        if (p === null || p.finished) return null;
        const at = defaultPlace(s.plan);
        const workout: Workout = {
          id: newId(), startedAt: now(), finishedAt: null, day: p.day, week: p.week, blockWeek: p.blockWeek, place: at,
          exercises: newExercises(s, plannedDay(s.plan, s.kept, p.day, p.blockWeek, at), p.blockWeek),
        };
        change({ active: workout });
        return workout;
      },
      setSet: (ex, i, patch) => editExercise(ex, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) })),
      toggleSet: (ex, i) => {
        const before = get().active?.exercises[ex]?.sets[i];
        if (before === undefined) return false;
        const done = !before.done;
        editExercise(ex, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, done } : s)) }));
        return done;
      },
      addSet: (ex) => editExercise(ex, (e) => {
        const last = e.sets[e.sets.length - 1];
        return { ...e, skipped: false, sets: [...e.sets, { weight: last?.weight ?? null, reps: last?.reps ?? null, done: false }] };
      }),
      removeSet: (ex, i) => editExercise(ex, (e) => ({ ...e, sets: e.sets.filter((_, j) => j !== i) })),
      switchPlace: (to) => {
        const s = get();
        const w = s.active;
        if (w === null || s.plan === null || w.place === to) return;
        // Exercises with a done set stay; the rest are picked again for the new place, in the same slots.
        const fresh = newExercises(s, plannedDay(s.plan, s.kept, w.day, w.blockWeek, to), w.blockWeek);
        const exercises = w.exercises.map((e) => {
          if (e.sets.some((x) => x.done)) return e;
          return fresh.find((f) => f.slot === e.slot) ?? e;
        });
        for (const f of fresh) if (!exercises.some((e) => e.slot === f.slot)) exercises.push(f);
        change({ active: { ...w, place: to, exercises: exercises.filter((e) => e.sets.some((x) => x.done) || fresh.some((f) => f.slot === e.slot)) } });
      },
      swap: (ex, move, keep) => {
        const s = get();
        const w = s.active;
        const old = w?.exercises[ex];
        if (w === null || old === undefined || s.plan === null) return;
        const kept = keep ? { ...s.kept, [w.place]: { ...(s.kept[w.place] ?? {}), [old.slot]: move } } : s.kept;
        const planned = plannedDay(s.plan, { [w.place]: { [old.slot]: move } }, w.day, w.blockWeek, w.place).find((e) => e.slot === old.slot);
        const replacement = planned !== undefined && planned.move === move ? newExercises(s, [planned], w.blockWeek)[0]! : null;
        if (replacement === null) return;
        set({ kept });
        editExercise(ex, () => replacement);
      },
      skipExercise: (ex) => editExercise(ex, (e) => ({ ...e, skipped: true, sets: e.sets.filter((x) => x.done) })),
      finishWorkout: () => {
        const w = get().active;
        if (w === null) return null;
        const done: Workout = { ...w, finishedAt: now(), exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length > 0) };
        if (done.exercises.length === 0) {
          change({ active: null, restUntil: null });
          return null;
        }
        change({ active: null, workouts: [...get().workouts, done], restUntil: null });
        return done;
      },
      discardWorkout: () => change({ active: null, restUntil: null }),
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
        if (r.done[id] !== undefined) return;
        change({ reading: { ...r, done: { ...r.done, [id]: now() } } });
      },
      addFood: (entry) => {
        const at = now();
        const full: FoodEntry = { ...entry, id: newId(), day: dayKey(at), at };
        change({ food: [...get().food, full] });
        return full;
      },
      removeFood: (id) => {
        const found = get().food.find((f) => f.id === id) ?? null;
        if (found !== null) change({ food: get().food.filter((f) => f.id !== id) });
        return found;
      },
      restoreFood: (entry) => change({ food: [...get().food, entry].sort((a, b) => a.at - b.at) }),
      setTargets: (targets) => change({ targets }),
      resetAll: () => change({ ...EMPTY }),
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

