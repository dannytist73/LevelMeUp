import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../src/constants.ts';
import { CHECKIN_ANSWERS, checkinOutcome, shouldOfferLighterPlan } from '../src/checkin.ts';
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
