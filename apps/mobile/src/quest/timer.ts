// A quest timer (spec §3.6, M6a decision 3): segments of real time, so it keeps counting with the screen off or the app
// closed. The server counts the same segments, clamped to the day, and completes at 80 % of the target.
import { elapsedMs, questTimerDone } from '@levelmeup/rules';
import type { Segment } from '@levelmeup/rules';

export type TimerState = { segments: readonly Segment[]; runningSince: number | null };

export const NEW_TIMER: TimerState = { segments: [], runningSince: null };

export const startTimer = (t: TimerState, now: number): TimerState => (t.runningSince !== null ? t : { ...t, runningSince: now });

export const pauseTimer = (t: TimerState, now: number): TimerState =>
  t.runningSince === null ? t : { segments: [...t.segments, { start: t.runningSince, end: Math.max(t.runningSince, now) }], runningSince: null };

/** What a claim sends: the finished segments and the running one up to now. */
export const timerSegments = (t: TimerState, now: number): Segment[] => [...pauseTimer(t, now).segments];

export const timerElapsed = (t: TimerState, now: number): number => elapsedMs(timerSegments(t, now));

export const timerDone = (t: TimerState, now: number, targetMs: number): boolean => questTimerDone(timerElapsed(t, now), targetMs);

const isTime = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;

function readTimer(raw: unknown): TimerState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { segments, runningSince } = raw as { segments?: unknown; runningSince?: unknown };
  if (!Array.isArray(segments)) return null;
  if (runningSince !== null && !isTime(runningSince)) return null;
  const read: Segment[] = [];
  for (const s of segments) {
    if (typeof s !== 'object' || s === null) return null;
    const { start, end } = s as { start?: unknown; end?: unknown };
    if (!isTime(start) || !isTime(end) || end < start) return null;
    read.push({ start, end });
  }
  return { segments: read, runningSince };
}

/** Every stored timer by quest id (`lmu.timers`); anything unreadable is dropped. */
export function parseTimers(text: string | null): Record<number, TimerState> {
  if (text === null) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof raw !== 'object' || raw === null) return {};
  const timers: Record<number, TimerState> = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = Number(key);
    const timer = readTimer(value);
    if (Number.isSafeInteger(id) && id > 0 && timer !== null) timers[id] = timer;
  }
  return timers;
}
