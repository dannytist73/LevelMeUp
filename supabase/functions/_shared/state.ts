// Database rows and what the rules make of them. Pure: no database access here.
import {
  CLASSES, STATS, TRAINABLE_STATS, levelForXp, levelProgress, newLadder, rankFor, statPoints, xpToNextPoint,
} from '../../../packages/rules/src/index.ts';
import type {
  AbilityId, AchievementProgress, ClassId, DayWindow, Difficulty, Goal, LadderState, Limitation, PastDay, PlayerProfile,
  Rank, Rating, Slot, Stat, StatMap, StreakState, Tier, TrainableStat, WhyReason, XpByStat,
} from '../../../packages/rules/src/index.ts';
import type { Condition, CompletionType } from '../../../packages/rules/src/index.ts';

/** Bigint ids arrive as strings from postgres.js. */
export type Id = number | string;

export type ProfileRow = {
  user_id: string;
  name: string;
  voice: 'mentor' | 'system' | 'questmaster';
  class_id: ClassId;
  time_zone: string;
  boundary_minutes: number;
  minutes_per_day: number;
  difficulty: Difficulty;
  goals: Goal[];
  limitations: Limitation[];
  gentle_start: boolean;
  own_program: boolean;
  book: string | null;
  reveal: unknown;
  accountability_level: number;
};

export type CharacterRow = Record<`start_${Stat}` | `xp_${Stat}`, number> & {
  total_xp: number;
  streak_current: number;
  streak_best: number;
  shields: number;
  awaiting_checkin: boolean;
  quests_cleared: number;
  hard_days_cleared: number;
  comebacks: number;
  recoveries_cleared: number;
  articles_read: number;
  ability_last_used: Partial<Record<AbilityId, number>>;
  version: number;
};

export type LadderRow = { ladder_id: string; state: LadderState };

export type DayRow = {
  id: Id;
  day_number: number;
  starts_at: Date;
  ends_at: Date;
  time_zone: string;
  budget: number;
  light: boolean;
  comeback: boolean;
  hard_day: boolean;
  article_id: string | null;
  protection: 'planned_rest' | 'outage' | 'no_quests' | null;
  status: 'open' | 'closed';
  resolution: 'streak_day' | 'protected' | 'awaiting_checkin' | null;
  streak_applied: boolean;
};

export type InstanceRow = {
  id: Id;
  day_id: Id;
  slot: Slot;
  template_id: string;
  ladder_id: string | null;
  rung: number | null;
  stat: Stat;
  tier: Tier;
  minutes: number;
  completion: CompletionType;
  condition: Condition;
  hard_day: boolean;
  xp: XpByStat;
  why: WhyReason;
  book: string | null;
  completed_at: Date | null;
  rating: Rating | null;
  payload: unknown;
};

export type CheckinRow = { id: Id; day_id: Id | null; gap_from: number | null; gap_to: number | null; answer: string | null };

/** A quest as `start_player` and `advance` store it (camelCase, the shape `levelmeup.insert_day` reads). */
export type InstanceDraft = {
  slot: Slot;
  templateId: string;
  ladder: string | null;
  rung: number | null;
  stat: Stat;
  tier: Tier;
  minutes: number;
  completion: CompletionType;
  condition: Condition;
  hardDay: boolean;
  xp: XpByStat;
  why: WhyReason;
  book: string | null;
};

export type DayDraft = {
  dayNumber: number;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  budget: number;
  light: boolean;
  comeback: boolean;
  articleId: string | null;
  protection: 'no_quests' | null;
  contentVersion: number;
  quests: InstanceDraft[];
};

export function startPoints(c: CharacterRow): StatMap {
  return Object.fromEntries(STATS.map((s) => [s, c[`start_${s}`]])) as StatMap;
}

export function statXp(c: CharacterRow): StatMap {
  return Object.fromEntries(STATS.map((s) => [s, c[`xp_${s}`]])) as StatMap;
}

export function totalOf(xp: StatMap): number {
  return STATS.reduce((sum, s) => sum + xp[s], 0);
}

export function streakState(c: CharacterRow): StreakState {
  return { current: c.streak_current, best: c.streak_best, shields: c.shields, awaitingCheckin: c.awaiting_checkin };
}

export function ladderMap(rows: readonly LadderRow[]): Record<string, LadderState> {
  return Object.fromEntries(rows.map((r) => [r.ladder_id, r.state]));
}

/** The rules' view of the player. `xp` lets a caller include XP about to be written (closing days). */
export function toProfile(p: ProfileRow, start: StatMap, xp: StatMap): PlayerProfile {
  const stats = Object.fromEntries(TRAINABLE_STATS.map((s) => [s, statPoints(start[s], xp[s])])) as Record<TrainableStat, number>;
  return {
    classId: p.class_id,
    level: levelForXp(totalOf(xp)),
    goals: p.goals,
    minutesPerDay: p.minutes_per_day,
    difficulty: p.difficulty,
    limitations: p.limitations,
    gentleStart: p.gentle_start,
    ownProgram: p.own_program,
    stats,
    book: p.book,
  };
}

export function dayWindow(d: DayRow): DayWindow {
  return { startsAt: d.starts_at.getTime(), endsAt: d.ends_at.getTime(), timeZone: d.time_zone };
}

/** Each slot's final template per day, oldest first (the builder's history). */
export function pastDays(days: readonly DayRow[], instances: readonly InstanceRow[]): PastDay[] {
  return [...days]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      dayNumber: d.day_number,
      quests: Object.fromEntries(instances.filter((q) => String(q.day_id) === String(d.id)).map((q) => [q.slot, q.template_id])),
    }));
}

export type StatView = { points: number; rank: Rank; xp: number; toNext: number };

/** What the phone shows; every number computed by the rules from stored XP. */
export function characterView(c: CharacterRow) {
  const start = startPoints(c);
  const xp = statXp(c);
  const stats = Object.fromEntries(
    STATS.map((s) => {
      const points = statPoints(start[s], xp[s]);
      return [s, { points, rank: rankFor(points), xp: xp[s], toNext: xpToNextPoint(xp[s]) } satisfies StatView];
    }),
  ) as Record<Stat, StatView>;
  return {
    totalXp: totalOf(xp),
    ...levelProgress(totalOf(xp)),
    stats,
    streak: streakState(c),
    version: c.version,
  };
}

const RANK_ORDER: readonly Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

/** The counters `newAchievements` needs (rules: achievements.ts). */
export function achievementProgress(c: CharacterRow, ladders: Readonly<Record<string, LadderState>>): AchievementProgress {
  const view = characterView(c);
  const bestRank = TRAINABLE_STATS.map((s) => view.stats[s].rank).reduce((a, b) => (RANK_ORDER.indexOf(b) > RANK_ORDER.indexOf(a) ? b : a), 'E' as Rank);
  return {
    questsCleared: c.quests_cleared,
    level: view.level,
    bestStreak: c.streak_best,
    highestRungs: Object.fromEntries(Object.entries(ladders).map(([id, s]) => [id, (s ?? newLadder()).highestRung])),
    articlesRead: c.articles_read,
    recoveriesCleared: c.recoveries_cleared,
    hardDaysCleared: c.hard_days_cleared,
    comebacks: c.comebacks,
    bestRank,
    abilitiesUsed: Object.keys(c.ability_last_used) as AbilityId[],
  };
}

/** The class's main stat, for the reveal and the views. */
export function mainStat(classId: ClassId): TrainableStat {
  return CLASSES[classId].main;
}
