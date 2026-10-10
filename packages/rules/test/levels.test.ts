import { describe, expect, it } from 'vitest';
import { LEVEL_CURVE, cumulativeXpForLevel, levelForXp, levelProgress, xpToNextLevel } from '../src/levels.ts';

const SPEC_CURVE = { base: 30, step: 20 };

describe('level curve (spec §2.3)', () => {
  it('reproduces the spec table for the original 30 + 20 × (L − 1) curve', () => {
    expect([2, 5, 10, 15, 20].map((level) => cumulativeXpForLevel(level, SPEC_CURVE))).toEqual([30, 240, 990, 2240, 3990]);
  });

  it('uses the tuned step by default', () => {
    expect([2, 5, 10, 15, 20].map((level) => cumulativeXpForLevel(level))).toEqual([30, 312, 1422, 3332, 6042]);
  });

  it('level 1 needs nothing and level 2 needs the base', () => {
    expect(cumulativeXpForLevel(1)).toBe(0);
    expect(cumulativeXpForLevel(2)).toBe(LEVEL_CURVE.base);
    expect(xpToNextLevel(1)).toBe(LEVEL_CURVE.base);
  });

  it('each level costs one step more than the level before', () => {
    for (let level = 1; level < 60; level++) {
      expect(xpToNextLevel(level + 1) - xpToNextLevel(level)).toBe(LEVEL_CURVE.step);
      expect(cumulativeXpForLevel(level + 1) - cumulativeXpForLevel(level)).toBe(xpToNextLevel(level));
    }
  });

  it('levelForXp inverts cumulativeXpForLevel', () => {
    for (let level = 1; level <= 60; level++) {
      expect(levelForXp(cumulativeXpForLevel(level))).toBe(level);
      if (level > 1) expect(levelForXp(cumulativeXpForLevel(level) - 1)).toBe(level - 1);
    }
  });

  it('levelProgress splits total XP into the current level', () => {
    const start = cumulativeXpForLevel(6);
    expect(levelProgress(start + 62)).toEqual({ level: 6, xpIntoLevel: 62, xpForLevel: xpToNextLevel(6) });
  });

  it('rejects invalid input', () => {
    expect(() => levelForXp(-1)).toThrow(RangeError);
    expect(() => levelForXp(Number.NaN)).toThrow(RangeError);
    expect(() => xpToNextLevel(0)).toThrow(RangeError);
    expect(() => cumulativeXpForLevel(1.5)).toThrow(RangeError);
  });
});
