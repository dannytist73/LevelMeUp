import { CHECKIN_ANSWERS } from './checkin.ts';
import type { CheckinAnswer } from './checkin.ts';
import { CONSEQUENCE_PAUSE_THRESHOLD, CONSEQUENCE_WINDOW_MS } from './constants.ts';
import type { Slot } from './types.ts';

export type AccountabilityLevel = 0 | 1 | 2;

/** The Accountability Pact's levels (spec §4.3): off, the Shadow, the Trial of Stillness. */
export const ACCOUNTABILITY_LEVELS: readonly AccountabilityLevel[] = [0, 1, 2];

/**
 * The player's Accountability Pact. `appliesFrom` is when the current level was signed (M7c decision 2): a missed day
 * counts only if it started at or after that moment, so the pact starts with the quest day after the one in progress
 * ("never today's"); signed during onboarding, that is day 2. Null when off.
 */
export type Pact = { level: AccountabilityLevel; appliesFrom: number | null };

export type ConsequenceInput = {
  pact: Pact;
  answer: CheckinAnswer;
  /** Start of the quest day that was missed; for a gap of away days, the first of them. */
  missedDayStartsAt: number;
  /** When earlier consequences were applied. */
  consequenceTimes: readonly number[];
  nowMs: number;
  /** A consequence was already applied on the quest day this check-in is answered. */
  consequenceAlreadyOnThisQuestDay: boolean;
};

export type ConsequenceDecision =
  | { kind: 'none'; reason: 'pact_off' | 'not_a_confirmed_miss' | 'day_started_before_pact' | 'already_applied_today' }
  | { kind: 'paused'; offerLighterPlan: true }
  | { kind: 'apply'; level: 1 | 2 };

/** Invalid input throws, so bad data can only ever lead to no consequence. */
export function decideConsequence(input: ConsequenceInput): ConsequenceDecision {
  const { pact } = input;
  if (pact.level !== 0 && pact.level !== 1 && pact.level !== 2) throw new RangeError(`unknown pact level ${pact.level}`);
  if (!CHECKIN_ANSWERS.includes(input.answer)) throw new RangeError(`unknown check-in answer ${input.answer}`);
  if (pact.level === 0 || pact.appliesFrom === null) return { kind: 'none', reason: 'pact_off' };
  if (input.answer !== 'just_didnt') return { kind: 'none', reason: 'not_a_confirmed_miss' };
  if (input.missedDayStartsAt < pact.appliesFrom) return { kind: 'none', reason: 'day_started_before_pact' };
  if (input.consequenceAlreadyOnThisQuestDay) return { kind: 'none', reason: 'already_applied_today' };
  const recent = input.consequenceTimes.filter((t) => t <= input.nowMs && input.nowMs - t < CONSEQUENCE_WINDOW_MS);
  if (recent.length >= CONSEQUENCE_PAUSE_THRESHOLD) return { kind: 'paused', offerLighterPlan: true };
  return { kind: 'apply', level: pact.level };
}

/** A consequence in force: it lasts only for the quest day on which the check-in was answered. */
export type ActiveConsequence = { level: 1 | 2; trialCleared: boolean; dayStartsAt: number; dayEndsAt: number };

/**
 * Level 2 seals the side quests until the 10-minute focus session is done, and only during that quest day.
 * Nothing else is ever sealed.
 */
export function isSealed(slot: Slot, active: ActiveConsequence | null, nowMs: number): boolean {
  return (
    active !== null &&
    active.level === 2 &&
    !active.trialCleared &&
    nowMs >= active.dayStartsAt &&
    nowMs < active.dayEndsAt &&
    (slot === 'side1' || slot === 'side2')
  );
}
