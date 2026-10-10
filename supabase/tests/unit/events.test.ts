import { describe, expect, it } from 'vitest';
import { MAX_EVENTS, checkCompletionPayload, parseSyncBody, timerTargetMs } from '../../functions/_shared/events.ts';
import { isProblem } from '../../functions/_shared/http.ts';

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
        { id: id(2), type: 'swap', instanceId: 5 },
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

  it('rejects malformed timers', () => {
    expect(check(timer, {})).toEqual({ code: 'bad_payload' });
    expect(check(timer, { segments: [{ start: 'a', end: 2 }] })).toEqual({ code: 'bad_payload' });
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
    expect(check(text, {})).toEqual({ code: 'bad_payload' });
  });
});
