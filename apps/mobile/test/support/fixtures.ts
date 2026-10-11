// Phone-side fixtures built with the server's own fixtures and `stateView`, so tests see exactly what `lmu-sync` sends.
import { LIBRARY } from '@levelmeup/content';
import { SAFETY_QUESTIONS, STATS, newLadder } from '@levelmeup/rules';
import type { Rating, Slot } from '@levelmeup/rules';
import { stateView } from '../../../../supabase/functions/_shared/state.ts';
import type { CharacterRow, DayRow, Snapshot } from '../../../../supabase/functions/_shared/state.ts';
import { dayOffers } from '../../../../supabase/functions/_shared/today.ts';
import {
  DAY1, DAY_TWO_SLOTS, HOUR, characterRow, dayRow, dayTwoSnapshot, historyOf, instanceRows, ladderRows, manilaDay, profileRow,
} from '../../../../supabase/tests/unit/fixtures.ts';
import type { PhoneEvent, Reveal, ServerState } from '../../src/game/types.ts';
import { NEW_DRAFT } from '../../src/onboarding/flow.ts';
import type { Draft } from '../../src/onboarding/flow.ts';

export { DAY1, DAY_TWO_SLOTS, characterRow, ladderRows, profileRow };

/** Day 1 of the server fixtures' player, with the given slots already cleared and their XP counted. */
export function serverState(done: readonly Slot[] = [], character: Partial<CharacterRow> = {}): ServerState {
  const earned: Partial<CharacterRow> = {};
  for (const q of DAY1.quests.filter((q) => done.includes(q.slot))) {
    for (const s of STATS) earned[`xp_${s}`] = (earned[`xp_${s}`] ?? 0) + (q.xp[s] ?? 0);
  }
  const snapshot: Snapshot = {
    profile: profileRow(),
    character: characterRow({ ...earned, ...character }),
    ladders: [],
    days: [dayRow(DAY1, 1)],
    instances: instanceRows(DAY1, 1, done),
    checkins: [],
    earned: [],
    queued: false,
    painReports: 0,
    workoutsDone: 0,
  };
  return stateView(snapshot, dayOffers(snapshot, LIBRARY), historyOf(snapshot));
}

/** A time inside day 2 of `adjustState`. */
export const DAY_TWO_NOW = manilaDay(2).startsAt + HOUR;

/**
 * Day 2 with push-1 (core, at its ladder's rung), walk-1 and reading-0: every adjustment has something to offer. Quest
 * ids: core 200, side1 201, side2 202, article 203; the day's id is 2.
 */
export function adjustState(over: Partial<Snapshot> = {}, day: Partial<DayRow> = {}): ServerState {
  const snapshot = dayTwoSnapshot(DAY_TWO_SLOTS, { ladders: ladderRows({ push: newLadder(1) }), ...over }, day);
  return stateView(snapshot, dayOffers(snapshot, LIBRARY), historyOf(snapshot));
}

let next = 1;
const id = () => `00000000-0000-4000-8000-${String(next++).padStart(12, '0')}`;

export const completeEvent = (instanceId: number, rating: Rating | null = null): PhoneEvent =>
  ({ id: id(), type: 'complete', instanceId, completedAt: Date.UTC(2026, 9, 10, 13), rating, payload: {} });
export const undoEvent = (instanceId: number): PhoneEvent => ({ id: id(), type: 'undo', instanceId });
export const rateEvent = (instanceId: number, rating: 'easy' | 'right' | 'too_hard'): PhoneEvent => ({ id: id(), type: 'rate', instanceId, rating });

/** A finished interview: Rin, mentor voice, a stronger body, trains now and then, no limits, no safety flags. */
export const READY_DRAFT: Draft = {
  ...NEW_DRAFT, name: 'Rin', voice: 'mentor', goals: ['body'], training: 'some', noLimits: true,
  equipment: [], noEquipment: true, programStyle: 'none',
  safety: Array<boolean>(SAFETY_QUESTIONS).fill(false), slip: 'stakes',
};

export const REVEAL: Reveal = { narrative: 'Rin. Class: Warrior.', strengths: ['Strength'], growth: ['Focus'], source: 'template' };

/** Day 2 with a workout (workout-0, planned for the default player) as its core quest, id 200. */
export function workoutState(over: Partial<Snapshot> = {}): ServerState {
  const snapshot = dayTwoSnapshot({ ...DAY_TWO_SLOTS, core: 'workout-0' }, over);
  return stateView(snapshot, dayOffers(snapshot, LIBRARY), historyOf(snapshot));
}
