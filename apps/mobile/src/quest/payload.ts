// What a completion sends for each completion type (spec §3.6). The server checks the same shapes with the same limits
// (`checkCompletionPayload`), and the tests run every payload through it (M6a decision 2).
import { PLAY_TEXT } from '@levelmeup/content';
import type { Condition, SessionMove } from '@levelmeup/rules';
import { MAX_REPS, MAX_SENTENCE, MAX_SETS } from '../../../../supabase/functions/_shared/events.ts';
import { timerSegments } from './timer.ts';
import type { TimerState } from './timer.ts';

export { MAX_REPS, MAX_SENTENCE, MAX_SETS };

export const timerPayload = (t: TimerState, now: number) => ({ segments: timerSegments(t, now) });
export const repsPayload = (sets: readonly number[]) => ({ sets: [...sets] });
export const textPayload = (text: string) => ({ text: text.trim() });

/** A rep log starts at the target: each set at its reps, or at its seconds for a hold (decision 4). */
export function startingSets(condition: Condition): number[] {
  if (condition.kind === 'reps') return Array<number>(condition.sets).fill(condition.reps);
  if (condition.kind === 'hold') return Array<number>(condition.sets).fill(condition.seconds);
  return [1];
}

/** What a rep log counts: "reps", "reps per side", "seconds" or "seconds per side" (the words are content's). */
export function repUnit(condition: Condition): string {
  const units = PLAY_TEXT.reps.units;
  const perSide = 'perSide' in condition && condition.perSide;
  if (condition.kind === 'hold') return perSide ? units.secondsPerSide : units.seconds;
  return perSide ? units.repsPerSide : units.reps;
}

export const repsValid = (sets: readonly number[]): boolean =>
  sets.length >= 1 && sets.length <= MAX_SETS && sets.every((n) => Number.isInteger(n) && n >= 0 && n <= MAX_REPS) && sets.some((n) => n > 0);

const CONTROL = /\p{Cc}/u;

export function sentenceValid(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_SENTENCE && !CONTROL.test(trimmed);
}

/** A workout log starts each set at the bottom of its exercise's range (M6c decision 9). */
export function startingSession(moves: readonly SessionMove[]): number[][] {
  return moves.map((m) => Array<number>(m.sets).fill(m.min));
}

/** Every set, in order; the server checks the count against the plan. */
export const sessionPayload = (sets: readonly (readonly number[])[]) => ({ sets: sets.flat() });

export const sessionValid = (sets: readonly (readonly number[])[]): boolean => repsValid(sets.flat());

/** What a workout exercise counts, in content's words. */
export function moveUnit(move: Pick<SessionMove, 'unit' | 'perSide'>): string {
  const units = PLAY_TEXT.reps.units;
  if (move.unit === 'seconds') return move.perSide ? units.secondsPerSide : units.seconds;
  return move.perSide ? units.repsPerSide : units.reps;
}
