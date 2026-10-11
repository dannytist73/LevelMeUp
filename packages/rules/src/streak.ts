import { MAX_SHIELDS, SHIELD_EVERY_STREAK_DAYS, STREAK_MILESTONES } from './constants.ts';

export type StreakState = {
  current: number;
  best: number;
  shields: number;
  /** A closed day is waiting for its check-in; the streak is shown as paused. */
  awaitingCheckin: boolean;
};

/** What a closed day is, before any check-in. */
export type ClosedDayResolution = { kind: 'streak_day' } | { kind: 'protected' } | { kind: 'awaiting_checkin' };

/** The answered check-in: protected, or a miss once its recovery window ends. A miss exists only here. */
export type CheckinResolution = { kind: 'protected' } | { kind: 'miss'; recovered: boolean; shieldWaived: boolean };

export type DayResolution = ClosedDayResolution | CheckinResolution;

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

/**
 * Why a day was protected without asking: planned rest or a rest after "I felt pain" (both chosen by the player), a
 * server outage, or no quests were generated.
 */
export type Protection = 'planned_rest' | 'pain' | 'outage' | 'no_quests';

export type ClosedDay = { coreDone: boolean; questsDone: number; protection: Protection | null };

/**
 * How a closed day enters the streak (architecture §4.3). Only a day that is neither a streak day nor protected asks
 * the check-in, so a crash, an outage or missing data can never become a miss on its own.
 */
export function closedDayResolution(day: ClosedDay): ClosedDayResolution {
  if (isStreakDay(day)) return { kind: 'streak_day' };
  if (day.protection !== null) return { kind: 'protected' };
  return { kind: 'awaiting_checkin' };
}

const NOTHING = { milestoneXp: 0, shieldEarned: false, shieldUsed: false, reset: false };

/**
 * Applies the next closed day. Days must be applied in quest-day order. While a check-in is pending, later days wait:
 * another unanswered day only widens the gap (one check-in covers it), and anything else throws until the check-in
 * is resolved with `resolveCheckin`, so delaying the answer can't change the result. A miss can't be applied here:
 * it only ever comes from the player's own check-in answer.
 */
export function applyDay(state: StreakState, resolution: ClosedDayResolution): StreakChange {
  const kind: string = resolution.kind;
  if (kind !== 'streak_day' && kind !== 'protected' && kind !== 'awaiting_checkin') {
    throw new RangeError(`a closed day can't be "${kind}"; a miss only comes from resolveCheckin`);
  }
  if (state.awaitingCheckin) {
    if (resolution.kind === 'awaiting_checkin') return { ...NOTHING, state };
    throw new Error('a check-in is pending: resolve it before applying later days');
  }
  return applyResolution(state, resolution);
}

/** Resolves the pending check-in (one answer covers the whole gap): protected, or a miss once its recovery window ends. */
export function resolveCheckin(state: StreakState, resolution: CheckinResolution): StreakChange {
  const kind: string = resolution.kind;
  if (kind !== 'protected' && kind !== 'miss') throw new RangeError(`a check-in can't resolve to "${kind}"`);
  if (!state.awaitingCheckin) throw new Error('no check-in is pending');
  return applyResolution(state, resolution);
}

function applyResolution(state: StreakState, resolution: DayResolution): StreakChange {
  const nothing = NOTHING;
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
