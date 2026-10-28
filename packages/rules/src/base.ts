// The base app's training plan (docs/2026-10-28-base-app.md, "Train"): plan lengths, where a workout falls in the
// 6-week Kaizen block, each day's exercises for the gym or home, the week's sets and rep targets, and next week's
// weight from the builders' progression rules (docs/research/kaizen-training.md §3.5, §3.6). Plain code, no copy: the
// app words these results from @levelmeup/content.
import type { Limitation } from './types.ts';
import type { BlockDay, Equipment, Move, MoveSlot } from './workout.ts';

/** Weeks in a Kaizen block: 5 building weeks, then the easy (deload) week. */
export const BASE_BLOCK_WEEKS = 6;
export const MIN_PLAN_WEEKS = 4;
export const MAX_PLAN_WEEKS = 52;
export const BASE_DAYS_OPTIONS = [2, 3, 4, 5] as const;
export type BaseDays = (typeof BASE_DAYS_OPTIONS)[number];

/** 6 weeks, 12 weeks, a custom number of weeks, or no end date (it keeps going in 6-week rounds). */
export type PlanLength = { kind: 'weeks'; weeks: number } | { kind: 'open' };
export type Experience = 'new' | 'returning' | 'regular';
export type Where = 'gym' | 'home' | 'both';
export type Place = 'gym' | 'home';
export type BaseStyle = 'men' | 'women';

/** Everything at a gym: machines and barbells, and the rest too. */
export const GYM_EQUIPMENT: readonly Equipment[] = ['gym', 'dumbbells', 'bench', 'bands', 'pullup_bar'];

/** The day layouts by days a week: the builders' 2x to 5x (§3.4). */
export type BaseDayLayouts = {
  two: readonly BlockDay[];
  three: Readonly<Record<BaseStyle, readonly BlockDay[]>>;
  four: Readonly<Record<BaseStyle, readonly BlockDay[]>>;
  five: readonly BlockDay[];
};

export function baseDays(layouts: BaseDayLayouts, style: BaseStyle, days: BaseDays): readonly BlockDay[] {
  switch (days) {
    case 2: return layouts.two;
    case 3: return layouts.three[style];
    case 4: return layouts.four[style];
    case 5: return layouts.five;
  }
}

/** A custom length's weeks, kept between 4 and 52. */
export const clampWeeks = (weeks: number): number => Math.min(MAX_PLAN_WEEKS, Math.max(MIN_PLAN_WEEKS, Math.round(weeks)));

/** The weeks from `startMs` to an end date, rounded up and kept between 4 and 52. */
export function weeksUntil(startMs: number, endMs: number): number {
  return clampWeeks(Math.ceil((endMs - startMs) / (7 * 24 * 60 * 60 * 1000)));
}

/** The end of a plan of `weeks` that starts at `startMs`. */
export const planEnd = (startMs: number, weeks: number): number => startMs + weeks * 7 * 24 * 60 * 60 * 1000;

/** Where the next workout falls: plan week (from 1), its week in the block (1 to 6, 6 the easy week), the day. */
export type PlanPlace = { week: number; blockWeek: number; round: number; day: number; finished: boolean };

/**
 * The next workout's place, `done` workouts into the plan: the week moves on by workouts done, not by the calendar
 * (the plan waits for you). A plan with an end has finished once all its weeks are done.
 */
export function planPlace(done: number, days: BaseDays, length: PlanLength): PlanPlace {
  if (!Number.isInteger(done) || done < 0) throw new RangeError(`done must be a whole number, got ${done}`);
  const index = Math.floor(done / days);
  return {
    week: index + 1,
    blockWeek: (index % BASE_BLOCK_WEEKS) + 1,
    round: Math.floor(index / BASE_BLOCK_WEEKS) + 1,
    day: done % days,
    finished: length.kind === 'weeks' && index >= length.weeks,
  };
}

/** The highest exercise level for where you are now: new and coming-back lifters start on the easier versions. */
export const levelCap = (experience: Experience): number => (experience === 'regular' ? 3 : 2);

/** What a place has: the gym has everything, home has what you said you own. */
export const equipmentAt = (place: Place, home: readonly Equipment[]): readonly Equipment[] => (place === 'gym' ? GYM_EQUIPMENT : home);

const fits = (move: Move, have: readonly Equipment[], limitations: readonly Limitation[], cap: number): boolean =>
  move.level <= cap && move.needs.every((n) => have.includes(n)) && !move.contraindications.some((c) => limitations.includes(c));

/**
 * The exercises that can fill a slot at a place, best first: those made for the slot, then the harder ones you're
 * ready for, then (at the gym) the machine and barbell versions, then the library's order.
 */
export function slotChoices(moves: readonly Move[], slot: MoveSlot, place: Place, home: readonly Equipment[], limitations: readonly Limitation[], experience: Experience): Move[] {
  const have = equipmentAt(place, home);
  const cap = levelCap(experience);
  const order = new Map(moves.map((m, i) => [m.id, i]));
  return moves
    .filter((m) => m.slots.includes(slot) && fits(m, have, limitations, cap))
    .sort((a, b) =>
      Number(b.slots[0] === slot) - Number(a.slots[0] === slot)
      || b.level - a.level
      || (place === 'gym' ? Number(b.needs.includes('gym')) - Number(a.needs.includes('gym')) : 0)
      || order.get(a.id)! - order.get(b.id)!);
}

/** A planned exercise: its slot, the move, the week's sets and its rep target. */
export type BaseExercise = { slot: MoveSlot; move: string; sets: number; target: Target; restSeconds: number };
/** Fixed reps every set (a main lift), or a range to fill (accessories, bands, bodyweight, holds). */
export type Target = { kind: 'fixed'; reps: number } | { kind: 'range'; min: number; max: number; unit: 'reps' | 'seconds' };

/** The builders' fixed targets for a day's main lift (§3.6), by our exercise ids. */
export const FIXED_TARGETS: Readonly<Record<string, number>> = {
  'barbell-bench-press': 6, 'barbell-squat': 6,
  'db-incline-press': 8, 'machine-chest-press': 8, 'db-floor-press': 8, 'barbell-rdl': 8,
  'db-rdl': 10,
};
const MAIN_SLOTS: readonly MoveSlot[] = ['horizontal_push', 'incline_push', 'squat', 'hip_hinge'];

/** The week's target for a move: a day's first push, squat or hinge slot uses a fixed target when the builder has one. */
export function targetFor(move: Move, slot: MoveSlot, isFirst: boolean, blockWeek: number): Target {
  const fixed = FIXED_TARGETS[move.id];
  const easy = blockWeek === BASE_BLOCK_WEEKS;
  const half = (n: number): number => Math.max(1, Math.ceil(n / 2));
  if (fixed !== undefined && isFirst && MAIN_SLOTS.includes(slot)) return { kind: 'fixed', reps: easy ? half(fixed) : fixed };
  return easy ? { kind: 'range', min: half(move.min), max: half(move.max), unit: move.unit } : { kind: 'range', min: move.min, max: move.max, unit: move.unit };
}

/** Rest between sets (§3.5): 2 to 3 minutes for compounds, 1 to 2 for isolation, abs and calves. */
export const restFor = (move: Move): number => (move.pattern === 'isolation' || move.pattern === 'core' ? 90 : 150);

/**
 * When nothing at a place fits a slot (arms and shoulders at home with nothing), a move from these slots stands in,
 * in order, so a bodyweight workout stays full.
 */
export const FALLBACK: Readonly<Partial<Record<MoveSlot, readonly MoveSlot[]>>> = {
  incline_push: ['horizontal_push'], chest: ['horizontal_push'], vertical_push: ['horizontal_push'],
  triceps: ['vertical_push', 'horizontal_push'], biceps: ['vertical_pull', 'horizontal_pull'], shoulders: ['vertical_push', 'horizontal_pull'],
  vertical_pull: ['horizontal_pull'], quads: ['squat'], hamstrings_glutes: ['hip_hinge'], calves: ['squat'],
};

/** Kept swaps: a slot's chosen move for this block, by place. */
export type KeptSwaps = Readonly<Partial<Record<Place, Readonly<Partial<Record<MoveSlot, string>>>>>>;

export type BaseDayInput = {
  moves: readonly Move[];
  day: BlockDay;
  blockWeek: number;
  place: Place;
  home: readonly Equipment[];
  limitations: readonly Limitation[];
  experience: Experience;
  kept?: KeptSwaps;
};

/**
 * A day's workout at a place: each slot's best move (or the one you kept for this block), never the same move twice;
 * the week's sets (2 of everything in the easy week); a slot nothing fits at that place is left out.
 */
export function planDay({ moves, day, blockWeek, place, home, limitations, experience, kept }: BaseDayInput): BaseExercise[] {
  if (!Number.isInteger(blockWeek) || blockWeek < 1 || blockWeek > BASE_BLOCK_WEEKS) throw new RangeError(`blockWeek must be 1 to 6, got ${blockWeek}`);
  const used = new Set<string>();
  const out: BaseExercise[] = [];
  day.forEach(({ slot, sets }, i) => {
    const choices = slotChoices(moves, slot, place, home, limitations, experience).filter((m) => !used.has(m.id));
    const keptId = kept?.[place]?.[slot];
    const stand = (FALLBACK[slot] ?? []).flatMap((s) => slotChoices(moves, s, place, home, limitations, experience)).filter((m) => !used.has(m.id));
    const move = choices.find((m) => m.id === keptId) ?? choices[0] ?? stand[0];
    if (move === undefined) return;
    used.add(move.id);
    const count = blockWeek === BASE_BLOCK_WEEKS ? 2 : (sets[blockWeek - 1] ?? sets[sets.length - 1] ?? 3);
    out.push({ slot, move: move.id, sets: count, target: targetFor(move, slot, i === 0, blockWeek), restSeconds: restFor(move) });
  });
  return out;
}

/** A logged set: the weight (null for bodyweight and bands), the reps or seconds, and whether it was done. */
export type LoggedSet = { weight: number | null; reps: number | null; done: boolean };
export type Units = 'kg' | 'lb';

/** How a move progresses (§3.6): fixed target, double progression, band, bodyweight, or a hold. */
export type Progression = 'fixed' | 'double' | 'band' | 'bodyweight' | 'hold';

export function progressionOf(move: Move, target: Target): Progression {
  if (move.unit === 'seconds') return 'hold';
  if (target.kind === 'fixed') return 'fixed';
  if (move.needs.length === 1 && move.needs[0] === 'bands') return 'band';
  if (move.needs.length === 0 || (move.needs.length === 1 && move.needs[0] === 'pullup_bar')) return 'bodyweight';
  return 'double';
}

/** The weight step: 2.5 kg or 5 lb for the upper body, double for squats and hinges. */
export function weightStep(move: Move, units: Units): number {
  const lower = move.pattern === 'squat' || move.pattern === 'hinge';
  return units === 'kg' ? (lower ? 5 : 2.5) : lower ? 10 : 5;
}

/** Next time's advice for a move: more weight, less, the same, a harder version or a heavier band. */
export type Advice =
  | { kind: 'up' | 'down' | 'same'; weight: number }
  | { kind: 'more_reps' | 'harder' | 'heavier_band' | 'longer' | 'first' };

/**
 * Next time's advice from the last workout's done sets of a move (§3.6). Fixed: the last set at target + 2 adds a
 * step, any set short of the target takes one off. Double: every set at the top of the range adds a step, any below
 * the bottom takes one off. Bands: 20 or more on every set means a heavier band. Bodyweight: the top of the range on
 * every set means a harder version. Nothing done yet: first time.
 */
export function advise(move: Move, target: Target, last: readonly LoggedSet[], units: Units): Advice {
  const sets = last.filter((s) => s.done && s.reps !== null);
  if (sets.length === 0) return { kind: 'first' };
  const reps = sets.map((s) => s.reps!);
  const weights = sets.map((s) => s.weight).filter((w): w is number => w !== null && w > 0);
  const weight = weights.length > 0 ? Math.max(...weights) : null;
  const step = weightStep(move, units);
  const kind = progressionOf(move, target);
  const lo = target.kind === 'fixed' ? target.reps : target.min;
  const hi = target.kind === 'fixed' ? target.reps + 2 : target.max;
  const top = target.kind === 'fixed' ? reps[reps.length - 1]! >= hi : reps.every((r) => r >= hi);
  const short = reps.some((r) => r < lo);
  switch (kind) {
    case 'hold': return reps.every((r) => r >= hi) ? { kind: 'longer' } : { kind: 'more_reps' };
    case 'band': return reps.every((r) => r >= 20) ? { kind: 'heavier_band' } : { kind: 'more_reps' };
    case 'bodyweight': return top ? { kind: 'harder' } : { kind: 'more_reps' };
    default:
      if (weight === null) return top ? { kind: 'harder' } : { kind: 'more_reps' };
      if (top) return { kind: 'up', weight: weight + step };
      if (short) return { kind: 'down', weight: Math.max(0, weight - step) };
      return { kind: 'same', weight };
  }
}

/** A set's work for bests: weight × reps (reps alone without a weight). */
export const setScore = (s: LoggedSet): number => (s.reps ?? 0) * (s.weight !== null && s.weight > 0 ? s.weight : 1);

/** The best of some sets: the heaviest weight, then the most reps at it; reps alone when nothing had a weight. */
export function bestSet(sets: readonly LoggedSet[]): LoggedSet | null {
  let best: LoggedSet | null = null;
  for (const s of sets) {
    if (!s.done || s.reps === null || s.reps <= 0) continue;
    if (best === null) { best = s; continue; }
    const w = s.weight ?? 0;
    const bw = best.weight ?? 0;
    if (w > bw || (w === bw && s.reps > best.reps!)) best = s;
  }
  return best;
}

/** Weight × reps over every done set with a weight (a workout's total lifted). */
export const volume = (sets: readonly LoggedSet[]): number =>
  sets.reduce((sum, s) => sum + (s.done && s.weight !== null && s.reps !== null ? s.weight * s.reps : 0), 0);

/** A workout's minutes, roughly: a minute a set plus its rest. */
export const baseMinutes = (exercises: readonly Pick<BaseExercise, 'sets' | 'restSeconds'>[]): number =>
  Math.round(exercises.reduce((sum, e) => sum + e.sets * (60 + e.restSeconds), 0) / 60 / 5) * 5;
