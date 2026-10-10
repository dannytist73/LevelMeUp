// The time-zone expectations from time.test.ts as plain data, so the phone can run the same checks on Hermes (its
// Intl implementation is not V8's). Vitest proves every case in Node (hermes-cases.test.ts); the app's developer
// self-check runs them on the device. Each `actual` returns plain JSON so the comparison needs no test library.
import { HOUR_MS } from '../src/constants.ts';
import {
  acceptsCompletion, canonicalTimeZone, firstDayWindow, isClosed, isValidTimeZone, localParts, nextBoundaryAtOrAfter,
  nextDayWindow, offsetMs, zonedToUtc,
} from '../src/time.ts';
import type { DayWindow } from '../src/time.ts';

export type TimeCase = { name: string; actual: () => unknown; expected: unknown };

const iso = (text: string): number => Date.parse(text);
const hours = (window: DayWindow): number => (window.endsAt - window.startsAt) / HOUR_MS;
const FOUR_AM = 240;
const windowEnding = (endsAt: string, timeZone: string): DayWindow => ({
  startsAt: iso(endsAt) - 24 * HOUR_MS,
  endsAt: iso(endsAt),
  timeZone,
});
const throwsRange = (fn: () => unknown): boolean => {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof RangeError;
  }
};

/** Ends of `count` days flown into `timeZone`, and whether each stayed within 20–28 h. */
function flight(from: DayWindow, timeZone: string, count: number): { ends: number[]; within: boolean[] } {
  let window = from;
  const ends: number[] = [];
  const within: boolean[] = [];
  for (let i = 0; i < count; i++) {
    window = nextDayWindow(window, timeZone, FOUR_AM);
    ends.push(window.endsAt);
    within.push(hours(window) >= 20 && hours(window) <= 28);
  }
  return { ends, within };
}

/** Days that break the rules over a long run (contiguous, 20–28 h, and optionally ending at 4:00 AM local). */
function longRun(timeZone: string, boundary: number, days: number, endAtFour: boolean): string[] {
  const broken: string[] = [];
  let window = firstDayWindow(iso('2026-01-01T12:00:00Z'), timeZone, boundary);
  for (let i = 0; i < days && broken.length < 3; i++) {
    const next = nextDayWindow(window, timeZone, boundary);
    if (next.startsAt !== window.endsAt) broken.push(`day ${i}: gap`);
    if (hours(next) < 20 || hours(next) > 28) broken.push(`day ${i}: ${hours(next)} h`);
    if (endAtFour) {
      const end = localParts(timeZone, next.endsAt);
      if (end.hour !== 4 || end.minute !== 0) broken.push(`day ${i}: ends ${end.hour}:${end.minute}`);
    }
    window = next;
  }
  return broken;
}

const closingDay = windowEnding('2026-10-10T20:00:00Z', 'Asia/Manila');
const inside = closingDay.startsAt + HOUR_MS;

export const TIME_CASES: readonly TimeCase[] = [
  {
    name: 'wall-clock parts in Manila',
    actual: () => localParts('Asia/Manila', iso('2026-10-09T20:00:00Z')),
    expected: { year: 2026, month: 10, day: 10, hour: 4, minute: 0, second: 0 },
  },
  {
    name: 'offsets: Manila, New York summer and winter',
    actual: () => [
      offsetMs('Asia/Manila', iso('2026-10-10T00:00:00Z')),
      offsetMs('America/New_York', iso('2026-07-01T12:00:00Z')),
      offsetMs('America/New_York', iso('2026-01-15T12:00:00Z')),
    ],
    expected: [8 * HOUR_MS, -4 * HOUR_MS, -5 * HOUR_MS],
  },
  {
    name: 'wall-clock to instant on both sides of a DST change',
    actual: () => [
      zonedToUtc('America/New_York', 2026, 3, 8, FOUR_AM),
      zonedToUtc('America/New_York', 2026, 11, 1, FOUR_AM),
      zonedToUtc('Europe/London', 2026, 3, 29, FOUR_AM),
    ],
    expected: [iso('2026-03-08T08:00:00Z'), iso('2026-11-01T09:00:00Z'), iso('2026-03-29T03:00:00Z')],
  },
  {
    name: 'next boundary at or after an instant',
    actual: () => [
      nextBoundaryAtOrAfter('Asia/Manila', FOUR_AM, iso('2026-10-09T20:00:00Z')),
      nextBoundaryAtOrAfter('Asia/Manila', FOUR_AM, iso('2026-10-09T20:00:01Z')),
    ],
    expected: [iso('2026-10-09T20:00:00Z'), iso('2026-10-10T20:00:00Z')],
  },
  {
    name: 'canonical zone names (and Calcutta, the ICU spelling)',
    actual: () => [
      canonicalTimeZone('asia/manila'),
      firstDayWindow(iso('2026-10-10T07:00:00Z'), 'ASIA/MANILA', FOUR_AM).timeZone,
      isValidTimeZone(canonicalTimeZone('Asia/Calcutta')),
      throwsRange(() => canonicalTimeZone('Mars/Olympus')),
    ],
    expected: ['Asia/Manila', 'Asia/Manila', true, true],
  },
  {
    name: 'zone and boundary validation',
    actual: () => [
      isValidTimeZone('Asia/Manila'),
      isValidTimeZone('Mars/Olympus'),
      throwsRange(() => localParts('Mars/Olympus', 0)),
      throwsRange(() => nextBoundaryAtOrAfter('Asia/Manila', 1440, 0)),
    ],
    expected: [true, false, true, true],
  },
  {
    name: 'a normal day runs boundary to boundary, 24 h',
    actual: () => nextDayWindow(windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila'), 'Asia/Manila', FOUR_AM),
    expected: { startsAt: iso('2026-10-09T20:00:00Z'), endsAt: iso('2026-10-10T20:00:00Z'), timeZone: 'Asia/Manila' },
  },
  {
    name: 'spring forward: 23 h (New York, London); fall back: 25 h (New York)',
    actual: () => [
      hours(nextDayWindow(windowEnding('2026-03-07T09:00:00Z', 'America/New_York'), 'America/New_York', FOUR_AM)),
      hours(nextDayWindow(windowEnding('2026-03-28T04:00:00Z', 'Europe/London'), 'Europe/London', FOUR_AM)),
      hours(nextDayWindow(windowEnding('2026-10-31T08:00:00Z', 'America/New_York'), 'America/New_York', FOUR_AM)),
    ],
    expected: [23, 23, 25],
  },
  {
    name: 'a short hop (Manila to Tokyo) keeps the boundary',
    actual: () => nextDayWindow(windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila'), 'Asia/Tokyo', FOUR_AM).endsAt,
    expected: iso('2026-10-10T19:00:00Z'),
  },
  {
    name: 'flying east (Los Angeles to Manila): 20–28 h days, re-synced in 3',
    actual: () => flight(windowEnding('2026-10-11T11:00:00Z', 'America/Los_Angeles'), 'Asia/Manila', 3),
    expected: {
      ends: [iso('2026-10-12T15:00:00Z'), iso('2026-10-13T19:00:00Z'), iso('2026-10-14T20:00:00Z')],
      within: [true, true, true],
    },
  },
  {
    name: 'flying west (Manila to Los Angeles): 20–28 h days, re-synced in 4',
    actual: () => flight(windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila'), 'America/Los_Angeles', 4),
    expected: {
      ends: [iso('2026-10-11T00:00:00Z'), iso('2026-10-12T04:00:00Z'), iso('2026-10-13T08:00:00Z'), iso('2026-10-14T11:00:00Z')],
      within: [true, true, true, true],
    },
  },
  {
    name: 'a 2:00 PM boundary for a shift worker',
    actual: () => nextDayWindow(windowEnding('2026-10-09T06:00:00Z', 'Asia/Manila'), 'Asia/Manila', 14 * 60).endsAt,
    expected: iso('2026-10-10T06:00:00Z'),
  },
  {
    name: 'day 1 ends at the first boundary at least 6 h away',
    actual: () => [
      firstDayWindow(iso('2026-10-10T07:00:00Z'), 'Asia/Manila', FOUR_AM),
      firstDayWindow(iso('2026-10-10T17:00:00Z'), 'Asia/Manila', FOUR_AM).endsAt,
    ],
    expected: [
      { startsAt: iso('2026-10-10T07:00:00Z'), endsAt: iso('2026-10-10T20:00:00Z'), timeZone: 'Asia/Manila' },
      iso('2026-10-11T20:00:00Z'),
    ],
  },
  ...['Asia/Manila', 'America/New_York', 'Europe/London', 'Australia/Sydney', 'America/Los_Angeles'].map((timeZone) => ({
    name: `${timeZone}: 400 days contiguous, 20–28 h, ending at 4:00 AM`,
    actual: () => longRun(timeZone, FOUR_AM, 400, true),
    expected: [],
  })),
  {
    name: 'boundaries a DST change skips (Santiago, Havana, Beirut midnight; New York 2:30 AM; Kathmandu 11:59 PM)',
    actual: () =>
      ([['America/Santiago', 0], ['America/Havana', 0], ['Asia/Beirut', 0], ['America/New_York', 150], ['Asia/Kathmandu', 1439]] as const)
        .flatMap(([timeZone, boundary]) => longRun(timeZone, boundary, 800, false).map((b) => `${timeZone} ${b}`)),
    expected: [],
  },
  {
    name: 'closing and late completions',
    actual: () => [
      isClosed(closingDay, closingDay.endsAt - 1),
      isClosed(closingDay, closingDay.endsAt),
      acceptsCompletion(closingDay, inside, closingDay.endsAt + 48 * HOUR_MS),
      acceptsCompletion(closingDay, inside, closingDay.endsAt + 48 * HOUR_MS + 1),
      acceptsCompletion(closingDay, closingDay.startsAt - 1, inside),
      acceptsCompletion(closingDay, closingDay.endsAt, closingDay.endsAt),
      acceptsCompletion(closingDay, inside + 10 * 60_000, inside),
    ],
    expected: [false, true, true, false, false, false, false],
  },
];
