import { CLOCK_SKEW_MS, FIRST_DAY_MIN_MS, LATE_SYNC_MS, MAX_DAY_MS, MIN_DAY_MS } from './constants.ts';

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

/** One quest day: absolute instants (epoch ms) plus the zone its end was computed in. */
export type DayWindow = { startsAt: number; endsAt: number; timeZone: string };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock reading in `timeZone` (an IANA name such as "Asia/Manila") at the instant `utcMs`. */
export function localParts(timeZone: string, utcMs: number): LocalParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(utcMs));
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Intl returned no ${type} for ${timeZone}`);
    return Number(part.value);
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
}

/** How far `timeZone` is ahead of UTC at `utcMs`, in ms (UTC+8 gives 28 800 000). */
export function offsetMs(timeZone: string, utcMs: number): number {
  const p = localParts(timeZone, utcMs);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallClockAsUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * The instant when the wall clock in `timeZone` shows `minutes` after midnight on the given date.
 * A time skipped by a DST change resolves to a nearby real instant.
 */
export function zonedToUtc(timeZone: string, year: number, month: number, day: number, minutes: number): number {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, minutes);
  const firstGuess = wallClockAsUtc - offsetMs(timeZone, wallClockAsUtc);
  return wallClockAsUtc - offsetMs(timeZone, firstGuess);
}

/** The first instant at or after `fromMs` when the wall clock in `timeZone` shows the boundary time. */
export function nextBoundaryAtOrAfter(timeZone: string, boundaryMinutes: number, fromMs: number): number {
  if (!Number.isInteger(boundaryMinutes) || boundaryMinutes < 0 || boundaryMinutes >= 24 * 60) {
    throw new RangeError(`boundaryMinutes must be an integer from 0 to 1439, got ${boundaryMinutes}`);
  }
  const start = localParts(timeZone, fromMs);
  for (let offsetDays = 0; offsetDays <= 2; offsetDays++) {
    const date = new Date(Date.UTC(start.year, start.month - 1, start.day + offsetDays));
    const candidate = zonedToUtc(timeZone, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), boundaryMinutes);
    if (candidate >= fromMs) return candidate;
  }
  throw new Error(`no ${boundaryMinutes}-minute boundary within 3 days of ${fromMs} in ${timeZone}`);
}

/** Day 1 starts when onboarding ends and runs to the first boundary at least 6 hours away. */
export function firstDayWindow(nowMs: number, timeZone: string, boundaryMinutes: number): DayWindow {
  return {
    startsAt: nowMs,
    endsAt: nextBoundaryAtOrAfter(timeZone, boundaryMinutes, nowMs + FIRST_DAY_MIN_MS),
    timeZone,
  };
}

/**
 * The day after `previous`. It starts when `previous` ends and ends at the first boundary at least 20 h later,
 * in the phone's zone at that moment, capped at 28 h (spec §3.8).
 */
export function nextDayWindow(previous: DayWindow, timeZone: string, boundaryMinutes: number): DayWindow {
  const startsAt = previous.endsAt;
  const boundary = nextBoundaryAtOrAfter(timeZone, boundaryMinutes, startsAt + MIN_DAY_MS);
  return { startsAt, endsAt: Math.min(boundary, startsAt + MAX_DAY_MS), timeZone };
}

/**
 * A day covers [startsAt, endsAt): it is closed from `endsAt` on, the instant the next day starts
 * (lazy closing, architecture §4.3).
 */
export function isClosed(day: DayWindow, nowMs: number): boolean {
  return nowMs >= day.endsAt;
}

/**
 * Whether a completion stamped `completedAt` still counts when it reaches the server at `receivedAt`: stamped inside
 * the day, not in the future (beyond small clock skew), and received no later than 48 h after the day closed.
 */
export function acceptsCompletion(day: DayWindow, completedAt: number, receivedAt: number): boolean {
  return (
    completedAt >= day.startsAt &&
    completedAt < day.endsAt &&
    completedAt <= receivedAt + CLOCK_SKEW_MS &&
    receivedAt <= day.endsAt + LATE_SYNC_MS
  );
}
