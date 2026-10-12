import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../src/constants.ts';
import { CHECKIN_ANSWERS, checkinEvents, checkinOutcome, lighterMinutes, lighterPlanOffered, shouldOfferLighterPlan } from '../src/checkin.ts';
import type { CheckinAnswer, LighterPlanEvent } from '../src/checkin.ts';

const PROTECTED = {
  resolution: 'protected',
  lighterTomorrow: false,
  pauseLadder: false,
  stepDownLadder: false,
  reduceDailyMinutes: false,
  recoveryQuest: false,
};

describe('check-in answers (spec §3.7)', () => {
  it('lists the six answers', () => {
    expect(CHECKIN_ANSWERS).toEqual(['sick', 'injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt']);
  });

  it('sick: paused, lighter tomorrow', () => {
    expect(checkinOutcome('sick')).toEqual({ ...PROTECTED, lighterTomorrow: true });
  });

  it('injured: paused, lighter tomorrow, that ladder paused', () => {
    expect(checkinOutcome('injured')).toEqual({ ...PROTECTED, lighterTomorrow: true, pauseLadder: true });
  });

  it('emergency, travel or a brutal day: paused', () => {
    expect(checkinOutcome('emergency')).toEqual(PROTECTED);
  });

  it('too hard: paused, that ladder steps down', () => {
    expect(checkinOutcome('too_hard')).toEqual({ ...PROTECTED, stepDownLadder: true });
  });

  it('a lighter load: paused, fewer daily minutes', () => {
    expect(checkinOutcome('lighter_load')).toEqual({ ...PROTECTED, reduceDailyMinutes: true });
  });

  it('I just didn\'t: a recovery chance with a recovery quest', () => {
    expect(checkinOutcome('just_didnt')).toEqual({ ...PROTECTED, resolution: 'recovery_chance', recoveryQuest: true });
  });

  it('rejects an unknown answer', () => {
    expect(() => checkinOutcome('bogus' as CheckinAnswer)).toThrow(RangeError);
  });
});

describe('lighter-plan offers', () => {
  const now = 100 * DAY_MS;
  const at = (daysAgo: number, kind: LighterPlanEvent['kind']): LighterPlanEvent => ({ at: now - daysAgo * DAY_MS, kind });

  it('offers one after 3 recovery quests in 14 days', () => {
    expect(shouldOfferLighterPlan([at(1, 'recovery_quest'), at(5, 'recovery_quest'), at(13, 'recovery_quest')], now)).toBe(true);
    expect(shouldOfferLighterPlan([at(1, 'recovery_quest'), at(5, 'recovery_quest')], now)).toBe(false);
  });

  it('offers one after 3 protected days in 14 days, counting only the last 14', () => {
    expect(shouldOfferLighterPlan([at(0, 'protected_day'), at(3, 'protected_day'), at(9, 'protected_day')], now)).toBe(true);
    expect(shouldOfferLighterPlan([at(0, 'protected_day'), at(3, 'protected_day'), at(14, 'protected_day')], now)).toBe(false);
  });

  it('does not add the two kinds together', () => {
    expect(
      shouldOfferLighterPlan([at(1, 'recovery_quest'), at(2, 'recovery_quest'), at(3, 'protected_day'), at(4, 'protected_day')], now),
    ).toBe(false);
  });
});

describe('the lighter plan (M7a decision 9)', () => {
  it('drops the daily minutes one step, never below the lowest', () => {
    expect([40, 25, 15, 10].map(lighterMinutes)).toEqual([25, 15, 10, null]);
  });

  it("counts \"I just didn't\" as a recovery quest and any other answer as each day it protected", () => {
    expect(checkinEvents([
      { answer: 'just_didnt', at: 5, days: 1 },
      { answer: 'emergency', at: 6, days: 3 },
      { answer: 'sick', at: 7, days: 1 },
    ])).toEqual([
      { at: 5, kind: 'recovery_quest' },
      { at: 6, kind: 'protected_day' }, { at: 6, kind: 'protected_day' }, { at: 6, kind: 'protected_day' },
      { at: 7, kind: 'protected_day' },
    ]);
  });

  it('is offered when the check-ins call for it, then waits 14 days after the player answers it', () => {
    const now = 30 * DAY_MS;
    const events = checkinEvents([{ answer: 'emergency', at: now - DAY_MS, days: 3 }]);
    expect(lighterPlanOffered(events, now, null)).toBe(true);
    expect(lighterPlanOffered(events, now, now - 13 * DAY_MS)).toBe(false);
    expect(lighterPlanOffered(events, now, now - 14 * DAY_MS)).toBe(true);
    expect(lighterPlanOffered([], now, null)).toBe(false);
  });
});
