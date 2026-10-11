// Dates as the boards show them ("SAT · 10 OCT", "07:40"), in the quest day's own zone. Built on the rules' localParts
// with fixed English names, so they never depend on the phone's language or on Hermes's locale data.
import { localParts } from '@levelmeup/rules';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;
const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
] as const;

/** "SAT · 10 OCT" for a `YYYY-MM-DD` date (Today's header: the quest day's date, rules `questDayDate`). */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
  return `${weekday} · ${d} ${MONTHS[m - 1]!}`;
}

export function clockTime(iso: string, timeZone: string): string {
  const p = localParts(timeZone, Date.parse(iso));
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** "7:00 AM" for minutes after midnight (the Rhythm board's clock). */
export function clockLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  return `${((hour + 11) % 12) + 1}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

const titleCase = (word: string): string => word.charAt(0) + word.slice(1).toLowerCase();

/** "Sat 24 Oct", inside a sentence (the class-change lock). */
export function dateLine(ms: number, timeZone: string): string {
  const p = localParts(timeZone, ms);
  const weekday = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]!;
  return `${titleCase(weekday)} ${p.day} ${titleCase(MONTHS[p.month - 1]!)}`;
}

/** "Mon 12 Oct" for a `YYYY-MM-DD` date (calendar cells, "Since day 1"). */
export function dateKeyLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
  return `${titleCase(weekday)} ${d} ${titleCase(MONTHS[m - 1]!)}`;
}

/** "OCTOBER 2026" (the calendar's title). */
export const monthLabel = ({ year, month }: { year: number; month: number }): string => `${MONTH_NAMES[month - 1]!} ${year}`;
