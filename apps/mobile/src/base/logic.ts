// The base app's state and the plain facts screens read from it (docs/2026-10-28-base-app.md). Everything lives on
// the phone today; sending it to the server waits for the owner's yes (B1 deploy).
import { BASE_LAYOUTS, BASE_MOVES, BOOKS, baseMove } from '@levelmeup/content';
import { baseDays, bestSet, planDay, planPlace, programRun } from '@levelmeup/rules';
import type {
  BaseDays, BaseExercise, BaseStyle, Equipment, Experience, KeptSwaps, Limitation, LoggedSet, MoveSlot, Place, PlanLength, PlanPlace, Target, Units, Where,
} from '@levelmeup/rules';

export type PlanSetup = {
  style: BaseStyle;
  experience: Experience;
  length: PlanLength;
  days: BaseDays;
  where: Where;
  home: Equipment[];
  limitations: Limitation[];
  startedAt: number;
};

export type WorkoutExercise = { slot: MoveSlot; move: string; target: Target; restSeconds: number; sets: LoggedSet[]; skipped?: boolean };
export type Workout = {
  id: string;
  startedAt: number;
  finishedAt: number | null;
  day: number;
  week: number;
  blockWeek: number;
  place: Place;
  exercises: WorkoutExercise[];
};

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodEntry = { id: string; day: string; at: number; meal: Meal; name: string; amount: string; kcal: number; protein: number; carbs: number | null; fat: number | null };
export type Targets = { kcal: number; protein: number; weight: number; goal: 'lose' | 'keep' | 'gain' };

export type BaseData = {
  v: 1;
  plan: PlanSetup | null;
  units: Units;
  workouts: Workout[];
  active: Workout | null;
  kept: KeptSwaps;
  reading: { book: string | null; done: Record<string, number> };
  food: FoodEntry[];
  targets: Targets | null;
};

export const EMPTY: BaseData = { v: 1, plan: null, units: 'kg', workouts: [], active: null, kept: {}, reading: { book: null, done: {} }, food: [], targets: null };

/** The place a workout starts at: the gym unless you train only at home. */
export const defaultPlace = (plan: PlanSetup): Place => (plan.where === 'home' ? 'home' : 'gym');

/** Workouts that count in the current run: after 14 days away the plan starts again from its easy first week. */
export function doneInRun(data: BaseData, now: number): number {
  return programRun(data.workouts.filter((w) => w.finishedAt !== null).map((w) => w.finishedAt!), now);
}

export function place(data: BaseData, now: number): PlanPlace | null {
  return data.plan === null ? null : planPlace(doneInRun(data, now), data.plan.days, data.plan.length);
}

/** The total weeks of a plan with an end (null for no end date). */
export const planWeeks = (plan: PlanSetup): number | null => (plan.length.kind === 'weeks' ? plan.length.weeks : null);

/** A day's exercises at a place, this block's kept swaps included. */
export function plannedDay(plan: PlanSetup, kept: KeptSwaps, day: number, blockWeek: number, at: Place): BaseExercise[] {
  const layout = baseDays(BASE_LAYOUTS, plan.style, plan.days);
  return planDay({ moves: BASE_MOVES, day: layout[day % layout.length]!, blockWeek, place: at, home: plan.home, limitations: plan.limitations, experience: plan.experience, kept });
}

/** The sets you did last time for a move: the newest finished workout that has it with a done set. */
export function lastSets(data: Pick<BaseData, 'workouts'>, move: string): LoggedSet[] {
  for (let i = data.workouts.length - 1; i >= 0; i--) {
    const ex = data.workouts[i]!.exercises.find((e) => e.move === move && e.sets.some((s) => s.done));
    if (ex !== undefined) return ex.sets.filter((s) => s.done);
  }
  return [];
}

/** A move's best set over every finished workout. */
export function best(data: Pick<BaseData, 'workouts'>, move: string): LoggedSet | null {
  return bestSet(data.workouts.flatMap((w) => w.exercises.filter((e) => e.move === move).flatMap((e) => e.sets)));
}

/** A new workout's exercises: each set starts at last time's numbers (weight and reps), ready to tick. */
export function newExercises(data: BaseData, planned: readonly BaseExercise[]): WorkoutExercise[] {
  return planned.map((e) => {
    const last = lastSets(data, e.move);
    const sets: LoggedSet[] = Array.from({ length: e.sets }, (_, i) => {
      const prev = last[Math.min(i, last.length - 1)];
      const reps = e.target.kind === 'fixed' ? e.target.reps : prev?.reps ?? e.target.min;
      return { weight: prev?.weight ?? null, reps, done: false };
    });
    return { slot: e.slot, move: e.move, target: e.target, restSeconds: e.restSeconds, sets };
  });
}

/** Workouts finished in the current plan week. */
export function doneThisWeek(data: BaseData, now: number): number {
  const p = place(data, now);
  if (p === null || data.plan === null) return 0;
  return doneInRun(data, now) % data.plan.days;
}

/** A local calendar day's key, "2026-10-28". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function foodTotals(entries: readonly FoodEntry[]) {
  return entries.reduce((t, e) => ({ kcal: t.kcal + e.kcal, protein: t.protein + e.protein, carbs: t.carbs + (e.carbs ?? 0), fat: t.fat + (e.fat ?? 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

/** Recent different foods, newest first, for one-tap logging again. */
export function recentFoods(entries: readonly FoodEntry[], max = 6): FoodEntry[] {
  const seen = new Set<string>();
  const out: FoodEntry[] = [];
  for (let i = entries.length - 1; i >= 0 && out.length < max; i--) {
    const key = entries[i]!.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entries[i]!);
  }
  return out;
}

/**
 * Daily targets from body weight and goal: about 31 kcal per kg to stay the same, 20% less to lose fat, 10% more to
 * build muscle, and 1.8 g of protein per kg. A starting point the person can change.
 */
export function suggestTargets(weight: number, units: Units, goal: Targets['goal']): Targets {
  const kg = units === 'kg' ? weight : weight * 0.4536;
  const keep = kg * 31;
  const kcal = Math.round((goal === 'lose' ? keep * 0.8 : goal === 'gain' ? keep * 1.1 : keep) / 50) * 50;
  return { kcal, protein: Math.round(kg * 1.8 / 5) * 5, weight, goal };
}

/** The book you're reading: the chosen one, else the first. Its next chapter: the first not read (null when done). */
export function currentBook(data: BaseData) {
  const book = BOOKS.find((b) => b.id === data.reading.book) ?? BOOKS[0]!;
  const index = book.chapters.findIndex((c) => data.reading.done[c] === undefined);
  return { book, next: index === -1 ? null : index };
}

export const moveName = (id: string): string => baseMove(id).name;
