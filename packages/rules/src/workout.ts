// Workouts (M6c): sessions of several exercises, planned for the player from the library's moves and programs. Pure
// and deterministic, so the server plans a workout when it builds a day and the phone can draft the same quest again.
// The exercise names, slots and rep ranges come from the owner's Kaizen workout builders (docs/research); the words
// live in packages/content.
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
