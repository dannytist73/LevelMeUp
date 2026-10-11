// Workouts (M6c): sessions of several exercises, planned for the player from the library's moves and programs. Pure
// and deterministic, so the server plans a workout when it builds a day and the phone can draft the same quest again.
// The exercise names, slots and rep ranges come from the owner's Kaizen workout builders (docs/research); the words
// live in packages/content.
import { MIN_WORKOUT_MOVES, WORKOUT_SET_MINUTES, WORKOUT_WARMUP_MINUTES } from './constants.ts';
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

export type TrainingLibrary = { moves: readonly Move[]; programs: Readonly<Record<ProgramStyle, readonly ProgramDay[]>> };

/** One exercise of a planned workout; the template gives its sets. */
export type PlannedMove = { move: string; unit: Move['unit']; min: number; max: number; perSide: boolean };

/** One exercise as a quest stores it. */
export type SessionMove = PlannedMove & { sets: number };

/** The same planned exercises, in the same order (M6e: a phone's offline workout against the server's plan). */
export function sameMoves(a: readonly PlannedMove[] | null, b: readonly PlannedMove[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((m, i) => {
    const n = b[i]!;
    return m.move === n.move && m.unit === n.unit && m.min === n.min && m.max === n.max && m.perSide === n.perSide;
  });
}

/** Minutes a workout takes: the warm-up plus every set with its rest. */
export function workoutMinutes(sets: readonly number[]): number {
  return WORKOUT_WARMUP_MINUTES + Math.ceil(sets.reduce((sum, n) => sum + n, 0) * WORKOUT_SET_MINUTES);
}

/** The template is a workout: its condition gives the sets of each exercise. */
export const isWorkout = (template: Pick<QuestTemplate, 'condition'>): boolean => template.condition.kind === 'workout';

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
    let best: Move | null = null;
    for (const move of training.moves) {
      if (!move.slots.includes(slot) || move.level > shape.level || picked.includes(move)) continue;
      if (!hasEquipment(move, profile.equipment) || move.contraindications.some((tag) => profile.limitations.includes(tag))) continue;
      if (best === null || preference(move) > preference(best)) best = move;
    }
    if (best !== null) picked.push(best);
  }
  if (picked.length < MIN_WORKOUT_MOVES) return null;
  return picked.map((m) => ({ move: m.id, unit: m.unit, min: m.min, max: m.max, perSide: m.perSide }));
}

/**
 * A planned workout as a quest stores it: each move with its sets in the version in use. The hard-day version keeps the
 * first exercises its shape lists (one set of the first two: the minimum session, decision 6).
 */
export function sessionCondition(template: QuestTemplate, moves: readonly PlannedMove[], hardDay: boolean): Condition {
  const full = workoutShape(template, false);
  if (moves.length < MIN_WORKOUT_MOVES || moves.length > full.sets.length) {
    throw new RangeError(`${template.id} takes ${MIN_WORKOUT_MOVES} to ${full.sets.length} exercises, got ${moves.length}`);
  }
  const shape = workoutShape(template, hardDay);
  return { kind: 'session', moves: moves.slice(0, shape.sets.length).map((m, i) => ({ ...m, sets: shape.sets[i]! })) };
}

/** Minutes of a planned workout in the version in use; fewer moves than the template has take less. */
export function sessionMinutes(template: QuestTemplate, moves: readonly PlannedMove[], hardDay: boolean): number {
  return workoutMinutes(workoutShape(template, hardDay).sets.slice(0, moves.length));
}

/** A stored session's moves without their sets, to draft it again (its hard-day version); null for other quests. */
export function plannedMoves(condition: Condition): PlannedMove[] | null {
  if (condition.kind !== 'session') return null;
  return condition.moves.map(({ sets: _sets, ...move }) => move);
}

/** Every set a stored session asks for (the length of its log). */
export function sessionSets(condition: Condition): number {
  return condition.kind === 'session' ? condition.moves.reduce((sum, m) => sum + m.sets, 0) : 0;
}
