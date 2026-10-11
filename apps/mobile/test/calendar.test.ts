import { compareMonths, monthOf, monthWeeks, shiftMonth, todayMark } from '../src/lib/calendar.ts';

describe('the month calendar (M6d decisions 3–4)', () => {
  it('lays a month out in Monday-first weeks, blank outside the month', () => {
    const weeks = monthWeeks({ year: 2026, month: 10 }); // 1 Oct 2026 is a Thursday
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weeks.at(-1)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
    expect(weeks).toHaveLength(5);
    expect(monthWeeks({ year: 2027, month: 2 }).flat().filter(Boolean)).toHaveLength(28);
    expect(monthWeeks({ year: 2028, month: 2 }).flat().filter(Boolean)).toHaveLength(29);
  });

  it('moves between months across the year', () => {
    expect(monthOf('2026-10-12')).toEqual({ year: 2026, month: 10 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(compareMonths({ year: 2026, month: 10 }, { year: 2026, month: 9 })).toBeGreaterThan(0);
  });

  it("draws today from the phone's own day, by the streak rules; never a miss", () => {
    const quests = (done: string[]) => (['core', 'side1', 'side2'] as const).map((slot) => ({ slot, completedAt: done.includes(slot) ? 'x' : null }));
    const day = (over: object = {}) => ({ protection: null, hardDay: false, quests: quests([]), ...over });
    expect(todayMark(day())).toBe('none');
    expect(todayMark(day({ quests: quests(['core']) }))).toBe('cleared');
    expect(todayMark(day({ hardDay: true, quests: quests(['core']) }))).toBe('hard');
    expect(todayMark(day({ quests: quests(['side1', 'side2']) }))).toBe('cleared');
    expect(todayMark(day({ protection: 'planned_rest' }))).toBe('rest');
    expect(todayMark(day({ protection: 'no_quests' }))).toBe('paused');
  });
});
