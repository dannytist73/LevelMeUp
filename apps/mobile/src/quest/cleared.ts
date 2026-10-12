// The numbers on "Quest cleared" (board D2, M6a decision 5), from what the phone shows before and after the completion.
// XP and stats move at once (the projection); Discipline and the streak change when the server closes the day, so the
// screen shows what today now counts for.
import { STATS, STREAK_SLOTS, isStreakDay } from '@levelmeup/rules';
import type { Rank, Stat } from '@levelmeup/rules';
import type { CharacterView, QuestView } from '../game/types.ts';

export type Shot = { character: CharacterView; quests: readonly QuestView[] };

export type ClearedNumbers = {
  xp: number;
  statUps: { stat: Stat; from: number; to: number; rank: Rank }[];
  /** The core quest: today earns Discipline +5 when it closes (spec §2.1). */
  discipline: boolean;
  /**
   * This completion made today a streak day: the streak grows by one when the day closes (spec §2.4). Null while a
   * check-in is pending: the server holds the day until it's answered, and the answer decides the streak (review).
   */
  streak: { from: number; to: number } | null;
  level: { level: number; xpIntoLevel: number; xpForLevel: number };
  /** The recovery quest: the day is taken back when today ends (M7a). */
  recovered: boolean;
};

function streakDay(quests: readonly QuestView[]): boolean {
  const done = quests.filter((q) => q.completedAt !== null);
  return isStreakDay({ coreDone: done.some((q) => q.slot === 'core'), questsDone: done.filter((q) => STREAK_SLOTS.includes(q.slot)).length });
}

export function clearedSummary(before: Shot | null, after: Shot, questId: number): ClearedNumbers {
  const quest = after.quests.find((q) => q.id === questId);
  if (quest === undefined) throw new RangeError(`quest ${questId} is not today's`);
  const statUps = before === null ? [] : STATS.flatMap((stat) => {
    const from = before.character.stats[stat].points;
    const to = after.character.stats[stat].points;
    return to > from ? [{ stat, from, to, rank: after.character.stats[stat].rank }] : [];
  });
  const current = after.character.streak.current;
  const grew = before !== null && !after.character.streak.awaitingCheckin && !streakDay(before.quests) && streakDay(after.quests);
  const { level, xpIntoLevel, xpForLevel } = after.character;
  return {
    xp: Object.values(quest.xp).reduce((sum, x) => sum + (x ?? 0), 0),
    statUps,
    discipline: quest.slot === 'core',
    streak: grew ? { from: current, to: current + 1 } : null,
    level: { level, xpIntoLevel, xpForLevel },
    recovered: quest.slot === 'recovery',
  };
}
