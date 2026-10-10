import {
  MIN_MS_BETWEEN_STEP_UPS,
  MISSES_FOR_STEP_DOWN,
  MISS_WINDOW_MS,
  REENTRY_AWAY_MS,
  STEP_UP_BAR,
  STEP_UP_EASY_COUNT,
  STEP_UP_WINDOW_MS,
} from './constants.ts';
import type { Difficulty } from './types.ts';

export type Rating = 'easy' | 'right' | 'too_hard';

export type LadderState = {
  rung: number;
  /** Highest rung ever reached; the rung bonus is paid only when this rises. */
  highestRung: number;
  /** Completions at the current rung (quest-day start time and rating). */
  atRung: ReadonlyArray<{ at: number; rating: Rating }>;
  /** Recent missed sessions of this ladder (quest-day start times). */
  misses: readonly number[];
  lastStepUpAt: number | null;
  paused: boolean;
};

export type LadderChange = {
  state: LadderState;
  steppedUp: boolean;
  steppedDown: boolean;
  /** True when a step-up reached a rung never reached before: pay the rung bonus. */
  newHighestRung: boolean;
  /** The player rated it too hard: offer a step down now. */
  offerStepDown: boolean;
};

export function newLadder(rung = 0): LadderState {
  return { rung, highestRung: rung, atRung: [], misses: [], lastStepUpAt: null, paused: false };
}

function unchanged(state: LadderState): LadderChange {
  return { state, steppedUp: false, steppedDown: false, newHighestRung: false, offerStepDown: false };
}

export function recordCompletion(
  state: LadderState,
  completion: { at: number; rating: Rating; difficulty: Difficulty; maxRung: number },
): LadderChange {
  if (state.paused) return unchanged(state);
  // Sorted by quest day and measured from the latest one, so a late-synced completion counts on its own day.
  // Only the 14-day window is kept: older completions can never count again, and the saved state stays small.
  const all = [...state.atRung, { at: completion.at, rating: completion.rating }].sort((a, b) => a.at - b.at);
  const latest = all[all.length - 1]!.at;
  const recent = all.filter((c) => latest - c.at < STEP_UP_WINDOW_MS);
  const lastTwoFine = recent.slice(-2).every((c) => c.rating !== 'too_hard');
  const enough =
    recent.length >= STEP_UP_BAR[completion.difficulty] ||
    recent.filter((c) => c.rating === 'easy').length >= STEP_UP_EASY_COUNT;
  const weekPassed = state.lastStepUpAt === null || latest - state.lastStepUpAt >= MIN_MS_BETWEEN_STEP_UPS;

  if (enough && lastTwoFine && weekPassed && state.rung < completion.maxRung) {
    const rung = state.rung + 1;
    return {
      state: { ...state, rung, highestRung: Math.max(state.highestRung, rung), atRung: [], misses: [], lastStepUpAt: latest },
      steppedUp: true,
      steppedDown: false,
      newHighestRung: rung > state.highestRung,
      offerStepDown: false,
    };
  }
  return { ...unchanged({ ...state, atRung: recent }), offerStepDown: completion.rating === 'too_hard' && state.rung > 0 };
}

export function stepDown(state: LadderState): LadderChange {
  if (state.rung === 0) return unchanged({ ...state, atRung: [], misses: [] });
  return {
    state: { ...state, rung: state.rung - 1, atRung: [], misses: [] },
    steppedUp: false,
    steppedDown: true,
    newHighestRung: false,
    offerStepDown: false,
  };
}

/** 2 missed sessions of this ladder within 7 days step it down. */
export function recordMiss(state: LadderState, at: number): LadderChange {
  const misses = [...state.misses, at].filter((t) => at - t < MISS_WINDOW_MS);
  if (misses.length >= MISSES_FOR_STEP_DOWN) return stepDown(state);
  return unchanged({ ...state, misses });
}

/** Back after 5 or more days away: the first session is one rung lower. */
export function recordReentry(state: LadderState, at: number, lastActiveAt: number): LadderChange {
  return at - lastActiveAt >= REENTRY_AWAY_MS ? stepDown(state) : unchanged(state);
}

/** "I felt pain": pause the ladder without penalty. */
export function recordPain(state: LadderState): LadderChange {
  return unchanged({ ...state, paused: true });
}

/** Resuming after pain starts one rung lower. */
export function resumeAfterPain(state: LadderState): LadderChange {
  return stepDown({ ...state, paused: false });
}
