import { describe, expect, it } from 'vitest';
import { HOUR_MS } from '../src/constants.ts';
import {
  acceptsCompletion,
  canonicalTimeZone,
  firstDayWindow,
  isClosed,
  isValidTimeZone,
  localDateKey,
  localParts,
  questDayDate,
  nextBoundaryAtOrAfter,
  nextDayWindow,
  offsetMs,
  zonedToUtc,
} from '../src/time.ts';
import type { DayWindow } from '../src/time.ts';

const iso = (text: string): number => Date.parse(text);
const hours = (window: DayWindow): number => (window.endsAt - window.startsAt) / HOUR_MS;
const FOUR_AM = 240;
const windowEnding = (endsAt: string, timeZone: string): DayWindow => ({
  startsAt: iso(endsAt) - 24 * HOUR_MS,
  endsAt: iso(endsAt),
  timeZone,
});

describe('time-zone helpers', () => {
  it("names a quest day's date: its start's, or for a day over 25 hours the date it mostly covers (M6d review)", () => {
    const at = (startsAt: number, endsAt: number, timeZone = 'Asia/Manila') => questDayDate({ startsAt, endsAt, timeZone });
    expect(at(Date.UTC(2026, 9, 11, 20), Date.UTC(2026, 9, 12, 20))).toBe('2026-10-12'); // 04:00 to 04:00
    // Day 1 begun at 23:00 on 11 Oct runs at least 6 hours, to 04:00 on 13 Oct: it is mostly the 12th.
    expect(at(Date.UTC(2026, 9, 11, 15), Date.UTC(2026, 9, 12, 20))).toBe('2026-10-12');
    // Day 1 begun at 22:00 on 10 Oct ends at 04:00 on the 11th: the 10th, and day 2 is the 11th.
    expect(at(Date.UTC(2026, 9, 10, 14), Date.UTC(2026, 9, 10, 20))).toBe('2026-10-10');
    // Clock changes keep the start's date: a 23-hour day from 00:30 (New York, 8 Mar) and a 25-hour one from 23:30 (31 Oct).
    expect(at(Date.UTC(2026, 2, 8, 5, 30), Date.UTC(2026, 2, 9, 4, 30), 'America/New_York')).toBe('2026-03-08');
    expect(at(Date.UTC(2026, 10, 1, 3, 30), Date.UTC(2026, 10, 2, 4, 30), 'America/New_York')).toBe('2026-10-31');
  });

  it('names the local date of an instant (M6d: the calendar)', () => {
    expect(localDateKey('Asia/Manila', Date.UTC(2026, 9, 11, 16, 30))).toBe('2026-10-12'); // 00:30 in Manila
    expect(localDateKey('America/New_York', Date.UTC(2026, 9, 12, 3))).toBe('2026-10-11');
    expect(localDateKey('UTC', Date.UTC(2026, 0, 5))).toBe('2026-01-05');
  });

  it('reads wall-clock parts in a zone', () => {
    expect(localParts('Asia/Manila', iso('2026-10-09T20:00:00Z'))).toEqual({
      year: 2026, month: 10, day: 10, hour: 4, minute: 0, second: 0,
    });
  });

  it('knows offsets, including daylight saving time', () => {
    expect(offsetMs('Asia/Manila', iso('2026-10-10T00:00:00Z'))).toBe(8 * HOUR_MS);
    expect(offsetMs('America/New_York', iso('2026-07-01T12:00:00Z'))).toBe(-4 * HOUR_MS);
    expect(offsetMs('America/New_York', iso('2026-01-15T12:00:00Z'))).toBe(-5 * HOUR_MS);
  });

  it('turns a wall-clock time into an instant on both sides of a DST change', () => {
    expect(zonedToUtc('America/New_York', 2026, 3, 8, FOUR_AM)).toBe(iso('2026-03-08T08:00:00Z'));
    expect(zonedToUtc('America/New_York', 2026, 11, 1, FOUR_AM)).toBe(iso('2026-11-01T09:00:00Z'));
    expect(zonedToUtc('Europe/London', 2026, 3, 29, FOUR_AM)).toBe(iso('2026-03-29T03:00:00Z'));
  });

  it('finds the next boundary at or after an instant', () => {
    expect(nextBoundaryAtOrAfter('Asia/Manila', FOUR_AM, iso('2026-10-09T20:00:00Z'))).toBe(iso('2026-10-09T20:00:00Z'));
    expect(nextBoundaryAtOrAfter('Asia/Manila', FOUR_AM, iso('2026-10-09T20:00:01Z'))).toBe(iso('2026-10-10T20:00:00Z'));
  });

  it('stores zone names in their canonical spelling', () => {
    expect(canonicalTimeZone('asia/manila')).toBe('Asia/Manila');
    expect(() => canonicalTimeZone('Mars/Olympus')).toThrow(RangeError);
    expect(firstDayWindow(iso('2026-10-10T07:00:00Z'), 'ASIA/MANILA', FOUR_AM).timeZone).toBe('Asia/Manila');
  });

  it('validates zone names and boundaries', () => {
    expect(isValidTimeZone('Asia/Manila')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(() => localParts('Mars/Olympus', 0)).toThrow(RangeError);
    expect(() => nextBoundaryAtOrAfter('Asia/Manila', 1440, 0)).toThrow(RangeError);
  });
});

describe('quest-day windows (spec §3.8)', () => {
  it('a normal day runs boundary to boundary, 24 h', () => {
    expect(nextDayWindow(windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila'), 'Asia/Manila', FOUR_AM)).toEqual({
      startsAt: iso('2026-10-09T20:00:00Z'),
      endsAt: iso('2026-10-10T20:00:00Z'),
      timeZone: 'Asia/Manila',
    });
  });

  it('spring forward gives a 23 h day (New York)', () => {
    const next = nextDayWindow(windowEnding('2026-03-07T09:00:00Z', 'America/New_York'), 'America/New_York', FOUR_AM);
    expect(next.endsAt).toBe(iso('2026-03-08T08:00:00Z'));
    expect(hours(next)).toBe(23);
  });

  it('fall back gives a 25 h day (New York)', () => {
    const next = nextDayWindow(windowEnding('2026-10-31T08:00:00Z', 'America/New_York'), 'America/New_York', FOUR_AM);
    expect(next.endsAt).toBe(iso('2026-11-01T09:00:00Z'));
    expect(hours(next)).toBe(25);
  });

  it('spring forward gives a 23 h day (London)', () => {
    const next = nextDayWindow(windowEnding('2026-03-28T04:00:00Z', 'Europe/London'), 'Europe/London', FOUR_AM);
    expect(next.endsAt).toBe(iso('2026-03-29T03:00:00Z'));
    expect(hours(next)).toBe(23);
  });

  it('a short hop (Manila to Tokyo) keeps the boundary', () => {
    const next = nextDayWindow(windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila'), 'Asia/Tokyo', FOUR_AM);
    expect(next.endsAt).toBe(iso('2026-10-10T19:00:00Z'));
    expect(hours(next)).toBe(23);
  });

  it('flying east (Los Angeles to Manila) caps days at 28 h and re-syncs within 3 days', () => {
    let window = windowEnding('2026-10-11T11:00:00Z', 'America/Los_Angeles');
    const ends: number[] = [];
    for (let i = 0; i < 3; i++) {
      window = nextDayWindow(window, 'Asia/Manila', FOUR_AM);
      ends.push(window.endsAt);
      expect(hours(window)).toBeGreaterThanOrEqual(20);
      expect(hours(window)).toBeLessThanOrEqual(28);
    }
    expect(ends).toEqual([iso('2026-10-12T15:00:00Z'), iso('2026-10-13T19:00:00Z'), iso('2026-10-14T20:00:00Z')]);
  });

  it('flying west (Manila to Los Angeles) caps days at 28 h and re-syncs within 4 days', () => {
    let window = windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila');
    const ends: number[] = [];
    for (let i = 0; i < 4; i++) {
      window = nextDayWindow(window, 'America/Los_Angeles', FOUR_AM);
      ends.push(window.endsAt);
      expect(hours(window)).toBeGreaterThanOrEqual(20);
      expect(hours(window)).toBeLessThanOrEqual(28);
    }
    expect(ends).toEqual([
      iso('2026-10-11T00:00:00Z'),
      iso('2026-10-12T04:00:00Z'),
      iso('2026-10-13T08:00:00Z'),
      iso('2026-10-14T11:00:00Z'),
    ]);
  });

  it('works with a custom boundary (2:00 PM for a shift worker)', () => {
    const next = nextDayWindow(windowEnding('2026-10-09T06:00:00Z', 'Asia/Manila'), 'Asia/Manila', 14 * 60);
    expect(next.endsAt).toBe(iso('2026-10-10T06:00:00Z'));
  });

  it('day 1 starts at onboarding and ends at the first boundary at least 6 h away', () => {
    expect(firstDayWindow(iso('2026-10-10T07:00:00Z'), 'Asia/Manila', FOUR_AM)).toEqual({
      startsAt: iso('2026-10-10T07:00:00Z'),
      endsAt: iso('2026-10-10T20:00:00Z'),
      timeZone: 'Asia/Manila',
    });
    expect(firstDayWindow(iso('2026-10-10T17:00:00Z'), 'Asia/Manila', FOUR_AM).endsAt).toBe(iso('2026-10-11T20:00:00Z'));
  });

  it.each(['Asia/Manila', 'America/New_York', 'Europe/London', 'Australia/Sydney', 'America/Los_Angeles'])(
    '%s: 400 days in a row stay contiguous, 20–28 h, and end at 4:00 AM',
    (timeZone) => {
      let window = firstDayWindow(iso('2026-01-01T12:00:00Z'), timeZone, FOUR_AM);
      for (let i = 0; i < 400; i++) {
        const next = nextDayWindow(window, timeZone, FOUR_AM);
        expect(next.startsAt).toBe(window.endsAt);
        expect(hours(next)).toBeGreaterThanOrEqual(20);
        expect(hours(next)).toBeLessThanOrEqual(28);
        const end = localParts(timeZone, next.endsAt);
        expect([end.hour, end.minute]).toEqual([4, 0]);
        window = next;
      }
    },
  );

  it('custom boundaries, even ones a DST change skips (midnight in Santiago, 2:30 AM in New York), keep every day 20–28 h', () => {
    const cases: Array<[string, number]> = [
      ['America/Santiago', 0], ['America/Havana', 0], ['Asia/Beirut', 0], ['America/New_York', 150], ['Asia/Kathmandu', 1439],
    ];
    for (const [timeZone, boundary] of cases) {
      let window = firstDayWindow(iso('2026-01-01T12:00:00Z'), timeZone, boundary);
      for (let i = 0; i < 800; i++) {
        const next = nextDayWindow(window, timeZone, boundary);
        expect(next.startsAt).toBe(window.endsAt);
        expect(hours(next)).toBeGreaterThanOrEqual(20);
        expect(hours(next)).toBeLessThanOrEqual(28);
        window = next;
      }
    }
  });
});

describe('closing and late completions (spec §3.6, architecture §4.3)', () => {
  const day = windowEnding('2026-10-10T20:00:00Z', 'Asia/Manila');
  const inside = day.startsAt + HOUR_MS;

  it('a day is closed from its end on, the instant the next day starts (no overlap)', () => {
    expect(isClosed(day, day.endsAt - 1)).toBe(false);
    expect(isClosed(day, day.endsAt)).toBe(true);
  });

  it('accepts a completion stamped inside the day until 48 h after it closes', () => {
    expect(acceptsCompletion(day, inside, day.endsAt + 48 * HOUR_MS)).toBe(true);
    expect(acceptsCompletion(day, inside, day.endsAt + 48 * HOUR_MS + 1)).toBe(false);
  });

  it('rejects completions stamped outside the day or in the future', () => {
    expect(acceptsCompletion(day, day.startsAt - 1, inside)).toBe(false);
    expect(acceptsCompletion(day, day.endsAt, day.endsAt)).toBe(false);
    expect(acceptsCompletion(day, inside + 10 * 60_000, inside)).toBe(false);
  });
});
