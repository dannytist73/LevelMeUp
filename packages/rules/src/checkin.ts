import { LIGHTER_PLAN_THRESHOLD, LIGHTER_PLAN_WINDOW_MS } from './constants.ts';

export type CheckinAnswer = 'sick' | 'injured' | 'emergency' | 'too_hard' | 'lighter_load' | 'just_didnt';

export const CHECKIN_ANSWERS: readonly CheckinAnswer[] = ['sick', 'injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt'];

export type CheckinOutcome = {
  /** `protected` pauses the streak now; `recovery_chance` waits for the recovery quest. */
  resolution: 'protected' | 'recovery_chance';
  lighterTomorrow: boolean;
  /** Pause the missed quest's ladder (an injury). */
  pauseLadder: boolean;
  /** Step the missed quest's ladder down one rung. */
  stepDownLadder: boolean;
  reduceDailyMinutes: boolean;
  /** Offer a 5-minute recovery quest on the day the check-in is answered. */
  recoveryQuest: boolean;
};

const PROTECTED: CheckinOutcome = {
  resolution: 'protected',
  lighterTomorrow: false,
  pauseLadder: false,
  stepDownLadder: false,
  reduceDailyMinutes: false,
  recoveryQuest: false,
};

const OUTCOMES: Readonly<Record<CheckinAnswer, CheckinOutcome>> = {
  sick: { ...PROTECTED, lighterTomorrow: true },
  injured: { ...PROTECTED, lighterTomorrow: true, pauseLadder: true },
  emergency: PROTECTED,
  too_hard: { ...PROTECTED, stepDownLadder: true },
  lighter_load: { ...PROTECTED, reduceDailyMinutes: true },
  just_didnt: { ...PROTECTED, resolution: 'recovery_chance', recoveryQuest: true },
};

export function checkinOutcome(answer: CheckinAnswer): CheckinOutcome {
  if (!CHECKIN_ANSWERS.includes(answer)) throw new RangeError(`unknown check-in answer ${answer}`);
  return { ...OUTCOMES[answer] };
}

/**
 * `protected_day` means a day protected by a check-in answer. Planned rest days and server outages are not
 * recorded here, so they never trigger an offer.
 */
export type LighterPlanEvent = { at: number; kind: 'recovery_quest' | 'protected_day' };

/** 3 or more recovery quests, or 3 or more protected days, in the last 14 days (spec §3.7). */
export function shouldOfferLighterPlan(events: readonly LighterPlanEvent[], nowMs: number): boolean {
  const recent = events.filter((event) => event.at <= nowMs && nowMs - event.at < LIGHTER_PLAN_WINDOW_MS);
  const count = (kind: LighterPlanEvent['kind']): number => recent.filter((event) => event.kind === kind).length;
  return count('recovery_quest') >= LIGHTER_PLAN_THRESHOLD || count('protected_day') >= LIGHTER_PLAN_THRESHOLD;
}
