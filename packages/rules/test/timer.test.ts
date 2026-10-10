import { describe, expect, it } from 'vitest';
import { MINUTE_MS } from '../src/constants.ts';
import { elapsedMs, questTimerDone, trialDone } from '../src/timer.ts';

describe('timers', () => {
  it('adds up segments, merging overlaps and ignoring empty ones', () => {
    expect(elapsedMs([{ start: 0, end: 60_000 }, { start: 120_000, end: 150_000 }])).toBe(90_000);
    expect(elapsedMs([{ start: 0, end: 60_000 }, { start: 30_000, end: 90_000 }])).toBe(90_000);
    expect(elapsedMs([{ start: 50_000, end: 40_000 }])).toBe(0);
    expect(elapsedMs([])).toBe(0);
  });

  it('ignores segments without real times, so an endless segment never completes a timer', () => {
    expect(elapsedMs([{ start: 0, end: Number.POSITIVE_INFINITY }, { start: Number.NaN, end: 60_000 }])).toBe(0);
  });

  it('completes a quest timer at 80 % of its target', () => {
    expect(questTimerDone(8 * MINUTE_MS, 10 * MINUTE_MS)).toBe(true);
    expect(questTimerDone(8 * MINUTE_MS - 1, 10 * MINUTE_MS)).toBe(false);
  });

  it('needs the full 10 minutes for the Trial of Stillness', () => {
    expect(trialDone(10 * MINUTE_MS)).toBe(true);
    expect(trialDone(10 * MINUTE_MS - 1)).toBe(false);
  });
});
