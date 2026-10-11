import { describe, expect, it } from 'vitest';
import { newLadder } from '../../../packages/rules/src/index.ts';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { CALENDAR_DAYS, calendarDate, calendarMark, stateView } from '../../functions/_shared/state.ts';
import type { CalendarRow } from '../../functions/_shared/state.ts';
import { dayOffers } from '../../functions/_shared/today.ts';
import { DAY_TWO_SLOTS, characterRow, dayTwoSnapshot, historyOf, ladderRows, profileRow } from './fixtures.ts';

const row = (over: Partial<CalendarRow>): CalendarRow => ({
  day_number: 3, starts_at: new Date(Date.UTC(2026, 9, 11, 22)), ends_at: new Date(Date.UTC(2026, 9, 12, 22)), time_zone: 'Asia/Manila', status: 'closed',
  resolution: 'streak_day', protection: null, hard_day: false, ...over,
});

describe('the calendar mark (M6d decision 3)', () => {
  it('names each closed day plainly, never as a miss', () => {
    expect(calendarMark(row({}))).toBe('cleared');
    expect(calendarMark(row({ hard_day: true }))).toBe('hard');
    expect(calendarMark(row({ resolution: 'protected', protection: 'planned_rest' }))).toBe('rest');
    expect(calendarMark(row({ resolution: 'protected', protection: 'pain' }))).toBe('rest');
    expect(calendarMark(row({ resolution: 'protected', protection: 'outage' }))).toBe('paused');
    expect(calendarMark(row({ resolution: 'protected', protection: 'no_quests' }))).toBe('paused');
    expect(calendarMark(row({ resolution: 'awaiting_checkin' }))).toBe('none');
    expect(calendarMark(row({ status: 'open', resolution: null }))).toBe('open');
  });

  it('dates a day by the date it mostly covers: a day 1 begun late in the evening takes the next one (review)', () => {
    // Onboarding at 23:00 in Manila on 10 Oct: day 1 runs at least 6 hours, to 04:00 on 12 Oct, and day 2 starts then.
    const day1 = row({ day_number: 1, starts_at: new Date(Date.UTC(2026, 9, 10, 15)), ends_at: new Date(Date.UTC(2026, 9, 11, 20)) });
    const day2 = row({ day_number: 2, starts_at: new Date(Date.UTC(2026, 9, 11, 20)), ends_at: new Date(Date.UTC(2026, 9, 12, 20)) });
    expect(calendarDate(day1)).toBe('2026-10-11');
    expect(calendarDate(day2)).toBe('2026-10-12');
    // Any other day: the date it starts on, in its own zone.
    expect(calendarDate(row({ time_zone: 'America/New_York' }))).toBe('2026-10-11'); // 18:00 on 11 Oct in New York
    expect(calendarDate(row({}))).toBe('2026-10-12'); // 06:00 on 12 Oct in Manila
  });

  it('keeps about three months', () => {
    expect(CALENDAR_DAYS).toBe(92);
  });
});

describe('the state for Character and Chronicle (M6d)', () => {
  it('dates each day in its own zone, newest first', () => {
    const s = dayTwoSnapshot();
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.calendar.map((d) => d.dayNumber)).toEqual([2, 1]);
    expect(view.calendar[0]).toEqual({ dayNumber: 2, date: expect.stringMatching(/^2026-10-\d\d$/), mark: 'open' });
    expect(view.calendar[1]!.mark).toBe('cleared');
  });

  it('shows growth since day 1: points gained per stat, levels, quests cleared and new rungs', () => {
    const s = dayTwoSnapshot(undefined, {
      character: characterRow({ xp_strength: 88, xp_discipline: 22, total_xp: 110, quests_cleared: 4 }),
    });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), newRungs: 2 });
    expect(view.growth).toEqual({
      since: expect.stringMatching(/^2026-10-\d\d$/), levels: view.character.level - 1,
      stats: { strength: 2, vitality: 0, wisdom: 0, focus: 0, discipline: 1 }, questsCleared: 4, newRungs: 2,
    });
  });

  it('carries the abilities\' last use, the book, its progress and the finished books', () => {
    const finished = [{ title: 'Meditations', startedAt: null, finishedAt: '2026-10-01T10:00:00.000Z', sessions: 9, minutes: 140 }];
    const s = dayTwoSnapshot(undefined, {
      profile: profileRow(undefined, { book: 'Dune', book_started_at: new Date(Date.UTC(2026, 9, 5)), books_finished: finished }),
      character: characterRow({ ability_last_used: { stillness: 4 } }),
    });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), reading: { sessions: 3, minutes: 45 } });
    expect(view.character.abilityLastUsed).toEqual({ stillness: 4 });
    expect(view.profile).toMatchObject({ book: 'Dune', bookStartedAt: '2026-10-05T00:00:00.000Z', booksFinished: finished });
    expect(view.reading).toEqual({ sessions: 3, minutes: 45 });
  });

  it('has no reading without a book, and keeps the achievements in earned order', () => {
    const s = dayTwoSnapshot(undefined, { earned: ['level-5', 'first-trial'] });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), reading: { sessions: 3, minutes: 45 } });
    expect(view.reading).toBeNull();
    expect(view.achievements).toEqual(['level-5', 'first-trial']);
  });
});

describe('what the phone needs to build a day offline (M6e decision 3)', () => {
  it("sends every ladder's state, each recent day's final quests, and the workouts done", () => {
    const s = dayTwoSnapshot(DAY_TWO_SLOTS, { ladders: ladderRows({ push: newLadder(1) }), workoutsDone: 3 });
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.ladders).toEqual({ push: newLadder(1) });
    expect(view.history.map((d) => d.dayNumber)).toEqual([1, 2]);
    expect(view.history[1]!.quests).toMatchObject({ core: 'push-1', side1: 'walk-1', side2: 'reading-0', article: 'article' });
    expect(view.workoutsDone).toBe(3);
  });
});
