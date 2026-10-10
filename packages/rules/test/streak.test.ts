import { describe, expect, it } from 'vitest';
import { applyDay, isStreakDay, newStreak } from '../src/streak.ts';
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
    expect(applyDay(waiting, { kind: 'protected' }).state).toEqual({ ...waiting, awaitingCheckin: false });
  });

  it('a recovered miss keeps everything', () => {
    const change = applyDay(waiting, { kind: 'miss', recovered: true, shieldWaived: false });
    expect(change.state).toEqual({ ...waiting, awaitingCheckin: false });
    expect(change.shieldUsed).toBe(false);
  });

  it('an unrecovered miss spends a shield', () => {
    const change = applyDay(waiting, { kind: 'miss', recovered: false, shieldWaived: false });
    expect(change.state).toEqual({ current: 9, best: 12, shields: 0, awaitingCheckin: false });
    expect(change.shieldUsed).toBe(true);
  });

  it('Unbreakable waives the shield', () => {
    const change = applyDay(waiting, { kind: 'miss', recovered: false, shieldWaived: true });
    expect(change.state.shields).toBe(1);
    expect(change.shieldUsed).toBe(false);
  });

  it('with no shield the streak resets, but the best stays', () => {
    const change = applyDay({ ...waiting, shields: 0 }, { kind: 'miss', recovered: false, shieldWaived: false });
    expect(change.state).toEqual({ current: 0, best: 12, shields: 0, awaitingCheckin: false });
    expect(change.reset).toBe(true);
  });
});
