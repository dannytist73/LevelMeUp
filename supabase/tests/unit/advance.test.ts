import { describe, expect, it } from 'vitest';
import {
  DAY_MS, DISCIPLINE_PER_CORE_DAY, LIGHT_DAY_MINUTES, RUNG_BONUS_XP, cumulativeXpForLevel, newLadder, nextDayWindow, planWorkout, plannedMoves, sessionCondition,
  templateById,
} from '../../../packages/rules/src/index.ts';
import { CONTENT_VERSION, LIBRARY } from '../../../packages/content/src/index.ts';
import { planAdvance } from '../../functions/_shared/advance.ts';
import { startPoints, statXp, toProfile } from '../../functions/_shared/state.ts';
import type { CharacterRow, DayDraft, DayRow, PendingCheckin, QueuedDay } from '../../functions/_shared/state.ts';
import {
  DAY1, HOUR, afterDay1, characterRow, dayRow, dayTwoSnapshot, instanceRows, ladderRows, manilaDay, pendingCheckin, profileRow,
} from './fixtures.ts';

const day1End = new Date(DAY1.endsAt).getTime();
const core = DAY1.quests.find((q) => q.slot === 'core')!;
/** Day n (n ≥ 2) of the fixtures' player in Manila, with day 1's quests. */
const dayN = (n: number): DayDraft => {
  const w = manilaDay(n);
  return { ...DAY1, dayNumber: n, startsAt: new Date(w.startsAt).toISOString(), endsAt: new Date(w.endsAt).toISOString() };
};
const closedRow = (n: number, resolution: DayRow['resolution']): DayRow =>
  dayRow(dayN(n), n, { status: 'closed', resolution, streak_applied: false });
const queued = (n: number, resolution: QueuedDay['resolution']): QueuedDay => ({ id: String(n), day_number: n, resolution });
const held = (over: Partial<PendingCheckin> = {}): PendingCheckin => pendingCheckin({ answer: 'just_didnt', recovery_day_id: '2', ...over });

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
    const out = planAdvance(afterDay1([], manilaDay(3).endsAt, {
      character: characterRow({ awaiting_checkin: true }),
      days: [closedRow(2, 'streak_day'), dayRow(dayN(3), 3)],
      instances: instanceRows(dayN(3), 3),
      queue: [queued(2, 'streak_day')],
    }))!;
    expect(out.close).toEqual([{ dayId: 3, resolution: 'awaiting_checkin', streakApplied: false, checkin: false }]);
    expect(out.applied).toEqual([]);
  });

  it('away days behind a waiting day wait too: no gap check-in now', () => {
    const out = planAdvance(afterDay1([], manilaDay(6).startsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true }),
      days: [closedRow(2, 'streak_day'), dayRow(dayN(3), 3)],
      instances: instanceRows(dayN(3), 3, ['core']),
      queue: [queued(2, 'streak_day')],
    }))!;
    expect(out.gap).toBeNull();
    expect(out.newDay!.dayNumber).toBe(6);
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

describe('workouts on built days (M6c decision 5)', () => {
  it('the next strength day is a workout planned from the workouts done so far', () => {
    const s = dayTwoSnapshot({ core: 'walk-1', side1: 'reading-0', side2: 'focus-0' }, { workoutsDone: 1 });
    const outcome = planAdvance({
      ...s, pending: s.checkin, timeZone: 'Asia/Manila', nowMs: manilaDay(3).startsAt + HOUR, library: LIBRARY, contentVersion: CONTENT_VERSION,
    });
    const core = outcome!.newDay!.quests.find((q) => q.slot === 'core')!;
    expect(core.templateId).toBe('workout-0');
    const template = templateById(LIBRARY, 'workout-0');
    const player = toProfile(s.profile, startPoints(s.character), statXp(s.character));
    expect(core.condition).toEqual(sessionCondition(template, planWorkout(LIBRARY.training, template, player, 1)!, false));
  });
});

describe('a day the phone built offline (M6e)', () => {
  const end = day1End + 5 * HOUR;
  const built = planAdvance(afterDay1(['core'], end))!.newDay!;
  const phone = built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: plannedMoves(q.condition) }));

  it('without one, says nothing about it', () => {
    expect(planAdvance(afterDay1(['core'], end))!.offline).toBeNull();
  });

  it("keeps the phone's quests when the rules allow them, even where the server would have chosen others", () => {
    const side2 = built.quests.find((q) => q.slot === 'side2')!;
    const used = new Set(built.quests.map((q) => q.ladder ?? q.templateId));
    const other = LIBRARY.templates.find((t) => t.role === 'micro' && t.exercise === null && t.minutes <= side2.minutes && !used.has(t.id))!;
    const mine = phone.map((q) => (q.slot === 'side2' ? { ...q, templateId: other.id, why: { code: 'swap' as const } } : q));
    const out = planAdvance({ ...afterDay1(['core'], end), provisional: { dayNumber: 2, quests: mine } })!;
    expect(out.offline).toEqual({ kept: 'phone', problems: [] });
    expect(out.newDay!.quests.find((q) => q.slot === 'side2')).toMatchObject({ templateId: other.id, why: { code: 'swap' } });
    expect(out.newDay!.quests.filter((q) => q.slot !== 'side2')).toEqual(built.quests.filter((q) => q.slot !== 'side2'));
  });

  it("builds its own day when the phone's breaks a rule, and says why", () => {
    const core = built.quests.find((q) => q.slot === 'core')!;
    const higher = LIBRARY.templates.find((t) => t.ladder === core.ladder && t.rung === (core.rung ?? 0) + 1)!;
    const mine = phone.map((q) => (q.slot === 'core' ? { ...q, templateId: higher.id } : q));
    const out = planAdvance({ ...afterDay1(['core'], end), provisional: { dayNumber: 2, quests: mine } })!;
    expect(out.offline).toEqual({ kept: 'server', problems: [`${higher.id} is above the player's rung`] });
    expect(out.newDay!.quests).toEqual(built.quests);
  });

  it('keeps the phone\'s quests only for the day it built', () => {
    const out = planAdvance({ ...afterDay1(['core'], end), provisional: { dayNumber: 3, quests: phone } })!;
    expect(out.offline!.kept).toBe('server');
    expect(out.offline!.problems.some((p) => p.includes('day number'))).toBe(true);
    expect(out.newDay!.dayNumber).toBe(2);
  });

  it("when the rules can't read the phone's day at all, the server's own day is stored (review)", () => {
    const out = planAdvance({ ...afterDay1(['core'], end, { workoutsDone: -1 }), provisional: { dayNumber: 2, quests: phone } })!;
    expect(out.offline).toEqual({ kept: 'server', problems: [expect.stringMatching(/workoutsDone/)] });
    expect(out.newDay!.protection).toBe('no_quests');
  });

  it("a completion counted for another quest moves no ladder: the player did the phone's quest (review)", () => {
    const instances = instanceRows(DAY1, 1, ['core']).map((q) => (q.slot === 'core' ? { ...q, payload: { offlineQuest: 'push-0' } } : q));
    const out = planAdvance(afterDay1(['core'], end, { instances }))!;
    const core = DAY1.quests.find((q) => q.slot === 'core')!;
    expect(out.ladders[core.ladder!]).toBeUndefined();
    expect(out.ledger).toContainEqual(expect.objectContaining({ sourceType: 'discipline', sourceId: 'day:1' }));
  });
});

describe('the check-in answered (M7a)', () => {
  it('once the check-in is resolved, the days that waited are applied in order (decision 5)', () => {
    const out = planAdvance(afterDay1([], manilaDay(4).startsAt + HOUR, {
      character: characterRow({ streak_current: 5, streak_best: 6 }),
      days: [closedRow(2, 'streak_day'), closedRow(3, 'streak_day'), dayRow(dayN(4), 4)],
      instances: instanceRows(dayN(4), 4),
      queue: [queued(3, 'streak_day'), queued(2, 'streak_day')],
    }))!;
    expect(out.applied).toEqual([2, 3]);
    expect(out.opened).toEqual([]);
    expect(out.streak).toEqual({ current: 7, best: 7, shields: 1, awaitingCheckin: false });
    expect(out.ledger).toContainEqual({ sourceType: 'milestone', sourceId: 'day:3', stat: 'discipline', amount: 20 });
    expect(out.close).toEqual([]);
    expect(out.newDay).toBeNull();
  });

  it('the replay stops at a missed day, which opens its own check-in; the days after it keep waiting', () => {
    const out = planAdvance(afterDay1([], manilaDay(5).startsAt + HOUR, {
      character: characterRow({ streak_current: 2, streak_best: 2 }),
      days: [closedRow(2, 'streak_day'), closedRow(3, 'awaiting_checkin'), closedRow(4, 'streak_day'), dayRow(dayN(5), 5)],
      instances: instanceRows(dayN(5), 5),
      queue: [queued(2, 'streak_day'), queued(3, 'awaiting_checkin'), queued(4, 'streak_day')],
    }))!;
    expect(out.applied).toEqual([2, 3]);
    expect(out.opened).toEqual([{ dayId: 3 }]);
    expect(out.streak).toEqual({ current: 3, best: 3, shields: 0, awaitingCheckin: true });
  });

  it('away days between waiting days, or before the running day, are one gap check-in', () => {
    const between = planAdvance(afterDay1([], manilaDay(6).startsAt + HOUR, {
      days: [closedRow(2, 'streak_day'), closedRow(5, 'streak_day'), dayRow(dayN(6), 6)],
      instances: instanceRows(dayN(6), 6),
      queue: [queued(2, 'streak_day'), queued(5, 'streak_day')],
    }))!;
    expect(between.applied).toEqual([2]);
    expect(between.opened).toEqual([{ gapFrom: 3, gapTo: 4 }]);
    expect(between.streak.awaitingCheckin).toBe(true);
    const before = planAdvance(afterDay1([], manilaDay(5).startsAt + HOUR, {
      days: [closedRow(2, 'streak_day'), dayRow(dayN(5), 5)],
      instances: instanceRows(dayN(5), 5),
      queue: [queued(2, 'streak_day')],
    }))!;
    expect(before.applied).toEqual([2]);
    expect(before.opened).toEqual([{ gapFrom: 3, gapTo: 4 }]);
  });

  it('"I just didn\'t" is settled when its recovery day ends: recovered keeps the streak and counts for Rise Again', () => {
    const out = planAdvance(afterDay1([], manilaDay(2).endsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true, streak_current: 5, streak_best: 5, shields: 1 }),
      days: [dayRow(DAY1, 1, { status: 'closed', resolution: 'awaiting_checkin', streak_applied: true }), dayRow(dayN(2), 2)],
      instances: instanceRows(dayN(2), 2, ['core']),
      pending: held({ recovered: true }),
    }))!;
    expect(out.resolved).toEqual({ id: 7, outcome: 'recovered' });
    expect(out.counters.recoveriesCleared).toBe(1);
    expect(out.close).toEqual([{ dayId: 2, resolution: 'streak_day', streakApplied: true, checkin: false }]);
    expect(out.streak).toEqual({ current: 6, best: 6, shields: 1, awaitingCheckin: false });
    expect(out.ability).toBeNull();
  });

  it('not recovered: Unbreakable when ready (no shield needed), else a shield, else a reset that keeps the best', () => {
    const settle = (character: Partial<CharacterRow>) => planAdvance(afterDay1([], manilaDay(2).endsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true, streak_current: 5, streak_best: 9, ...character }),
      days: [dayRow(dayN(2), 2)],
      instances: instanceRows(dayN(2), 2, ['side1', 'side2']),
      pending: held(),
    }))!;
    const level10 = cumulativeXpForLevel(10);
    const unbreakable = settle({ xp_strength: level10, shields: 0 });
    expect(unbreakable.resolved).toEqual({ id: 7, outcome: 'unbreakable' });
    expect(unbreakable.ability).toEqual({ id: 'unbreakable', day: 2 });
    expect(unbreakable.streak.current).toBe(6);
    const cooling = settle({ xp_strength: level10, shields: 1, ability_last_used: { unbreakable: 1 } });
    expect(cooling.resolved).toEqual({ id: 7, outcome: 'shield' });
    expect(cooling.streak).toMatchObject({ current: 6, shields: 0 });
    const reset = settle({ shields: 0 });
    expect(reset.resolved).toEqual({ id: 7, outcome: 'reset' });
    expect(reset.streak).toEqual({ current: 1, best: 9, shields: 0, awaitingCheckin: false });
  });

  it('days that waited behind the held check-in are applied once it is settled, before the recovery day itself', () => {
    const out = planAdvance(afterDay1([], manilaDay(3).endsAt + HOUR, {
      character: characterRow({ awaiting_checkin: true, streak_current: 5, streak_best: 5, shields: 1 }),
      days: [closedRow(2, 'streak_day'), dayRow(dayN(3), 3)],
      instances: instanceRows(dayN(3), 3, ['core']),
      queue: [queued(2, 'streak_day')],
      pending: held({ recovery_day_id: '3' }),
    }))!;
    expect(out.resolved).toEqual({ id: 7, outcome: 'shield' });
    expect(out.applied).toEqual([2]);
    expect(out.close).toEqual([{ dayId: 3, resolution: 'streak_day', streakApplied: true, checkin: false }]);
    expect(out.streak).toEqual({ current: 7, best: 7, shields: 1, awaitingCheckin: false });
  });

  it('after "sick" or "injured" the next day is light, and the flag is used up (decision 6)', () => {
    const out = planAdvance(afterDay1(['core'], day1End, { character: characterRow({ next_day_light: true }) }))!;
    expect(out.newDay).toMatchObject({ dayNumber: 2, light: true, comeback: false });
    expect(out.lightUsed).toBe(true);
    expect(planAdvance(afterDay1(['core'], day1End))!.lightUsed).toBe(false);
  });
});
