import { describe, expect, it } from 'vitest';
import { DAY_MS, HOUR_MS } from '../src/constants.ts';
import { CHECKIN_ANSWERS } from '../src/checkin.ts';
import { decideConsequence, isSealed } from '../src/consequence.ts';
import type { ConsequenceInput } from '../src/consequence.ts';

const enabledAt = Date.parse('2026-10-09T12:00:00Z');
const base: ConsequenceInput = {
  pact: { level: 1, enabledAt },
  answer: 'just_didnt',
  missedDayStartsAt: Date.parse('2026-10-09T20:00:00Z'),
  consequenceTimes: [],
  nowMs: Date.parse('2026-10-11T01:00:00Z'),
  consequenceAlreadyOnThisQuestDay: false,
};

describe('when a consequence applies (spec §4.3)', () => {
  it('applies the pact level after "I just didn\'t"', () => {
    expect(decideConsequence(base)).toEqual({ kind: 'apply', level: 1 });
    expect(decideConsequence({ ...base, pact: { level: 2, enabledAt } })).toEqual({ kind: 'apply', level: 2 });
  });

  it('is off by default', () => {
    expect(decideConsequence({ ...base, pact: { level: 0, enabledAt } })).toEqual({ kind: 'none', reason: 'pact_off' });
    expect(decideConsequence({ ...base, pact: { level: 1, enabledAt: null } })).toEqual({ kind: 'none', reason: 'pact_off' });
  });

  it('never applies for any other answer', () => {
    for (const answer of CHECKIN_ANSWERS.filter((a) => a !== 'just_didnt')) {
      expect(decideConsequence({ ...base, answer })).toEqual({ kind: 'none', reason: 'not_a_confirmed_miss' });
    }
  });

  it('only counts quest days that started after the pact was signed', () => {
    expect(decideConsequence({ ...base, missedDayStartsAt: enabledAt - HOUR_MS })).toEqual({ kind: 'none', reason: 'day_started_before_pact' });
    expect(decideConsequence({ ...base, missedDayStartsAt: enabledAt })).toEqual({ kind: 'none', reason: 'day_started_before_pact' });
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
});

describe('Trial of Stillness sealing', () => {
  const trial = { level: 2 as const, trialCleared: false };

  it('seals only the two side quests until the focus session is done', () => {
    expect(isSealed('side1', trial)).toBe(true);
    expect(isSealed('side2', trial)).toBe(true);
    expect(isSealed('side1', { ...trial, trialCleared: true })).toBe(false);
  });

  it('never seals the core quest, the recovery quest or the article', () => {
    for (const slot of ['core', 'recovery', 'article'] as const) expect(isSealed(slot, trial)).toBe(false);
  });

  it('seals nothing at level 1 or without a consequence', () => {
    expect(isSealed('side1', { level: 1, trialCleared: false })).toBe(false);
    expect(isSealed('side1', null)).toBe(false);
  });
});
