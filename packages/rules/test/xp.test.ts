import { describe, expect, it } from 'vitest';
import type { Tier } from '../src/types.ts';
import { questXp, splitXp, totalXp } from '../src/xp.ts';

describe('quest XP (spec §2.2)', () => {
  it('pays by tier', () => {
    expect([questXp('minor'), questXp('standard'), questXp('major')]).toEqual([10, 20, 30]);
  });

  it('pays half, rounded up, at least 5, for the hard-day version', () => {
    expect([questXp('minor', { hardDay: true }), questXp('standard', { hardDay: true }), questXp('major', { hardDay: true })]).toEqual([5, 10, 15]);
  });
});

describe('XP splits', () => {
  it('puts everything on the primary stat when there is no split', () => {
    expect(splitXp(20, 'strength')).toEqual({ strength: 20 });
  });

  it('splits without ever adding XP', () => {
    expect(splitXp(20, 'strength', { secondary: 'vitality', primaryShare: 0.7 })).toEqual({ strength: 14, vitality: 6 });
    const odd = splitXp(15, 'focus', { secondary: 'wisdom', primaryShare: 0.5 });
    expect(odd).toEqual({ focus: 8, wisdom: 7 });
    expect(totalXp(odd)).toBe(15);
  });

  it('is not thrown off by floating-point noise (100 × 0.07 is 7.000000000000001 in JS)', () => {
    expect(splitXp(100, 'strength', { secondary: 'vitality', primaryShare: 0.07 })).toEqual({ strength: 7, vitality: 93 });
  });

  it('leaves out a secondary share that rounds to nothing', () => {
    expect(splitXp(1, 'strength', { secondary: 'vitality', primaryShare: 0.7 })).toEqual({ strength: 1 });
  });

  it('rejects an unknown tier', () => {
    expect(() => questXp('epic' as Tier)).toThrow(RangeError);
  });

  it('rejects nonsense splits', () => {
    expect(() => splitXp(20, 'strength', { secondary: 'strength', primaryShare: 0.5 })).toThrow(RangeError);
    expect(() => splitXp(20, 'strength', { secondary: 'vitality', primaryShare: 1 })).toThrow(RangeError);
    expect(() => splitXp(20, 'strength', { secondary: 'vitality', primaryShare: 0 })).toThrow(RangeError);
    expect(() => splitXp(-5, 'strength')).toThrow(RangeError);
  });
});
