// The base app's state and the plain facts screens read from it (docs/2026-10-28-base-app.md). Everything lives on
// the phone today; sending it to the server waits for the owner's yes (B1 deploy).
import { BASE_LAYOUTS, BASE_MOVES, BASE_TEXT, BOOKS, baseMove, chapter, workoutName } from '@levelmeup/content';
import { advise, baseDays, bestSet, placeAt, planDay, planIndex, programRun } from '@levelmeup/rules';
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
  /** Weeks carried over from before `startedAt` (a days-a-week change keeps the week you were on). */
  weekOffset?: number;
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
  /** When the last set was ticked (a workout finished hours later is dated by it). */
  lastAt?: number;
};

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodEntry = { id: string; day: string; at: number; meal: Meal; name: string; amount: string; kcal: number; protein: number; carbs: number | null; fat: number | null };
export type Targets = { kcal: number; protein: number; weight: number; goal: 'lose' | 'keep' | 'gain' };

export type Reminder = 'off' | 'morning' | 'evening';

export type LookChoice = 'system' | 'dark' | 'light';

export type BaseData = {
  v: 1;
  /** Graphite dark or light, or as the phone is set. */
  look: LookChoice;
  reminder: Reminder;
  /** A notification when the rest ends while the app is in the background. */
  restAlerts: boolean;
  plan: PlanSetup | null;
  units: Units;
  workouts: Workout[];
  active: Workout | null;
  kept: KeptSwaps;
  /** The book you're on, the chapters read (when), and the card each unfinished chapter was left on. */
  reading: { book: string | null; done: Record<string, number>; at?: Record<string, number> };
  food: FoodEntry[];
  targets: Targets | null;
};

export const EMPTY: BaseData = { v: 1, look: 'system', reminder: 'off', restAlerts: false, plan: null, units: 'kg', workouts: [], active: null, kept: {}, reading: { book: null, done: {} }, food: [], targets: null };

/** The place a workout starts at: the gym unless you train only at home. */
export const defaultPlace = (plan: PlanSetup): Place => (plan.where === 'home' ? 'home' : 'gym');

/**
 * Workouts that count in the current run: only those since the plan was set up (a new plan starts at week 1), and
 * after 14 days away the plan starts again from its easy first week.
 */
export function doneInRun(data: BaseData, now: number): number {
  return programRun(planTimes(data), now);
}

/** When this plan's workouts were finished. */
const planTimes = (data: BaseData): number[] => {
  const since = data.plan?.startedAt ?? 0;
  return data.workouts.filter((w) => w.finishedAt !== null && w.finishedAt > since).map((w) => w.finishedAt!);
};

/** The plan started again after 14 days away: workouts were done in this plan, none count in the current run. */
export function restarted(data: BaseData, now: number): boolean {
  return planTimes(data).length > 0 && doneInRun(data, now) === 0 && !(place(data, now)?.finished ?? false);
}

export function place(data: BaseData, now: number): PlanPlace | null {
  if (data.plan === null) return null;
  const run = doneInRun(data, now);
  const before = planTimes(data).length - run;
  return placeAt(planIndex(data.plan.weekOffset ?? 0, before, run, data.plan.days), run % data.plan.days, data.plan.length);
}

/** The total weeks of a plan with an end (null for no end date). */
export const planWeeks = (plan: PlanSetup): number | null => (plan.length.kind === 'weeks' ? plan.length.weeks : null);

/** A day's exercises at a place, this block's kept swaps included. */
export function plannedDay(plan: PlanSetup, kept: KeptSwaps, day: number, blockWeek: number, at: Place): BaseExercise[] {
  const layout = baseDays(BASE_LAYOUTS, plan.style, plan.days);
  return planDay({ moves: BASE_MOVES, day: layout[day % layout.length]!, blockWeek, place: at, home: plan.home, limitations: plan.limitations, experience: plan.experience, kept });
}

/** The sets you did last time for a move: the newest finished workout that has it with a done set. */
export function lastSets(data: Pick<BaseData, 'workouts'>, move: string, skipEasy = false): LoggedSet[] {
  for (let i = data.workouts.length - 1; i >= 0; i--) {
    const w = data.workouts[i]!;
    // An easy week's half-rep sets say nothing about what to lift next (review 2026-10-28): advice looks past them.
    if (skipEasy && w.blockWeek === 6) continue;
    const ex = w.exercises.find((e) => e.move === move && e.sets.some((s) => s.done));
    if (ex !== undefined) return ex.sets.filter((s) => s.done);
  }
  return skipEasy ? lastSets(data, move, false) : [];
}

/** A move's best set over every finished workout. */
export function best(data: Pick<BaseData, 'workouts'>, move: string): LoggedSet | null {
  return bestSet(data.workouts.flatMap((w) => w.exercises.filter((e) => e.move === move).flatMap((e) => e.sets)));
}

/**
 * A new workout's exercises, ready to tick (research 2026-10-28 #1): each set starts at the advised weight (last time's,
 * a step up or down by the progression rules; the same in the easy week) and last time's reps, or the target.
 */
export function newExercises(data: BaseData, planned: readonly BaseExercise[], blockWeek = 1): WorkoutExercise[] {
  return planned.map((e) => {
    const last = lastSets(data, e.move, true);
    const a = blockWeek === 6 ? null : advise(baseMove(e.move), e.target, last, data.units);
    const weight = a !== null && (a.kind === 'up' || a.kind === 'down' || a.kind === 'same') ? a.weight : null;
    // A new weight starts at the bottom of the range: the shown reps are what a tick saves.
    const fresh = a !== null && (a.kind === 'up' || a.kind === 'down');
    const sets: LoggedSet[] = Array.from({ length: e.sets }, (_, i) => {
      const prev = last[Math.min(i, last.length - 1)];
      const reps = e.target.kind === 'fixed' ? e.target.reps : blockWeek === 6 || fresh ? e.target.min : prev?.reps ?? e.target.min;
      return { weight: weight ?? prev?.weight ?? null, reps, done: false };
    });
    return { slot: e.slot, move: e.move, target: e.target, restSeconds: e.restSeconds, sets };
  });
}

/**
 * Ramp-up sets before a heavy lift (Kaizen's warm-up, docs/research/kaizen-training.md §3.7): about 50% × 6, 75% × 4
 * and 90% × 2 of the working weight, rounded down to the plate step; none for a light weight.
 */
export function warmupSets(weight: number, units: 'kg' | 'lb'): { weight: number; reps: number }[] {
  const step = units === 'kg' ? 2.5 : 5;
  if (weight < (units === 'kg' ? 20 : 45)) return [];
  return [[0.5, 6], [0.75, 4], [0.9, 2]]
    .map(([share, reps]) => ({ weight: Math.floor((weight * share!) / step) * step, reps: reps! }))
    .filter((s, i, all) => s.weight > 0 && (i === 0 || s.weight !== all[i - 1]!.weight));
}

/** Days with a chapter read in the 7 days to `now` (weeks, not streaks: nothing is lost). */
export function readDaysThisWeek(data: Pick<BaseData, 'reading'>, now: number): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  return new Set(Object.values(data.reading.done).filter((t) => t >= start.getTime() && t <= now).map(dayKey)).size;
}

/** Workouts finished in the current plan week. */
export function doneThisWeek(data: BaseData, now: number): number {
  const p = place(data, now);
  if (p === null || data.plan === null) return 0;
  return p.day;
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

/** The home-screen widget's three lines: the next workout, the next chapter, today's food. Null without a plan. */
export function widgetLines(data: BaseData, now: number): { train: string; read: string; eat: string } | null {
  if (data.plan === null) return null;
  const W = BASE_TEXT.widget;
  const p = place(data, now)!;
  const train = data.active !== null ? W.inProgress(BASE_TEXT.today.workout(workoutName(data.active.day)))
    : p.finished ? W.planDone : W.next(BASE_TEXT.today.workout(workoutName(p.day)), BASE_TEXT.today.weekOf(p.week, planWeeks(data.plan)));
  const { book, next } = currentBook(data);
  const read = next === null ? W.bookDone : chapter(book.chapters[next]!).title;
  const eat = W.kcal(Math.round(foodTotals(data.food.filter((f) => f.day === dayKey(now))).kcal), data.targets?.kcal ?? null);
  return { train, read, eat };
}

/** Reads the saved record (the widget's task runs without the app). */
export function readBase(raw: string | null): BaseData | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BaseData> | null;
    return parsed !== null && typeof parsed === 'object' && parsed.v === 1 ? { ...EMPTY, ...parsed } : null;
  } catch {
    return null;
  }
}

/** A daily note's slot: its id, when it shows and what it says. */
export type DailyNote = { id: string; at: number; title: string; body: string };

/**
 * The daily reminder for the next 7 days at 8:00 or 19:00 (research 2026-10-28 #14): one quiet note naming the next
 * workout and chapter. Planned again each time the app opens, so it stops by itself after a week away.
 */
export function dailyNotes(data: BaseData, now: number): DailyNote[] {
  if (data.reminder === 'off') return [];
  const hour = data.reminder === 'morning' ? 8 : 19;
  const p = place(data, now);
  const workout = p === null || p.finished ? null : BASE_TEXT.today.workout(workoutName(p.day));
  const { book, next } = currentBook(data);
  const chapterTitle = next === null ? null : chapter(book.chapters[next]!).title;
  const notes: DailyNote[] = [];
  for (let i = 0; i < 8 && notes.length < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(hour, 0, 0, 0);
    if (d.getTime() <= now) continue;
    notes.push({ id: `base:${i}`, at: d.getTime(), title: BASE_TEXT.note.title, body: BASE_TEXT.note.body(workout, chapterTitle) });
  }
  return notes;
}
