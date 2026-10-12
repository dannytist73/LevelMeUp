import { LIGHTER_PLAN_THRESHOLD, LIGHTER_PLAN_WINDOW_MS, MINUTES_OPTIONS } from './constants.ts';

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

/** A check-in the player answered: when, and how many days it covered (one missed day, or a run of away days). */
export type AnsweredCheckin = { answer: CheckinAnswer; at: number; days: number };

/**
 * What answered check-ins count towards the lighter-plan offer (spec §3.7): "I just didn't" is a recovery quest; any
 * other answer protects each day it covers.
 */
export function checkinEvents(answers: readonly AnsweredCheckin[]): LighterPlanEvent[] {
  return answers.flatMap((a): LighterPlanEvent[] =>
    a.answer === 'just_didnt'
      ? [{ at: a.at, kind: 'recovery_quest' }]
      : Array.from({ length: Math.max(1, a.days) }, (): LighterPlanEvent => ({ at: a.at, kind: 'protected_day' })));
}

/** The next lower daily minutes (spec §3.7: "daily minutes drop, plan lightens"), or null at the lowest. */
export function lighterMinutes(minutes: number): number | null {
  const lower = MINUTES_OPTIONS.filter((m) => m < minutes);
  return lower.length === 0 ? null : lower[lower.length - 1]!;
}

/**
 * The lighter-plan offer: shown when the check-ins call for it, and not again for LIGHTER_PLAN_WINDOW_MS after the
 * player last answered it (M7a decision 9), so it never shows on every open.
 */
export function lighterPlanOffered(events: readonly LighterPlanEvent[], nowMs: number, answeredAt: number | null): boolean {
  if (answeredAt !== null && nowMs - answeredAt < LIGHTER_PLAN_WINDOW_MS) return false;
  return shouldOfferLighterPlan(events, nowMs);
}
