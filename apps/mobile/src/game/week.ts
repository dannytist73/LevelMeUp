// M17: the week's recap on Today. The first time the app opens in a new week (Monday first, in the chronicle's own
// dates), one System note says how last week went: the days cleared and rested, out of the days the chronicle has, never
// what was missed. A new week is a fresh start (the "fresh start" research in docs/2026-10-20-polish-loop.md). Pure.
import type { Offer } from '../state/store.ts';
import type { DayMark } from '../lib/calendar.ts';

export type WeekRecap = { key: `week:${string}`; cleared: number; rested: number; days: number };

const DAY_MS = 86_400_000;
const toDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The Monday of a date's week ("YYYY-MM-DD"). */
export function weekStart(date: string): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  const fromMonday = (new Date(ms).getUTCDay() + 6) % 7;
  return toDate(ms - fromMonday * DAY_MS);
}

/** Last week's recap while today's day runs, unless it was already shown this week; null when there's nothing to say. */
export function weekRecap(calendar: readonly { date: string; mark: DayMark }[], offers: readonly Offer[]): WeekRecap | null {
  const today = calendar.find((d) => d.mark === 'open');
  if (today === undefined) return null;
  const monday = weekStart(today.date);
  const key = `week:${monday}` as const;
  if (offers.includes(key)) return null;
  const from = toDate(Date.parse(`${monday}T00:00:00Z`) - 7 * DAY_MS);
  // One mark per date (a date can hold two quest days after a time-zone move): the strongest, as the calendar shows.
  const marks = new Map<string, DayMark>();
  for (const d of calendar) {
    if (d.date < from || d.date >= monday) continue;
    const kept = marks.get(d.date);
    if (kept === undefined || kept === 'none' || kept === 'paused') marks.set(d.date, d.mark);
  }
  if (marks.size < 2) return null;
  const values = [...marks.values()];
  return {
    key,
    cleared: values.filter((m) => m === 'cleared' || m === 'hard').length,
    rested: values.filter((m) => m === 'rest').length,
    days: marks.size,
  };
}
