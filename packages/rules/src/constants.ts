import type { ClassId, Difficulty, Goal, Limitation, Rank, Stat, Tier, TrainableStat } from './types.ts';

export const STATS: readonly Stat[] = ['strength', 'vitality', 'wisdom', 'focus', 'discipline'];

// XP (spec §2.2)
export const XP_BY_TIER: Readonly<Record<Tier, number>> = { minor: 10, standard: 20, major: 30 };
export const HARD_DAY_MIN_XP = 5;
export const RUNG_BONUS_XP = 15;

// Levels (spec §2.3): XP from level L to L+1 = LEVEL_BASE + LEVEL_STEP × (L − 1).
// M1's simplified pacing model tuned LEVEL_STEP to 32; M2's campaign on real built days (campaign.ts) showed real
// days earn less and brought it back to the spec's 20.
export const LEVEL_BASE = 30;
export const LEVEL_STEP = 20;

// Stats and ranks (spec §2.1)
export const START_STAT_MIN = 3;
export const START_STAT_MAX = 8;
export const CLASS_MAIN_STAT_BONUS = 2;
export const STAT_XP_DIVISOR = 10;
/** Lowest stat points for each rank, highest rank first. */
export const RANK_FLOORS: ReadonlyArray<readonly [Rank, number]> = [
  ['S', 60],
  ['A', 40],
  ['B', 25],
  ['C', 15],
  ['D', 10],
  ['E', 0],
];

// Classes (spec §2.5)
export const CLASSES: Readonly<Record<ClassId, { main: TrainableStat; second: TrainableStat }>> = {
  warrior: { main: 'strength', second: 'vitality' },
  mage: { main: 'wisdom', second: 'focus' },
  rogue: { main: 'focus', second: 'vitality' },
  monk: { main: 'vitality', second: 'wisdom' },
};

// Discipline and streaks (spec §2.1, §2.4)
export const DISCIPLINE_PER_CORE_DAY = 5;
export const DISCIPLINE_PER_RECOVERY = 5;
export const STREAK_MILESTONES: Readonly<Record<number, number>> = { 7: 20, 14: 30, 30: 50, 66: 80, 100: 100 };
export const SHIELD_EVERY_STREAK_DAYS = 7;
export const MAX_SHIELDS = 2;

// Time (spec §3.6, §3.8)
export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const MIN_DAY_MS = 20 * HOUR_MS;
export const MAX_DAY_MS = 28 * HOUR_MS;
export const FIRST_DAY_MIN_MS = 6 * HOUR_MS;
export const LATE_SYNC_MS = 48 * HOUR_MS;
export const CLOCK_SKEW_MS = 5 * MINUTE_MS;
export const DEFAULT_BOUNDARY_MINUTES = 4 * 60;

// Ladders (spec §3.3)
export const STEP_UP_BAR: Readonly<Record<Difficulty, number>> = { gentle: 4, steady: 3, hard: 2 };
export const STEP_UP_WINDOW_MS = 14 * DAY_MS;
export const STEP_UP_EASY_COUNT = 2;
export const MIN_MS_BETWEEN_STEP_UPS = 7 * DAY_MS;
export const MISSES_FOR_STEP_DOWN = 2;
export const MISS_WINDOW_MS = 7 * DAY_MS;
export const REENTRY_AWAY_MS = 5 * DAY_MS;

// Fair failure and accountability (spec §3.7, §4.3)
export const LIGHTER_PLAN_WINDOW_MS = 14 * DAY_MS;
export const LIGHTER_PLAN_THRESHOLD = 3;
export const CONSEQUENCE_WINDOW_MS = 7 * DAY_MS;
export const CONSEQUENCE_PAUSE_THRESHOLD = 3;

// Timers (spec §3.6, §4.3)
export const TIMER_COMPLETE_FRACTION = 0.8;
export const TRIAL_FOCUS_MS = 10 * MINUTE_MS;

// Building a day (spec §3.2, §3.5)
export const TRAINABLE_STATS: readonly TrainableStat[] = ['strength', 'vitality', 'wisdom', 'focus'];
export const GOALS: readonly Goal[] = ['body', 'energy', 'learn', 'focus', 'routine'];
export const MAX_GOALS = 2;
export const LIMITATIONS: readonly Limitation[] = ['knee', 'back', 'shoulder', 'wrist'];
/** The minutes a day a player can choose (onboarding board 5). */
export const MINUTES_OPTIONS: readonly number[] = [10, 15, 25, 40];
/** Minutes kept free for each side quest; the library always has quests this short. */
export const MIN_SIDE_MINUTES = 2;
/** The budget on light days: day 1, the first day back after time away, the day after a sick or injured check-in. */
export const LIGHT_DAY_MINUTES = 10;
/** The core quest's 7-day pattern (spec §2.5): main stat 4 days, second stat 2, the weakest stat 1. */
export const CORE_MIX: readonly ('main' | 'second' | 'balance')[] = ['main', 'second', 'main', 'balance', 'main', 'second', 'main'];
/** Same-stat alternatives a swap offers, plus one balance quest. */
export const SWAP_SAME_STAT_CHOICES = 2;
/** Planned rest days allowed in any 7 consecutive quest days. */
export const REST_DAYS_PER_WEEK = 2;
/** Weekly and monthly limits count quest days, so DST and travel can't shift them. */
export const WEEK_QUEST_DAYS = 7;
export const MONTH_QUEST_DAYS = 30;
/**
 * Least minutes for each effort tier (spec §2.2: standard 10–20, major 25–45, with a little slack). A minor quest can
 * take longer when it is very easy.
 */
export const TIER_MIN_MINUTES: Readonly<Record<Tier, number>> = { minor: 0, standard: 8, major: 23 };
