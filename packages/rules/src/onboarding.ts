// Onboarding's numbers (spec §1.1, §4.2): from the player's answers the rules compute the class, the starting estimates,
// the starting rungs, the day boundary and the suggested accountability level. Claude only writes the reveal's words.
import { DEFAULT_BOUNDARY_MINUTES } from './constants.ts';
import { newLadder } from './ladder.ts';
import type { LadderState } from './ladder.ts';
import { ladderById, maxRungFor } from './library.ts';
import type { PlayerProfile, QuestLibrary } from './library.ts';
import type { ClassId, Goal, StatMap } from './types.ts';

/** "How much do you train now?" `own`: the player follows their own program (spec §3.1). */
export type Training = 'none' | 'some' | 'most' | 'own';
/** The branch questions for the Learn and Focus goals: how much they read, how long they can focus. */
export type Habit = 'low' | 'mid' | 'high';
/** "When you slip, what gets you back?" (spec §1.1 beat 7). */
export type Slip = 'nudge' | 'smaller' | 'stakes' | 'space';
/** The answer that sets a ladder's starting rung. */
export type Seed = 'training' | 'reading' | 'focus';

export const TRAININGS: readonly Training[] = ['none', 'some', 'most', 'own'];
export const HABITS: readonly Habit[] = ['low', 'mid', 'high'];
export const SLIPS: readonly Slip[] = ['nudge', 'smaller', 'stakes', 'space'];
/** The safety check's yes-or-no questions (spec §3.4); any yes means a gentle start. */
export const SAFETY_QUESTIONS = 7;

/** What the interview asked that shapes the numbers. `reading` and `focus` are null unless their goal was picked. */
export type Answers = { goals: readonly Goal[]; training: Training; reading: Habit | null; focus: Habit | null };

/** Each goal's class (spec §2.5's typical days). */
export const GOAL_CLASS: Readonly<Record<Goal, ClassId>> = {
  body: 'warrior', energy: 'monk', learn: 'mage', focus: 'rogue', routine: 'monk',
};

/** The first goal the player picked decides; the reveal lets them choose another. */
export function suggestedClass(goals: readonly Goal[]): ClassId {
  const first = goals[0];
  if (first === undefined) throw new RangeError('a class needs at least one goal');
  return GOAL_CLASS[first];
}

const BY_TRAINING: Readonly<Record<Training, number>> = { none: 4, some: 5, most: 6, own: 6 };
const BY_HABIT: Readonly<Record<Habit, number>> = { low: 4, mid: 5, high: 6 };
/** An unasked stat and Discipline start where the pacing personas do (campaign.ts, PERSONA_ESTIMATES). */
const UNASKED = 5;
const DISCIPLINE_START = 4;

/** Starting estimates before the class bonus (spec §2.1, 3–8): the average answers give 5, 5, 5, 5, 4. */
export function onboardingEstimates(answers: Answers): StatMap {
  return {
    strength: BY_TRAINING[answers.training],
    vitality: BY_TRAINING[answers.training],
    wisdom: answers.reading === null ? UNASKED : BY_HABIT[answers.reading],
    focus: answers.focus === null ? UNASKED : BY_HABIT[answers.focus],
    discipline: DISCIPLINE_START,
  };
}

/** Experienced players skip the first rung, never more: one rung keeps every level target from level 10 on (M5 plan). */
const TRAINING_RUNG: Readonly<Record<Training, number>> = { none: 0, some: 0, most: 1, own: 1 };
const HABIT_RUNG: Readonly<Record<Habit, number>> = { low: 0, mid: 0, high: 1 };

/**
 * The ladders that start above rung 0 (spec §4.2; a ladder not listed starts at 0). `seeds` says which answer sets
 * which ladder (packages/content's SEEDS). A gentle start keeps every training ladder at 0, and no rung is above what
 * the player may train at (`maxRungFor`: limitations, the gentle start, an own program, the minutes).
 */
export function startingLadders(
  library: QuestLibrary,
  profile: PlayerProfile,
  answers: Answers,
  seeds: Readonly<Record<string, Seed>>,
): Record<string, LadderState> {
  const ladders: Record<string, LadderState> = {};
  for (const [id, seed] of Object.entries(seeds)) {
    ladderById(library, id); // throws for a seed the library doesn't have
    const habit = seed === 'reading' ? answers.reading : seed === 'focus' ? answers.focus : null;
    const wanted =
      seed === 'training' ? (profile.gentleStart ? 0 : TRAINING_RUNG[answers.training]) : habit === null ? 0 : HABIT_RUNG[habit];
    const rung = Math.min(wanted, maxRungFor(library, id, profile));
    if (rung > 0) ladders[id] = newLadder(rung);
  }
  return ladders;
}

/** True when no strength ladder fits the player's day: an own program at 10 or 15 minutes (M2 review). */
export function strengthClosed(library: QuestLibrary, profile: PlayerProfile): boolean {
  return library.ladders.filter((l) => l.stat === 'strength').every((l) => maxRungFor(library, l.id, profile) < 0);
}

const DAY_MINUTES = 1440;

/**
 * The day boundary from sleep and wake times, in minutes after midnight (spec §1.1 beat 5): the default 4 AM when the
 * player is asleep then, otherwise the middle of their sleep on the half hour (shift workers).
 */
export function boundaryFromSleep(sleep: number, wake: number): number {
  for (const time of [sleep, wake]) {
    if (!Number.isInteger(time) || time < 0 || time >= DAY_MINUTES) {
      throw new RangeError(`times are whole minutes after midnight, got ${time}`);
    }
  }
  if (sleep === wake) throw new RangeError('sleep and wake times must differ');
  const asleep = (wake - sleep + DAY_MINUTES) % DAY_MINUTES;
  const sinceSleepAtDefault = (DEFAULT_BOUNDARY_MINUTES - sleep + DAY_MINUTES) % DAY_MINUTES;
  if (sinceSleepAtDefault > 0 && sinceSleepAtDefault < asleep) return DEFAULT_BOUNDARY_MINUTES;
  return (Math.round((sleep + asleep / 2) / 30) * 30) % DAY_MINUTES;
}

/** The pact the reveal suggests (spec §4.3): The Shadow (level 1) for "real stakes", none otherwise. Nothing turns on. */
export function suggestedPactLevel(slip: Slip): 0 | 1 {
  return slip === 'stakes' ? 1 : 0;
}
