import type { Condition } from '../../../rules/src/index.ts';

// Shorthands for quest conditions, so the data files read like the tables in the M2 plan.
export const reps = (sets: number, count: number, perSide = false): Condition => ({ kind: 'reps', sets, reps: count, perSide });
export const hold = (sets: number, seconds: number, perSide = false): Condition => ({ kind: 'hold', sets, seconds, perSide });
export const minutes = (count: number): Condition => ({ kind: 'minutes', minutes: count });
export const HABIT: Condition = { kind: 'habit' };
export const SENTENCE: Condition = { kind: 'sentence' };
