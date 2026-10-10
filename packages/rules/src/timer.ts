import { TIMER_COMPLETE_FRACTION, TRIAL_FOCUS_MS } from './constants.ts';

export type Segment = { start: number; end: number };

/** Total time covered by the segments; overlaps count once, so duplicated segments can't inflate a timer. */
export function elapsedMs(segments: readonly Segment[]): number {
  const sorted = segments.filter((s) => s.end > s.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let coveredUntil = Number.NEGATIVE_INFINITY;
  for (const segment of sorted) {
    const start = Math.max(segment.start, coveredUntil);
    if (segment.end > start) total += segment.end - start;
    coveredUntil = Math.max(coveredUntil, segment.end);
  }
  return total;
}

export function questTimerDone(elapsed: number, targetMs: number): boolean {
  return elapsed >= targetMs * TIMER_COMPLETE_FRACTION;
}

export function trialDone(elapsed: number): boolean {
  return elapsed >= TRIAL_FOCUS_MS;
}
