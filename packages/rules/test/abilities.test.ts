import { describe, expect, it } from 'vitest';
import { ABILITIES, ABILITY_IDS, abilityReady, abilityUnlocked, swapLimit } from '../src/abilities.ts';
import type { AbilityId } from '../src/abilities.ts';

describe('class abilities (spec §2.5)', () => {
  it('has two abilities per class, at levels 5 and 10', () => {
    expect(ABILITY_IDS).toHaveLength(8);
    for (const classId of ['warrior', 'mage', 'rogue', 'monk'] as const) {
      const levels = ABILITY_IDS.filter((id) => ABILITIES[id].classId === classId).map((id) => ABILITIES[id].level);
      expect(levels.sort((a, b) => a - b)).toEqual([5, 10]);
    }
  });

  it('unlock at their level for their class only, and follow a class change', () => {
    expect(abilityUnlocked('second_wind', 'warrior', 4)).toBe(false);
    expect(abilityUnlocked('second_wind', 'warrior', 5)).toBe(true);
    expect(abilityUnlocked('second_wind', 'monk', 20)).toBe(false);
    expect(abilityUnlocked('dawn_ritual', 'monk', 10)).toBe(true);
  });

  it('weekly and monthly abilities wait 7 or 30 quest days between uses', () => {
    expect(abilityReady('second_wind', 'warrior', 5, null, 9)).toBe(true);
    expect(abilityReady('second_wind', 'warrior', 5, 3, 9)).toBe(false);
    expect(abilityReady('second_wind', 'warrior', 5, 3, 10)).toBe(true);
    expect(abilityReady('stillness', 'monk', 5, 10, 16)).toBe(false);
    expect(abilityReady('unbreakable', 'warrior', 10, 1, 30)).toBe(false);
    expect(abilityReady('unbreakable', 'warrior', 10, 1, 31)).toBe(true);
    expect(abilityReady('dawn_ritual', 'monk', 10, 9, 9)).toBe(true);
  });

  it('a locked ability is never ready', () => {
    expect(abilityReady('stillness', 'monk', 4, null, 9)).toBe(false);
  });

  it('Shadowstep gives a Rogue 2 swaps a day from level 5', () => {
    expect(swapLimit('rogue', 4)).toBe(1);
    expect(swapLimit('rogue', 5)).toBe(2);
    expect(swapLimit('warrior', 30)).toBe(1);
  });

  it('rejects an unknown ability', () => {
    expect(() => abilityUnlocked('fireball' as AbilityId, 'mage', 50)).toThrow(RangeError);
  });
});
