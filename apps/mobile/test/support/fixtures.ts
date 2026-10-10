// Phone-side fixtures built with the server's own fixtures and `stateView`, so tests see exactly what `lmu-sync` sends.
import { STATS } from '@levelmeup/rules';
import type { Rating, Slot } from '@levelmeup/rules';
import { stateView } from '../../../../supabase/functions/_shared/state.ts';
import type { CharacterRow } from '../../../../supabase/functions/_shared/state.ts';
import { DAY1, characterRow, dayRow, instanceRows, profileRow } from '../../../../supabase/tests/unit/fixtures.ts';
import type { PhoneEvent, ServerState } from '../../src/game/types.ts';

export { DAY1, characterRow };

/** Day 1 of the server fixtures' player, with the given slots already cleared and their XP counted. */
export function serverState(done: readonly Slot[] = [], character: Partial<CharacterRow> = {}): ServerState {
  const earned: Partial<CharacterRow> = {};
  for (const q of DAY1.quests.filter((q) => done.includes(q.slot))) {
    for (const s of STATS) earned[`xp_${s}`] = (earned[`xp_${s}`] ?? 0) + (q.xp[s] ?? 0);
  }
  return stateView({
    profile: profileRow(),
    character: characterRow({ ...earned, ...character }),
    ladders: [],
    days: [dayRow(DAY1, 1)],
    instances: instanceRows(DAY1, 1, done),
    checkins: [],
    earned: [],
    queued: false,
  });
}

let next = 1;
const id = () => `00000000-0000-4000-8000-${String(next++).padStart(12, '0')}`;

export const completeEvent = (instanceId: number, rating: Rating | null = null): PhoneEvent =>
  ({ id: id(), type: 'complete', instanceId, completedAt: Date.UTC(2026, 9, 10, 13), rating, payload: {} });
export const undoEvent = (instanceId: number): PhoneEvent => ({ id: id(), type: 'undo', instanceId });
export const rateEvent = (instanceId: number, rating: 'easy' | 'right' | 'too_hard'): PhoneEvent => ({ id: id(), type: 'rate', instanceId, rating });
