// Phone events for `lmu-sync` (architecture §4.1). M3 handles complete, undo and rate; M6b the adjustments (swap, hard
// day, rest, pain, resume, step down, class change, Stillness and Dawn Ritual); M6c the training setup; M6d the Scholar's
// Path book; the rest arrive with the milestones whose screens send them, and until then are rejected without touching
// anything.
import {
  CLASSES, CLOCK_SKEW_MS, EQUIPMENT, PROGRAM_STYLES, canonicalTimeZone, elapsedMs, isValidTimeZone, questTimerDone, sessionSets,
} from '../../../packages/rules/src/index.ts';
import type { ClassId, Equipment, ProgramStyle, Rating, Segment } from '../../../packages/rules/src/index.ts';
import { isObject, problem, UUID } from './http.ts';
import type { Problem } from './http.ts';
import type { DayRow, InstanceRow } from './state.ts';

export const MAX_EVENTS = 50;
const RATINGS: readonly Rating[] = ['easy', 'right', 'too_hard'];
const MAX_SEGMENTS = 100;
export const MAX_SETS = 20;
export const MAX_REPS = 999;
export const MAX_SENTENCE = 280;
/** Times a phone can send: whole milliseconds between 2026 and 2100 (SQL checks the real window). */
const EARLIEST_MS = Date.UTC(2026, 0, 1);
const LATEST_MS = Date.UTC(2100, 0, 1);
const isTime = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= EARLIEST_MS && (v as number) <= LATEST_MS;
/** Control characters (Postgres refuses \u0000 in jsonb; a sentence has no line breaks). */
const CONTROL = /\p{Cc}/u;

export type CompleteEvent = { id: string; type: 'complete'; instanceId: number; completedAt: number; rating: Rating | null; payload: unknown };
export type UndoEvent = { id: string; type: 'undo'; instanceId: number };
export type RateEvent = { id: string; type: 'rate'; instanceId: number; rating: Rating };
export type PainChoice = 'gentle' | 'rest' | 'pause';
export type DayAbility = 'stillness' | 'dawn_ritual';
export type SwapEvent = { id: string; type: 'swap'; instanceId: number; templateId: string };
export type HardDayEvent = { id: string; type: 'hard_day'; dayId: number };
export type RestEvent = { id: string; type: 'plan_rest'; dayId: number };
export type PainEvent = { id: string; type: 'pain'; instanceId: number; choice: PainChoice };
/** `ladderId`: a ladder, or a standalone exercise quest resting after pain (rules: painKey). */
export type ResumeEvent = { id: string; type: 'resume'; ladderId: string };
export type StepDownEvent = { id: string; type: 'step_down'; instanceId: number };
export type ClassChangeEvent = { id: string; type: 'class_change'; classId: ClassId };
export type AbilityEvent = { id: string; type: 'ability'; dayId: number; ability: DayAbility };
/** M6c: the player's training setup (Settings → Training); today's open workout is re-planned with it. */
export type TrainingEvent = { id: string; type: 'training'; equipment: Equipment[]; programStyle: ProgramStyle };
/** M6d: Scholar's Path. A title starts that book; `finished` first records the current one; null sets it aside. */
export type BookEvent = { id: string; type: 'book'; title: string | null; finished: boolean };
export const MAX_BOOK_TITLE = 120;
export type AdjustEvent =
  | SwapEvent | HardDayEvent | RestEvent | PainEvent | ResumeEvent | StepDownEvent | ClassChangeEvent | AbilityEvent | TrainingEvent
  | BookEvent;
export type PhoneEvent = CompleteEvent | UndoEvent | RateEvent | AdjustEvent;
export type Rejected = { id: string | null; code: string };

export const ADJUST_TYPES: readonly AdjustEvent['type'][] = [
  'swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training', 'book',
];
export const isAdjust = (event: PhoneEvent): event is AdjustEvent => (ADJUST_TYPES as readonly string[]).includes(event.type);

/** What `levelmeup.events` stores for an adjustment: the event without its id and type. */
export function adjustPayload(event: AdjustEvent): Record<string, unknown> {
  const { id: _id, type: _type, ...rest } = event;
  return rest;
}

export type SyncRequest = { timeZone: string; events: PhoneEvent[]; rejected: Rejected[] };

/** Instance and day ids: positive safe integers. */
const isId = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
/** Template and ladder ids, as the content package writes them. */
const isKey = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(v);
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
const PAIN_CHOICES: readonly PainChoice[] = ['gentle', 'rest', 'pause'];
const DAY_ABILITIES: readonly DayAbility[] = ['stillness', 'dawn_ritual'];

function parseEvent(raw: unknown): PhoneEvent | Rejected {
  if (!isObject(raw)) return { id: null, code: 'bad_event' };
  const id = typeof raw.id === 'string' && UUID.test(raw.id) ? raw.id.toLowerCase() : null;
  if (id === null) return { id: null, code: 'bad_event_id' };
  const bad: Rejected = { id, code: 'bad_event' };
  switch (raw.type) {
    case 'complete': {
      if (!isId(raw.instanceId) || !isTime(raw.completedAt)) return bad;
      const rating = raw.rating ?? null;
      if (rating !== null && !RATINGS.includes(rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'complete', instanceId: raw.instanceId, completedAt: raw.completedAt, rating: rating as Rating | null, payload: raw.payload ?? {} };
    }
    case 'undo':
      return isId(raw.instanceId) ? { id, type: 'undo', instanceId: raw.instanceId } : bad;
    case 'rate':
      if (!isId(raw.instanceId)) return bad;
      if (!RATINGS.includes(raw.rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'rate', instanceId: raw.instanceId, rating: raw.rating as Rating };
    case 'swap':
      return isId(raw.instanceId) && isKey(raw.templateId) ? { id, type: 'swap', instanceId: raw.instanceId, templateId: raw.templateId } : bad;
    case 'hard_day':
      return isId(raw.dayId) ? { id, type: 'hard_day', dayId: raw.dayId } : bad;
    case 'plan_rest':
      return isId(raw.dayId) ? { id, type: 'plan_rest', dayId: raw.dayId } : bad;
    case 'pain':
      return isId(raw.instanceId) && PAIN_CHOICES.includes(raw.choice as PainChoice)
        ? { id, type: 'pain', instanceId: raw.instanceId, choice: raw.choice as PainChoice }
        : bad;
    case 'resume':
      return isKey(raw.ladderId) ? { id, type: 'resume', ladderId: raw.ladderId } : bad;
    case 'step_down':
      return isId(raw.instanceId) ? { id, type: 'step_down', instanceId: raw.instanceId } : bad;
    case 'class_change':
      return CLASS_IDS.includes(raw.classId as ClassId) ? { id, type: 'class_change', classId: raw.classId as ClassId } : bad;
    case 'ability':
      return isId(raw.dayId) && DAY_ABILITIES.includes(raw.ability as DayAbility)
        ? { id, type: 'ability', dayId: raw.dayId, ability: raw.ability as DayAbility }
        : bad;
    case 'training': {
      const equipment = raw.equipment;
      if (!Array.isArray(equipment) || new Set(equipment).size !== equipment.length) return bad;
      if (!equipment.every((e) => EQUIPMENT.includes(e as Equipment)) || !PROGRAM_STYLES.includes(raw.programStyle as ProgramStyle)) return bad;
      return { id, type: 'training', equipment: equipment as Equipment[], programStyle: raw.programStyle as ProgramStyle };
    }
    case 'book': {
      if (typeof raw.finished !== 'boolean') return bad;
      if (raw.title === null) return { id, type: 'book', title: null, finished: raw.finished };
      if (typeof raw.title !== 'string') return bad;
      const title = raw.title.trim();
      if (title.length < 1 || title.length > MAX_BOOK_TITLE || CONTROL.test(title)) return bad;
      return { id, type: 'book', title, finished: raw.finished };
    }
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
      // A workout logs every planned set, in order (M6c decision 9).
      if (instance.condition.kind === 'session' && sets.length !== sessionSets(instance.condition)) return { code: 'bad_payload' };
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
