import { describe, expect, it } from 'vitest';
import * as rules from '../src/index.ts';

describe('public API', () => {
  it.each([
    'levelForXp', 'levelProgress', 'statPoints', 'xpToNextPoint', 'rankFor', 'startingStats', 'questXp', 'splitXp',
    'firstDayWindow', 'nextDayWindow', 'isClosed', 'acceptsCompletion', 'isValidTimeZone', 'applyDay', 'isStreakDay',
    'checkinOutcome', 'shouldOfferLighterPlan', 'recordCompletion', 'recordMiss', 'recordReentry', 'recordPain',
    'resumeAfterPain', 'stepDown', 'decideConsequence', 'isSealed', 'elapsedMs', 'questTimerDone', 'trialDone',
    'simulatePacing', 'meetsTargets',
  ])('exports %s', (name) => {
    expect(typeof (rules as Record<string, unknown>)[name]).toBe('function');
  });

  it('exports the constants', () => {
    expect(rules.XP_BY_TIER.standard).toBe(20);
    expect(rules.LEVEL_CURVE).toEqual({ base: rules.LEVEL_BASE, step: rules.LEVEL_STEP });
  });
});
