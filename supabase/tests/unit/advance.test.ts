import { describe, expect, it } from 'vitest';
import { DAY_MS, DISCIPLINE_PER_CORE_DAY, LIGHT_DAY_MINUTES, RUNG_BONUS_XP, newLadder, nextDayWindow } from '../../../packages/rules/src/index.ts';
import { planAdvance } from '../../functions/_shared/advance.ts';
import { DAY1, HOUR, afterDay1, characterRow, dayRow, instanceRows, ladderRows, manilaDay, profileRow } from './fixtures.ts';

const day1End = new Date(DAY1.endsAt).getTime();
const core = DAY1.quests.find((q) => q.slot === 'core')!;

describe('closing days and building the next one (architecture §4.3)', () => {
  it('does nothing while day 1 is running', () => {
    expect(planAdvance(afterDay1(['core'], day1End - 1))).toBeNull();
  });

  it('day 1 ended with the core done: a streak day, Discipline, the ladder session, and day 2', () => {
    const out = planAdvance(afterDay1(['core'], day1End + 5 * HOUR))!;
    expect(out.close).toEqual([{ dayId: 1, resolution: 'streak_day', streakApplied: true, checkin: false }]);
    expect(out.streak).toEqual({ current: 1, best: 1, shields: 0, awaitingCheckin: false });
    expect(out.ledger).toEqual([{ sourceType: 'discipline', sourceId: 'day:1', stat: 'discipline', amount: DISCIPLINE_PER_CORE_DAY }]);
    expect(out.ladders[core.ladder!]!.atRung).toEqual([{ at: new Date(DAY1.startsAt).getTime(), rating: 'right' }]);
    expect(out.gap).toBeNull();
    const day2 = out.newDay!;
    expect(day2.dayNumber).toBe(2);
    expect(day2.startsAt).toBe(DAY1.endsAt);
    expect(new Date(day2.endsAt).getTime()).toBe(manilaDay(2).endsAt);
    expect(day2.light).toBe(false);
    expect(day2.protection).toBeNull();
    expect(day2.quests.map((q) => q.slot)).toEqual(expect.arrayContaining(['core', 'side1', 'side2']));
  });

  it('two side quests and no core still make a streak day, without Discipline', () => {
    const out = planAdvance(afterDay1(['side1', 'side2'], day1End))!;
    expect(out.close[0]!.resolution).toBe('streak_day');
    expect(out.ledger).toEqual([]);
  });

  it('nothing done: the day asks its check-in, ladder sessions count as missed, and day 2 is still built', () => {
    const out = planAdvance(afterDay1([], day1End))!;
    expect(out.close).toEqual([{ dayId: 1, resolution: 'awaiting_checkin', streakApplied: true, checkin: true }]);
    expect(out.streak.awaitingCheckin).toBe(true);
    expect(out.ladders[core.ladder!]!.misses).toEqual([new Date(DAY1.startsAt).getTime()]);
    expect(out.newDay!.dayNumber).toBe(2);
  });

  it('a hard day counts as cleared only when its core quest was done in its hard-day version (M6b review)', () => {
    const input = afterDay1(['core'], day1End);
    const hardDay = { ...input, days: [dayRow(DAY1, 1, { hard_day: true })] };
    // Called after clearing the core at full XP: no "hard day cleared".
    expect(planAdvance(hardDay)!.counters.hardDaysCleared).toBe(0);
    const lighter = { ...hardDay, instances: input.instances.map((q) => (q.slot === 'core' ? { ...q, hard_day: true } : q)) };
    expect(planAdvance(lighter)!.counters.hardDaysCleared).toBe(1);
  });

  it('a protected day never counts a missed session', () => {
    const input = afterDay1([], day1End);
    const out = planAdvance({ ...input, days: [dayRow(DAY1, 1, { protection: 'planned_rest' })] })!;
    expect(out.close[0]!.resolution).toBe('protected');
    expect(out.ladders).toEqual({});
  });

  it('while a check-in is pending, a later streak day waits and the streak does not move', () => {
    const input = afterDay1(['core'], day1End, { character: characterRow({ awaiting_checkin: true, streak_current: 3, streak_best: 5 }) });
    const out = planAdvance(input)!;
    expect(out.close).toEqual([{ dayId: 1, resolution: 'streak_day', streakApplied: false, checkin: false }]);
    expect(out.streak).toEqual({ current: 3, best: 5, shields: 0, awaitingCheckin: true });
    expect(out.ledger.map((l) => l.sourceType)).toEqual(['discipline']);
  });

  it('another unanswered day, or days away, only widen the pending check-in', () => {
    const out = planAdvance(afterDay1([], day1End, { character: characterRow({ awaiting_checkin: true }) }))!;
    expect(out.close[0]).toEqual({ dayId: 1, resolution: 'awaiting_checkin', streakApplied: true, checkin: false });
    const away = planAdvance(afterDay1([], manilaDay(5).startsAt + HOUR))!;
    expect(away.close[0]!.checkin).toBe(true);
    expect(away.gap).toBeNull();
    expect(away.newDay!.dayNumber).toBe(5);
  });

  it('pending check-in → streak day → missed day: the missed day waits too (answering late changes nothing)', () => {
    const day2Window = manilaDay(2);
    const day2 = { ...DAY1, dayNumber: 2, startsAt: new Date(day2Window.startsAt).toISOString(), endsAt: new Date(day2Window.endsAt).toISOString() };
    const input = afterDay1(['core'], day2Window.endsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true, streak_current: 2, streak_best: 2 }),
      days: [dayRow(DAY1, 1), dayRow(day2, 2)],
      instances: [...instanceRows(DAY1, 1, ['core']), ...instanceRows(day2, 2)],
    });
    const out = planAdvance(input)!;
    expect(out.close).toEqual([
      { dayId: 1, resolution: 'streak_day', streakApplied: false, checkin: false },
      { dayId: 2, resolution: 'awaiting_checkin', streakApplied: false, checkin: false },
    ]);
    expect(out.streak).toEqual({ current: 2, best: 2, shields: 0, awaitingCheckin: true });
    expect(out.newDay!.dayNumber).toBe(3);
  });

  it('once a day waits from an earlier sync, every later day waits, missed or not', () => {
    const out = planAdvance(afterDay1([], day1End, { queued: true, character: characterRow({ awaiting_checkin: true }) }))!;
    expect(out.close).toEqual([{ dayId: 1, resolution: 'awaiting_checkin', streakApplied: false, checkin: false }]);
  });

  it('away days behind a waiting day wait too: no gap check-in now', () => {
    const now = manilaDay(5).startsAt + HOUR;
    const out = planAdvance(afterDay1(['core'], now, { queued: true, character: characterRow({ awaiting_checkin: true }) }))!;
    expect(out.gap).toBeNull();
    expect(out.newDay!.dayNumber).toBe(5);
    expect(out.streak.awaitingCheckin).toBe(true);
  });

  it('3 away days are one gap check-in, counted in the day number', () => {
    const now = manilaDay(5).startsAt + 3 * HOUR;
    const out = planAdvance(afterDay1(['core'], now))!;
    expect(out.gap).toEqual({ from: 2, to: 4 });
    expect(out.newDay!.dayNumber).toBe(5);
    expect(new Date(out.newDay!.startsAt).getTime()).toBe(manilaDay(5).startsAt);
    expect(out.newDay!.light).toBe(false);
    expect(out.streak).toEqual({ current: 1, best: 1, shields: 0, awaitingCheckin: true });
  });

  it('5 or more away days: a light comeback day, and active ladders start one rung lower', () => {
    const now = manilaDay(8).startsAt + HOUR;
    const ladders = ladderRows({ walk: { ...newLadder(2), highestRung: 2 }, push: { ...newLadder(0) } });
    const out = planAdvance(afterDay1(['core'], now, { ladders }))!;
    expect(out.gap).toEqual({ from: 2, to: 7 });
    expect(out.newDay!).toMatchObject({ dayNumber: 8, light: true, comeback: true, budget: LIGHT_DAY_MINUTES });
    expect(out.ladders.walk!.rung).toBe(1);
  });

  it('a step up to a rung never reached before pays the rung bonus once', () => {
    const at = new Date(DAY1.startsAt).getTime();
    const ladder = core.ladder!;
    const state = { ...newLadder(0), atRung: [{ at: at - 2 * DAY_MS, rating: 'right' as const }, { at: at - DAY_MS, rating: 'right' as const }] };
    const out = planAdvance(afterDay1(['core'], day1End, { ladders: ladderRows({ [ladder]: state }) }))!;
    expect(out.ladders[ladder]!.rung).toBe(1);
    expect(out.ledger).toContainEqual({ sourceType: 'rung', sourceId: `rung:${ladder}:1`, stat: core.stat, amount: RUNG_BONUS_XP });
    const again = planAdvance(afterDay1(['core'], day1End, { ladders: ladderRows({ [ladder]: { ...state, highestRung: 1 } }) }))!;
    expect(again.ledger.filter((l) => l.sourceType === 'rung')).toEqual([]);
  });

  it('a 7th streak day earns a shield and the 7-day milestone', () => {
    const out = planAdvance(afterDay1(['core'], day1End, { character: characterRow({ streak_current: 6, streak_best: 6 }) }))!;
    expect(out.streak).toEqual({ current: 7, best: 7, shields: 1, awaitingCheckin: false });
    expect(out.ledger).toContainEqual({ sourceType: 'milestone', sourceId: 'day:1', stat: 'discipline', amount: 20 });
  });

  it('a too-hard rating reaches the ladder with the session', () => {
    const input = afterDay1(['core'], day1End);
    const out = planAdvance({ ...input, instances: instanceRows(DAY1, 1, ['core'], 'too_hard') })!;
    expect(out.ladders[core.ladder!]!.atRung).toEqual([{ at: new Date(DAY1.startsAt).getTime(), rating: 'too_hard' }]);
  });

  it('after travel, the next day follows the phone\'s new time zone', () => {
    const out = planAdvance(afterDay1(['core'], day1End + HOUR, { timeZone: 'America/New_York' }))!;
    const expected = nextDayWindow({ startsAt: new Date(DAY1.startsAt).getTime(), endsAt: day1End, timeZone: 'Asia/Manila' }, 'America/New_York', 240);
    expect(out.newDay).toMatchObject({ startsAt: new Date(expected.startsAt).toISOString(), endsAt: new Date(expected.endsAt).toISOString(), timeZone: 'America/New_York' });
  });

  it('a day the builder cannot make is protected automatically, with no quests', () => {
    const out = planAdvance(afterDay1(['core'], day1End, { profile: profileRow(undefined, { goals: [] }) }))!;
    expect(out.newDay).toMatchObject({ dayNumber: 2, protection: 'no_quests', quests: [] });
    expect(out.buildError).toMatch(/\S/);
    expect(planAdvance(afterDay1(['core'], day1End))!.buildError).toBeNull();
  });

  it('an absence longer than the day-by-day count starts a fresh day from now', () => {
    const now = day1End + 500 * DAY_MS;
    const out = planAdvance(afterDay1(['core'], now))!;
    expect(new Date(out.newDay!.startsAt).getTime()).toBe(now);
    expect(out.newDay!.dayNumber).toBeGreaterThanOrEqual(500);
  });
});
