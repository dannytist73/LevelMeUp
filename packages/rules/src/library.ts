import { CLASSES, GOALS, LIMITATIONS, MAX_GOALS, MINUTES_OPTIONS, MIN_SIDE_MINUTES, TRAINABLE_STATS } from './constants.ts';
import type { LadderState } from './ladder.ts';
import type { ClassId, Difficulty, Goal, Limitation, Stat, Tier, TrainableStat } from './types.ts';
import type { XpSplit } from './xp.ts';

/** The physical work a quest asks for; null for reading, focus, breathing and habits. */
export type Exercise = 'strength' | 'walk' | 'mobility';

/** How the player marks a quest done (spec §3.6). */
export type CompletionType = 'tap' | 'timer' | 'reps' | 'text';

/** What "done" means, measurably (spec §3.1). */
export type Condition =
  | { kind: 'reps'; sets: number; reps: number; perSide: boolean }
  | { kind: 'hold'; sets: number; seconds: number; perSide: boolean }
  | { kind: 'minutes'; minutes: number }
  | { kind: 'habit' }
  | { kind: 'sentence' };

/**
 * `ladder` templates are a ladder's rungs; `micro` ones are tiny standalone quests that keep short days possible; the
 * others each fill one special slot.
 */
export type TemplateRole = 'ladder' | 'micro' | 'recovery' | 'stillness' | 'dawn_ritual' | 'article';

/** The rules-relevant part of a quest template. Its words, in three voices, live in packages/content. */
export type QuestTemplate = {
  id: string;
  role: TemplateRole;
  ladder: string | null;
  rung: number | null;
  /** Discipline only for recovery quests. */
  stat: Stat;
  split: XpSplit | null;
  tier: Tier;
  /** Minutes the full version takes; the day's budget counts these. */
  minutes: number;
  completion: CompletionType;
  condition: Condition;
  exercise: Exercise | null;
  /** Suitable for a gentle start (spec §3.4); only gentle walking and mobility carry it. */
  gentle: boolean;
  contraindications: readonly Limitation[];
  /** The hard-day version (spec §3.5): the same kind of condition, less of it. */
  hardDay: { minutes: number; condition: Condition };
};

export type Ladder = {
  id: string;
  stat: TrainableStat;
  goals: readonly Goal[];
  /** Classes whose core quest prefers this ladder (spec §2.5, "typical day"). */
  affinity: readonly ClassId[];
  /** "Complete your own planned session": replaces the strength ladders for players with their own program. */
  ownProgram: boolean;
  /** Its quests show the player's Scholar's Path book. */
  tracksBook: boolean;
};

export type QuestLibrary = {
  ladders: readonly Ladder[];
  templates: readonly QuestTemplate[];
  /** The 5-minute recovery quest for each class (spec §3.7). */
  recovery: Readonly<Record<ClassId, string>>;
};

/** What the day builder needs to know about the player. */
export type PlayerProfile = {
  classId: ClassId;
  level: number;
  goals: readonly Goal[];
  minutesPerDay: number;
  difficulty: Difficulty;
  limitations: readonly Limitation[];
  /** The safety check had a "yes" (spec §3.4). */
  gentleStart: boolean;
  /** The player follows their own training program (spec §3.1). */
  ownProgram: boolean;
  /** Current stat points, for balance quests. */
  stats: Readonly<Record<TrainableStat, number>>;
  /** Scholar's Path (Mage level 10): the book reading quests track. */
  book: string | null;
};

const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'steady', 'hard'];

/** Throws RangeError for a profile no day can be built from, so bad data never shapes a day. */
export function validateProfile(profile: PlayerProfile): void {
  if (!Object.keys(CLASSES).includes(profile.classId)) throw new RangeError(`unknown class ${profile.classId}`);
  if (!Number.isInteger(profile.level) || profile.level < 1) {
    throw new RangeError(`level must be an integer of at least 1, got ${profile.level}`);
  }
  const { goals } = profile;
  if (goals.length < 1 || goals.length > MAX_GOALS || new Set(goals).size !== goals.length || !goals.every((g) => GOALS.includes(g))) {
    throw new RangeError(`goals must be 1 or ${MAX_GOALS} different goals, got [${goals.join(', ')}]`);
  }
  if (!MINUTES_OPTIONS.includes(profile.minutesPerDay)) {
    throw new RangeError(`minutes per day must be one of ${MINUTES_OPTIONS.join(', ')}, got ${profile.minutesPerDay}`);
  }
  if (!DIFFICULTIES.includes(profile.difficulty)) throw new RangeError(`unknown difficulty ${profile.difficulty}`);
  if (!profile.limitations.every((l) => LIMITATIONS.includes(l))) {
    throw new RangeError(`unknown limitation in [${profile.limitations.join(', ')}]`);
  }
  for (const stat of TRAINABLE_STATS) {
    if (!Number.isFinite(profile.stats[stat])) throw new RangeError(`stat points for ${stat} must be a number`);
  }
}

export function findTemplate(library: QuestLibrary, id: string): QuestTemplate | undefined {
  return library.templates.find((t) => t.id === id);
}

export function templateById(library: QuestLibrary, id: string): QuestTemplate {
  const template = findTemplate(library, id);
  if (!template) throw new RangeError(`unknown quest template ${id}`);
  return template;
}

export function ladderById(library: QuestLibrary, id: string): Ladder {
  const ladder = library.ladders.find((l) => l.id === id);
  if (!ladder) throw new RangeError(`unknown ladder ${id}`);
  return ladder;
}

/** The one template that fills a special slot. */
export function specialTemplate(library: QuestLibrary, role: 'stillness' | 'dawn_ritual' | 'article'): QuestTemplate {
  const template = library.templates.find((t) => t.role === role);
  if (!template) throw new RangeError(`the quest library has no ${role} quest`);
  return template;
}

/** Reported limitations exclude matching templates; a gentle start allows only gentle walking and mobility. */
export function templateAllowed(template: QuestTemplate, profile: PlayerProfile): boolean {
  if (template.contraindications.some((tag) => profile.limitations.includes(tag))) return false;
  if (profile.gentleStart && template.exercise !== null && (template.exercise === 'strength' || !template.gentle)) return false;
  return true;
}

/** Players with their own program get its ladder instead of the strength ladders. */
export function ladderAllowed(ladder: Ladder, profile: PlayerProfile): boolean {
  if (ladder.ownProgram) return profile.ownProgram;
  return !(profile.ownProgram && ladder.stat === 'strength');
}

/** A ladder's rungs, easiest first. */
export function ladderRungs(library: QuestLibrary, ladderId: string): QuestTemplate[] {
  return library.templates
    .filter((t) => t.role === 'ladder' && t.ladder === ladderId)
    .sort((a, b) => (a.rung ?? 0) - (b.rung ?? 0));
}

/** The exercise a ladder trains (its first rung's). */
export function ladderExercise(library: QuestLibrary, ladderId: string): Exercise | null {
  return ladderRungs(library, ladderId)[0]?.exercise ?? null;
}

/**
 * The highest rung the player may train at. Allowed rungs are a prefix: the first excluded rung ends the climb, so
 * nobody skips past an exercise they shouldn't do. −1 when the ladder is closed to the player.
 */
export function allowedTopRung(library: QuestLibrary, ladderId: string, profile: PlayerProfile): number {
  if (!ladderAllowed(ladderById(library, ladderId), profile)) return -1;
  const rungs = ladderRungs(library, ladderId);
  let top = -1;
  while (top + 1 < rungs.length && templateAllowed(rungs[top + 1]!, profile)) top++;
  return top;
}

/** Minutes the core quest may take: the budget minus the minimum kept for two side quests. */
export function coreAllowance(budget: number): number {
  return budget - 2 * MIN_SIDE_MINUTES;
}

/** The highest allowed rung no higher than `fromRung` that fits in `allowance` minutes; −1 when none does. */
function fittingRung(library: QuestLibrary, ladderId: string, profile: PlayerProfile, fromRung: number, allowance: number): number {
  const rungs = ladderRungs(library, ladderId);
  let rung = Math.min(fromRung, allowedTopRung(library, ladderId, profile));
  while (rung >= 0 && rungs[rung]!.minutes > allowance) rung--;
  return rung;
}

/** The rung a quest is built at: the player's rung, lowered to an allowed rung that fits the minutes available. */
export function effectiveRung(library: QuestLibrary, ladderId: string, profile: PlayerProfile, state: LadderState, allowance: number): number {
  return fittingRung(library, ladderId, profile, state.rung, allowance);
}

/** `maxRung` for recordCompletion: the highest allowed rung that fits a normal day's core quest; −1 if none. */
export function maxRungFor(library: QuestLibrary, ladderId: string, profile: PlayerProfile): number {
  return fittingRung(library, ladderId, profile, Number.MAX_SAFE_INTEGER, coreAllowance(profile.minutesPerDay));
}
