// Workout memory (M10c decision 7): the reps of the last time each exercise or rep-log quest was logged, kept on this
// phone, so the next log starts where you left it. Read from the phone's store with care: anything malformed is dropped.
import type { SessionMove } from '@levelmeup/rules';
import { MAX_REPS } from './payload.ts';

export type LastSets = Readonly<Record<string, readonly number[]>>;

export const moveKey = (move: string): string => `move:${move}`;
export const questKey = (templateId: string): string => `quest:${templateId}`;

const validSets = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every((n) => Number.isInteger(n) && n >= 0 && n <= MAX_REPS);

export function readLastSets(raw: string | null): LastSets {
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, sets]) => /^(move|quest):/.test(key) && validSets(sets)));
  } catch {
    return {};
  }
}

/** A logged workout's sets (sent flat, in order) split back into each exercise's. */
export function sessionMemory(moves: readonly SessionMove[], flat: readonly number[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  let at = 0;
  for (const m of moves) {
    out[moveKey(m.move)] = flat.slice(at, at + m.sets);
    at += m.sets;
  }
  return out;
}

/**
 * Where each set of a workout starts: last time's number when it lies in the exercise's range today, else the bottom of
 * the range (M6c decision 9). A set beyond last time's count starts at the bottom too.
 */
export function startFromLast(moves: readonly SessionMove[], last: LastSets): number[][] {
  return moves.map((m) => {
    const before = last[moveKey(m.move)] ?? [];
    return Array.from({ length: m.sets }, (_, i) => {
      const n = before[i];
      return n !== undefined && n >= m.min && n <= m.max ? n : m.min;
    });
  });
}

/** "10 · 9 · 8" for the "Last time" line. */
export const setsLine = (sets: readonly number[]): string => sets.join(' · ');
