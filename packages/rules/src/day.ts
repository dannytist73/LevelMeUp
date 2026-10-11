import { abilityUnlocked } from './abilities.ts';
import { CLASSES, CORE_MIX, DISCIPLINE_PER_RECOVERY, LIGHT_DAY_MINUTES, MIN_SIDE_MINUTES, TRAINABLE_STATS } from './constants.ts';
import { newLadder } from './ladder.ts';
import type { LadderState } from './ladder.ts';
import {
  allowedTopRung, coreAllowance, effectiveRung, findTemplate, ladderAllowed, ladderById, ladderExercise, ladderRungs,
  specialTemplate, templateAllowed, validateProfile,
} from './library.ts';
import type { Ladder, PlayerProfile, QuestLibrary, QuestTemplate } from './library.ts';
import type { Goal, Slot, Stat, Tier, TrainableStat } from './types.ts';
import { isWorkout, planWorkout, sessionMinutes } from './workout.ts';
import type { PlannedMove } from './workout.ts';
import { questXp, splitXp } from './xp.ts';
import type { XpByStat } from './xp.ts';

/** Why a quest was picked (spec §3.2: every card shows it). Content turns it into words in the player's voice. */
export type WhyReason =
  | { code: 'class_main' | 'class_second' | 'balance'; stat: TrainableStat }
  | { code: 'goal'; goal: Goal }
  | { code: 'unlocked'; previous: string }
  /** `minutes`: the day's budget, which is 10 on a light day. */
  | { code: 'short_on_time'; minutes: number }
  | {
      code:
        | 'after_strength' | 'stepped_down' | 'gentle_start' | 'limits' | 'light_day' | 'own_program'
        | 'swap' | 'stillness' | 'dawn_ritual' | 'recovery' | 'second_wind' | 'pain' | 'article';
    };

export type WhyCode = WhyReason['code'];

export const WHY_CODES: readonly WhyCode[] = [
  'class_main', 'class_second', 'balance', 'goal', 'unlocked', 'after_strength', 'stepped_down', 'gentle_start', 'limits',
  'short_on_time', 'light_day', 'own_program', 'swap', 'stillness', 'dawn_ritual', 'recovery', 'second_wind', 'pain', 'article',
];

/** One quest of a day, ready to store. The reward is a snapshot from the rules tables (architecture §3). */
export type QuestDraft = {
  slot: Slot;
  templateId: string;
  ladder: string | null;
  rung: number | null;
  stat: Stat;
  tier: Tier;
  /** Minutes of the version in use (the hard-day version on a hard day). */
  minutes: number;
  hardDay: boolean;
  xp: XpByStat;
  why: WhyReason;
  /** Scholar's Path: the book a reading quest tracks. */
  book: string | null;
  /** A workout's planned exercises (M6c decision 8); null for every other quest. */
  moves: readonly PlannedMove[] | null;
};

export type BuiltDay = {
  dayNumber: number;
  /** Minutes the core and side quests may take (10 on a light day). */
  budget: number;
  light: boolean;
  hardDay: boolean;
  articleId: string | null;
  /** Core, side1, side2 and the article, then the recovery quest when one is owed. */
  quests: readonly QuestDraft[];
};

/** A recent day: each slot's final template, after any swap, Stillness, Dawn Ritual or Second Wind. */
export type PastDay = { dayNumber: number; quests: Readonly<Partial<Record<Slot, string>>> };

export type DayInput = {
  /** 1 for the day onboarding ends, counting every quest day since (away days included). */
  dayNumber: number;
  profile: PlayerProfile;
  /**
   * Ladder states by ladder id; a ladder not listed starts at rung 0. A standalone exercise quest resting after pain is
   * listed by its template id (only `paused` matters for it).
   */
  ladders: Readonly<Record<string, LadderState>>;
  /** The last 7 days or so; older days and unknown templates are ignored. */
  history: readonly PastDay[];
  /** The first day back after 5+ days away, or the day after a sick or injured check-in. Day 1 is always light. */
  light: boolean;
  /** Workouts completed so far (M6c): a new workout follows the program's next day; a missed one repeats. */
  workoutsDone: number;
  articleId: string | null;
};

/** The reward snapshot: the tier's XP (halved on a hard day), split if the template says so. */
export function questReward(template: QuestTemplate, hardDay: boolean): XpByStat {
  if (template.role === 'recovery') return { discipline: DISCIPLINE_PER_RECOVERY };
  return splitXp(questXp(template.tier, { hardDay }), template.stat, template.split ?? undefined);
}

/** A quest for a slot. The article and recovery quests have no hard-day version; a workout needs its exercises. */
export function draftQuest(
  template: QuestTemplate,
  slot: Slot,
  why: WhyReason,
  options: { hardDay?: boolean; book?: string | null; moves?: readonly PlannedMove[] | null } = {},
): QuestDraft {
  const hardDay = options.hardDay === true && template.role !== 'article' && template.role !== 'recovery';
  const moves = options.moves ?? null;
  if (isWorkout(template) !== (moves !== null)) {
    throw new RangeError(isWorkout(template) ? `${template.id} needs its planned exercises` : `${template.id} is not a workout`);
  }
  return {
    slot,
    templateId: template.id,
    ladder: template.ladder,
    rung: template.rung,
    stat: template.stat,
    tier: template.tier,
    minutes: moves !== null ? sessionMinutes(template, moves, hardDay) : hardDay ? template.hardDay.minutes : template.minutes,
    hardDay,
    xp: questReward(template, hardDay),
    why,
    book: options.book ?? null,
    moves,
  };
}

/** The day's budget for core and side quests: 10 minutes on a light day. */
export function dayBudget(input: DayInput): number {
  const light = input.light || input.dayNumber === 1;
  return light ? Math.min(LIGHT_DAY_MINUTES, input.profile.minutesPerDay) : input.profile.minutesPerDay;
}

/** What a day's choices depend on beyond the profile: recent use and yesterday's strength work. */
export type DayContext = {
  library: QuestLibrary;
  input: DayInput;
  /** The last day each ladder (or standalone template) was built. */
  lastUsed: ReadonlyMap<string, number>;
  /** Strength ladders built yesterday: the same strength pattern never comes two days running. */
  strengthYesterday: ReadonlySet<string>;
  /** Yesterday's core (or Second Wind) was strength work, so today's core is walking or mobility. */
  afterStrength: boolean;
};

export type Candidate = { template: QuestTemplate; state: LadderState | null; capped: 'limits' | 'time' | null };

export type Choice = { candidate: Candidate; reason: WhyReason };

/** A ladder is used once a day; a standalone template by its own id. */
export function useKey(template: QuestTemplate): string {
  return template.ladder ?? template.id;
}

export function dayContext(library: QuestLibrary, input: DayInput): DayContext {
  if (!Number.isInteger(input.dayNumber) || input.dayNumber < 1) {
    throw new RangeError(`dayNumber must be an integer of at least 1, got ${input.dayNumber}`);
  }
  if (!Number.isInteger(input.workoutsDone) || input.workoutsDone < 0) {
    throw new RangeError(`workoutsDone must be a whole number, got ${input.workoutsDone}`);
  }
  validateProfile(input.profile);
  const lastUsed = new Map<string, number>();
  const strengthYesterday = new Set<string>();
  let afterStrength = false;
  for (const past of input.history) {
    if (past.dayNumber >= input.dayNumber) continue;
    for (const [slot, id] of Object.entries(past.quests)) {
      // History can outlive the content: a retired template is simply skipped.
      const template = id === undefined ? undefined : findTemplate(library, id);
      if (!template) continue;
      const key = useKey(template);
      lastUsed.set(key, Math.max(lastUsed.get(key) ?? 0, past.dayNumber));
      if (past.dayNumber === input.dayNumber - 1 && template.exercise === 'strength') {
        if (template.ladder !== null) strengthYesterday.add(template.ladder);
        // A workout trains the whole body, so every strength ladder rests the next day (M6c decision 7).
        if (isWorkout(template)) for (const l of library.ladders) if (l.stat === 'strength') strengthYesterday.add(l.id);
        if (slot === 'core' || slot === 'recovery') afterStrength = true;
      }
    }
  }
  return { library, input, lastUsed, strengthYesterday, afterStrength };
}

/** Least recently built first (never built counts as day 0); ties keep library order. */
function leastRecent(ctx: DayContext, candidates: Candidate[]): Candidate[] {
  const last = (c: Candidate): number => ctx.lastUsed.get(useKey(c.template)) ?? 0;
  return candidates.sort((a, b) => last(a) - last(b));
}

/** Every ladder in `ladders` that can give a quest of at most `allowance` minutes today. */
export function ladderCandidates(ctx: DayContext, ladders: readonly Ladder[], allowance: number, used: ReadonlySet<string>): Candidate[] {
  const { library, input } = ctx;
  const candidates: Candidate[] = [];
  for (const ladder of ladders) {
    if (used.has(ladder.id) || ctx.strengthYesterday.has(ladder.id) || !ladderAllowed(ladder, input.profile)) continue;
    const state = input.ladders[ladder.id] ?? newLadder();
    if (state.paused) continue;
    const rung = effectiveRung(library, ladder.id, input.profile, state, allowance);
    if (rung < 0) continue;
    const template = ladderRungs(library, ladder.id)[rung]!;
    // A workout needs at least two exercises the player can do today (decision 5).
    if (isWorkout(template) && movesFor(ctx, template) === null) continue;
    const capped = rung === state.rung ? null : allowedTopRung(library, ladder.id, input.profile) < state.rung ? 'limits' : 'time';
    candidates.push({ template, state, capped });
  }
  return leastRecent(ctx, candidates);
}

/** Tiny standalone quests of `stat` that fit (never one resting after pain). */
export function microCandidates(ctx: DayContext, stat: Stat, allowance: number, used: ReadonlySet<string>): Candidate[] {
  const candidates = ctx.library.templates
    .filter((t) => t.role === 'micro' && t.stat === stat && t.minutes <= allowance && !used.has(t.id) && !ctx.input.ladders[t.id]?.paused)
    .filter((t) => templateAllowed(t, ctx.input.profile))
    .map((template): Candidate => ({ template, state: null, capped: null }));
  return leastRecent(ctx, candidates);
}

/** Trainable stats from fewest points to most; ties keep the fixed stat order. */
export function statsByWeakest(stats: Readonly<Record<TrainableStat, number>>): TrainableStat[] {
  return [...TRAINABLE_STATS].sort((a, b) => stats[a] - stats[b]);
}

/** Scholar's Path: the player's book, on quests of a ladder that tracks it. */
export function bookFor(ctx: DayContext, template: QuestTemplate): string | null {
  const { profile } = ctx.input;
  if (template.ladder === null || profile.book === null || !ladderById(ctx.library, template.ladder).tracksBook) return null;
  return abilityUnlocked('scholars_path', profile.classId, profile.level) ? profile.book : null;
}

/**
 * No movement twice in a day (M6c review): what a strength quest keeps out of the day's other slots (ladder ids and
 * standalone template ids, as `useKey` names them). A workout keeps out the strength ladders whose movement it trains
 * and the small strength quests; any other strength quest keeps out the workouts (their plan isn't known yet).
 */
export function keptOutBy(library: QuestLibrary, template: QuestTemplate, moves: readonly PlannedMove[] | null): string[] {
  if (template.exercise !== 'strength') return [];
  const isWorkoutLadder = (id: string): boolean => {
    const first = ladderRungs(library, id)[0];
    return first !== undefined && isWorkout(first);
  };
  if (!isWorkout(template)) return library.ladders.filter((l) => isWorkoutLadder(l.id)).map((l) => l.id);
  const trained = new Set((moves ?? []).map((m) => library.training.moves.find((x) => x.id === m.move)?.pattern));
  return [
    ...library.ladders.filter((l) => l.pattern !== undefined && trained.has(l.pattern)).map((l) => l.id),
    ...library.templates.filter((t) => t.role === 'micro' && t.exercise === 'strength').map((t) => t.id),
  ];
}

/** A workout's exercises for this player today (decision 5); null for other quests, or when too few fit. */
export function movesFor(ctx: DayContext, template: QuestTemplate): PlannedMove[] | null {
  return isWorkout(template) ? planWorkout(ctx.library.training, template, ctx.input.profile, ctx.input.workoutsDone) : null;
}

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const laddersOf = (ctx: DayContext, stat: Stat): Ladder[] => ctx.library.ladders.filter((l) => l.stat === stat);

function chooseCore(ctx: DayContext, budget: number, used: ReadonlySet<string>): Choice {
  const { classId } = ctx.input.profile;
  const { main, second } = CLASSES[classId];
  const weakest = statsByWeakest(ctx.input.profile.stats);
  const mix = CORE_MIX[(ctx.input.dayNumber - 1) % CORE_MIX.length];
  const target = mix === 'main' ? main : mix === 'second' ? second : weakest[0]!;
  const allowance = coreAllowance(budget);
  const reasonFor = (stat: TrainableStat): WhyReason => ({
    code: stat === main ? 'class_main' : stat === second ? 'class_second' : 'balance',
    stat,
  });

  // The day after a strength core never has another: where the pattern asks for strength, walk or stretch instead.
  if (ctx.afterStrength && target === 'strength') {
    const easyOnMuscles = ctx.library.ladders.filter((l) => {
      const exercise = ladderExercise(ctx.library, l.id);
      return exercise === 'walk' || exercise === 'mobility';
    });
    const candidate = ladderCandidates(ctx, easyOnMuscles, allowance, used)[0];
    if (candidate) return { candidate, reason: { code: 'after_strength' } };
  }
  const order = unique([target, second, main, ...weakest]).filter((s) => !(ctx.afterStrength && s === 'strength'));
  for (const stat of order) {
    const ladders = laddersOf(ctx, stat);
    const preferred = ladders.filter((l) => l.affinity.includes(classId));
    const candidate = ladderCandidates(ctx, preferred, allowance, used)[0] ?? ladderCandidates(ctx, ladders, allowance, used)[0];
    if (candidate) return { candidate, reason: reasonFor(stat) };
  }
  for (const stat of order) {
    const candidate = microCandidates(ctx, stat, allowance, used)[0];
    if (candidate) return { candidate, reason: reasonFor(stat) };
  }
  throw new Error('the quest library has no core quest for this player');
}

/** The weakest stat first, stats already in the day last; a ladder quest, else a tiny one. Null when nothing fits. */
export function balanceChoice(
  ctx: DayContext,
  allowance: number,
  used: ReadonlySet<string>,
  avoid: readonly Stat[],
  options: { noStrength?: boolean } = {},
): Choice | null {
  const weakest = statsByWeakest(ctx.input.profile.stats).filter((s) => !(options.noStrength && s === 'strength'));
  const order = [...weakest.filter((s) => !avoid.includes(s)), ...weakest.filter((s) => avoid.includes(s))];
  for (const stat of order) {
    const candidate = ladderCandidates(ctx, laddersOf(ctx, stat), allowance, used)[0] ?? microCandidates(ctx, stat, allowance, used)[0];
    if (candidate) return { candidate, reason: { code: 'balance', stat } };
  }
  return null;
}

function chooseBalance(ctx: DayContext, allowance: number, used: ReadonlySet<string>, avoid: readonly Stat[]): Choice {
  const choice = balanceChoice(ctx, allowance, used, avoid);
  if (!choice) throw new Error('the quest library has no side quest that fits');
  return choice;
}

function chooseGoalSide(ctx: DayContext, allowance: number, used: ReadonlySet<string>): Choice {
  const { goals } = ctx.input.profile;
  // The goals take turns leading, so two goals share the side quest.
  const ordered = goals.map((_, i) => goals[(i + ctx.input.dayNumber) % goals.length]!);
  for (const goal of ordered) {
    const candidate = ladderCandidates(ctx, ctx.library.ladders.filter((l) => l.goals.includes(goal)), allowance, used)[0];
    if (candidate) return { candidate, reason: { code: 'goal', goal } };
  }
  for (const goal of ordered) {
    for (const stat of unique(ctx.library.ladders.filter((l) => l.goals.includes(goal)).map((l) => l.stat))) {
      const candidate = microCandidates(ctx, stat, allowance, used)[0];
      if (candidate) return { candidate, reason: { code: 'goal', goal } };
    }
  }
  return chooseBalance(ctx, allowance, used, []);
}

/** The reason a card shows: safety and adjustments first, then what the slot asked for. */
function explain(ctx: DayContext, slot: Slot, choice: Choice, light: boolean): WhyReason {
  const { template, state, capped } = choice.candidate;
  if (choice.reason.code === 'after_strength') return choice.reason;
  if (ctx.input.profile.gentleStart && template.exercise !== null) return { code: 'gentle_start' };
  if (slot === 'core' && light) return { code: 'light_day' };
  if (state !== null && template.ladder !== null && template.rung !== null) {
    if (capped === 'limits') return { code: 'limits' };
    if (capped === 'time') return { code: 'short_on_time', minutes: dayBudget(ctx.input) };
    if (template.rung > 0 && state.lastStepUpAt !== null && state.atRung.length === 0 && state.rung === state.highestRung) {
      return { code: 'unlocked', previous: ladderRungs(ctx.library, template.ladder)[template.rung - 1]!.id };
    }
    if (state.rung < state.highestRung) return { code: 'stepped_down' };
    if (ladderById(ctx.library, template.ladder).ownProgram) return { code: 'own_program' };
  }
  return choice.reason;
}

/**
 * Builds a quest day (spec §3.2). Pure and deterministic, so the phone (offline) and the server build the same day
 * from the same input. Throws RangeError for invalid input.
 */
export function buildDay(library: QuestLibrary, input: DayInput): BuiltDay {
  const ctx = dayContext(library, input);
  const light = input.light || input.dayNumber === 1;
  const budget = dayBudget(input);
  const used = new Set<string>();
  const core = chooseCore(ctx, budget, used);
  const coreMoves = movesFor(ctx, core.candidate.template);
  for (const key of [useKey(core.candidate.template), ...keptOutBy(library, core.candidate.template, coreMoves)]) used.add(key);
  const side1 = chooseGoalSide(ctx, budget - core.candidate.template.minutes - MIN_SIDE_MINUTES, used);
  const side1Moves = movesFor(ctx, side1.candidate.template);
  for (const key of [useKey(side1.candidate.template), ...keptOutBy(library, side1.candidate.template, side1Moves)]) used.add(key);
  const side2 = chooseBalance(
    ctx,
    budget - core.candidate.template.minutes - side1.candidate.template.minutes,
    used,
    [core.candidate.template.stat, side1.candidate.template.stat],
  );
  const draft = (slot: Slot, choice: Choice): QuestDraft => {
    const { template } = choice.candidate;
    return draftQuest(template, slot, explain(ctx, slot, choice, light), { book: bookFor(ctx, template), moves: movesFor(ctx, template) });
  };
  return {
    dayNumber: input.dayNumber,
    budget,
    light,
    hardDay: false,
    articleId: input.articleId,
    quests: [
      draft('core', core),
      draft('side1', side1),
      draft('side2', side2),
      draftQuest(specialTemplate(library, 'article'), 'article', { code: 'article' }),
    ],
  };
}
