// M17: the week's recap on Today (game/week.ts).
import { weekRecap, weekStart } from '../src/game/week.ts';

const day = (date: string, mark: 'cleared' | 'hard' | 'rest' | 'paused' | 'none' | 'open') => ({ dayNumber: 0, date, mark });

describe('weekStart', () => {
  it('is the Monday of the date\'s week', () => {
    expect(weekStart('2026-10-19')).toBe('2026-10-19'); // a Monday
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // the Sunday after
    expect(weekStart('2026-10-21')).toBe('2026-10-19');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(weekStart('2026-01-01')).toBe('2025-12-29'); // across the year
  });
});

describe('weekRecap', () => {
  const lastWeek = [
    day('2026-10-12', 'cleared'), day('2026-10-13', 'hard'), day('2026-10-14', 'rest'), day('2026-10-15', 'none'),
    day('2026-10-16', 'cleared'), day('2026-10-17', 'paused'), day('2026-10-18', 'none'),
  ];

  it('counts last week\'s cleared and rest days, on any day of the new week', () => {
    const calendar = [day('2026-10-21', 'open'), day('2026-10-20', 'cleared'), day('2026-10-19', 'none'), ...lastWeek.reverse()];
    expect(weekRecap(calendar, [])).toEqual({ key: 'week:2026-10-19', cleared: 3, rested: 1, days: 7 });
  });

  it('shows once a week: dismissed, it waits for the next week', () => {
    const calendar = [day('2026-10-19', 'open'), ...lastWeek];
    expect(weekRecap(calendar, ['week:2026-10-19'])).toBeNull();
    expect(weekRecap(calendar, ['week:2026-10-12'])).not.toBeNull();
  });

  it('needs at least two days in the chronicle last week (a first week that began on Sunday says nothing)', () => {
    expect(weekRecap([day('2026-10-19', 'open'), day('2026-10-18', 'cleared')], [])).toBeNull();
    expect(weekRecap([day('2026-10-19', 'open'), day('2026-10-18', 'cleared'), day('2026-10-17', 'none')], []))
      .toEqual({ key: 'week:2026-10-19', cleared: 1, rested: 0, days: 2 });
  });

  it('says nothing without a day running (the day ended, or none yet)', () => {
    expect(weekRecap(lastWeek, [])).toBeNull();
    expect(weekRecap([], [])).toBeNull();
  });
});
