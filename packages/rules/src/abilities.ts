import { MONTH_QUEST_DAYS, WEEK_QUEST_DAYS } from './constants.ts';
import type { ClassId } from './types.ts';

export type AbilityId =
  | 'second_wind' | 'unbreakable' | 'insight' | 'scholars_path' | 'shadowstep' | 'vanish' | 'stillness' | 'dawn_ritual';

export type Ability = { classId: ClassId; level: number; cooldownDays: number | null };

/** Class abilities (spec §2.5). `cooldownDays` counts quest days between uses; null means no limit. */
export const ABILITIES: Readonly<Record<AbilityId, Ability>> = {
  second_wind: { classId: 'warrior', level: 5, cooldownDays: WEEK_QUEST_DAYS },
  unbreakable: { classId: 'warrior', level: 10, cooldownDays: MONTH_QUEST_DAYS },
  insight: { classId: 'mage', level: 5, cooldownDays: null },
  scholars_path: { classId: 'mage', level: 10, cooldownDays: null },
  shadowstep: { classId: 'rogue', level: 5, cooldownDays: null },
  vanish: { classId: 'rogue', level: 10, cooldownDays: null },
  stillness: { classId: 'monk', level: 5, cooldownDays: WEEK_QUEST_DAYS },
  dawn_ritual: { classId: 'monk', level: 10, cooldownDays: null },
};

export const ABILITY_IDS = Object.keys(ABILITIES) as AbilityId[];

function ability(id: AbilityId): Ability {
  if (!ABILITY_IDS.includes(id)) throw new RangeError(`unknown ability ${id}`);
  return ABILITIES[id];
}

/** Abilities follow the current class at the current level, so a class change moves them too. */
export function abilityUnlocked(id: AbilityId, classId: ClassId, level: number): boolean {
  const { classId: owner, level: needed } = ability(id);
  return owner === classId && level >= needed;
}

/** Unlocked, and its cooldown in quest days has passed since the last use on `lastUsedDay`. */
export function abilityReady(id: AbilityId, classId: ClassId, level: number, lastUsedDay: number | null, dayNumber: number): boolean {
  if (!abilityUnlocked(id, classId, level)) return false;
  const { cooldownDays } = ability(id);
  return cooldownDays === null || lastUsedDay === null || dayNumber - lastUsedDay >= cooldownDays;
}

/** Swaps a day allows: 1, or 2 with Shadowstep (spec §3.5). */
export function swapLimit(classId: ClassId, level: number): number {
  return abilityUnlocked('shadowstep', classId, level) ? 2 : 1;
}
