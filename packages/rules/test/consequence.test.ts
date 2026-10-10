import { describe, expect, it } from 'vitest';
import { DAY_MS, HOUR_MS } from '../src/constants.ts';
import { CHECKIN_ANSWERS } from '../src/checkin.ts';
import type { CheckinAnswer } from '../src/checkin.ts';
import { decideConsequence, isSealed } from '../src/consequence.ts';
import type { AccountabilityLevel, ActiveConsequence, ConsequenceInput } from '../src/consequence.ts';

/** Signed during the quest day before; covers quest days from the next one, which starts here. */
const appliesFrom = Date.parse('2026-10-09T20:00:00Z');
const base: ConsequenceInput = {
  pact: { level: 1, appliesFrom },
  answer: 'just_didnt',
  missedDayStartsAt: appliesFrom,
  consequenceTimes: [],
  nowMs: Date.parse('2026-10-11T01:00:00Z'),
  consequenceAlreadyOnThisQuestDay: false,
};

describe('when a consequence applies (spec §4.3)', () => {
  it('applies the pact level after "I just didn\'t"', () => {
    expect(decideConsequence(base)).toEqual({ kind: 'apply', level: 1 });
    expect(decideConsequence({ ...base, pact: { level: 2, appliesFrom } })).toEqual({ kind: 'apply', level: 2 });
  });

  it('is off by default', () => {
    expect(decideConsequence({ ...base, pact: { level: 0, appliesFrom } })).toEqual({ kind: 'none', reason: 'pact_off' });
    expect(decideConsequence({ ...base, pact: { level: 1, appliesFrom: null } })).toEqual({ kind: 'none', reason: 'pact_off' });
  });

  it('never applies for any other answer', () => {
    for (const answer of CHECKIN_ANSWERS.filter((a) => a !== 'just_didnt')) {
      expect(decideConsequence({ ...base, answer })).toEqual({ kind: 'none', reason: 'not_a_confirmed_miss' });
    }
  });

  it('starts with the quest day after signing, never the day in progress', () => {
    expect(decideConsequence({ ...base, missedDayStartsAt: appliesFrom - DAY_MS })).toEqual({ kind: 'none', reason: 'day_started_before_pact' });
    expect(decideConsequence({ ...base, missedDayStartsAt: appliesFrom - 1 })).toEqual({ kind: 'none', reason: 'day_started_before_pact' });
    expect(decideConsequence({ ...base, missedDayStartsAt: appliesFrom })).toEqual({ kind: 'apply', level: 1 });
  });

  it('applies at most once per quest day', () => {
    expect(decideConsequence({ ...base, consequenceAlreadyOnThisQuestDay: true })).toEqual({ kind: 'none', reason: 'already_applied_today' });
  });

  it('pauses and offers a lighter plan after 3 consequences in 7 days', () => {
    const recent = [1, 3, 5].map((d) => base.nowMs - d * DAY_MS);
    expect(decideConsequence({ ...base, consequenceTimes: recent })).toEqual({ kind: 'paused', offerLighterPlan: true });
    const oneOld = [1, 3, 8].map((d) => base.nowMs - d * DAY_MS);
    expect(decideConsequence({ ...base, consequenceTimes: oneOld })).toEqual({ kind: 'apply', level: 1 });
  });

  it('refuses invalid input instead of applying anything', () => {
    expect(() => decideConsequence({ ...base, pact: { level: 3 as AccountabilityLevel, appliesFrom } })).toThrow(RangeError);
    expect(() => decideConsequence({ ...base, answer: 'whatever' as CheckinAnswer })).toThrow(RangeError);
  });
});

describe('Trial of Stillness sealing', () => {
  const dayStartsAt = Date.parse('2026-10-10T20:00:00Z');
  const trial: ActiveConsequence = { level: 2, trialCleared: false, dayStartsAt, dayEndsAt: dayStartsAt + DAY_MS };
  const inside = dayStartsAt + HOUR_MS;

  it('seals only the two side quests until the focus session is done', () => {
    expect(isSealed('side1', trial, inside)).toBe(true);
    expect(isSealed('side2', trial, inside)).toBe(true);
    expect(isSealed('side1', { ...trial, trialCleared: true }, inside)).toBe(false);
  });

  it('never seals the core quest, the recovery quest or the article', () => {
    for (const slot of ['core', 'recovery', 'article'] as const) expect(isSealed(slot, trial, inside)).toBe(false);
  });

  it('seals nothing at level 1 or without a consequence', () => {
    expect(isSealed('side1', { ...trial, level: 1 }, inside)).toBe(false);
    expect(isSealed('side1', null, inside)).toBe(false);
  });

  it('is time-limited: nothing stays sealed outside that quest day, even if the trial never synced', () => {
    expect(isSealed('side1', trial, dayStartsAt - 1)).toBe(false);
    expect(isSealed('side1', trial, trial.dayEndsAt)).toBe(false);
    expect(isSealed('side1', trial, trial.dayEndsAt + 30 * DAY_MS)).toBe(false);
  });
});
