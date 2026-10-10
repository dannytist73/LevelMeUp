import { LEVEL_BASE, LEVEL_STEP } from './constants.ts';

/** XP from level L to L+1 is base + step × (L − 1). */
export type LevelCurve = { readonly base: number; readonly step: number };

export const LEVEL_CURVE: LevelCurve = Object.freeze({ base: LEVEL_BASE, step: LEVEL_STEP });

export type LevelProgress = { level: number; xpIntoLevel: number; xpForLevel: number };

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number, curve: LevelCurve = LEVEL_CURVE): number {
  assertLevel(level);
  return curve.base + curve.step * (level - 1);
}

/** Total XP needed to reach `level`; level 1 needs 0. */
export function cumulativeXpForLevel(level: number, curve: LevelCurve = LEVEL_CURVE): number {
  assertLevel(level);
  const n = level - 1;
  return curve.base * n + (curve.step * n * (n - 1)) / 2;
}

/** The level a player with `totalXp` has reached. */
export function levelForXp(totalXp: number, curve: LevelCurve = LEVEL_CURVE): number {
  if (!Number.isFinite(totalXp) || totalXp < 0) {
    throw new RangeError(`totalXp must be a non-negative number, got ${totalXp}`);
  }
  // A curve whose levels cost nothing would never stop climbing.
  if (!(curve.base > 0 && curve.step >= 0 && Number.isFinite(curve.base + curve.step))) {
    throw new RangeError(`the level curve needs base > 0 and step >= 0, got ${curve.base} and ${curve.step}`);
  }
  let level = 1;
  while (cumulativeXpForLevel(level + 1, curve) <= totalXp) level++;
  return level;
}

/** Level plus how far into it the player is, for the XP bar. */
export function levelProgress(totalXp: number, curve: LevelCurve = LEVEL_CURVE): LevelProgress {
  const level = levelForXp(totalXp, curve);
  return {
    level,
    xpIntoLevel: totalXp - cumulativeXpForLevel(level, curve),
    xpForLevel: xpToNextLevel(level, curve),
  };
}

function assertLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1) throw new RangeError(`level must be an integer of at least 1, got ${level}`);
}
