import { describe, expect, it } from 'vitest';
import * as rules from '../src/index.ts';

describe('public API', () => {
  it.each([
    'levelForXp', 'levelProgress', 'statPoints', 'xpToNextPoint', 'pointProgress', 'nextRank', 'localDateKey', 'questDayDate', 'rankFor', 'startingStats', 'questXp', 'splitXp',
    'firstDayWindow', 'nextDayWindow', 'isClosed', 'acceptsCompletion', 'isValidTimeZone', 'applyDay', 'isStreakDay',
    'checkinOutcome', 'shouldOfferLighterPlan', 'recordCompletion', 'recordMiss', 'recordReentry', 'recordPain',
    'resumeAfterPain', 'stepDown', 'decideConsequence', 'isSealed', 'elapsedMs', 'questTimerDone', 'trialDone',
    'simulatePacing', 'meetsTargets', 'closedDayResolution', 'resolveCheckin', 'canonicalTimeZone', 'templateAllowed',
    'effectiveRung', 'maxRungFor', 'abilityUnlocked', 'abilityReady', 'swapLimit', 'buildDay',
    'draftQuest', 'questReward', 'swapOptions', 'applySwap', 'applyHardDay', 'restAllowed', 'applyStillness', 'applyDawnRitual',
    'addRecovery', 'checkProvisionalDay', 'closeLadders', 'reenterLadders', 'followingDay', 'meetsCriterion', 'newAchievements', 'campaignPacing',
    'campaignFailures', 'painKey', 'painOption', 'seeProfessional', 'classChangeOpensAt',
    'suggestedClass', 'onboardingEstimates', 'startingLadders', 'strengthClosed', 'boundaryFromSleep', 'suggestedPactLevel',
  ])('exports %s', (name) => {
    expect(typeof (rules as Record<string, unknown>)[name]).toBe('function');
  });

  it('exports the constants', () => {
    expect(rules.XP_BY_TIER.standard).toBe(20);
    expect(rules.LEVEL_CURVE).toEqual({ base: rules.LEVEL_BASE, step: rules.LEVEL_STEP });
    expect(rules.MINUTES_OPTIONS).toEqual([10, 15, 25, 40]);
    expect(rules.CORE_MIX.filter((m) => m === 'main')).toHaveLength(4);
    expect(rules.TRAINABLE_STATS).toEqual(['strength', 'vitality', 'wisdom', 'focus']);
    // Spec §2.4: the core quest, both side quests and the reading count towards "any 2 quests"; recovery never does.
    expect(rules.STREAK_SLOTS).toEqual(['core', 'side1', 'side2', 'article']);
  });
});
