import { MAX_SHIELDS, SHIELD_EVERY_STREAK_DAYS, STREAK_MILESTONES } from './constants.ts';

export type StreakState = {
  current: number;
  best: number;
  shields: number;
  /** A closed day is waiting for its check-in; the streak is shown as paused. */
  awaitingCheckin: boolean;
};

export type DayResolution =
  | { kind: 'streak_day' }
  | { kind: 'protected' }
  | { kind: 'awaiting_checkin' }
  | { kind: 'miss'; recovered: boolean; shieldWaived: boolean };

export type StreakChange = {
  state: StreakState;
  /** Discipline XP for reaching a milestone (7, 14, 30, 66, 100 days). */
  milestoneXp: number;
  shieldEarned: boolean;
  shieldUsed: boolean;
  reset: boolean;
};

export function newStreak(): StreakState {
  return { current: 0, best: 0, shields: 0, awaitingCheckin: false };
}

/** A streak day: the core quest done in any version, or any two quests done (spec §2.4). */
export function isStreakDay(day: { coreDone: boolean; questsDone: number }): boolean {
  return day.coreDone || day.questsDone >= 2;
}

export function applyDay(state: StreakState, resolution: DayResolution): StreakChange {
  const nothing = { milestoneXp: 0, shieldEarned: false, shieldUsed: false, reset: false };
  switch (resolution.kind) {
    case 'streak_day': {
      const current = state.current + 1;
      const shieldEarned = current % SHIELD_EVERY_STREAK_DAYS === 0 && state.shields < MAX_SHIELDS;
      return {
        ...nothing,
        state: {
          current,
          best: Math.max(state.best, current),
          shields: shieldEarned ? state.shields + 1 : state.shields,
          awaitingCheckin: false,
        },
        milestoneXp: STREAK_MILESTONES[current] ?? 0,
        shieldEarned,
      };
    }
    case 'protected':
      return { ...nothing, state: { ...state, awaitingCheckin: false } };
    case 'awaiting_checkin':
      return { ...nothing, state: { ...state, awaitingCheckin: true } };
    case 'miss': {
      if (resolution.recovered || resolution.shieldWaived) {
        return { ...nothing, state: { ...state, awaitingCheckin: false } };
      }
      if (state.shields > 0) {
        return { ...nothing, state: { ...state, shields: state.shields - 1, awaitingCheckin: false }, shieldUsed: true };
      }
      return { ...nothing, state: { ...state, current: 0, awaitingCheckin: false }, reset: true };
    }
  }
}
