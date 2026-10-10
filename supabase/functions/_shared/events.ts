// Phone events for `lmu-sync` (architecture §4.1). M3 handles complete, undo and rate; the other event types arrive
// with the milestones whose screens send them, and until then are rejected without touching anything.
import { CLOCK_SKEW_MS, canonicalTimeZone, elapsedMs, isValidTimeZone, questTimerDone } from '../../../packages/rules/src/index.ts';
import type { Rating, Segment } from '../../../packages/rules/src/index.ts';
import { isObject, problem, UUID } from './http.ts';
import type { Problem } from './http.ts';
import type { DayRow, InstanceRow } from './state.ts';

export const MAX_EVENTS = 50;
const RATINGS: readonly Rating[] = ['easy', 'right', 'too_hard'];
const MAX_SEGMENTS = 100;
const MAX_SETS = 20;
const MAX_REPS = 999;
const MAX_SENTENCE = 280;
/** Times a phone can send: whole milliseconds between 2026 and 2100 (SQL checks the real window). */
const EARLIEST_MS = Date.UTC(2026, 0, 1);
const LATEST_MS = Date.UTC(2100, 0, 1);
const isTime = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= EARLIEST_MS && (v as number) <= LATEST_MS;
/** Control characters (Postgres refuses \u0000 in jsonb; a sentence has no line breaks). */
const CONTROL = /\p{Cc}/u;

export type CompleteEvent = { id: string; type: 'complete'; instanceId: number; completedAt: number; rating: Rating | null; payload: unknown };
export type UndoEvent = { id: string; type: 'undo'; instanceId: number };
export type RateEvent = { id: string; type: 'rate'; instanceId: number; rating: Rating };
export type PhoneEvent = CompleteEvent | UndoEvent | RateEvent;
export type Rejected = { id: string | null; code: string };

export type SyncRequest = { timeZone: string; events: PhoneEvent[]; rejected: Rejected[] };

const isInstanceId = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;

function parseEvent(raw: unknown): PhoneEvent | Rejected {
  if (!isObject(raw)) return { id: null, code: 'bad_event' };
  const id = typeof raw.id === 'string' && UUID.test(raw.id) ? raw.id.toLowerCase() : null;
  if (id === null) return { id: null, code: 'bad_event_id' };
  if (!isInstanceId(raw.instanceId)) return { id, code: 'bad_event' };
  switch (raw.type) {
    case 'complete': {
      if (!isTime(raw.completedAt)) return { id, code: 'bad_event' };
      const rating = raw.rating ?? null;
      if (rating !== null && !RATINGS.includes(rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'complete', instanceId: raw.instanceId, completedAt: raw.completedAt, rating: rating as Rating | null, payload: raw.payload ?? {} };
    }
    case 'undo':
      return { id, type: 'undo', instanceId: raw.instanceId };
    case 'rate':
      if (!RATINGS.includes(raw.rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'rate', instanceId: raw.instanceId, rating: raw.rating as Rating };
    default:
      return { id, code: 'unsupported_event' };
  }
}

/** The sync body: the phone's time zone (canonical) and its events in order. Bad events are rejected one by one. */
export function parseSyncBody(body: unknown): SyncRequest | Problem {
  if (!isObject(body)) return problem(400, 'bad_body');
  if (typeof body.timeZone !== 'string' || !isValidTimeZone(body.timeZone)) return problem(400, 'bad_time_zone');
  const raw = body.events ?? [];
  if (!Array.isArray(raw)) return problem(400, 'bad_body');
  if (raw.length > MAX_EVENTS) return problem(413, 'too_many_events', `at most ${MAX_EVENTS} events per sync`);
  const events: PhoneEvent[] = [];
  const rejected: Rejected[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = parseEvent(item);
    if ('type' in parsed) {
      if (seen.has(parsed.id)) continue;
      seen.add(parsed.id);
      events.push(parsed);
    } else {
      rejected.push(parsed);
    }
  }
  return { timeZone: canonicalTimeZone(body.timeZone), events, rejected };
}

/** What a timer must cover: the condition's time, else the quest's minutes. */
export function timerTargetMs(instance: Pick<InstanceRow, 'condition' | 'minutes'>): number {
  const c = instance.condition;
  if (c.kind === 'minutes') return c.minutes * 60_000;
  if (c.kind === 'hold') return c.sets * c.seconds * (c.perSide ? 2 : 1) * 1000;
  return instance.minutes * 60_000;
}

/**
 * Checks a completion's payload for the quest's completion type (spec §3.6) and returns what to store, or a reason.
 * Timer segments only count inside the day and up to the time the server received them, so a timer can't be stretched.
 */
export function checkCompletionPayload(
  instance: Pick<InstanceRow, 'completion' | 'condition' | 'minutes'>,
  day: Pick<DayRow, 'starts_at' | 'ends_at'>,
  payload: unknown,
  receivedAt: number,
): { payload: Record<string, unknown> } | { code: string } {
  switch (instance.completion) {
    case 'tap':
      return { payload: {} };
    case 'timer': {
      if (!isObject(payload) || !Array.isArray(payload.segments) || payload.segments.length > MAX_SEGMENTS) return { code: 'bad_payload' };
      const from = day.starts_at.getTime();
      const until = Math.min(day.ends_at.getTime(), receivedAt + CLOCK_SKEW_MS);
      const sent: Segment[] = [];
      for (const s of payload.segments) {
        if (!isObject(s) || !isTime(s.start) || !isTime(s.end)) return { code: 'bad_payload' };
        sent.push({ start: s.start, end: s.end });
      }
      const counted = sent.map((s) => ({ start: Math.max(s.start, from), end: Math.min(s.end, until) }));
      if (!questTimerDone(elapsedMs(counted), timerTargetMs(instance))) return { code: 'timer_short' };
      return { payload: { segments: sent } };
    }
    case 'reps': {
      if (!isObject(payload) || !Array.isArray(payload.sets)) return { code: 'bad_payload' };
      const sets = payload.sets;
      if (sets.length < 1 || sets.length > MAX_SETS) return { code: 'bad_payload' };
      if (!sets.every((n) => Number.isInteger(n) && n >= 0 && n <= MAX_REPS)) return { code: 'bad_payload' };
      if (!sets.some((n) => n > 0)) return { code: 'bad_payload' };
      return { payload: { sets } };
    }
    case 'text': {
      if (!isObject(payload) || typeof payload.text !== 'string') return { code: 'bad_payload' };
      const text = payload.text.trim();
      if (text.length < 1 || text.length > MAX_SENTENCE || CONTROL.test(text)) return { code: 'bad_payload' };
      return { payload: { text } };
    }
    default:
      return { code: 'bad_payload' };
  }
}
