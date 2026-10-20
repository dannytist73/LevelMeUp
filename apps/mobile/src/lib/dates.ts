// Dates as the boards show them ("Saturday, 10 Oct", "07:40"), in the quest day's own zone. Built on the rules' localParts
// with fixed English names, so they never depend on the phone's language or on Hermes's locale data. M12 (audit 20):
// sentence case everywhere, as Lantern's labels are.
import { localParts } from '@levelmeup/rules';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
] as const;

/** "Saturday, 10 Oct" for a `YYYY-MM-DD` date (Today's header: the quest day's date, rules `questDayDate`). */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
  return `${weekday}, ${d} ${titleCase(MONTHS[m - 1]!)}`;
}

export function clockTime(iso: string, timeZone: string): string {
  const p = localParts(timeZone, Date.parse(iso));
  // M17 (design critique): the 12-hour clock the settings and onboarding use ("7:40 AM"); it was "07:40" here alone.
  return clockLabel(p.hour * 60 + p.minute);
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
export const monthLabel = ({ year, month }: { year: number; month: number }): string => `${titleCase(MONTH_NAMES[month - 1]!)} ${year}`;
