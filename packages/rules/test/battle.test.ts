import { describe, expect, it } from 'vitest';
import {
  battleDays, battleEndsAt, battleNeed, battleOf, dayNeed, monsterWeek, opponent, questPower,
} from '../src/battle.ts';
import type { BattleDay, Grumbler } from '../src/battle.ts';
import { DAY_MS, HOUR_MS } from '../src/constants.ts';
import { firstDayWindow, nextDayWindow } from '../src/time.ts';

const ROSTER: readonly Grumbler[] = [
  { id: 'snoozle', weakness: 'vitality' },
  { id: 'scrollo', weakness: 'focus' },
  { id: 'laterpillar', weakness: 'strength' },
];

/** A normal day: four quests, `cleared` by stat. */
const day = (dayNumber: number, cleared: BattleDay['cleared'] = {}, over: Partial<BattleDay> = {}): BattleDay => ({
  dayNumber, closed: true, protected: false, quests: 4, cleared, ...over,
});

describe('battle windows (plan: battle n covers days 3n−2..3n)', () => {
  it('numbers the battles by quest day', () => {
    expect([1, 2, 3, 4, 6, 7].map(battleOf)).toEqual([1, 1, 1, 2, 2, 3]);
    expect(battleDays(1)).toEqual({ first: 1, last: 3 });
    expect(battleDays(2)).toEqual({ first: 4, last: 6 });
  });
});

describe('power and need', () => {
  it("a cleared quest gives 1 power, 2 on the Grumble's weakness", () => {
    expect(questPower('vitality', 'vitality')).toBe(2);
    expect(questPower('strength', 'vitality')).toBe(1);
    expect(questPower('discipline', 'vitality')).toBe(1);
  });

  it("each day asks min(3, its quests); a protected or away day asks nothing; a day not built yet asks 3", () => {
    expect(dayNeed(day(1))).toBe(3);
    expect(dayNeed(day(1, {}, { quests: 2 }))).toBe(2);
    expect(dayNeed(day(1, {}, { protected: true }))).toBe(0);
    expect(dayNeed('away')).toBe(0);
    expect(dayNeed('later')).toBe(3);
  });

  it('three normal days need 8; each rematch makes it 1 friendlier, at most 3; never under 2', () => {
    expect(battleNeed([3, 3, 3], 0)).toBe(8);
    expect(battleNeed([3, 0, 3], 0)).toBe(5);
    expect(battleNeed([2, 3, 3], 0)).toBe(7);
    expect(battleNeed([3, 3, 3], 2)).toBe(6);
    expect(battleNeed([3, 3, 3], 9)).toBe(5);
    expect(battleNeed([0, 0, 0], 0)).toBe(2);
    expect(battleNeed([2, 0, 0], 3)).toBe(2);
  });
});

describe('the opponent', () => {
  it('is the Grumble befriended the fewest times, ties in roster order', () => {
    expect(opponent(ROSTER, {}).id).toBe('snoozle');
    expect(opponent(ROSTER, { snoozle: 1 }).id).toBe('scrollo');
    expect(opponent(ROSTER, { snoozle: 1, scrollo: 1, laterpillar: 1 }).id).toBe('snoozle');
    expect(opponent(ROSTER, { snoozle: 2, scrollo: 1, laterpillar: 1 }).id).toBe('scrollo');
  });
});

describe('monsterWeek: the camp and the current battle, derived from the stored days', () => {
  it('before any day: battle 1 against the first Grumble, every day still to come', () => {
    const mw = monsterWeek(ROSTER, []);
    expect(mw.wins).toEqual({});
    expect(mw.last).toBeNull();
    expect(mw.battle).toMatchObject({ n: 1, grumble: 'snoozle', weakness: 'vitality', rematch: 0, first: 1, last: 3, need: 8, power: 0, waiting: false });
    expect(mw.battle.days.map((d) => d.state)).toEqual(['later', 'later', 'later']);
  });

  it("day 1 running: today's cleared quests charge the battle", () => {
    const mw = monsterWeek(ROSTER, [day(1, { vitality: 1, strength: 1 }, { closed: false })]);
    expect(mw.battle).toMatchObject({ n: 1, power: 3, need: 8 });
    expect(mw.battle.days).toEqual([
      { dayNumber: 1, state: 'played', power: 3, need: 3 },
      { dayNumber: 2, state: 'later', power: 0, need: 3 },
      { dayNumber: 3, state: 'later', power: 0, need: 3 },
    ]);
  });

  it('a won battle befriends the Grumble and the next one arrives', () => {
    const days = [day(1, { vitality: 1, strength: 1 }), day(2, { vitality: 1, wisdom: 1 }), day(3, { focus: 2 }), day(4, {}, { closed: false })];
    const mw = monsterWeek(ROSTER, days);
    expect(mw.wins).toEqual({ snoozle: 1 });
    expect(mw.last).toEqual({ n: 1, grumble: 'snoozle', won: true, power: 8, need: 8, rematch: 0, byStat: { vitality: 4, strength: 1, wisdom: 1, focus: 2 } });
    expect(mw.battle).toMatchObject({ n: 2, grumble: 'scrollo', weakness: 'focus', rematch: 0, first: 4, last: 6 });
  });

  it('a lost battle keeps the Grumble for a rematch, a little friendlier; nothing is taken', () => {
    const days = [day(1, { strength: 1 }), day(2), day(3, { wisdom: 1 }), day(4, {}, { closed: false })];
    const mw = monsterWeek(ROSTER, days);
    expect(mw.wins).toEqual({});
    expect(mw.last).toMatchObject({ n: 1, grumble: 'snoozle', won: false, power: 2, need: 8 });
    expect(mw.battle).toMatchObject({ n: 2, grumble: 'snoozle', rematch: 1, need: 7 });
  });

  it('the rematch count rises with each loss in a row and resets with a win', () => {
    const lost = (n: number) => [day(3 * n - 2), day(3 * n - 1), day(3 * n)];
    const four = [...lost(1), ...lost(2), ...lost(3), day(10, {}, { closed: false })];
    expect(monsterWeek(ROSTER, four).battle).toMatchObject({ n: 4, grumble: 'snoozle', rematch: 3, need: 5 });
    const won = [...lost(1), day(4, { vitality: 4 }), day(5), day(6), day(7, {}, { closed: false })];
    expect(monsterWeek(ROSTER, won).battle).toMatchObject({ n: 3, grumble: 'scrollo', rematch: 0, need: 8 });
  });

  it("is decided once the window's last day has closed, before the next day exists", () => {
    const open = [day(1, { vitality: 4 }), day(2), day(3, {}, { closed: false })];
    expect(monsterWeek(ROSTER, open).battle.n).toBe(1);
    const closed = [day(1, { vitality: 4 }), day(2), day(3)];
    const mw = monsterWeek(ROSTER, closed);
    expect(mw.last).toMatchObject({ n: 1, won: true });
    expect(mw.battle).toMatchObject({ n: 2, grumble: 'scrollo', power: 0, need: 8 });
    expect(mw.battle.days.map((d) => d.state)).toEqual(['later', 'later', 'later']);
  });

  it('a window spent entirely away is skipped: no battle, no rematch', () => {
    const days = [day(1, { vitality: 4 }), day(2), day(3), day(10, { focus: 1 }, { closed: false })];
    const mw = monsterWeek(ROSTER, days);
    expect(mw.wins).toEqual({ snoozle: 1 });
    expect(mw.last).toMatchObject({ n: 1 });
    expect(mw.battle).toMatchObject({ n: 4, grumble: 'scrollo', rematch: 0, first: 10, last: 12, power: 2, need: 8 });
  });

  it('away days ask nothing, so coming back mid-battle is still winnable', () => {
    const days = [day(1, { vitality: 4 }), day(2), day(3), day(6, { focus: 1 }, { closed: false })];
    const mw = monsterWeek(ROSTER, days);
    expect(mw.battle).toMatchObject({ n: 2, grumble: 'scrollo', power: 2, need: 2 });
    expect(mw.battle.days.map((d) => d.state)).toEqual(['away', 'away', 'played']);
  });

  it('a rest day lowers the need and its bonus quests still charge', () => {
    const days = [day(1, { strength: 1 }), day(2, { strength: 1 }, { protected: true, closed: false })];
    const mw = monsterWeek(ROSTER, days);
    expect(mw.battle.days.map((d) => d.state)).toEqual(['played', 'rest', 'later']);
    expect(mw.battle).toMatchObject({ need: 5, power: 2 });
  });

  it('once every Grumble is a friend, the cycle starts again', () => {
    const won = (n: number, stat: 'vitality' | 'focus' | 'strength') => [day(3 * n - 2, { [stat]: 4 }), day(3 * n - 1), day(3 * n)];
    const days = [...won(1, 'vitality'), ...won(2, 'focus'), ...won(3, 'strength'), day(10, {}, { closed: false })];
    const mw = monsterWeek(ROSTER, days);
    expect(mw.wins).toEqual({ snoozle: 1, scrollo: 1, laterpillar: 1 });
    expect(mw.battle.grumble).toBe('snoozle');
  });

  it('waits for an unanswered check-in on one of its days: no result, later days charge nothing yet (review)', () => {
    const days = [day(1, { vitality: 2 }), day(2), day(3, {}, { waiting: true }), day(4, { focus: 3 }, { closed: false })];
    const mw = monsterWeek(ROSTER, days);
    expect(mw.last).toBeNull();
    expect(mw.battle).toMatchObject({ n: 1, grumble: 'snoozle', waiting: true, power: 4, need: 8 });
    // Answered sick: that day asks nothing, the battle is decided, and battle 2 counts day 4.
    const answered = [day(1, { vitality: 2 }), day(2, { vitality: 1 }), day(3, {}, { protected: true }), day(4, { focus: 3 }, { closed: false })];
    const after = monsterWeek(ROSTER, answered);
    expect(after.last).toMatchObject({ n: 1, won: true, power: 6, need: 5 });
    expect(after.battle).toMatchObject({ n: 2, grumble: 'scrollo', waiting: false, power: 6 });
  });

  it('a check-in waiting on a battle still running holds nothing yet', () => {
    const mw = monsterWeek(ROSTER, [day(1, {}, { waiting: true }), day(2, {}, { closed: false })]);
    expect(mw.battle).toMatchObject({ n: 1, waiting: false });
  });

  it('a window with nothing to clear on any day is skipped, not lost (review)', () => {
    const empty = (n: number) => day(n, {}, { quests: 0, protected: true });
    const mw = monsterWeek(ROSTER, [empty(1), empty(2), empty(3), day(4, {}, { closed: false })]);
    expect(mw.last).toBeNull();
    expect(mw.battle).toMatchObject({ n: 2, grumble: 'snoozle', rematch: 0 });
  });

  it('reads the days in any order', () => {
    const days = [day(4, {}, { closed: false }), day(2, { vitality: 1, wisdom: 1 }), day(1, { vitality: 1, strength: 1 }), day(3, { focus: 2 })];
    expect(monsterWeek(ROSTER, days).wins).toEqual({ snoozle: 1 });
  });

  it('a late completion that reaches the need turns a lost battle into a friend (the plan: derived)', () => {
    const lost = [day(1, { vitality: 3 }), day(2), day(3), day(4, {}, { closed: false })];
    expect(monsterWeek(ROSTER, lost).battle.grumble).toBe('snoozle');
    const late = [day(1, { vitality: 3 }), day(2, { strength: 2 }), day(3), day(4, {}, { closed: false })];
    expect(monsterWeek(ROSTER, late).wins).toEqual({ snoozle: 1 });
    expect(monsterWeek(ROSTER, late).battle.grumble).toBe('scrollo');
  });
});

describe('battleEndsAt', () => {
  it("is the end of the window's last day, from the day windows (time zone and boundary)", () => {
    const today = firstDayWindow(Date.UTC(2026, 9, 25, 9), 'UTC', 240);
    const second = nextDayWindow(today, 'UTC', 240);
    const third = nextDayWindow(second, 'UTC', 240);
    expect(battleEndsAt(today, 4, 6, 240)).toBe(third.endsAt);
    expect(battleEndsAt(today, 6, 6, 240)).toBe(today.endsAt);
    expect(third.endsAt - today.endsAt).toBe(2 * DAY_MS);
  });

  it('follows the time zone across a clock change', () => {
    // Europe/Berlin leaves summer time on 2026-10-25 at 03:00: the quest day from 24 Oct 04:00 is 25 hours long.
    const today = firstDayWindow(Date.UTC(2026, 9, 23, 9), 'Europe/Berlin', 240);
    expect(battleEndsAt(today, 1, 2, 240) - today.endsAt).toBe(DAY_MS + HOUR_MS);
  });
});
