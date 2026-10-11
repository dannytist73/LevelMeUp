import { CLASSES, DAY_MS, DISCIPLINE_PER_CORE_DAY, RUNG_BONUS_XP, STAT_XP_DIVISOR } from './constants.ts';
import { buildDay } from './day.ts';
import type { PastDay } from './day.ts';
import { newLadder, recordCompletion, recordMiss } from './ladder.ts';
import type { LadderState } from './ladder.ts';
import { maxRungFor } from './library.ts';
import type { PlayerProfile, QuestLibrary } from './library.ts';
import { LEVEL_CURVE, cumulativeXpForLevel, levelForXp } from './levels.ts';
import type { LevelCurve } from './levels.ts';
import { PACING_LEVELS, PACING_PROFILES, PACING_TARGETS, mulberry32 } from './simulation.ts';
import { startingStats, statPoints } from './stats.ts';
import { applyDay, closedDayResolution, newStreak, resolveCheckin } from './streak.ts';
import type { ClassId, Difficulty, Goal, Slot, Stat, StatMap } from './types.ts';

export type Persona = { name: string; classId: ClassId; goals: readonly Goal[]; minutesPerDay: number; difficulty: Difficulty };

/** One persona per class, at the onboarding defaults (25 minutes, steady). */
export const PERSONAS: readonly Persona[] = [
  { name: 'warrior', classId: 'warrior', goals: ['body', 'energy'], minutesPerDay: 25, difficulty: 'steady' },
  { name: 'mage', classId: 'mage', goals: ['learn', 'focus'], minutesPerDay: 25, difficulty: 'steady' },
  { name: 'rogue', classId: 'rogue', goals: ['focus', 'routine'], minutesPerDay: 25, difficulty: 'steady' },
  { name: 'monk', classId: 'monk', goals: ['energy', 'routine'], minutesPerDay: 25, difficulty: 'steady' },
];

/** Every persona's onboarding estimates; `startingStats` adds the class bonus. */
export const PERSONA_ESTIMATES: StatMap = { strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: 4 };

/**
 * Spec §2.1: about rank C (15 points) in the main stat after 3 months of steady play, judged on the average class
 * (owner's decision, M2): ±20 % gives days 72–108 for the mean over the personas. Classes train their main stat at
 * different rates by design (the daily article also trains Wisdom), so each persona only has to land between
 * 6 weeks and 5 months.
 */
export const RANK_TARGET = { points: 15, meanMinDay: 72, meanMaxDay: 108, eachMinDay: 42, eachMaxDay: 150 } as const;

export type CampaignOptions = {
  runs?: number;
  days?: number;
  curve?: LevelCurve;
  divisor?: number;
  /** Ladders above rung 0 on day 1 (onboarding's starting rungs, M5); none by default. */
  startLadders?: (persona: Persona) => Record<string, LadderState>;
};
export type CampaignResult = { levels: Record<number, number | null>; rankDay: number | null };

type Run = { levelDay: Map<number, number>; rankDay: number | null };

function runCampaign(
  library: QuestLibrary, persona: Persona, rate: number, seed: number, days: number, curve: LevelCurve, divisor: number,
  startLadders: Readonly<Record<string, LadderState>>,
): Run {
  const random = mulberry32(seed);
  const start = startingStats(PERSONA_ESTIMATES, persona.classId);
  const statXp: Record<Stat, number> = { strength: 0, vitality: 0, wisdom: 0, focus: 0, discipline: 0 };
  const points = (stat: Stat): number => statPoints(start[stat], statXp[stat], divisor);
  const total = (): number => Object.values(statXp).reduce((sum, xp) => sum + xp, 0);
  const ladders: Record<string, LadderState> = { ...startLadders };
  const history: PastDay[] = [];
  const levelDay = new Map<number, number>();
  const main = CLASSES[persona.classId].main;
  let rankDay: number | null = null;
  let streak = newStreak();

  for (let day = 1; day <= days; day++) {
    const at = (day - 1) * DAY_MS;
    const profile: PlayerProfile = {
      classId: persona.classId,
      level: levelForXp(total(), curve),
      goals: persona.goals,
      minutesPerDay: persona.minutesPerDay,
      difficulty: persona.difficulty,
      limitations: [],
      gentleStart: false,
      ownProgram: false,
      equipment: [],
      programStyle: 'none',
      stats: { strength: points('strength'), vitality: points('vitality'), wisdom: points('wisdom'), focus: points('focus') },
      book: null,
    };
    const built = buildDay(library, { dayNumber: day, profile, ladders, history: history.slice(-7), light: false, workoutsDone: 0, articleId: null });
    let done = 0;
    let coreDone = false;
    for (const quest of built.quests) {
      const cleared = random() < rate;
      if (cleared) {
        done++;
        if (quest.slot === 'core') coreDone = true;
        for (const [stat, xp] of Object.entries(quest.xp)) statXp[stat as Stat] += xp ?? 0;
      }
      if (quest.ladder === null || quest.rung === null) continue;
      const state = ladders[quest.ladder] ?? newLadder();
      if (cleared) {
        const maxRung = maxRungFor(library, quest.ladder, profile);
        const change = recordCompletion(state, { at, rung: quest.rung, rating: 'right', difficulty: persona.difficulty, maxRung });
        ladders[quest.ladder] = change.state;
        if (change.newHighestRung) statXp[quest.stat] += RUNG_BONUS_XP;
      } else {
        ladders[quest.ladder] = recordMiss(state, { at, rung: quest.rung }).state;
      }
    }
    history.push({ dayNumber: day, quests: Object.fromEntries(built.quests.map((q) => [q.slot, q.templateId])) as Partial<Record<Slot, string>> });
    if (coreDone) statXp.discipline += DISCIPLINE_PER_CORE_DAY;
    // A day that isn't a streak day is answered "I just didn't" and the recovery quest is skipped, as in M1's model.
    const closed = applyDay(streak, closedDayResolution({ coreDone, questsDone: done, protection: null }));
    const change = closed.state.awaitingCheckin ? resolveCheckin(closed.state, { kind: 'miss', recovered: false, shieldWaived: false }) : closed;
    streak = change.state;
    statXp.discipline += change.milestoneXp;
    for (const level of PACING_LEVELS) {
      if (!levelDay.has(level) && total() >= cumulativeXpForLevel(level, curve)) levelDay.set(level, day);
    }
    if (rankDay === null && points(main) >= RANK_TARGET.points) rankDay = day;
  }
  return { levelDay, rankDay };
}

/**
 * Mean day each level (and the main stat's rank C) is reached over `runs` seeded runs; null if any run never does.
 * The default 180 days runs past the slowest class's rank C.
 */
export function campaignPacing(library: QuestLibrary, persona: Persona, rate: number, options: CampaignOptions = {}): CampaignResult {
  const { runs = 200, days = 180, curve = LEVEL_CURVE, divisor = STAT_XP_DIVISOR, startLadders } = options;
  const start = startLadders?.(persona) ?? {};
  const totals = new Map<number, number>();
  const unreached = new Set<number>();
  let rankTotal = 0;
  let rankMissed = false;
  for (let seed = 1; seed <= runs; seed++) {
    const run = runCampaign(library, persona, rate, seed, days, curve, divisor, start);
    for (const level of PACING_LEVELS) {
      const day = run.levelDay.get(level);
      if (day === undefined) unreached.add(level);
      else totals.set(level, (totals.get(level) ?? 0) + day);
    }
    if (run.rankDay === null) rankMissed = true;
    else rankTotal += run.rankDay;
  }
  const levels: Record<number, number | null> = {};
  for (const level of PACING_LEVELS) levels[level] = unreached.has(level) ? null : (totals.get(level) ?? 0) / runs;
  return { levels, rankDay: rankMissed ? null : rankTotal / runs };
}

/** Every pacing target (spec §2.3) and the rank target (spec §2.1) the personas miss; empty when all are met. */
export function campaignFailures(library: QuestLibrary, options: CampaignOptions = {}): string[] {
  const failures: string[] = [];
  const rankDays: number[] = [];
  for (const persona of PERSONAS) {
    const results = {
      steady: campaignPacing(library, persona, PACING_PROFILES.steady, options),
      struggling: campaignPacing(library, persona, PACING_PROFILES.struggling, options),
    };
    for (const target of PACING_TARGETS) {
      const day = results[target.profile].levels[target.level];
      if (day == null || day < target.minDay || day > target.maxDay) {
        failures.push(`${persona.name} ${target.profile} level ${target.level}: day ${day?.toFixed(1) ?? 'never'} (target ${target.minDay}–${target.maxDay})`);
      }
    }
    const rankDay = results.steady.rankDay;
    if (rankDay === null || rankDay < RANK_TARGET.eachMinDay || rankDay > RANK_TARGET.eachMaxDay) {
      failures.push(`${persona.name} steady rank C: day ${rankDay?.toFixed(1) ?? 'never'} (target ${RANK_TARGET.eachMinDay}–${RANK_TARGET.eachMaxDay})`);
    }
    if (rankDay !== null) rankDays.push(rankDay);
  }
  if (rankDays.length === PERSONAS.length) {
    const mean = rankDays.reduce((sum, day) => sum + day, 0) / rankDays.length;
    if (mean < RANK_TARGET.meanMinDay || mean > RANK_TARGET.meanMaxDay) {
      failures.push(`mean rank C day ${mean.toFixed(1)} (target ${RANK_TARGET.meanMinDay}–${RANK_TARGET.meanMaxDay})`);
    }
  }
  return failures;
}
