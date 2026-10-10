import { describe, expect, it } from 'vitest';
import { rankFor, startingStats, statPoints, xpToNextPoint } from '../src/stats.ts';
import type { ClassId } from '../src/types.ts';

describe('stat points (spec §2.1)', () => {
  it('adds floor(sqrt(statXp / 10)) to the starting points', () => {
    expect(statPoints(8, 0)).toBe(8);
    expect(statPoints(8, 9)).toBe(8);
    expect(statPoints(8, 10)).toBe(9);
    expect(statPoints(8, 150)).toBe(11);
    expect(statPoints(8, 159)).toBe(11);
    expect(statPoints(8, 160)).toBe(12);
  });

  it('says how much stat XP the next point needs', () => {
    expect(xpToNextPoint(0)).toBe(10);
    expect(xpToNextPoint(40)).toBe(50);
    expect(xpToNextPoint(150)).toBe(10);
    expect(xpToNextPoint(160)).toBe(90);
  });

  it('rejects invalid input', () => {
    expect(() => statPoints(-1, 0)).toThrow(RangeError);
    expect(() => statPoints(5, -10)).toThrow(RangeError);
    expect(() => xpToNextPoint(Number.NaN)).toThrow(RangeError);
  });
});

describe('ranks', () => {
  it.each([
    [0, 'E'], [9, 'E'], [10, 'D'], [14, 'D'], [15, 'C'], [24, 'C'],
    [25, 'B'], [39, 'B'], [40, 'A'], [59, 'A'], [60, 'S'], [99, 'S'],
  ] as const)('%i points is rank %s', (points, rank) => {
    expect(rankFor(points)).toBe(rank);
  });
});

describe('starting stats', () => {
  it('keeps estimates in the 3–8 band and gives the class main stat +2', () => {
    expect(startingStats({ strength: 7, vitality: 6, wisdom: 5, focus: 4, discipline: 3 }, 'warrior')).toEqual({
      strength: 9, vitality: 6, wisdom: 5, focus: 4, discipline: 3,
    });
  });

  it('clamps and rounds out-of-band estimates before the bonus', () => {
    expect(startingStats({ strength: 12, vitality: 1, wisdom: 5.6, focus: 4, discipline: 0 }, 'mage')).toEqual({
      strength: 8, vitality: 3, wisdom: 8, focus: 4, discipline: 3,
    });
  });

  it('rejects a missing estimate or an unknown class', () => {
    expect(() => startingStats({ strength: Number.NaN, vitality: 5, wisdom: 5, focus: 5, discipline: 5 }, 'monk')).toThrow(RangeError);
    expect(() => startingStats({ strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: 5 }, 'paladin' as ClassId)).toThrow(RangeError);
    expect(() => startingStats({ strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: 5 }, '__proto__' as ClassId)).toThrow(RangeError);
  });
});
