import { describe, expect, it } from 'vitest';
import { closeLadders, followingDay, reenterLadders } from '../src/closing.ts';
import { DAY_MS, HOUR_MS, MAX_AWAY_DAYS, REENTRY_AWAY_MS } from '../src/constants.ts';
import { newLadder } from '../src/ladder.ts';
import type { LadderState } from '../src/ladder.ts';
import { nextDayWindow } from '../src/time.ts';
import { FIXTURE, PROFILE } from './fixtures/library.ts';

const AT = Date.UTC(2026, 9, 11, 20); // a quest day's start

describe("closing a day's ladders (M6e: the server and the phone share it)", () => {
  it('records each ladder quest: a completion with its rating ("right" when unrated), or a missed session', () => {
    const out = closeLadders(FIXTURE, { push: newLadder(1) }, {
      startsAt: AT,
      protected: false,
      quests: [
        { ladder: 'push', rung: 1, done: true, rating: null },
        { ladder: 'walk', rung: 0, done: false, rating: null },
        { ladder: null, rung: null, done: true, rating: 'easy' },
      ],
    }, PROFILE);
    expect(out.changed.push!.atRung).toEqual([{ at: AT, rating: 'right' }]);
    expect(out.changed.walk!.misses).toEqual([AT]);
    expect(Object.keys(out.changed).sort()).toEqual(['push', 'walk']);
    expect(out.newRungs).toEqual([]);
  });

  it('a protected day records no missed session, and a ladder this content lacks is skipped', () => {
    const out = closeLadders(FIXTURE, {}, {
      startsAt: AT,
      protected: true,
      quests: [{ ladder: 'walk', rung: 0, done: false, rating: null }, { ladder: 'retired', rung: 0, done: true, rating: null }],
    }, PROFILE);
    expect(out).toEqual({ changed: {}, newRungs: [] });
  });

  it('names a rung reached for the first time (the caller pays its bonus)', () => {
    // Steady: 3 completions at the rung within 14 days step it up; two are there already.
    const walk: LadderState = { ...newLadder(0), atRung: [{ at: AT - 2 * DAY_MS, rating: 'right' }, { at: AT - DAY_MS, rating: 'right' }] };
    const out = closeLadders(FIXTURE, { walk }, { startsAt: AT, protected: false, quests: [{ ladder: 'walk', rung: 0, done: true, rating: 'right' }] }, PROFILE);
    expect(out.changed.walk!.rung).toBe(1);
    expect(out.newRungs).toEqual([{ ladder: 'walk', rung: 1 }]);
  });
});

describe('the first day back (spec §3.3)', () => {
  it('steps down every ladder that is not resting after pain', () => {
    const out = reenterLadders({ push: newLadder(2), walk: { ...newLadder(1), paused: true } }, AT + REENTRY_AWAY_MS, AT);
    expect(out).toEqual({ push: { ...newLadder(2), rung: 1 } });
    expect(reenterLadders({ push: newLadder(2) }, AT + REENTRY_AWAY_MS - 1, AT)).toEqual({});
  });
});

describe('the next quest day (architecture §4.3)', () => {
  // 04:00 to 04:00 in Manila.
  const last = { startsAt: Date.UTC(2026, 9, 10, 20), endsAt: Date.UTC(2026, 9, 11, 20), timeZone: 'Asia/Manila' };
  const BOUNDARY = 240;

  it('is the window after the last day while it runs', () => {
    expect(followingDay(last, 3, 'Asia/Manila', BOUNDARY, last.endsAt + HOUR_MS)).toEqual({
      window: nextDayWindow(last, 'Asia/Manila', BOUNDARY), dayNumber: 4, away: 0, comeback: false,
    });
  });

  it('counts the days that ended meanwhile as away days', () => {
    const out = followingDay(last, 3, 'Asia/Manila', BOUNDARY, last.endsAt + 2 * DAY_MS + HOUR_MS);
    expect(out).toMatchObject({ dayNumber: 6, away: 2, comeback: false });
    expect(out.window.startsAt).toBe(last.endsAt + 2 * DAY_MS);
  });

  it('a day starting 5 or more days after the last one ended is a comeback', () => {
    expect(followingDay(last, 3, 'Asia/Manila', BOUNDARY, last.endsAt + 5 * DAY_MS + HOUR_MS)).toMatchObject({ away: 5, comeback: true });
  });

  it(`after more than ${MAX_AWAY_DAYS} away days, starts a fresh day from now`, () => {
    const now = last.endsAt + (MAX_AWAY_DAYS + 10) * DAY_MS + HOUR_MS;
    const out = followingDay(last, 3, 'Asia/Manila', BOUNDARY, now);
    expect(out).toMatchObject({ away: MAX_AWAY_DAYS + 10, dayNumber: 3 + 1 + MAX_AWAY_DAYS + 10, comeback: true });
    expect(out.window.startsAt).toBe(now);
    expect(out.window.endsAt).toBeGreaterThan(now);
  });
});
