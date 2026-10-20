// What Character shows beyond the server's numbers (M6d): each ability's place on the class path, the line under each
// stat, whether Scholar's Path is open, and whether the training setup was never chosen. Pure, from the rules.
import { ABILITIES_LATER, CHARACTER_TEXT, fillText } from '@levelmeup/content';
import { ABILITIES, ABILITY_IDS, abilityUnlocked, nextRank, pointProgress } from '@levelmeup/rules';
import type { AbilityId, ClassId, Equipment, ProgramStyle, Stat } from '@levelmeup/rules';

const T = CHARACTER_TEXT;

export type AbilityStatus =
  | { kind: 'locked'; level: number; left: number }
  | { kind: 'later' }
  | { kind: 'ready' }
  | { kind: 'cooldown'; days: number }
  | { kind: 'unlocked' };

export function classAbilities(classId: ClassId): AbilityId[] {
  return ABILITY_IDS.filter((id) => ABILITIES[id].classId === classId).sort((a, b) => ABILITIES[a].level - ABILITIES[b].level);
}

/** `lastUsed` and `dayNumber` are quest-day numbers (cooldowns count quest days); `dayNumber` is null without a day. */
export function abilityStatus(id: AbilityId, classId: ClassId, level: number, lastUsed: number | null, dayNumber: number | null): AbilityStatus {
  const { level: needed, cooldownDays } = ABILITIES[id];
  if (!abilityUnlocked(id, classId, level)) return { kind: 'locked', level: needed, left: needed - level };
  if (ABILITIES_LATER.includes(id)) return { kind: 'later' };
  if (cooldownDays === null) return { kind: 'unlocked' };
  if (lastUsed === null || dayNumber === null) return { kind: 'ready' };
  const left = cooldownDays - (dayNumber - lastUsed);
  return left <= 0 ? { kind: 'ready' } : { kind: 'cooldown', days: left };
}

export function statusText(status: AbilityStatus): string {
  switch (status.kind) {
    case 'locked':
      return status.left === 1 ? fillText(T.path.lockedOne, { level: status.level }) : fillText(T.path.locked, { level: status.level, left: status.left });
    case 'later':
      return T.path.later;
    case 'ready':
      return T.path.ready;
    case 'cooldown':
      return status.days === 1 ? T.path.cooldownOne : fillText(T.path.cooldown, { days: status.days });
    case 'unlocked':
      return T.path.unlocked;
  }
}

/** "50 XP to 10 · rank D at 10" (board D4). */
export function statLine(stat: Stat, points: number, xp: number): string {
  const { into, span } = pointProgress(xp);
  const parts = [fillText(T.stats.toNext, { xp: span - into, next: points + 1 })];
  const rank = nextRank(points);
  if (rank !== null && rank.at === points + 1) parts.push(fillText(T.stats.rankAt, { rank: rank.rank, at: rank.at }));
  if (stat === 'discipline') parts.push(T.stats.discipline);
  return parts.join(' · ');
}

export const scholarsPathOpen = (classId: ClassId, level: number): boolean => abilityUnlocked('scholars_path', classId, level);

/** Never chose a training setup, and could train with one (decision 13). */
export function trainingUnset(p: { equipment: readonly Equipment[]; programStyle: ProgramStyle; ownProgram: boolean; gentleStart: boolean }): boolean {
  return p.equipment.length === 0 && p.programStyle === 'none' && !p.ownProgram && !p.gentleStart;
}
