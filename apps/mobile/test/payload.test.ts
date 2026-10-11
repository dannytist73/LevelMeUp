/** @jest-environment node */
import { checkCompletionPayload, timerTargetMs } from '../../../supabase/functions/_shared/events.ts';
import type { QuestView } from '../src/game/types.ts';
import { LIBRARY } from '@levelmeup/content';
import { sessionCondition, templateById } from '@levelmeup/rules';
import {
  moveUnit, repUnit, repsPayload, repsValid, sentenceValid, sessionPayload, sessionValid, startingSession, startingSets, textPayload,
  timerPayload,
} from '../src/quest/payload.ts';
import { NEW_TIMER, parseTimers, pauseTimer, startTimer, timerDone, timerElapsed } from '../src/quest/timer.ts';
import { serverState } from './support/fixtures.ts';

const day = serverState().today!;
const dayRow = { starts_at: new Date(day.startsAt!), ends_at: new Date(day.endsAt!) };
const base = day.quests[0]!;
const quest = (over: Partial<QuestView>): QuestView => ({ ...base, ...over });
const T0 = Date.parse(day.startsAt!) + 60 * 60_000; // an hour into the day
const MIN = 60_000;
const accepted = (q: QuestView, payload: unknown, at: number) => checkCompletionPayload(q, dayRow, payload, at);

describe('timers (decision 3)', () => {
  const walk = quest({ completion: 'timer', condition: { kind: 'minutes', minutes: 20 }, minutes: 20 });

  it('counts from timestamps: start, pause, resume, and a running segment up to now', () => {
    let t = startTimer(NEW_TIMER, T0);
    expect(startTimer(t, T0 + MIN)).toBe(t); // already running
    t = pauseTimer(t, T0 + 10 * MIN);
    expect(pauseTimer(t, T0 + 11 * MIN)).toBe(t); // already paused
    t = startTimer(t, T0 + 30 * MIN);
    expect(timerElapsed(t, T0 + 36 * MIN)).toBe(16 * MIN);
  });

  it('unlocks the claim at the server\'s 80 %, and the server accepts what it sends', () => {
    const t = startTimer(NEW_TIMER, T0);
    expect(timerDone(t, T0 + 15 * MIN, timerTargetMs(walk))).toBe(false);
    expect(timerDone(t, T0 + 16 * MIN, timerTargetMs(walk))).toBe(true);
    expect(accepted(walk, timerPayload(t, T0 + 16 * MIN), T0 + 16 * MIN)).not.toHaveProperty('code');
    expect(accepted(walk, timerPayload(t, T0 + 15 * MIN), T0 + 15 * MIN)).toEqual({ code: 'timer_short' });
  });

  it('reads stored timers, dropping anything unreadable', () => {
    const t = pauseTimer(startTimer(NEW_TIMER, T0), T0 + MIN);
    expect(parseTimers(JSON.stringify({ 7: t, 8: { segments: 'no' }, x: t }))).toEqual({ 7: t });
    expect(parseTimers('not json')).toEqual({});
    expect(parseTimers(null)).toEqual({});
  });
});

describe('rep logs (decision 4)', () => {
  const pushups = quest({ completion: 'reps', condition: { kind: 'reps', sets: 3, reps: 8, perSide: false } });
  const plank = quest({ completion: 'reps', condition: { kind: 'hold', sets: 2, seconds: 30, perSide: true } });

  it('start at the target: reps per set, or seconds per set for a hold', () => {
    expect(startingSets(pushups.condition)).toEqual([8, 8, 8]);
    expect(startingSets(plank.condition)).toEqual([30, 30]);
    expect(repUnit(pushups.condition)).toBe('reps');
    expect(repUnit(plank.condition)).toBe('seconds per side');
  });

  it('accept 1 to 20 sets of 0 to 999 with one above zero, as the server does', () => {
    expect(repsValid([8, 8, 8])).toBe(true);
    expect(repsValid([0, 5])).toBe(true);
    expect(repsValid([0, 0])).toBe(false);
    expect(repsValid([])).toBe(false);
    expect(repsValid(Array<number>(21).fill(1))).toBe(false);
    expect(repsValid([1000])).toBe(false);
    expect(accepted(pushups, repsPayload([8, 6, 5]), T0)).toEqual({ payload: { sets: [8, 6, 5] } });
    expect(accepted(plank, repsPayload(startingSets(plank.condition)), T0)).not.toHaveProperty('code');
  });
});

describe('one sentence and check-offs', () => {
  const note = quest({ completion: 'text', condition: { kind: 'sentence' } });
  const tap = quest({ completion: 'tap', condition: { kind: 'habit' } });

  it('send a trimmed sentence of 1 to 280 characters without control characters', () => {
    expect(sentenceValid('  I read two pages.  ')).toBe(true);
    expect(sentenceValid('   ')).toBe(false);
    expect(sentenceValid('a'.repeat(281))).toBe(false);
    expect(sentenceValid('two\nlines')).toBe(false);
    expect(accepted(note, textPayload('  I read two pages.  '), T0)).toEqual({ payload: { text: 'I read two pages.' } });
  });

  it('send nothing for a check-off', () => {
    expect(accepted(tap, {}, T0)).toEqual({ payload: {} });
  });
});

describe('workout logs (M6c decision 9)', () => {
  const template = templateById(LIBRARY, 'workout-0');
  const moves = [
    { move: 'goblet-squat', unit: 'reps', min: 10, max: 15, perSide: false },
    { move: 'db-row', unit: 'reps', min: 8, max: 12, perSide: true },
    { move: 'plank', unit: 'seconds', min: 20, max: 40, perSide: false },
  ] as const;
  const condition = sessionCondition(template, moves, false);
  if (condition.kind !== 'session') throw new Error('not a session');

  it('start every set at the bottom of its range', () => {
    expect(startingSession(condition.moves)).toEqual([[10, 10], [8, 8], [20, 20]]);
    expect(moveUnit(condition.moves[1]!)).toBe('reps per side');
    expect(moveUnit(condition.moves[2]!)).toBe('seconds');
  });

  it('send every set in order, which the server accepts; a count that differs is refused', () => {
    const payload = sessionPayload([[12, 11], [9, 8], [30, 25]]);
    expect(payload).toEqual({ sets: [12, 11, 9, 8, 30, 25] });
    expect(sessionValid([[12, 11], [9, 8], [30, 25]])).toBe(true);
    expect(sessionValid([[0, 0], [0, 0], [0, 0]])).toBe(false);
    const day = { starts_at: new Date(0), ends_at: new Date(Date.UTC(2100, 0, 1)) };
    const instance = { completion: 'reps' as const, condition, minutes: 16 };
    expect(checkCompletionPayload(instance, day, payload, Date.UTC(2026, 9, 11))).toEqual({ payload });
    expect(checkCompletionPayload(instance, day, sessionPayload([[12, 11], [9, 8]]), Date.UTC(2026, 9, 11))).toEqual({ code: 'bad_payload' });
  });
});
