// The Chronicle's month calendar (M6d, board D5): Monday-first weeks of `YYYY-MM-DD` dates (date arithmetic in UTC: a
// date key has no zone), moving between months, and today's look from the phone's own day.
import { STREAK_SLOTS, closedDayResolution } from '@levelmeup/rules';
import type { Protection, Slot } from '@levelmeup/rules';

export type Month = { year: number; month: number };
export type CellMark = 'cleared' | 'hard' | 'rest' | 'paused' | 'none';

const pad = (n: number): string => String(n).padStart(2, '0');

export const monthOf = (date: string): Month => ({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) });

export function shiftMonth({ year, month }: Month, by: number): Month {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export const compareMonths = (a: Month, b: Month): number => (a.year - b.year) * 12 + (a.month - b.month);

/** The month's weeks, Monday first; cells outside the month are null. */
export function monthWeeks({ year, month }: Month): (string | null)[][] {
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

const REST: readonly Protection[] = ['planned_rest', 'pain'];

/** Today as it would close now (decision 4), by the same rules as a closed day's mark. */
export function todayMark(day: { protection: Protection | null; hardDay: boolean; quests: readonly { slot: Slot; completedAt: string | null }[] }): CellMark {
  const done = day.quests.filter((q) => q.completedAt !== null);
  const resolution = closedDayResolution({
    coreDone: done.some((q) => q.slot === 'core'),
    questsDone: done.filter((q) => STREAK_SLOTS.includes(q.slot)).length,
    protection: day.protection,
  });
  if (resolution.kind === 'protected') return day.protection !== null && REST.includes(day.protection) ? 'rest' : 'paused';
  if (resolution.kind === 'streak_day') return day.hardDay ? 'hard' : 'cleared';
  return 'none';
}
