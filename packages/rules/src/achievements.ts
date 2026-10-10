import type { AbilityId } from './abilities.ts';
import type { Rank } from './types.ts';

/** What earns an achievement. Rungs count from 0 (rung 3 is a ladder's fourth step). */
export type AchievementCriterion =
  | { kind: 'quests'; count: number }
  | { kind: 'level'; level: number }
  | { kind: 'streak'; days: number }
  | { kind: 'rung'; ladder: string | null; rung: number }
  | { kind: 'articles'; count: number }
  | { kind: 'recoveries'; count: number }
  | { kind: 'hard_days'; count: number }
  | { kind: 'comebacks'; count: number }
  | { kind: 'rank'; rank: Rank }
  | { kind: 'ability'; ability: AbilityId };

/** Counters the server keeps for achievements (M3). */
export type AchievementProgress = {
  questsCleared: number;
  level: number;
  bestStreak: number;
  /** Highest rung ever reached, by ladder. */
  highestRungs: Readonly<Record<string, number>>;
  articlesRead: number;
  recoveriesCleared: number;
  /** Hard days on which the core quest was cleared. */
  hardDaysCleared: number;
  /** First days back after 5+ days away on which the core quest was cleared. */
  comebacks: number;
  /** The best rank among the stats. */
  bestRank: Rank;
  abilitiesUsed: readonly AbilityId[];
};

export type AchievementRule = { id: string; criterion: AchievementCriterion };

const RANK_ORDER: readonly Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export function meetsCriterion(criterion: AchievementCriterion, progress: AchievementProgress): boolean {
  switch (criterion.kind) {
    case 'quests':
      return progress.questsCleared >= criterion.count;
    case 'level':
      return progress.level >= criterion.level;
    case 'streak':
      return progress.bestStreak >= criterion.days;
    case 'rung':
      return criterion.ladder === null
        ? Object.values(progress.highestRungs).some((rung) => rung >= criterion.rung)
        : (progress.highestRungs[criterion.ladder] ?? -1) >= criterion.rung;
    case 'articles':
      return progress.articlesRead >= criterion.count;
    case 'recoveries':
      return progress.recoveriesCleared >= criterion.count;
    case 'hard_days':
      return progress.hardDaysCleared >= criterion.count;
    case 'comebacks':
      return progress.comebacks >= criterion.count;
    case 'rank':
      return RANK_ORDER.indexOf(progress.bestRank) >= RANK_ORDER.indexOf(criterion.rank);
    case 'ability':
      return progress.abilitiesUsed.includes(criterion.ability);
    default:
      throw new RangeError(`unknown achievement criterion ${(criterion as { kind: string }).kind}`);
  }
}

/** Achievements met now and not earned before, in definition order. */
export function newAchievements(rules: readonly AchievementRule[], progress: AchievementProgress, earned: readonly string[]): string[] {
  return rules.filter((rule) => !earned.includes(rule.id) && meetsCriterion(rule.criterion, progress)).map((rule) => rule.id);
}
