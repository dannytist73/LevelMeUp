import { describe, expect, it } from 'vitest';
import { MAX_EVENTS, adjustPayload, checkCompletionPayload, isAdjust, parseSyncBody, timerTargetMs } from '../../functions/_shared/events.ts';
import type { AdjustEvent, SyncRequest } from '../../functions/_shared/events.ts';
import { isProblem } from '../../functions/_shared/http.ts';
import { planWorkout, sessionCondition, templateById } from '../../../packages/rules/src/index.ts';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { startPoints, statXp, toProfile } from '../../functions/_shared/state.ts';
import { characterRow, profileRow } from './fixtures.ts';

const ID = '7d3e1f2a-1b2c-4d3e-8f40-0123456789ab';
const id = (n: number) => `7d3e1f2a-1b2c-4d3e-8f40-${String(n).padStart(12, '0')}`;
const DAY = { starts_at: new Date(Date.UTC(2026, 9, 10, 20)), ends_at: new Date(Date.UTC(2026, 9, 11, 20)) };
const start = DAY.starts_at.getTime();
const MIN = 60_000;

describe('the sync body', () => {
  it('needs a real time zone and canonicalises it', () => {
    expect(isProblem(parseSyncBody({ timeZone: 'Mars/Base', events: [] }))).toBe(true);
    expect(isProblem(parseSyncBody({ events: [] }))).toBe(true);
    const ok = parseSyncBody({ timeZone: 'Asia/Manila' });
    expect(ok).toEqual({ timeZone: 'Asia/Manila', events: [], rejected: [] });
  });

  it(`takes at most ${MAX_EVENTS} events`, () => {
    const events = Array.from({ length: MAX_EVENTS + 1 }, (_, i) => ({ id: id(i), type: 'undo', instanceId: 1 }));
    expect(parseSyncBody({ timeZone: 'UTC', events })).toMatchObject({ status: 413, code: 'too_many_events' });
  });

  it('keeps good events in order and rejects bad ones one by one', () => {
    const body = parseSyncBody({
      timeZone: 'UTC',
      events: [
        { id: id(1), type: 'complete', instanceId: 5, completedAt: start + MIN, payload: {} },
        { id: id(2), type: 'checkin', dayId: 5 },
        { id: 'not-a-uuid', type: 'undo', instanceId: 5 },
        { id: id(3), type: 'rate', instanceId: 5, rating: 'meh' },
        { id: id(4), type: 'undo', instanceId: -1 },
        { id: id(5), type: 'rate', instanceId: 5, rating: 'easy' },
        { id: id(1), type: 'complete', instanceId: 5, completedAt: start + MIN, payload: {} },
        'nonsense',
      ],
    });
    if (isProblem(body)) throw new Error('unexpected problem');
    expect(body.events.map((e) => [e.id, e.type])).toEqual([[id(1), 'complete'], [id(5), 'rate']]);
    expect(body.rejected).toEqual([
      { id: id(2), code: 'unsupported_event' },
      { id: null, code: 'bad_event_id' },
      { id: id(3), code: 'bad_rating' },
      { id: id(4), code: 'bad_event' },
      { id: null, code: 'bad_event' },
    ]);
  });

  it('a completion time must be whole milliseconds in a sane range (an invalid date would fail every retry)', () => {
    for (const completedAt of [1e16, start + 0.5, Date.UTC(2020, 0, 1), Number.NaN, '2026-10-10']) {
      const body = parseSyncBody({ timeZone: 'UTC', events: [{ id: ID, type: 'complete', instanceId: 1, completedAt }] });
      if (isProblem(body)) throw new Error('unexpected problem');
      expect(body.rejected).toEqual([{ id: ID, code: 'bad_event' }]);
    }
  });

  it('a completion carries its time, optional rating and payload', () => {
    const body = parseSyncBody({ timeZone: 'UTC', events: [{ id: ID.toUpperCase(), type: 'complete', instanceId: 9, completedAt: start, rating: 'too_hard' }] });
    if (isProblem(body)) throw new Error('unexpected problem');
    expect(body.events[0]).toEqual({ id: ID, type: 'complete', instanceId: 9, completedAt: start, rating: 'too_hard', payload: {} });
  });
});

describe('completion payloads (spec §3.6)', () => {
  const timer = { completion: 'timer' as const, condition: { kind: 'minutes' as const, minutes: 10 }, minutes: 10 };
  const check = (instance: Parameters<typeof checkCompletionPayload>[0], payload: unknown, receivedAt = start + 60 * MIN) =>
    checkCompletionPayload(instance, DAY, payload, receivedAt);

  it('a tap needs nothing and stores nothing', () => {
    expect(check({ ...timer, completion: 'tap' }, { anything: 1 })).toEqual({ payload: {} });
  });

  it('a timer completes at 80% of its target', () => {
    expect(check(timer, { segments: [{ start: start + MIN, end: start + 8 * MIN }] })).toEqual({ code: 'timer_short' });
    const ok = { segments: [{ start: start + MIN, end: start + 9 * MIN }] };
    expect(check(timer, ok)).toEqual({ payload: ok });
  });

  it('overlapping segments count once', () => {
    const twice = { segments: [{ start: start + MIN, end: start + 6 * MIN }, { start: start + MIN, end: start + 6 * MIN }, { start: start + 3 * MIN, end: start + 6 * MIN }] };
    expect(check(timer, twice)).toEqual({ code: 'timer_short' });
  });

  it('time outside the day or after the server received it does not count', () => {
    expect(check(timer, { segments: [{ start: start - 20 * MIN, end: start + 2 * MIN }] })).toEqual({ code: 'timer_short' });
    expect(check(timer, { segments: [{ start: start + MIN, end: start + 30 * MIN }] }, start + 3 * MIN)).toEqual({ code: 'timer_short' });
  });

  it('a hold timer targets sets × seconds, both sides when per side', () => {
    expect(timerTargetMs({ condition: { kind: 'hold', sets: 3, seconds: 20, perSide: true }, minutes: 5 })).toBe(120_000);
    expect(timerTargetMs({ condition: { kind: 'habit' }, minutes: 5 })).toBe(5 * MIN);
  });

  it('stores only each segment\'s start and end', () => {
    const sent = { segments: [{ start: start + MIN, end: start + 9 * MIN, note: 'a\u0000b' }] };
    expect(check(timer, sent)).toEqual({ payload: { segments: [{ start: start + MIN, end: start + 9 * MIN }] } });
  });

  it('rejects malformed timers', () => {
    expect(check(timer, {})).toEqual({ code: 'bad_payload' });
    expect(check(timer, { segments: [{ start: 'a', end: 2 }] })).toEqual({ code: 'bad_payload' });
    expect(check(timer, { segments: [{ start: start, end: 1e300 }] })).toEqual({ code: 'bad_payload' });
    expect(check(timer, { segments: Array.from({ length: 101 }, () => ({ start, end: start + 1 })) })).toEqual({ code: 'bad_payload' });
  });

  it('a rep log has 1–20 sets of 0–999 with at least one rep', () => {
    const reps = { ...timer, completion: 'reps' as const };
    expect(check(reps, { sets: [10, 8, 0] })).toEqual({ payload: { sets: [10, 8, 0] } });
    expect(check(reps, { sets: [0, 0] })).toEqual({ code: 'bad_payload' });
    expect(check(reps, { sets: [] })).toEqual({ code: 'bad_payload' });
    expect(check(reps, { sets: [1000] })).toEqual({ code: 'bad_payload' });
    expect(check(reps, { sets: [2.5] })).toEqual({ code: 'bad_payload' });
    expect(check(reps, { sets: Array.from({ length: 21 }, () => 1) })).toEqual({ code: 'bad_payload' });
  });

  it('a sentence is 1–280 characters, trimmed', () => {
    const text = { ...timer, completion: 'text' as const };
    expect(check(text, { text: '  I read two pages.  ' })).toEqual({ payload: { text: 'I read two pages.' } });
    expect(check(text, { text: '   ' })).toEqual({ code: 'bad_payload' });
    expect(check(text, { text: 'x'.repeat(281) })).toEqual({ code: 'bad_payload' });
    expect(check(text, { text: 'I read \u0000 two pages.' })).toEqual({ code: 'bad_payload' });
    expect(check(text, { text: 'Line one.\nLine two.' })).toEqual({ code: 'bad_payload' });
    expect(check(text, {})).toEqual({ code: 'bad_payload' });
  });
});

describe('adjustment events (M6b)', () => {
  it('parses each kind with its fields', () => {
    const body = parseSyncBody({
      timeZone: 'UTC',
      events: [
        { id: id(1), type: 'swap', instanceId: 5, templateId: 'walk-1' },
        { id: id(2), type: 'hard_day', dayId: 3 },
        { id: id(3), type: 'plan_rest', dayId: 3 },
        { id: id(4), type: 'pain', instanceId: 5, choice: 'gentle' },
        { id: id(5), type: 'resume', ladderId: 'micro-squats' },
        { id: id(6), type: 'step_down', instanceId: 5 },
        { id: id(7), type: 'class_change', classId: 'monk' },
        { id: id(8), type: 'ability', dayId: 3, ability: 'stillness' },
      ],
    });
    if (isProblem(body)) throw new Error('unexpected problem');
    expect(body.rejected).toEqual([]);
    expect(body.events.map((e) => e.type)).toEqual(['swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability']);
    expect(body.events.every(isAdjust)).toBe(true);
    expect(adjustPayload(body.events[0] as AdjustEvent)).toEqual({ instanceId: 5, templateId: 'walk-1' });
    expect(adjustPayload(body.events[6] as AdjustEvent)).toEqual({ classId: 'monk' });
  });

  it('rejects each one with a missing or bad field, one by one', () => {
    const bad = [
      { type: 'swap', instanceId: 5 },
      { type: 'swap', instanceId: 5, templateId: 'Walk 1' },
      { type: 'hard_day', dayId: 0 },
      { type: 'plan_rest' },
      { type: 'pain', instanceId: 5, choice: 'ouch' },
      { type: 'resume', ladderId: '' },
      { type: 'step_down', instanceId: 'x' },
      { type: 'class_change', classId: 'ranger' },
      { type: 'ability', dayId: 3, ability: 'vanish' },
    ];
    const body = parseSyncBody({ timeZone: 'UTC', events: bad.map((e, i) => ({ id: id(i + 1), ...e })) });
    if (isProblem(body)) throw new Error('unexpected problem');
    expect(body.events).toEqual([]);
    expect(body.rejected).toEqual(bad.map((_, i) => ({ id: id(i + 1), code: 'bad_event' })));
  });

  it('completions, undos and ratings are not adjustments', () => {
    expect(isAdjust({ id: ID, type: 'undo', instanceId: 1 })).toBe(false);
  });
});

describe('the training event (M6c decision 12)', () => {
  const parse = (event: Record<string, unknown>) => parseSyncBody({ timeZone: 'Asia/Manila', events: [{ id: ID, ...event }] });

  it('carries the equipment and the program style', () => {
    expect(parse({ type: 'training', equipment: ['dumbbells', 'bench'], programStyle: 'women' })).toMatchObject({
      events: [{ type: 'training', equipment: ['dumbbells', 'bench'], programStyle: 'women' }], rejected: [],
    });
    expect(parse({ type: 'training', equipment: [], programStyle: 'none' })).toMatchObject({ rejected: [] });
  });

  it('refuses unknown or repeated equipment and an unknown style', () => {
    for (const bad of [
      { equipment: ['kettlebell'], programStyle: 'none' }, { equipment: ['gym', 'gym'], programStyle: 'none' },
      { equipment: 'gym', programStyle: 'none' }, { equipment: [], programStyle: 'unisex' }, { equipment: [] },
    ]) {
      expect(parse({ type: 'training', ...bad })).toMatchObject({ events: [], rejected: [{ code: 'bad_event' }] });
    }
  });
});

describe('a workout log (M6c decision 9)', () => {
  const template = templateById(LIBRARY, 'workout-0');
  const player = toProfile(profileRow(), startPoints(characterRow()), statXp(characterRow()));
  const moves = planWorkout(LIBRARY.training, template, player, 0)!;
  const workout = { completion: 'reps' as const, condition: sessionCondition(template, moves, false), minutes: 16 };
  const check = (instance: typeof workout, payload: unknown) => checkCompletionPayload(instance, DAY, payload, start + 60 * MIN);

  it('has exactly one entry per planned set', () => {
    expect(check(workout, { sets: [10, 10, 9, 8, 12, 12] })).toEqual({ payload: { sets: [10, 10, 9, 8, 12, 12] } });
    expect(check(workout, { sets: [10, 10, 9, 8, 12] })).toEqual({ code: 'bad_payload' });
    expect(check(workout, { sets: [10, 10, 9, 8, 12, 12, 1] })).toEqual({ code: 'bad_payload' });
  });

  it('a hard-day workout logs one set of each of its first two exercises', () => {
    const hard = { ...workout, condition: sessionCondition(template, moves, true), minutes: 7 };
    expect(check(hard, { sets: [12, 10] })).toEqual({ payload: { sets: [12, 10] } });
  });
});

describe('the book event (M6d decision 12)', () => {
  const id = '00000000-0000-4000-8000-0000000000b1';
  const parse = (raw: Record<string, unknown>) => parseSyncBody({ timeZone: 'UTC', events: [{ id, type: 'book', ...raw }] });

  it('takes a trimmed title or null, and whether the current book is finished', () => {
    expect(parse({ title: '  Dune ', finished: false })).toMatchObject({ events: [{ type: 'book', title: 'Dune', finished: false }] });
    expect(parse({ title: null, finished: true })).toMatchObject({ events: [{ type: 'book', title: null, finished: true }] });
  });

  it.each([
    [{ title: '', finished: false }], [{ title: '   ', finished: false }], [{ title: 'x'.repeat(121), finished: false }],
    [{ title: 'Line\nbreak', finished: false }], [{ title: 7, finished: false }], [{ title: 'Dune' }], [{ title: 'Dune', finished: 'yes' }],
  ])('refuses %j', (raw) => {
    expect(parse(raw)).toMatchObject({ events: [], rejected: [{ id, code: 'bad_event' }] });
  });

  it('is an adjustment, stored without its id and type', () => {
    expect(isAdjust({ id, type: 'book', title: 'Dune', finished: false })).toBe(true);
    expect(adjustPayload({ id, type: 'book', title: 'Dune', finished: false })).toEqual({ title: 'Dune', finished: false });
  });
});

describe('offline-built days (M6e)', () => {
  const quest = { slot: 'core', templateId: 'push-1', why: { code: 'class_main', stat: 'strength' }, moves: null, book: null };
  const workout = {
    slot: 'side1', templateId: 'workout-0', why: { code: 'goal', goal: 'body' }, book: null,
    moves: [{ move: 'bridge', unit: 'reps', min: 8, max: 12, perSide: false }],
  };
  const day = {
    id: id(40), type: 'provisional_day', dayNumber: 2, builtAt: start + MIN, timeZone: 'Asia/Manila',
    window: { startsAt: start, endsAt: start + 24 * 60 * MIN }, budget: 25, light: false, quests: [quest, workout],
  };
  const parse = (events: unknown[]) => parseSyncBody({ timeZone: 'UTC', events }) as SyncRequest;

  it('reads the day, the zone and each quest, and drops anything else', () => {
    expect(parse([{ ...day, extra: 1, quests: [{ ...quest, extra: 2 }, workout] }])).toEqual({ timeZone: 'UTC', events: [day], rejected: [] });
  });

  it('refuses a malformed day', () => {
    for (const bad of [
      { dayNumber: 1 }, { dayNumber: 2.5 }, { builtAt: 5 }, { timeZone: 'Mars/Base' }, { window: { startsAt: start, endsAt: start } },
      { budget: 0 }, { light: 'no' }, { quests: [] }, { quests: [quest, quest] }, { quests: [{ ...quest, slot: 'nope' }] },
      { quests: [{ ...quest, why: { code: 'nope' } }] }, { quests: [{ ...quest, templateId: 'Push 1' }] },
      { quests: [{ ...workout, moves: [{ move: 'Bridge', unit: 'reps', min: 8, max: 12, perSide: false }] }] },
      { quests: [{ ...workout, moves: [{ move: 'bridge', unit: 'laps', min: 8, max: 12, perSide: false }] }] },
      { quests: [{ ...quest, book: 'Dune\nMessiah' }] },
    ]) {
      expect(parse([{ ...day, ...bad }]), JSON.stringify(bad)).toMatchObject({ events: [], rejected: [{ id: id(40), code: 'bad_event' }] });
    }
  });

  it('names a quest by its day and slot instead of its id: complete, undo, rate and pain', () => {
    const ref = { dayNumber: 2, slot: 'core', templateId: 'push-1' };
    const body = parse([
      { id: id(50), type: 'complete', ref, completedAt: start + MIN, payload: {} },
      { id: id(51), type: 'undo', ref },
      { id: id(52), type: 'rate', ref, rating: 'easy' },
      { id: id(53), type: 'pain', ref, choice: 'rest' },
      { id: id(54), type: 'complete', instanceId: 5, ref, completedAt: start + MIN },
      { id: id(55), type: 'undo', ref: { ...ref, slot: 'nope' } },
      { id: id(56), type: 'undo', ref: { ...ref, dayNumber: 0 } },
      { id: id(57), type: 'swap', ref, templateId: 'walk-1' },
    ]);
    expect(body.events).toEqual([
      { id: id(50), type: 'complete', instanceId: null, ref, completedAt: start + MIN, rating: null, payload: {} },
      { id: id(51), type: 'undo', instanceId: null, ref },
      { id: id(52), type: 'rate', instanceId: null, ref, rating: 'easy' },
      { id: id(53), type: 'pain', instanceId: null, ref, choice: 'rest' },
    ]);
    expect(body.rejected.map((r) => [r.id, r.code])).toEqual([[id(54), 'bad_event'], [id(55), 'bad_event'], [id(56), 'bad_event'], [id(57), 'bad_event']]);
  });

  it('an event with an id is read as before (no ref)', () => {
    expect(parse([{ id: id(60), type: 'undo', instanceId: 7 }]).events).toEqual([{ id: id(60), type: 'undo', instanceId: 7 }]);
  });
});
