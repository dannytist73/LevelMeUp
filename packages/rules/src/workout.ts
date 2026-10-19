// Workouts (M6c): sessions of several exercises, planned for the player from the library's moves and programs. Pure
// and deterministic, so the server plans a workout when it builds a day and the phone can draft the same quest again.
// The exercise names, slots and rep ranges come from the owner's Kaizen workout builders (docs/research); the words
// live in packages/content. M15 (plan 2026-10-20-m15-weekly-program.md): the weekly program, the builder's full days
// in its 6-week block.
import {
  BLOCK_RESTART_MS, BLOCK_WEEKS, EASY_WEEK_SETS, MIN_WORKOUT_MOVES, PROGRAM_HARD_DAY_SETS, WORKOUT_SET_MINUTES, WORKOUT_WARMUP_MINUTES,
} from './constants.ts';
import type { Condition, PlayerProfile, QuestTemplate } from './library.ts';
import type { Limitation } from './types.ts';

/** What a player can train with; bodyweight needs nothing, and a gym has everything (decision 1). */
export type Equipment = 'bands' | 'dumbbells' | 'bench' | 'pullup_bar' | 'gym';
export const EQUIPMENT: readonly Equipment[] = ['bands', 'dumbbells', 'bench', 'pullup_bar', 'gym'];

/** The program a player's workouts follow (owner decision 2026-10-11: Men's / Women's / No preference). */
export type ProgramStyle = 'men' | 'women' | 'none';
export const PROGRAM_STYLES: readonly ProgramStyle[] = ['men', 'women', 'none'];

/** A movement slot: exercises that can stand in for each other (the workout builder's substitution groups). */
export type MoveSlot =
  | 'horizontal_push' | 'incline_push' | 'chest' | 'vertical_push' | 'horizontal_pull' | 'vertical_pull' | 'squat'
  | 'quads' | 'hip_hinge' | 'hamstrings_glutes' | 'shoulders' | 'biceps' | 'triceps' | 'abs' | 'calves';
export const MOVE_SLOTS: readonly MoveSlot[] = [
  'horizontal_push', 'incline_push', 'chest', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'quads',
  'hip_hinge', 'hamstrings_glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'calves',
];

/** An exercise's picture family (quest art, decision 13). */
export type MovePattern = 'push' | 'press' | 'pull' | 'squat' | 'hinge' | 'core' | 'isolation';
export const MOVE_PATTERNS: readonly MovePattern[] = ['push', 'press', 'pull', 'squat', 'hinge', 'core', 'isolation'];

/** 1 is the easiest version; a workout template caps it. Every barbell lift is 3. */
export type MoveLevel = 1 | 2 | 3;

/** The rules-relevant part of an exercise. */
export type Move = {
  id: string;
  slots: readonly MoveSlot[];
  pattern: MovePattern;
  /** Everything it needs; empty for bodyweight. */
  needs: readonly Equipment[];
  level: MoveLevel;
  /** Reps, or seconds for a hold. */
  unit: 'reps' | 'seconds';
  min: number;
  max: number;
  perSide: boolean;
  contraindications: readonly Limitation[];
};

/** A program day: its slots, most important first. */
export type ProgramDay = readonly MoveSlot[];

/** How the player's workouts are set up (M15 decision 1): growing on readiness (M6c), or the weekly program. */
export type TrainingPlan = 'build' | 'weekly';
export const TRAINING_PLANS: readonly TrainingPlan[] = ['build', 'weekly'];
/** The weekly program's workouts a week (decision 2). */
export const PROGRAM_DAYS_OPTIONS: readonly number[] = [2, 3];

/** A weekly program slot: its movement and its sets in build-up weeks 1–5 (the builder's grid). */
export type BlockSlot = { slot: MoveSlot; sets: readonly number[] };
/** A weekly program day: its slots, most important first. */
export type BlockDay = readonly BlockSlot[];
/** The weekly programs (decision 2): the builder's 3-day layouts by program style, and the 2-day one they share. */
export type WeeklyPrograms = { three: Readonly<Record<ProgramStyle, readonly BlockDay[]>>; two: readonly BlockDay[] };

export type TrainingLibrary = {
  moves: readonly Move[];
  programs: Readonly<Record<ProgramStyle, readonly ProgramDay[]>>;
  weekly: WeeklyPrograms;
};

/** Where a weekly workout stands in its block (decision 3): week 1–6 (6 is the easy week) and its day (0 is A). */
export type ProgramBlock = { week: number; day: number };

/** One exercise of a planned workout; the template gives its sets, except in the weekly program (decision 6). */
export type PlannedMove = { move: string; unit: Move['unit']; min: number; max: number; perSide: boolean; sets?: number };

/** One exercise as a quest stores it. */
export type SessionMove = PlannedMove & { sets: number };

/** The same planned exercises, in the same order (M6e: a phone's offline workout against the server's plan). */
export function sameMoves(a: readonly PlannedMove[] | null, b: readonly PlannedMove[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((m, i) => {
    const n = b[i]!;
    return m.move === n.move && m.unit === n.unit && m.min === n.min && m.max === n.max && m.perSide === n.perSide && m.sets === n.sets;
  });
}

/** Minutes a workout takes: the warm-up plus every set with its rest. */
export function workoutMinutes(sets: readonly number[]): number {
  return WORKOUT_WARMUP_MINUTES + Math.ceil(sets.reduce((sum, n) => sum + n, 0) * WORKOUT_SET_MINUTES);
}

/** The template is a workout: a growing one (its condition gives the sets of each exercise) or a weekly one (M15). */
export const isWorkout = (template: Pick<QuestTemplate, 'condition'>): boolean =>
  template.condition.kind === 'workout' || template.condition.kind === 'program';

/** The template is a weekly program workout (M15 decision 5): its block gives the exercises and their sets. */
export const isProgram = (template: Pick<QuestTemplate, 'condition'>): boolean => template.condition.kind === 'program';

/** The player has what the move needs; a gym counts as everything. */
export function hasEquipment(move: Pick<Move, 'needs'>, equipment: readonly Equipment[]): boolean {
  return equipment.includes('gym') || move.needs.every((need) => equipment.includes(need));
}

/** Equipment the player owns first (they told us what they have), then the harder version. Ties keep library order. */
const preference = (move: Move): number => (move.needs.length > 0 ? 10 : 0) + move.level;

function workoutShape(template: QuestTemplate, hardDay: boolean) {
  const shape = hardDay ? template.hardDay.condition : template.condition;
  if (shape.kind !== 'workout') throw new RangeError(`${template.id} is not a workout`);
  return shape;
}

/** The best move for a slot (decision 5): owned equipment, no reported limitation, at most `level`, not yet picked. */
function bestMove(training: TrainingLibrary, slot: MoveSlot, level: MoveLevel, profile: PlayerProfile, picked: readonly Move[]): Move | null {
  let best: Move | null = null;
  for (const move of training.moves) {
    if (!move.slots.includes(slot) || move.level > level || picked.includes(move)) continue;
    if (!hasEquipment(move, profile.equipment) || move.contraindications.some((tag) => profile.limitations.includes(tag))) continue;
    if (best === null || preference(move) > preference(best)) best = move;
  }
  return best;
}

/**
 * Plans a workout (decision 5): for each slot of today's program day, then of the days after it, the best move the
 * player can do (owned equipment, no reported limitation, at most the template's level, not already in the session),
 * until the template has its exercises. Null when fewer than MIN_WORKOUT_MOVES fit: the day uses other strength quests.
 */
export function planWorkout(training: TrainingLibrary, template: QuestTemplate, profile: PlayerProfile, workoutsDone: number): PlannedMove[] | null {
  const shape = workoutShape(template, false);
  if (!Number.isInteger(workoutsDone) || workoutsDone < 0) throw new RangeError(`workoutsDone must be a whole number, got ${workoutsDone}`);
  const days = training.programs[profile.programStyle];
  if (days === undefined || days.length === 0) throw new RangeError(`no program for ${profile.programStyle}`);
  const today = workoutsDone % days.length;
  const slots = days.flatMap((_, i) => days[(today + i) % days.length]!);
  const picked: Move[] = [];
  for (const slot of slots) {
    if (picked.length === shape.sets.length) break;
    const best = bestMove(training, slot, shape.level, profile, picked);
    if (best !== null) picked.push(best);
  }
  if (picked.length < MIN_WORKOUT_MOVES) return null;
  return picked.map((m) => ({ move: m.id, unit: m.unit, min: m.min, max: m.max, perSide: m.perSide }));
}

/** The days a weekly program follows (decision 2): the shared 2-day layout at 2 a week, else the program style's. */
export function weeklyDays(training: TrainingLibrary, profile: Pick<PlayerProfile, 'programDays' | 'programStyle'>): readonly BlockDay[] {
  const days = profile.programDays === 2 ? training.weekly.two : training.weekly.three[profile.programStyle];
  if (days === undefined || days.length === 0) throw new RangeError(`no weekly program for ${profile.programStyle}, ${profile.programDays} a week`);
  return days;
}

/** The block's place of the next weekly workout (decision 3), `done` workouts into the run. */
export function programBlock(done: number, perWeek: number, days: number): ProgramBlock {
  if (!Number.isInteger(done) || done < 0) throw new RangeError(`programDone must be a whole number, got ${done}`);
  return { week: (Math.floor(done / perWeek) % BLOCK_WEEKS) + 1, day: done % days };
}

/**
 * Weekly workouts that count in the current run (decision 3), from the times the counted ones were completed: a run
 * starts again after BLOCK_RESTART_MS without one, and has ended when the last one is that long before `nowMs`.
 */
export function programRun(completedAt: readonly number[], nowMs: number): number {
  let done = 0;
  let last: number | null = null;
  for (const at of [...completedAt].sort((a, b) => a - b)) {
    done = last !== null && at - last > BLOCK_RESTART_MS ? 1 : done + 1;
    last = at;
  }
  return last === null || nowMs - last > BLOCK_RESTART_MS ? 0 : done;
}

/** Half a range for the easy week, rounded up, at least 1. */
const half = (n: number): number => Math.max(1, Math.ceil(n / 2));

/**
 * Plans a weekly workout (decisions 2, 6): every slot of the block's program day, in order, with the best move the
 * player can do (as planWorkout) and its sets for the week; the easy week has 2 sets of each at half the reps. A slot
 * nothing fits takes a move from the program's next days' slots, in order (as planWorkout fills a workout), or is left
 * out. Null when fewer than MIN_WORKOUT_MOVES fit.
 */
export function planProgram(training: TrainingLibrary, template: QuestTemplate, profile: PlayerProfile, programDone: number): PlannedMove[] | null {
  if (template.condition.kind !== 'program') throw new RangeError(`${template.id} is not a weekly workout`);
  const { level } = template.condition;
  const days = weeklyDays(training, profile);
  const block = programBlock(programDone, profile.programDays, days.length);
  const easy = block.week === BLOCK_WEEKS;
  const day = days[block.day]!;
  const picked: Move[] = [];
  const pick = (slot: MoveSlot): Move | null => {
    const best = bestMove(training, slot, level, profile, picked);
    if (best !== null) picked.push(best);
    return best;
  };
  // The day's own slots first, so a stand-in never takes a move one of them would have had.
  const chosen = day.map(({ slot }) => pick(slot));
  const standIns = days.flatMap((_, i) => (i === 0 ? [] : days[(block.day + i) % days.length]!.map((s) => s.slot)));
  let next = 0;
  for (let i = 0; i < chosen.length; i++) {
    while (chosen[i] === null && next < standIns.length) chosen[i] = pick(standIns[next++]!);
  }
  const moves: PlannedMove[] = [];
  chosen.forEach((move, i) => {
    if (move === null) return;
    moves.push({
      move: move.id, unit: move.unit, min: easy ? half(move.min) : move.min, max: easy ? half(move.max) : move.max, perSide: move.perSide,
      sets: easy ? EASY_WEEK_SETS : day[i]!.sets[block.week - 1]!,
    });
  });
  return moves.length < MIN_WORKOUT_MOVES ? null : moves;
}

/** The block of a weekly workout's plan (decision 6); null for every other quest. */
export function programBlockFor(training: TrainingLibrary, template: QuestTemplate, profile: PlayerProfile, programDone: number): ProgramBlock | null {
  return isProgram(template) ? programBlock(programDone, profile.programDays, weeklyDays(training, profile).length) : null;
}

/**
 * A planned workout as a quest stores it: each move with its sets in the version in use. The hard-day version keeps the
 * first exercises its shape lists (one set of the first two: the minimum session, decision 6). A weekly workout (M15)
 * takes its planned sets and keeps its block, in both versions.
 */
export function sessionCondition(template: QuestTemplate, moves: readonly PlannedMove[], hardDay: boolean, block: ProgramBlock | null = null): Condition {
  if (isProgram(template)) {
    if (block === null || moves.length < MIN_WORKOUT_MOVES || moves.some((m) => m.sets === undefined)) {
      throw new RangeError(`${template.id} takes its block and ${MIN_WORKOUT_MOVES} or more exercises with their sets`);
    }
    const hard = hardDay ? PROGRAM_HARD_DAY_SETS : null;
    const kept = hard === null ? moves : moves.slice(0, hard.length);
    return { kind: 'session', moves: kept.map((m, i) => ({ ...m, sets: hard === null ? m.sets! : hard[i]! })), block };
  }
  if (block !== null) throw new RangeError(`${template.id} is not a weekly workout`);
  const full = workoutShape(template, false);
  if (moves.length < MIN_WORKOUT_MOVES || moves.length > full.sets.length) {
    throw new RangeError(`${template.id} takes ${MIN_WORKOUT_MOVES} to ${full.sets.length} exercises, got ${moves.length}`);
  }
  const shape = workoutShape(template, hardDay);
  return { kind: 'session', moves: moves.slice(0, shape.sets.length).map(({ sets: _sets, ...m }, i) => ({ ...m, sets: shape.sets[i]! })) };
}

/** Minutes of a planned workout in the version in use; fewer moves than the template has take less. */
export function sessionMinutes(template: QuestTemplate, moves: readonly PlannedMove[], hardDay: boolean): number {
  if (isProgram(template)) return workoutMinutes(hardDay ? PROGRAM_HARD_DAY_SETS.slice(0, moves.length) : moves.map((m) => m.sets ?? 0));
  return workoutMinutes(workoutShape(template, hardDay).sets.slice(0, moves.length));
}

/**
 * A stored session's moves, to draft it again (its hard-day version); null for other quests. A growing workout's lose
 * their sets (its template gives them); a weekly workout's keep them (M15 decision 6).
 */
export function plannedMoves(condition: Condition): PlannedMove[] | null {
  if (condition.kind !== 'session') return null;
  if (condition.block !== undefined) return condition.moves.map((m) => ({ ...m }));
  return condition.moves.map(({ sets: _sets, ...move }) => move);
}

/** A stored weekly workout's block (M15); null for every other quest. */
export function plannedBlock(condition: Condition): ProgramBlock | null {
  return condition.kind === 'session' ? condition.block ?? null : null;
}

/** Every set a stored session asks for (the length of its log). */
export function sessionSets(condition: Condition): number {
  return condition.kind === 'session' ? condition.moves.reduce((sum, m) => sum + m.sets, 0) : 0;
}
