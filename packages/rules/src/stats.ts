import {
  CLASSES,
  CLASS_MAIN_STAT_BONUS,
  RANK_FLOORS,
  START_STAT_MAX,
  START_STAT_MIN,
  STATS,
  STAT_XP_DIVISOR,
} from './constants.ts';
import type { ClassId, Rank, StatMap } from './types.ts';

/** Points shown for a stat: the starting estimate plus floor(√(statXp / divisor)). Fast early, slower later. */
export function statPoints(start: number, statXp: number, divisor: number = STAT_XP_DIVISOR): number {
  if (!Number.isInteger(start) || start < 0) throw new RangeError(`start must be a non-negative integer, got ${start}`);
  assertStatXp(statXp);
  if (!(divisor > 0 && Number.isFinite(divisor))) throw new RangeError(`divisor must be a positive number, got ${divisor}`);
  return start + Math.floor(Math.sqrt(statXp / divisor));
}

/** Stat XP still needed before the next point. */
export function xpToNextPoint(statXp: number): number {
  assertStatXp(statXp);
  const earned = Math.floor(Math.sqrt(statXp / STAT_XP_DIVISOR));
  return STAT_XP_DIVISOR * (earned + 1) ** 2 - statXp;
}

export function rankFor(points: number): Rank {
  for (const [rank, floor] of RANK_FLOORS) {
    if (points >= floor) return rank;
  }
  return 'E';
}

/** Starting points from onboarding estimates: rounded, kept in 3–8, then +2 on the class's main stat. */
export function startingStats(estimates: StatMap, classId: ClassId): StatMap {
  if (!Object.keys(CLASSES).includes(classId)) throw new RangeError(`unknown class ${classId}`);
  const classInfo = CLASSES[classId];
  const result = {} as StatMap;
  for (const stat of STATS) {
    const estimate = estimates[stat];
    if (!Number.isFinite(estimate)) throw new RangeError(`estimate for ${stat} must be a number, got ${estimate}`);
    result[stat] = Math.min(START_STAT_MAX, Math.max(START_STAT_MIN, Math.round(estimate)));
  }
  result[classInfo.main] += CLASS_MAIN_STAT_BONUS;
  return result;
}

function assertStatXp(statXp: number): void {
  if (!Number.isFinite(statXp) || statXp < 0) throw new RangeError(`stat XP must be a non-negative number, got ${statXp}`);
}
