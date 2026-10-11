// Database rows and what the rules make of them. Pure: no database access here.
import {
  STATS, TRAINABLE_STATS, levelForXp, levelProgress, newLadder, rankFor, statPoints, xpToNextPoint,
} from '../../../packages/rules/src/index.ts';
import type {
  AbilityId, AchievementProgress, ClassId, CompletionType, Condition, DayWindow, Difficulty, Goal, LadderState, Limitation,
  PastDay, PlayerProfile, Protection, Rank, Rating, Slot, Stat, StatMap, StreakState, Tier, TrainableStat, WhyReason, XpByStat,
} from '../../../packages/rules/src/index.ts';

/** Bigint ids arrive as strings from postgres.js. */
export type Id = number | string;

export type ProfileRow = {
  user_id: string;
  name: string;
  voice: 'mentor' | 'system' | 'questmaster';
  class_id: ClassId;
  class_changed_at: Date | null;
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
  protection: Protection | null;
  status: 'open' | 'closed';
  resolution: 'streak_day' | 'protected' | 'awaiting_checkin' | null;
  streak_applied: boolean;
  swaps_used: number;
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

/** A quest's stored fields without its slot: what a swap, the gentle option or an ability puts in a slot. */
export type QuestFields = Omit<InstanceDraft, 'slot'>;

/** What the phone may offer today (M6b; `_shared/today.ts`). Per-quest offers are keyed by quest instance id. */
export type DayOffers = {
  swapsLeft: number;
  restAllowed: boolean;
  /** Day-shaping abilities ready now, each with the quest it puts in the core slot. */
  abilities: { ability: 'stillness' | 'dawn_ritual'; quest: QuestFields }[];
  swaps: Readonly<Record<string, QuestFields[]>>;
  /** Exercise quests only: gentle movement after pain, or null when none fits. */
  gentle: Readonly<Record<string, QuestFields | null>>;
  stepDown: readonly string[];
};

export const NO_OFFERS: DayOffers = { swapsLeft: 0, restAllowed: false, abilities: [], swaps: {}, gentle: {}, stepDown: [] };

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
    equipment: [],
    programStyle: 'none',
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
    // A ladder's rung counts only once the player has stepped up in the game: a starting rung from onboarding (M5) is
    // where they began, not a climb. The highest rung rises only with a step-up, which sets lastStepUpAt.
    highestRungs: Object.fromEntries(Object.entries(ladders).map(([id, s]) => {
      const state = s ?? newLadder();
      return [id, state.lastStepUpAt === null ? 0 : state.highestRung];
    })),
    articlesRead: c.articles_read,
    recoveriesCleared: c.recoveries_cleared,
    hardDaysCleared: c.hard_days_cleared,
    comebacks: c.comebacks,
    bestRank,
    abilitiesUsed: Object.keys(c.ability_last_used) as AbilityId[],
  };
}

export type Snapshot = {
  profile: ProfileRow;
  character: CharacterRow;
  ladders: LadderRow[];
  /** The latest days, in any order. */
  days: DayRow[];
  instances: InstanceRow[];
  /** Unanswered check-ins. */
  checkins: CheckinRow[];
  earned: string[];
  /** A closed day is waiting behind a pending check-in (`streak_applied = false`), possibly older than `days`. */
  queued: boolean;
  /** "I felt pain" reports in the last 14 days (rules: PAIN_WINDOW_MS). */
  painReports: number;
};

const SLOT_ORDER: readonly Slot[] = ['core', 'side1', 'side2', 'article', 'recovery'];
const iso = (d: Date | null): string | null => (d === null ? null : d.toISOString());

/** The phone's copy of the player's state (the `lmu-sync` and `lmu-onboarding` responses), with today's offers (M6b). */
export function stateView(s: Snapshot, offers: DayOffers) {
  const days = [...s.days].sort((a, b) => b.day_number - a.day_number);
  const today = days[0] ?? null;
  const questsOf = (day: DayRow) => s.instances.filter((q) => String(q.day_id) === String(day.id));
  return {
    profile: {
      name: s.profile.name, voice: s.profile.voice, classId: s.profile.class_id, classChangedAt: iso(s.profile.class_changed_at),
      timeZone: s.profile.time_zone,
      boundaryMinutes: s.profile.boundary_minutes, minutesPerDay: s.profile.minutes_per_day, difficulty: s.profile.difficulty,
      goals: s.profile.goals, limitations: s.profile.limitations, gentleStart: s.profile.gentle_start, ownProgram: s.profile.own_program,
      book: s.profile.book, reveal: s.profile.reveal, accountabilityLevel: s.profile.accountability_level,
    },
    character: characterView(s.character),
    today: today === null ? null : {
      id: Number(today.id), dayNumber: today.day_number, startsAt: iso(today.starts_at), endsAt: iso(today.ends_at),
      timeZone: today.time_zone, budget: today.budget, light: today.light, hardDay: today.hard_day, protection: today.protection,
      status: today.status,
      swapsLeft: offers.swapsLeft, restAllowed: offers.restAllowed, abilities: offers.abilities,
      quests: questsOf(today)
        .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
        .map((q) => ({
          id: Number(q.id), slot: q.slot, templateId: q.template_id, ladder: q.ladder_id, rung: q.rung, stat: q.stat, tier: q.tier,
          minutes: q.minutes, completion: q.completion, condition: q.condition, hardDay: q.hard_day, xp: q.xp, why: q.why,
          book: q.book, completedAt: iso(q.completed_at), rating: q.rating,
          swaps: offers.swaps[String(q.id)] ?? [], gentle: offers.gentle[String(q.id)] ?? null,
          canStepDown: offers.stepDown.includes(String(q.id)),
        })),
    },
    checkinsDue: s.checkins
      .filter((c) => c.answer === null)
      .map((c) => ({ id: Number(c.id), dayId: c.day_id === null ? null : Number(c.day_id), gapFrom: c.gap_from, gapTo: c.gap_to })),
    recentDays: days.slice(1).map((d) => ({
      dayNumber: d.day_number, startsAt: iso(d.starts_at), status: d.status, resolution: d.resolution,
      cleared: questsOf(d).filter((q) => q.completed_at !== null).length,
    })),
    achievements: [...s.earned].sort(),
    /** Ladders, or standalone exercise quests, resting after pain. */
    paused: s.ladders.filter((l) => l.state.paused).map((l) => l.ladder_id).sort(),
    painReports: s.painReports,
  };
}
