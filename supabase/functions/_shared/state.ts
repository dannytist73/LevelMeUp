// Database rows and what the rules make of them. Pure: no database access here.
import {
  STATS, TRAINABLE_STATS, checkinEvents, levelForXp, levelProgress, lighterMinutes, lighterPlanOffered, newLadder, questDayDate, rankFor,
  statPoints, xpToNextPoint,
} from '../../../packages/rules/src/index.ts';
import type {
  AbilityId, AchievementProgress, CheckinAnswer, ClassId, CompletionType, Condition, DayWindow, Difficulty, Equipment, Goal, LadderState,
  Limitation, PastDay, PlayerProfile, ProgramStyle, Protection, Rank, Rating, Slot, Stat, StatMap, StreakState, Tier, TrainableStat, TrainingPlan,
  WhyReason, XpByStat,
} from '../../../packages/rules/src/index.ts';
import { plusView } from './plus.ts';
import type { EntitlementRow, StatWeek } from './plus.ts';
import { insightView, nextArticle, readingsView, summaryOf } from './reading.ts';
import type { CandidateRow, InsightRow, ReadingRow } from './reading.ts';

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
  equipment: Equipment[];
  program_style: ProgramStyle;
  /** M15: the training plan, the weekly program's workouts a week, and when it was last switched on (decisions 1, 3). */
  training_plan: TrainingPlan;
  program_days: number;
  program_since: Date | null;
  book: string | null;
  /** M6d: when the current Scholar's Path book was set. */
  book_started_at: Date | null;
  /** M6d: finished books, oldest first (the newest 100). */
  books_finished: FinishedBook[];
  reveal: unknown;
  accountability_level: number;
  /** M7c: when the current pact level was signed (decision 2); null when off. */
  accountability_enabled_at: Date | null;
  /** M7a: when the player last answered the lighter-plan offer (decision 9). */
  lighter_plan_at: Date | null;
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
  /** M7a: the next day is light (a "sick" or "injured" check-in answer, decision 6). */
  next_day_light: boolean;
  /** M7b: the day number a rest day is planned for (decision 5), used when that day is built; null when none. */
  rest_day: number | null;
  /** M8b: Insight's topic and the quest day it was chosen on, for the next day built (decision 8); null when none. */
  insight: InsightRow | null;
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

/** M7c: what the pact did with "I just didn't" (decision 2): the Shadow, the Trial, or paused after 3 in 7 days. */
export type Consequence = 'shadow' | 'trial' | 'paused';

/**
 * M7a: the check-in not yet resolved (one at a time, decision 3), with the missed day's window and core quest, and whether
 * the recovery quest on its recovery day was cleared.
 */
export type PendingCheckin = {
  id: Id;
  day_id: Id | null;
  gap_from: number | null;
  gap_to: number | null;
  answer: CheckinAnswer | null;
  recovery_day_id: Id | null;
  missed_day: number | null;
  missed_starts_at: Date | null;
  missed_ends_at: Date | null;
  missed_time_zone: string | null;
  missed_core: string | null;
  missed_ladder: string | null;
  recovered: boolean;
  /** M7c: for away days, the end of the day before them (when the first away day started); else null. */
  gap_starts_at: Date | null;
  /** M7c: what the pact did with "I just didn't" (decision 4), when the Trial's session was done, the private note. */
  consequence: Consequence | null;
  trial_done_at: Date | null;
  note: string | null;
};

/** M7a: a closed day waiting behind a check-in (`streak_applied = false`). */
export type QueuedDay = { id: Id; day_number: number; resolution: 'streak_day' | 'protected' | 'awaiting_checkin' };

/**
 * M7a: a check-in answered in the last 14 days (the lighter-plan offer; a second answer to it is `already_answered`).
 * M7c: what the pact did with it and its recovery day (the 3-in-7 pause, one a day; decision 4), and notes (decision 8).
 */
export type AnsweredRow = {
  id: Id; answer: CheckinAnswer; answered_at: Date; gap_from: number | null; gap_to: number | null; consequence: Consequence | null;
  recovery_day_id: Id | null;
};

/** How a settled "I just didn't" ended (decision 4). */
export type MissOutcome = 'recovered' | 'unbreakable' | 'shield' | 'reset';

/** M7a: the latest settled "I just didn't" of the last 2 days, shown once by the phone. */
export type ResultRow = { id: Id; outcome: MissOutcome };

/** A Scholar's Path book the player finished (profiles.books_finished; times as ISO strings). */
export type FinishedBook = { title: string; startedAt: string | null; finishedAt: string; sessions: number; minutes: number };

/** What the Chronicle's calendar reads of a day (M6d). */
export type CalendarRow = Pick<DayRow, 'day_number' | 'starts_at' | 'ends_at' | 'time_zone' | 'status' | 'resolution' | 'protection' | 'hard_day'>;

/** Days the calendar covers (decision 3). */
export const CALENDAR_DAYS = 92;

/** What only Character and Chronicle need (M6d decision 2), read once per response by `loadHistory`. */
export type History = {
  /** The latest days, newest first, at most CALENDAR_DAYS. */
  days: CalendarRow[];
  /** Day 1's window (its date: `calendarDate`), or null. */
  dayOne: Pick<DayRow, 'starts_at' | 'ends_at' | 'time_zone'> | null;
  /** New rungs reached: the rung bonuses paid. */
  newRungs: number;
  /** Quests cleared with the current book since it was set. */
  reading: { sessions: number; minutes: number };
  /** M8b: the latest days with an article, newest first, at most READINGS_SHOWN (decision 7). */
  readings: ReadingRow[];
  /** M13: the all-time stat chart, oldest week first; null when the player isn't Plus. */
  statWeeks: StatWeek[] | null;
};

export type CalendarMark = 'open' | 'cleared' | 'hard' | 'rest' | 'paused' | 'none';

const REST: readonly Protection[] = ['planned_rest', 'pain'];

/** A quest day's date on the calendar (rules: `questDayDate`, which Today's header uses too). */
export function calendarDate(d: Pick<DayRow, 'starts_at' | 'ends_at' | 'time_zone'>): string {
  return questDayDate({ startsAt: d.starts_at.getTime(), endsAt: d.ends_at.getTime(), timeZone: d.time_zone });
}

/** How the calendar draws a day (decision 3). A closed day that is neither cleared nor protected is never a "miss". */
export function calendarMark(d: CalendarRow): CalendarMark {
  if (d.status === 'open') return 'open';
  if (d.resolution === 'streak_day') return d.hard_day ? 'hard' : 'cleared';
  if (d.resolution === 'protected') return d.protection !== null && REST.includes(d.protection) ? 'rest' : 'paused';
  return 'none';
}

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
  /** `no_quests` when the day couldn't be built (spec §3.7); M7b: `planned_rest` when the player planned it (decision 5). */
  protection: 'no_quests' | 'planned_rest' | null;
  contentVersion: number;
  quests: InstanceDraft[];
};

/** A quest's stored fields without its slot: what a swap, the gentle option or an ability puts in a slot. */
export type QuestFields = Omit<InstanceDraft, 'slot'>;

/** What the phone may offer today (M6b; `_shared/today.ts`). Per-quest offers are keyed by quest instance id. */
export type DayOffers = {
  swapsLeft: number;
  restAllowed: boolean;
  /** M7b: tomorrow can still be planned as a rest day (decision 5). */
  restTomorrow: boolean;
  /** Day-shaping abilities ready now, each with the quest it puts in the core slot. */
  abilities: { ability: 'stillness' | 'dawn_ritual'; quest: QuestFields }[];
  swaps: Readonly<Record<string, QuestFields[]>>;
  /** Exercise quests only: gentle movement after pain, or null when none fits. */
  gentle: Readonly<Record<string, QuestFields | null>>;
  stepDown: readonly string[];
  /** M7a: the quest Second Wind would redo with "I just didn't" on the pending check-in, or null (decision 7). */
  secondWind: QuestFields | null;
};

export const NO_OFFERS: DayOffers = {
  swapsLeft: 0, restAllowed: false, restTomorrow: false, abilities: [], swaps: {}, gentle: {}, stepDown: [], secondWind: null,
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
    equipment: p.equipment,
    programStyle: p.program_style,
    trainingPlan: p.training_plan,
    programDays: p.program_days,
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
    abilityLastUsed: c.ability_last_used,
    nextDayLight: c.next_day_light,
    restDay: c.rest_day,
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
  earned: string[];
  /** M7a: the check-in not yet resolved, or null. */
  checkin: PendingCheckin | null;
  /** M7a: closed days waiting behind a check-in, in day order (possibly older than `days`). */
  queue: QueuedDay[];
  /** M7a: check-ins answered in the last 14 days. */
  answered: AnsweredRow[];
  /** M7a: the latest settled "I just didn't" of the last 2 days, or null. */
  result: ResultRow | null;
  /** M7a: the database clock when the snapshot was read. */
  readAt: Date;
  /** "I felt pain" reports in the last 14 days (rules: PAIN_WINDOW_MS). */
  painReports: number;
  /** Workouts completed so far (M6c): the program day of the next workout (rules: planWorkout). */
  workoutsDone: number;
  /** M15: weekly workouts that count in the current run (rules: programRun): the next one's week and day. */
  programDone: number;
  /** M8b: the published library, each with the last quest day it was given to this player (decision 1). */
  articles: CandidateRow[];
  /** M13: LevelMeUp Plus grants. */
  entitlements: EntitlementRow[];
};

const SLOT_ORDER: readonly Slot[] = ['core', 'side1', 'side2', 'article', 'recovery'];
const iso = (d: Date | null): string | null => (d === null ? null : d.toISOString());

/** Growth since day 1 (decision 5): points gained per stat, levels gained, quests cleared, new rungs. */
function growthOf(c: CharacterRow, view: ReturnType<typeof characterView>, history: History) {
  const start = startPoints(c);
  return {
    since: history.dayOne === null ? null : calendarDate(history.dayOne),
    levels: view.level - 1,
    stats: Object.fromEntries(STATS.map((s) => [s, view.stats[s].points - start[s]])) as StatMap,
    questsCleared: c.quests_cleared,
    newRungs: history.newRungs,
  };
}

/** M7a: the pending check-in as the phone shows it (decisions 3, 7). */
function checkinView(c: PendingCheckin, offers: DayOffers) {
  const gap = c.day_id === null;
  return {
    id: Number(c.id),
    /** The missed day, or the first and last away days. */
    from: gap ? c.gap_from! : c.missed_day!,
    to: gap ? c.gap_to! : c.missed_day!,
    gap,
    /** The missed day's date (`YYYY-MM-DD`), or null for away days. */
    date: gap || c.missed_starts_at === null
      ? null
      : calendarDate({ starts_at: c.missed_starts_at, ends_at: c.missed_ends_at!, time_zone: c.missed_time_zone! }),
    /** The missed day's core quest and its ladder: what "injured" rests and "too hard" eases. */
    core: c.missed_core,
    ladder: c.missed_ladder,
    /** "just_didnt" while its recovery day runs; null until answered. */
    answer: c.answer,
    /** The quest Second Wind would redo with "I just didn't", or null. */
    secondWind: c.answer === null ? offers.secondWind : null,
    /** M7c: the day the recovery quest is on, while "I just didn't" waits for it to end; null before the answer. */
    recoveryDayId: c.recovery_day_id === null ? null : Number(c.recovery_day_id),
    /** M7c: what the pact did with "I just didn't", whether the Trial's session is done, the private note (decisions 4, 7, 8). */
    consequence: c.consequence,
    trialDone: c.trial_done_at !== null,
    note: c.note,
  };
}

/** M7a: the lighter plan one step down and whether it is offered now; null at the fewest minutes (decision 9). */
export function lighterPlanView(s: Snapshot): { from: number; to: number; offered: boolean } | null {
  const to = lighterMinutes(s.profile.minutes_per_day);
  if (to === null) return null;
  const events = checkinEvents(s.answered.map((a) => ({
    answer: a.answer, at: a.answered_at.getTime(), days: a.gap_from === null || a.gap_to === null ? 1 : a.gap_to - a.gap_from + 1,
  })));
  const answeredAt = s.profile.lighter_plan_at?.getTime() ?? null;
  return { from: s.profile.minutes_per_day, to, offered: lighterPlanOffered(events, s.readAt.getTime(), answeredAt) };
}

/**
 * The phone's copy of the player's state (the `lmu-sync` and `lmu-onboarding` responses), with today's offers (M6b) and
 * the history Character and Chronicle show (M6d).
 */
export function stateView(s: Snapshot, offers: DayOffers, history: History) {
  const character = characterView(s.character);
  const days = [...s.days].sort((a, b) => b.day_number - a.day_number);
  const today = days[0] ?? null;
  const questsOf = (day: DayRow) => s.instances.filter((q) => String(q.day_id) === String(day.id));
  const articleOf = (id: string | null) => {
    const found = id === null ? undefined : s.articles.find((a) => a.id === id);
    return found === undefined ? null : summaryOf(found);
  };
  const reader = { goals: s.profile.goals, classId: s.profile.class_id, insight: s.character.insight };
  const day = today === null ? null : { number: today.day_number, articleId: today.article_id, open: today.status === 'open' };
  return {
    profile: {
      name: s.profile.name, voice: s.profile.voice, classId: s.profile.class_id, classChangedAt: iso(s.profile.class_changed_at),
      timeZone: s.profile.time_zone,
      boundaryMinutes: s.profile.boundary_minutes, minutesPerDay: s.profile.minutes_per_day, difficulty: s.profile.difficulty,
      goals: s.profile.goals, limitations: s.profile.limitations, gentleStart: s.profile.gentle_start, ownProgram: s.profile.own_program,
      equipment: s.profile.equipment, programStyle: s.profile.program_style,
      trainingPlan: s.profile.training_plan, programDays: s.profile.program_days, // M15
      book: s.profile.book, bookStartedAt: iso(s.profile.book_started_at), booksFinished: s.profile.books_finished,
      reveal: s.profile.reveal, accountabilityLevel: s.profile.accountability_level,
      /** M7c: when the current pact level was signed: only days that start after it count (decision 2). */
      accountabilityFrom: iso(s.profile.accountability_enabled_at),
    },
    character,
    today: today === null ? null : {
      id: Number(today.id), dayNumber: today.day_number, startsAt: iso(today.starts_at), endsAt: iso(today.ends_at),
      timeZone: today.time_zone, budget: today.budget, light: today.light, hardDay: today.hard_day, protection: today.protection,
      status: today.status,
      article: articleOf(today.article_id),
      swapsLeft: offers.swapsLeft, restAllowed: offers.restAllowed, restTomorrow: offers.restTomorrow, abilities: offers.abilities,
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
    /** M7a: the check-in waiting for an answer, or held after "I just didn't" until its day ends (decisions 3–4). */
    checkin: s.checkin === null ? null : checkinView(s.checkin, offers),
    /** M7a: the latest settled "I just didn't", shown once by the phone. */
    checkinResult: s.result === null ? null : { id: Number(s.result.id), outcome: s.result.outcome },
    /** M7a: the lighter plan (decision 9). */
    lighterPlan: lighterPlanView(s),
    /** M8b: what the next day would read, as of now: the phone's offline day takes it (decision 4). */
    nextArticle: day === null || !day.open ? null : nextArticle(s.articles, reader, day),
    /** M8b: the latest readings, newest first, with the player's takeaway (decision 7). */
    readings: readingsView(history.readings),
    /** M8b: Insight's options and choice for a Mage from level 5 on an open day, else null (decision 8). */
    insight: insightView(s.articles, { ...reader, level: character.level }, day),
    recentDays: days.slice(1).map((d) => ({
      dayNumber: d.day_number, startsAt: iso(d.starts_at), status: d.status, resolution: d.resolution,
      cleared: questsOf(d).filter((q) => q.completed_at !== null).length,
    })),
    /** In earned order, oldest first (M6d decision 6). */
    achievements: [...s.earned],
    /** Ladders, or standalone exercise quests, resting after pain. */
    paused: s.ladders.filter((l) => l.state.paused).map((l) => l.ladder_id).sort(),
    painReports: s.painReports,
    /** M6d: the last CALENDAR_DAYS days, newest first. */
    calendar: history.days.map((d) => ({
      dayNumber: d.day_number, date: calendarDate(d), mark: calendarMark(d),
    })),
    growth: growthOf(s.character, character, history),
    /** Scholar's Path: sessions and minutes with the current book, or null without one. */
    reading: s.profile.book === null ? null : history.reading,
    /** M6e: what the phone needs to build the next day offline (rules: buildDay) — every ladder's state by id, each recent
     * day's final template per slot (oldest first) and the workouts done. */
    ladders: ladderMap(s.ladders),
    history: pastDays(s.days, s.instances),
    workoutsDone: s.workoutsDone,
    /** M15: the weekly workouts done in the current run, for the phone's offline day. */
    programDone: s.programDone,
    /** M13: whether the player is Plus, decided here from the stored grants (decision 1). */
    plus: plusView(s.entitlements, s.readAt),
    /** M13: the all-time stat chart, for Plus only (null otherwise). */
    statWeeks: history.statWeeks,
  };
}
