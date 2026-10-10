import type { CheckinAnswer } from './checkin.ts';
import { CONSEQUENCE_PAUSE_THRESHOLD, CONSEQUENCE_WINDOW_MS } from './constants.ts';
import type { Slot } from './types.ts';

export type AccountabilityLevel = 0 | 1 | 2;

/** The player's Accountability Pact. `enabledAt` is when the current level was signed; null when off. */
export type Pact = { level: AccountabilityLevel; enabledAt: number | null };

export type ConsequenceInput = {
  pact: Pact;
  answer: CheckinAnswer;
  /** Start of the quest day that was missed. */
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

export function decideConsequence(input: ConsequenceInput): ConsequenceDecision {
  const { pact } = input;
  if (pact.level === 0 || pact.enabledAt === null) return { kind: 'none', reason: 'pact_off' };
  if (input.answer !== 'just_didnt') return { kind: 'none', reason: 'not_a_confirmed_miss' };
  if (input.missedDayStartsAt <= pact.enabledAt) return { kind: 'none', reason: 'day_started_before_pact' };
  if (input.consequenceAlreadyOnThisQuestDay) return { kind: 'none', reason: 'already_applied_today' };
  const recent = input.consequenceTimes.filter((t) => t <= input.nowMs && input.nowMs - t < CONSEQUENCE_WINDOW_MS);
  if (recent.length >= CONSEQUENCE_PAUSE_THRESHOLD) return { kind: 'paused', offerLighterPlan: true };
  return { kind: 'apply', level: pact.level };
}

export type ActiveConsequence = { level: 1 | 2; trialCleared: boolean };

/** Level 2 seals the side quests until the 10-minute focus session is done. Nothing else is ever sealed. */
export function isSealed(slot: Slot, active: ActiveConsequence | null): boolean {
  return active !== null && active.level === 2 && !active.trialCleared && (slot === 'side1' || slot === 'side2');
}
