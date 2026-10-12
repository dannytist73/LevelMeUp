// Phone events for `lmu-sync` (architecture §4.1). M3 handles complete, undo and rate; M6b the adjustments (swap, hard
// day, rest, pain, resume, step down, class change, Stillness and Dawn Ritual); M6c the training setup; M6d the Scholar's
// Path book; M6e the offline-built day and quests named by day and slot; M7a the check-in's answer and the lighter plan;
// M7b the game settings and the tap time on a rest or pain report; M7c the pact, the Trial of Stillness and the check-in's
// note. Anything else is rejected without touching anything.
import {
  ACCOUNTABILITY_LEVELS, CHECKIN_ANSWERS, CLASSES, CLOCK_SKEW_MS, DIFFICULTIES, EQUIPMENT, MINUTES_OPTIONS, PROGRAM_STYLES, canonicalTimeZone, elapsedMs, isValidTimeZone,
  isWhyReason, questTimerDone, sessionSets,
} from '../../../packages/rules/src/index.ts';
import type {
  AccountabilityLevel, CheckinAnswer, ClassId, Difficulty, Equipment, PlannedMove, ProgramStyle, ProvisionalQuest, Rating, Segment, Slot,
} from '../../../packages/rules/src/index.ts';
import { VOICES } from '../../../packages/content/src/index.ts';
import type { Voice } from '../../../packages/content/src/index.ts';
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

/** M6e: a quest of a day the phone built offline, named by its day and slot until the server gives it an id. */
export type SlotRef = { dayNumber: number; slot: Slot; templateId: string };
/** Which quest an event is about: its id, or (M6e) its day and slot. */
export type QuestTarget = { instanceId: number; ref?: undefined } | { instanceId: null; ref: SlotRef };

export type CompleteEvent = { id: string; type: 'complete'; completedAt: number; rating: Rating | null; payload: unknown } & QuestTarget;
export type UndoEvent = { id: string; type: 'undo' } & QuestTarget;
export type RateEvent = { id: string; type: 'rate'; rating: Rating } & QuestTarget;
export type PainChoice = 'gentle' | 'rest' | 'pause';
export type DayAbility = 'stillness' | 'dawn_ritual';
export type SwapEvent = { id: string; type: 'swap'; instanceId: number; templateId: string };
export type HardDayEvent = { id: string; type: 'hard_day'; dayId: number };
/** `at` (M7b decision 6): when it was tapped, so a rest synced late still counts for its day; `tomorrow` (decision 5). */
export type RestEvent = { id: string; type: 'plan_rest'; dayId: number; at?: number; tomorrow?: true };
export type PainEvent = { id: string; type: 'pain'; choice: PainChoice; at?: number } & QuestTarget;
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
/** M7a: the answer to the pending check-in (decision 2); Second Wind only with "I just didn't" (decision 7). */
export type CheckinEvent = { id: string; type: 'checkin'; checkinId: number; answer: CheckinAnswer; secondWind: boolean };
/** M7a: the lighter-plan offer answered: lighten (one step fewer minutes) or keep the plan (decision 9). */
export type LighterEvent = { id: string; type: 'lighter_plan'; accept: boolean };
/** M7b: the game settings, always all four (decision 2). */
export type SettingsEvent = {
  id: string; type: 'settings'; voice: Voice; boundaryMinutes: number; minutesPerDay: number; difficulty: Difficulty;
};
/** M7c: the Accountability Pact's level (decision 3): a raise is signed when it arrives, a lowering is instant. */
export type PactEvent = { id: string; type: 'accountability_set'; level: AccountabilityLevel };
/** M7c: the Trial of Stillness's 10-minute focus session, finished (decision 7). */
export type TrialEvent = { id: string; type: 'trial'; checkinId: number };
/** M7c: the private "what got in the way?" note on a check-in (decision 8); null clears it. */
export type NoteEvent = { id: string; type: 'checkin_note'; checkinId: number; note: string | null };
export const MAX_NOTE = 500;
/** Control characters other than a line break (a note may have several lines). */
const NOTE_CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/u;
/**
 * M6e: a day the phone built offline (decision 4). The server reads the day number, when it was built, the zone and each
 * quest's slot, template, why-line and exercises. The window, budget, light flag and books are what the phone showed:
 * kept with the event, never trusted (the server recomputes them).
 */
export type ProvisionalDayEvent = {
  id: string;
  type: 'provisional_day';
  dayNumber: number;
  builtAt: number;
  timeZone: string;
  window: { startsAt: number; endsAt: number };
  budget: number;
  light: boolean;
  quests: (ProvisionalQuest & { book: string | null })[];
};
export type AdjustEvent =
  | SwapEvent | HardDayEvent | RestEvent | PainEvent | ResumeEvent | StepDownEvent | ClassChangeEvent | AbilityEvent | TrainingEvent
  | BookEvent | CheckinEvent | LighterEvent | SettingsEvent | PactEvent | TrialEvent | NoteEvent;
export type PhoneEvent = CompleteEvent | UndoEvent | RateEvent | AdjustEvent | ProvisionalDayEvent;
export type Rejected = { id: string | null; code: string };

export const ADJUST_TYPES: readonly AdjustEvent['type'][] = [
  'swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training', 'book', 'checkin',
  'lighter_plan', 'settings', 'accountability_set', 'trial', 'checkin_note',
];
export const isAdjust = (event: PhoneEvent): event is AdjustEvent => (ADJUST_TYPES as readonly string[]).includes(event.type);

/**
 * The order `lmu-sync` applies a batch in (indexes into `events`): as sent, except that check-in answers go last. An
 * answer closes the days that have ended first (M7a decision 2), so every completion sent with it must land before it
 * (M7a review: a completion sent after an answer would otherwise be refused as `day_closed`).
 */
export function applyOrder(events: readonly PhoneEvent[]): number[] {
  const indexes = events.map((_, i) => i);
  const answer = (i: number): boolean => events[i]!.type === 'checkin';
  return [...indexes.filter((i) => !answer(i)), ...indexes.filter(answer)];
}

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
const SLOTS: readonly Slot[] = ['core', 'side1', 'side2', 'article', 'recovery'];
const MAX_DAY_NUMBER = 100_000;
const MAX_MOVES = 12;
const isDayNumber = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= MAX_DAY_NUMBER;
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_REPS;

/** The quest an event names: an id, or (M6e) a day and slot — one of the two. */
function parseTarget(raw: Record<string, unknown>): QuestTarget | null {
  if (raw.ref === undefined || raw.ref === null) return isId(raw.instanceId) ? { instanceId: raw.instanceId } : null;
  if (raw.instanceId !== undefined && raw.instanceId !== null) return null;
  const ref = raw.ref;
  if (!isObject(ref) || !isDayNumber(ref.dayNumber) || !SLOTS.includes(ref.slot as Slot) || !isKey(ref.templateId)) return null;
  return { instanceId: null, ref: { dayNumber: ref.dayNumber, slot: ref.slot as Slot, templateId: ref.templateId } };
}

/** M7b decision 6: when a rest or pain report was tapped; older phones don't send it. Null when it isn't a time. */
function tapTime(raw: Record<string, unknown>): { at?: number } | null {
  if (raw.at === undefined) return {};
  return isTime(raw.at) ? { at: raw.at } : null;
}

function parseMoves(raw: unknown): PlannedMove[] | null | undefined {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_MOVES) return undefined;
  const moves: PlannedMove[] = [];
  for (const m of raw) {
    if (!isObject(m) || !isKey(m.move) || (m.unit !== 'reps' && m.unit !== 'seconds')) return undefined;
    if (!isCount(m.min) || !isCount(m.max) || typeof m.perSide !== 'boolean') return undefined;
    moves.push({ move: m.move, unit: m.unit, min: m.min, max: m.max, perSide: m.perSide });
  }
  return moves;
}

function parseProvisionalQuest(raw: unknown): ProvisionalDayEvent['quests'][number] | null {
  if (!isObject(raw) || !SLOTS.includes(raw.slot as Slot) || !isKey(raw.templateId) || !isWhyReason(raw.why)) return null;
  const book = raw.book ?? null;
  if (book !== null && (typeof book !== 'string' || book.length > MAX_BOOK_TITLE || CONTROL.test(book))) return null;
  const moves = parseMoves(raw.moves);
  if (moves === undefined) return null;
  return { slot: raw.slot as Slot, templateId: raw.templateId, why: { ...raw.why }, moves, book };
}

function parseEvent(raw: unknown): PhoneEvent | Rejected {
  if (!isObject(raw)) return { id: null, code: 'bad_event' };
  const id = typeof raw.id === 'string' && UUID.test(raw.id) ? raw.id.toLowerCase() : null;
  if (id === null) return { id: null, code: 'bad_event_id' };
  const bad: Rejected = { id, code: 'bad_event' };
  switch (raw.type) {
    case 'complete': {
      const target = parseTarget(raw);
      if (target === null || !isTime(raw.completedAt)) return bad;
      const rating = raw.rating ?? null;
      if (rating !== null && !RATINGS.includes(rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'complete', ...target, completedAt: raw.completedAt, rating: rating as Rating | null, payload: raw.payload ?? {} };
    }
    case 'undo': {
      const target = parseTarget(raw);
      return target === null ? bad : { id, type: 'undo', ...target };
    }
    case 'rate': {
      const target = parseTarget(raw);
      if (target === null) return bad;
      if (!RATINGS.includes(raw.rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'rate', ...target, rating: raw.rating as Rating };
    }
    case 'swap':
      return isId(raw.instanceId) && isKey(raw.templateId) ? { id, type: 'swap', instanceId: raw.instanceId, templateId: raw.templateId } : bad;
    case 'hard_day':
      return isId(raw.dayId) ? { id, type: 'hard_day', dayId: raw.dayId } : bad;
    case 'plan_rest': {
      const at = tapTime(raw);
      if (!isId(raw.dayId) || at === null || (raw.tomorrow !== undefined && typeof raw.tomorrow !== 'boolean')) return bad;
      return { id, type: 'plan_rest', dayId: raw.dayId, ...at, ...(raw.tomorrow === true ? { tomorrow: true as const } : {}) };
    }
    case 'pain': {
      const target = parseTarget(raw);
      const at = tapTime(raw);
      return target !== null && at !== null && PAIN_CHOICES.includes(raw.choice as PainChoice)
        ? { id, type: 'pain', ...target, choice: raw.choice as PainChoice, ...at }
        : bad;
    }
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
    case 'checkin': {
      if (!isId(raw.checkinId) || !CHECKIN_ANSWERS.includes(raw.answer as CheckinAnswer) || typeof raw.secondWind !== 'boolean') return bad;
      if (raw.secondWind && raw.answer !== 'just_didnt') return bad;
      return { id, type: 'checkin', checkinId: raw.checkinId, answer: raw.answer as CheckinAnswer, secondWind: raw.secondWind };
    }
    case 'lighter_plan':
      return typeof raw.accept === 'boolean' ? { id, type: 'lighter_plan', accept: raw.accept } : bad;
    case 'settings': {
      const end = raw.boundaryMinutes;
      if (!VOICES.includes(raw.voice as Voice) || !DIFFICULTIES.includes(raw.difficulty as Difficulty)) return bad;
      if (!MINUTES_OPTIONS.includes(raw.minutesPerDay as number)) return bad;
      // Whole half hours, as the phone's stepper sets them (the profile allows any minute of the day).
      if (!Number.isInteger(end) || (end as number) < 0 || (end as number) >= 24 * 60 || (end as number) % 30 !== 0) return bad;
      return {
        id, type: 'settings', voice: raw.voice as Voice, boundaryMinutes: end as number, minutesPerDay: raw.minutesPerDay as number,
        difficulty: raw.difficulty as Difficulty,
      };
    }
    case 'accountability_set':
      return ACCOUNTABILITY_LEVELS.includes(raw.level as AccountabilityLevel)
        ? { id, type: 'accountability_set', level: raw.level as AccountabilityLevel }
        : bad;
    case 'trial':
      return isId(raw.checkinId) ? { id, type: 'trial', checkinId: raw.checkinId } : bad;
    case 'checkin_note': {
      if (!isId(raw.checkinId)) return bad;
      if (raw.note === null) return { id, type: 'checkin_note', checkinId: raw.checkinId, note: null };
      if (typeof raw.note !== 'string') return bad;
      const note = raw.note.replace(/\r\n?/g, '\n').trim();
      if (note.length > MAX_NOTE || NOTE_CONTROL.test(note)) return bad;
      return { id, type: 'checkin_note', checkinId: raw.checkinId, note: note === '' ? null : note };
    }
    case 'provisional_day': {
      if (!isDayNumber(raw.dayNumber) || raw.dayNumber < 2 || !isTime(raw.builtAt)) return bad;
      if (typeof raw.timeZone !== 'string' || !isValidTimeZone(raw.timeZone)) return bad;
      const w = raw.window;
      if (!isObject(w) || !isTime(w.startsAt) || !isTime(w.endsAt) || w.endsAt <= w.startsAt) return bad;
      if (!Number.isInteger(raw.budget) || (raw.budget as number) < 1 || (raw.budget as number) > 60 || typeof raw.light !== 'boolean') return bad;
      if (!Array.isArray(raw.quests) || raw.quests.length < 1 || raw.quests.length > SLOTS.length) return bad;
      const quests: ProvisionalDayEvent['quests'] = [];
      for (const q of raw.quests) {
        const parsed = parseProvisionalQuest(q);
        if (parsed === null) return bad;
        quests.push(parsed);
      }
      if (new Set(quests.map((q) => q.slot)).size !== quests.length) return bad;
      return {
        id, type: 'provisional_day', dayNumber: raw.dayNumber, builtAt: raw.builtAt, timeZone: canonicalTimeZone(raw.timeZone),
        window: { startsAt: w.startsAt, endsAt: w.endsAt }, budget: raw.budget as number, light: raw.light, quests,
      };
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
