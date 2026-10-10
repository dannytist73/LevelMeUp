import { HARD_DAY_MIN_XP, XP_BY_TIER } from './constants.ts';
import type { Stat, Tier, TrainableStat } from './types.ts';

export type XpSplit = { secondary: TrainableStat; primaryShare: number };
export type XpByStat = Partial<Record<Stat, number>>;

/** XP for one quest instance; the hard-day version pays half, rounded up, at least 5. */
export function questXp(tier: Tier, options: { hardDay?: boolean } = {}): number {
  const full = XP_BY_TIER[tier];
  return options.hardDay ? Math.max(HARD_DAY_MIN_XP, Math.ceil(full / 2)) : full;
}

/** Shares a quest's XP between its primary stat and an optional secondary. The parts always add up to `amount`. */
export function splitXp(amount: number, primary: Stat, split?: XpSplit): XpByStat {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError(`amount must be a non-negative integer, got ${amount}`);
  const result: XpByStat = {};
  if (!split) {
    result[primary] = amount;
    return result;
  }
  if (split.secondary === primary) throw new RangeError('the secondary stat must differ from the primary stat');
  if (!(split.primaryShare > 0 && split.primaryShare < 1)) {
    throw new RangeError(`primaryShare must be between 0 and 1, got ${split.primaryShare}`);
  }
  // Round away floating-point noise first, so 100 × 0.07 gives 7, not 8.
  const primaryXp = Math.ceil(Math.round(amount * split.primaryShare * 1e6) / 1e6);
  result[primary] = primaryXp;
  result[split.secondary] = amount - primaryXp;
  return result;
}

export function totalXp(byStat: XpByStat): number {
  return Object.values(byStat).reduce((sum, xp) => sum + (xp ?? 0), 0);
}
