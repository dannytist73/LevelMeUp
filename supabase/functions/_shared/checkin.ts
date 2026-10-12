// The check-in's answer (spec §3.7; M7a decisions 2–8): the change `levelmeup.adjust` writes, or why it is refused. Pure.
// A protected answer resolves the check-in at once; "I just didn't" adds the recovery quest to the running day, and
// `planAdvance` settles the miss when that day ends. M7c: under a pact, the answer also carries what the pact sets off
// (`_shared/pact.ts`).
import {
  addRecovery, checkinOutcome, findTemplate, lighterMinutes, newLadder, painKey, recordPain, resolveCheckin, stepDown,
} from '../../../packages/rules/src/index.ts';
import type { BuiltDay, QuestLibrary, RecoveryOption } from '../../../packages/rules/src/index.ts';
import type { AdjustCode, Change, Plan } from './adjust.ts';
import { toDraft } from './drafts.ts';
import type { CheckinEvent } from './events.ts';
import { consequenceFor } from './pact.ts';
import { ladderMap, streakState } from './state.ts';
import type { Snapshot } from './state.ts';
import { openDay, questsOf, todayBuilt, todayInput } from './today.ts';

const refuse = (code: AdjustCode): Plan => ({ code });

export function planCheckin(s: Snapshot, event: CheckinEvent, { nowMs, library }: { nowMs: number; library: QuestLibrary }): Plan {
  const pending = s.checkin;
  if (pending === null || Number(pending.id) !== event.checkinId) {
    // Answered and resolved already (another phone, or a lost reply): say so rather than "not found" (review).
    return refuse(s.answered.some((a) => Number(a.id) === event.checkinId) ? 'already_answered' : 'not_found');
  }
  if (pending.answer !== null) return refuse('already_answered');
  // lmu-sync closes ended days before this event, so the answer lands on the day that runs now (decision 2).
  const day = openDay(s);
  if (day === null || nowMs >= day.ends_at.getTime()) return refuse('day_closed');
  const outcome = checkinOutcome(event.answer);
  const checkin: NonNullable<Change['checkin']> = { id: Number(pending.id), answer: event.answer, recoveryDayId: null, outcome: null };
  const change: Change = { day: { id: Number(day.id) }, checkin };

  // The missed core quest's exercise rests after an injury; its ladder steps down after "too hard" (decision 6).
  const ladders = ladderMap(s.ladders);
  const missed = pending.missed_core === null ? undefined : findTemplate(library, pending.missed_core);
  if (outcome.pauseLadder && missed !== undefined && missed.exercise !== null) {
    const key = painKey(missed);
    change.ladders = { [key]: recordPain(ladders[key] ?? newLadder()).state };
  }
  if (outcome.stepDownLadder && pending.missed_ladder !== null) {
    change.ladders = { [pending.missed_ladder]: stepDown(ladders[pending.missed_ladder] ?? newLadder()).state };
  }
  if (outcome.reduceDailyMinutes) {
    const minutes = lighterMinutes(s.profile.minutes_per_day);
    if (minutes !== null) change.minutes = minutes;
    change.lighterPlanAt = true;
  }
  if (outcome.lighterTomorrow) change.lightNext = true;

  if (outcome.resolution === 'protected') {
    checkin.outcome = 'protected';
    const streak = streakState(s.character);
    if (streak.awaitingCheckin) change.streak = resolveCheckin(streak, { kind: 'protected' }).state;
    return { change };
  }

  // "I just didn't": the recovery quest today; the miss is settled when today ends (decision 4).
  const quests = questsOf(s, day);
  if (quests.some((q) => q.slot === 'recovery')) return refuse('already_applied');
  let option: RecoveryOption = { kind: 'recovery' };
  if (event.secondWind) {
    if (pending.missed_core === null) return refuse('ability_not_ready');
    option = { kind: 'second_wind', missedCore: pending.missed_core, lastUsedDay: s.character.ability_last_used.second_wind ?? null };
  }
  let built: BuiltDay;
  try {
    built = addRecovery(library, todayInput(s, day), todayBuilt(day, quests), option);
  } catch (error) {
    if (error instanceof RangeError && event.secondWind) return refuse('ability_not_ready');
    throw error;
  }
  change.recovery = toDraft(library, built.quests.find((q) => q.slot === 'recovery')!);
  checkin.recoveryDayId = Number(day.id);
  if (event.secondWind) change.ability = { id: 'second_wind', day: day.day_number };
  // M7c decision 4: the pact's consequence, decided now and written with the answer.
  const consequence = consequenceFor(s, pending, Number(day.id), nowMs);
  if (consequence !== null) checkin.consequence = consequence;
  return { change };
}
