// Offline-built days (M6e): the clock the server applies a `provisional_day` at, whether a stored day is the one the
// phone showed, and which completions were counted for a quest the player didn't do. Pure.
import { CLOCK_SKEW_MS, LATE_SYNC_MS, MAX_DAY_MS, plannedMoves, sameMoves } from '../../../packages/rules/src/index.ts';
import type { ProvisionalQuest } from '../../../packages/rules/src/index.ts';
import type { InstanceRow } from './state.ts';

/**
 * The time a `provisional_day` is applied at (decision 5): when the phone built it, never later than now. A phone clock up
 * to CLOCK_SKEW_MS behind the previous day's end counts as that end (the day had ended for the phone). Null when it was
 * built more than CLOCK_SKEW_MS after now: the phone's clock is ahead. A day built so long ago that it ended more than
 * LATE_SYNC_MS ago takes no completion any more: it is applied now, so it can't fill the past (review).
 */
export function provisionalClock(builtAt: number, nowMs: number, lastEndsAt: number): number | null {
  if (builtAt > nowMs + CLOCK_SKEW_MS) return null;
  if (builtAt < nowMs - LATE_SYNC_MS - MAX_DAY_MS) return nowMs;
  const at = Math.min(builtAt, nowMs);
  return at < lastEndsAt && lastEndsAt <= nowMs && lastEndsAt - at <= CLOCK_SKEW_MS ? lastEndsAt : at;
}

/** The stored quests are the ones the phone showed: the same template in every slot, and a workout's same exercises. */
export function sameQuests(
  stored: readonly Pick<InstanceRow, 'slot' | 'template_id' | 'condition'>[],
  phone: readonly Pick<ProvisionalQuest, 'slot' | 'templateId' | 'moves'>[],
): boolean {
  return stored.length === phone.length && phone.every((p) => {
    const q = stored.find((s) => s.slot === p.slot);
    return q !== undefined && q.template_id === p.templateId && sameMoves(plannedMoves(q.condition), p.moves);
  });
}

/**
 * A completion counted for the quest now in its slot after the server rebuilt a day the phone built offline (M6e
 * decision 7): the player did another quest, so this one's ladder neither moves nor misses, and it isn't a workout done
 * (review).
 */
export function remapped(q: Pick<InstanceRow, 'payload'>): boolean {
  return typeof q.payload === 'object' && q.payload !== null && 'offlineQuest' in q.payload;
}
