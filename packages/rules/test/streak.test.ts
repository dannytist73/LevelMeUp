import { describe, expect, it } from 'vitest';
import { applyDay, closedDayResolution, isStreakDay, newStreak, resolveCheckin } from '../src/streak.ts';
import type { StreakState } from '../src/streak.ts';

const streakDays = (count: number, from: StreakState = newStreak()) => {
  let state = from;
  const milestones: Array<[number, number]> = [];
  const shields: number[] = [];
  for (let i = 1; i <= count; i++) {
    const change = applyDay(state, { kind: 'streak_day' });
    state = change.state;
    if (change.milestoneXp > 0) milestones.push([state.current, change.milestoneXp]);
    if (change.shieldEarned) shields.push(state.current);
  }
  return { state, milestones, shields };
};

describe('streak days (spec §2.4)', () => {
  it('counts the core quest in any version, or any two quests', () => {
    expect(isStreakDay({ coreDone: true, questsDone: 1 })).toBe(true);
    expect(isStreakDay({ coreDone: false, questsDone: 2 })).toBe(true);
    expect(isStreakDay({ coreDone: false, questsDone: 1 })).toBe(false);
  });

  it('grows, tracks the best, and pays Discipline milestones at 7, 14, 30, 66 and 100', () => {
    const { state, milestones } = streakDays(100);
    expect(state).toEqual({ current: 100, best: 100, shields: 2, awaitingCheckin: false });
    expect(milestones).toEqual([[7, 20], [14, 30], [30, 50], [66, 80], [100, 100]]);
  });

  it('earns a shield every 7 streak days and holds at most 2', () => {
    expect(streakDays(28).shields).toEqual([7, 14]);
  });
});

describe('closed days that are not streak days', () => {
  const waiting: StreakState = { current: 9, best: 12, shields: 1, awaitingCheckin: true };

  it('an unanswered check-in leaves the streak waiting, unchanged', () => {
    const change = applyDay({ ...waiting, awaitingCheckin: false }, { kind: 'awaiting_checkin' });
    expect(change.state).toEqual(waiting);
  });

  it('a protected day neither grows nor breaks the streak', () => {
    expect(resolveCheckin(waiting, { kind: 'protected' }).state).toEqual({ ...waiting, awaitingCheckin: false });
  });

  it('a recovered miss keeps everything', () => {
    const change = resolveCheckin(waiting, { kind: 'miss', recovered: true, shieldWaived: false });
    expect(change.state).toEqual({ ...waiting, awaitingCheckin: false });
    expect(change.shieldUsed).toBe(false);
  });

  it('an unrecovered miss spends a shield', () => {
    const change = resolveCheckin(waiting, { kind: 'miss', recovered: false, shieldWaived: false });
    expect(change.state).toEqual({ current: 9, best: 12, shields: 0, awaitingCheckin: false });
    expect(change.shieldUsed).toBe(true);
  });

  it('Unbreakable waives the shield', () => {
    const change = resolveCheckin(waiting, { kind: 'miss', recovered: false, shieldWaived: true });
    expect(change.state.shields).toBe(1);
    expect(change.shieldUsed).toBe(false);
  });

  it('with no shield the streak resets, but the best stays', () => {
    const change = resolveCheckin({ ...waiting, shields: 0 }, { kind: 'miss', recovered: false, shieldWaived: false });
    expect(change.state).toEqual({ current: 0, best: 12, shields: 0, awaitingCheckin: false });
    expect(change.reset).toBe(true);
  });
});

describe('days apply in order (spec §3.7: the streak stays paused until the check-in is answered)', () => {
  const sixDays: StreakState = { current: 6, best: 6, shields: 0, awaitingCheckin: false };

  it('a later day waits while a check-in is pending, so delaying the answer cannot dodge a reset', () => {
    const pending = applyDay(sixDays, { kind: 'awaiting_checkin' }).state;
    expect(() => applyDay(pending, { kind: 'streak_day' })).toThrow(/check-in is pending/);
    expect(() => applyDay(pending, { kind: 'protected' })).toThrow(/check-in is pending/);
    const missed = resolveCheckin(pending, { kind: 'miss', recovered: false, shieldWaived: false });
    expect(missed.reset).toBe(true);
    const next = applyDay(missed.state, { kind: 'streak_day' });
    expect(next.state.current).toBe(1);
    expect(next.milestoneXp).toBe(0);
  });

  it('more unanswered days widen the gap; one answer covers it', () => {
    let state = applyDay(sixDays, { kind: 'awaiting_checkin' }).state;
    state = applyDay(state, { kind: 'awaiting_checkin' }).state;
    state = applyDay(state, { kind: 'awaiting_checkin' }).state;
    expect(resolveCheckin(state, { kind: 'protected' }).state).toEqual(sixDays);
  });

  it('only a pending check-in can be resolved', () => {
    expect(() => resolveCheckin(sixDays, { kind: 'protected' })).toThrow(/no check-in is pending/);
  });
});

describe('closing a day (architecture §4.3)', () => {
  it('a streak day never asks the check-in, even when the core quest was skipped', () => {
    expect(closedDayResolution({ coreDone: false, questsDone: 2, protection: null })).toEqual({ kind: 'streak_day' });
  });

  it('an outage, a planned rest or a day without quests is protected without asking', () => {
    for (const protection of ['outage', 'planned_rest', 'no_quests'] as const) {
      expect(closedDayResolution({ coreDone: false, questsDone: 0, protection })).toEqual({ kind: 'protected' });
    }
  });

  it('otherwise the check-in is due', () => {
    expect(closedDayResolution({ coreDone: false, questsDone: 1, protection: null })).toEqual({ kind: 'awaiting_checkin' });
  });
});
