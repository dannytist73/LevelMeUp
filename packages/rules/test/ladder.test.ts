import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../src/constants.ts';
import { newLadder, recordCompletion, recordMiss, recordPain, recordReentry, resumeAfterPain, stepDown } from '../src/ladder.ts';
import type { LadderChange, LadderState, Rating } from '../src/ladder.ts';
import type { Difficulty } from '../src/types.ts';

const complete = (
  state: LadderState,
  days: number[],
  { rating = 'right', difficulty = 'steady', maxRung = 10 }: { rating?: Rating; difficulty?: Difficulty; maxRung?: number } = {},
): LadderChange[] => {
  const changes: LadderChange[] = [];
  let current = state;
  for (const day of days) {
    const change = recordCompletion(current, { at: day * DAY_MS, rating, difficulty, maxRung });
    changes.push(change);
    current = change.state;
  }
  return changes;
};
const last = (changes: LadderChange[]): LadderChange => changes[changes.length - 1]!;

describe('stepping up (spec §3.3)', () => {
  it('steady: 3 completions within 14 days step up, once, with the rung bonus', () => {
    const changes = complete(newLadder(), [0, 1, 2]);
    expect(changes.map((c) => c.steppedUp)).toEqual([false, false, true]);
    expect(last(changes).newHighestRung).toBe(true);
    expect(last(changes).state).toMatchObject({ rung: 1, highestRung: 1, atRung: [], lastStepUpAt: 2 * DAY_MS });
  });

  it('gentle needs 4 completions and hard needs 2', () => {
    expect(complete(newLadder(), [0, 1, 2, 3], { difficulty: 'gentle' }).map((c) => c.steppedUp)).toEqual([false, false, false, true]);
    expect(complete(newLadder(), [0, 1], { difficulty: 'hard' }).map((c) => c.steppedUp)).toEqual([false, true]);
  });

  it('2 "easy" ratings step up sooner', () => {
    expect(complete(newLadder(), [0, 1], { difficulty: 'gentle', rating: 'easy' }).map((c) => c.steppedUp)).toEqual([false, true]);
  });

  it('never steps up while either of the last 2 completions was "too hard", and offers a step down', () => {
    let state = newLadder(2);
    state = last(complete(state, [0, 1])).state;
    const tooHard = recordCompletion(state, { at: 2 * DAY_MS, rating: 'too_hard', difficulty: 'steady', maxRung: 10 });
    expect(tooHard.steppedUp).toBe(false);
    expect(tooHard.offerStepDown).toBe(true);
    const after = complete(tooHard.state, [3, 4]);
    expect(after.map((c) => c.steppedUp)).toEqual([false, true]);
  });

  it('does not offer a step down from the bottom rung', () => {
    expect(recordCompletion(newLadder(), { at: 0, rating: 'too_hard', difficulty: 'steady', maxRung: 10 }).offerStepDown).toBe(false);
  });

  it('ignores completions older than 14 days', () => {
    expect(complete(newLadder(), [0, 1, 20]).map((c) => c.steppedUp)).toEqual([false, false, false]);
  });

  it('steps up at most once a week', () => {
    const changes = complete(newLadder(), [0, 1, 2, 3, 8], { difficulty: 'hard' });
    expect(changes.map((c) => c.steppedUp)).toEqual([false, true, false, false, true]);
  });

  it('stops at the top rung', () => {
    expect(complete(newLadder(3), [0, 1, 2], { maxRung: 3 }).some((c) => c.steppedUp)).toBe(false);
  });

  it('pays the rung bonus only once per rung', () => {
    const up = last(complete(newLadder(), [0, 1, 2]));
    const down = stepDown(up.state);
    const again = last(complete(down.state, [10, 11, 12]));
    expect(again.steppedUp).toBe(true);
    expect(again.newHighestRung).toBe(false);
  });

  it('keeps only the completions inside the 14-day window, so the saved state stays small at the top rung', () => {
    const days = Array.from({ length: 60 }, (_, day) => day);
    expect(last(complete(newLadder(), days, { maxRung: 0 })).state.atRung).toHaveLength(14);
  });

  it('counts each quest day once: a duplicate never steps up, and recording a day again replaces its rating', () => {
    expect(complete(newLadder(), [0, 0], { difficulty: 'hard' }).some((c) => c.steppedUp)).toBe(false);
    expect(complete(newLadder(), [0, 0, 0]).some((c) => c.steppedUp)).toBe(false);
    const rated = recordCompletion(last(complete(newLadder(), [0])).state, { at: 0, rating: 'too_hard', difficulty: 'steady', maxRung: 10 });
    expect(rated.state.atRung).toEqual([{ at: 0, rating: 'too_hard' }]);
  });

  it('ignores a late completion from before the last step-up (it belongs to the old rung), but still offers a step down', () => {
    const up = last(complete(newLadder(), [3, 4], { difficulty: 'hard' }));
    expect(up.steppedUp).toBe(true);
    const late = recordCompletion(up.state, { at: 2 * DAY_MS, rating: 'too_hard', difficulty: 'hard', maxRung: 10 });
    expect(late.state).toEqual(up.state);
    expect(late.offerStepDown).toBe(true);
  });

  it('rejects an unknown rating or difficulty', () => {
    expect(() => recordCompletion(newLadder(), { at: 0, rating: 'meh' as Rating, difficulty: 'steady', maxRung: 10 })).toThrow(RangeError);
    expect(() => recordCompletion(newLadder(), { at: 0, rating: 'easy', difficulty: 'brutal' as Difficulty, maxRung: 10 })).toThrow(RangeError);
  });

  it('judges a late-synced completion by its quest day, measured from the latest quest day', () => {
    expect(complete(newLadder(), [0, 20, 10]).map((c) => c.steppedUp)).toEqual([false, false, false]);
    const close = complete(newLadder(), [5, 12, 10]);
    expect(close.map((c) => c.steppedUp)).toEqual([false, false, true]);
    expect(last(close).state.lastStepUpAt).toBe(12 * DAY_MS);
  });
});

describe('stepping down', () => {
  it('2 misses within 7 days step down', () => {
    const first = recordMiss(newLadder(2), 0);
    expect(first.steppedDown).toBe(false);
    const second = recordMiss(first.state, 3 * DAY_MS);
    expect(second.steppedDown).toBe(true);
    expect(second.state.rung).toBe(1);
  });

  it('misses 8 days apart do not, in either order', () => {
    const first = recordMiss(newLadder(2), 0);
    expect(recordMiss(first.state, 8 * DAY_MS).steppedDown).toBe(false);
    const later = recordMiss(newLadder(2), 10 * DAY_MS);
    expect(recordMiss(later.state, 2 * DAY_MS).steppedDown).toBe(false);
  });

  it('the same missed day recorded twice is one miss', () => {
    const first = recordMiss(newLadder(2), 0);
    expect(recordMiss(first.state, 0).steppedDown).toBe(false);
  });

  it('coming back after 5 or more days away starts one rung lower', () => {
    expect(recordReentry(newLadder(2), 10 * DAY_MS, 5 * DAY_MS).state.rung).toBe(1);
    expect(recordReentry(newLadder(2), 10 * DAY_MS, 6 * DAY_MS).state.rung).toBe(2);
  });

  it('never goes below the bottom rung', () => {
    const change = stepDown(newLadder());
    expect(change.state.rung).toBe(0);
    expect(change.steppedDown).toBe(false);
  });
});

describe('pain (spec §3.3, §3.4)', () => {
  it('pauses the ladder without penalty, ignores completions while paused, and resumes one rung lower', () => {
    const paused = recordPain(newLadder(3)).state;
    expect(paused.paused).toBe(true);
    expect(recordCompletion(paused, { at: 0, rating: 'easy', difficulty: 'hard', maxRung: 10 }).state).toEqual(paused);
    const resumed = resumeAfterPain(paused).state;
    expect(resumed).toMatchObject({ paused: false, rung: 2 });
  });

  it('a paused ladder records no misses or re-entry, so resuming is only ever one rung lower', () => {
    let paused = recordPain(newLadder(3)).state;
    paused = recordMiss(paused, 0).state;
    paused = recordMiss(paused, DAY_MS).state;
    paused = recordReentry(paused, 20 * DAY_MS, 0).state;
    expect(paused.rung).toBe(3);
    expect(resumeAfterPain(paused).state.rung).toBe(2);
  });
});
