import { DAY_MS, DISCIPLINE_PER_CORE_DAY, RUNG_BONUS_XP } from './constants.ts';
import { newLadder, recordCompletion } from './ladder.ts';
import type { LadderState } from './ladder.ts';
import { LEVEL_CURVE, cumulativeXpForLevel } from './levels.ts';
import type { LevelCurve } from './levels.ts';
import { applyDay, isStreakDay, newStreak, resolveCheckin } from './streak.ts';
import type { Tier } from './types.ts';
import { questXp } from './xp.ts';

/** Share of quests each kind of player completes (spec §2). */
export const PACING_PROFILES = { steady: 0.9, typical: 0.7, struggling: 0.4 } as const;

export type PacingTarget = { profile: 'steady' | 'struggling'; level: number; minDay: number; maxDay: number };

/** Spec §2.3 targets, widened by the ±20 % tolerance. "About 2½–3 months" is read as days 75–90. */
export const PACING_TARGETS: readonly PacingTarget[] = [
  { profile: 'steady', level: 2, minDay: 1, maxDay: 1.2 },
  { profile: 'steady', level: 5, minDay: 5.6, maxDay: 8.4 },
  { profile: 'steady', level: 10, minDay: 16.8, maxDay: 25.2 },
  { profile: 'steady', level: 15, minDay: 33.6, maxDay: 50.4 },
  { profile: 'steady', level: 20, minDay: 60, maxDay: 108 },
  { profile: 'struggling', level: 2, minDay: 1, maxDay: 2.4 },
  { profile: 'struggling', level: 5, minDay: 11.2, maxDay: 16.8 },
  { profile: 'struggling', level: 10, minDay: 32, maxDay: 48 },
];

export const PACING_LEVELS: readonly number[] = [2, 5, 10, 15, 20];

/** Small seeded random number generator, so every run of the simulation gives the same numbers. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SimulatedQuest = { tier: Tier; ladder: string | null; isCore: boolean };

function simulatedDay(day: number): SimulatedQuest[] {
  const light = day === 1;
  return [
    { tier: light ? 'minor' : 'standard', ladder: `core-${day % 3}`, isCore: true },
    { tier: light ? 'minor' : 'standard', ladder: `side1-${day % 2}`, isCore: false },
    { tier: 'minor', ladder: `side2-${day % 2}`, isCore: false },
    { tier: 'minor', ladder: null, isCore: false },
  ];
}

function simulateRun(rate: number, seed: number, days: number, curve: LevelCurve, levels: readonly number[]): Map<number, number> {
  const random = mulberry32(seed);
  const ladders = new Map<string, LadderState>();
  const reached = new Map<number, number>();
  let streak = newStreak();
  let xp = 0;

  for (let day = 1; day <= days; day++) {
    const at = (day - 1) * DAY_MS;
    let done = 0;
    let coreDone = false;
    for (const quest of simulatedDay(day)) {
      if (random() >= rate) continue;
      done++;
      xp += questXp(quest.tier);
      if (quest.isCore) coreDone = true;
      if (quest.ladder) {
        const ladder = ladders.get(quest.ladder) ?? newLadder();
        const change = recordCompletion(ladder, { at, rung: ladder.rung, rating: 'right', difficulty: 'steady', maxRung: 99 });
        ladders.set(quest.ladder, change.state);
        if (change.newHighestRung) xp += RUNG_BONUS_XP;
      }
    }
    if (coreDone) xp += DISCIPLINE_PER_CORE_DAY;
    // A day that isn't a streak day is answered "I just didn't" and the recovery quest is skipped.
    const closed = applyDay(streak, isStreakDay({ coreDone, questsDone: done }) ? { kind: 'streak_day' } : { kind: 'awaiting_checkin' });
    const change = closed.state.awaitingCheckin
      ? resolveCheckin(closed.state, { kind: 'miss', recovered: false, shieldWaived: false })
      : closed;
    streak = change.state;
    xp += change.milestoneXp;
    for (const level of levels) {
      if (!reached.has(level) && xp >= cumulativeXpForLevel(level, curve)) reached.set(level, day);
    }
  }
  return reached;
}

export type PacingOptions = { runs?: number; days?: number; curve?: LevelCurve; levels?: readonly number[] };

/** Mean day on which each level is reached over `runs` seeded runs; null if any run never reached it. */
export function simulatePacing(rate: number, options: PacingOptions = {}): Record<number, number | null> {
  const { runs = 200, days = 150, curve = LEVEL_CURVE, levels = PACING_LEVELS } = options;
  const totals = new Map<number, number>();
  const unreached = new Set<number>();
  for (let seed = 1; seed <= runs; seed++) {
    const reached = simulateRun(rate, seed, days, curve, levels);
    for (const level of levels) {
      const day = reached.get(level);
      if (day === undefined) unreached.add(level);
      else totals.set(level, (totals.get(level) ?? 0) + day);
    }
  }
  const result: Record<number, number | null> = {};
  for (const level of levels) result[level] = unreached.has(level) ? null : (totals.get(level) ?? 0) / runs;
  return result;
}

export function meetsTargets(curve: LevelCurve = LEVEL_CURVE): boolean {
  const results = {
    steady: simulatePacing(PACING_PROFILES.steady, { curve }),
    struggling: simulatePacing(PACING_PROFILES.struggling, { curve }),
  };
  return PACING_TARGETS.every((target) => {
    const day = results[target.profile][target.level];
    return day != null && day >= target.minDay && day <= target.maxDay;
  });
}
