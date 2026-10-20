// The onboarding interview (spec §1.1, boards O01–O06): the answers so far, which screens this player sees, when each
// screen's answers are complete, and the body `lmu-onboarding` receives. The server computes every number from it.
// M12 (Round 3, board R3-7; plan decisions 7–8): three chapters, You (name, goals), Your body (training and limits, then
// the safety check on its own) and Your day (reading and focus when asked, then the rhythm). The voice, the equipment,
// the slip question and the vow moved to cards on days 1 to 3: the onboarding sends the System voice and bodyweight
// training, which those cards change through the events that already exist.
import { DEFAULT_BOUNDARY_MINUTES, MAX_GOALS, SAFETY_QUESTIONS, boundaryFromSleep, suggestedClass } from '@levelmeup/rules';
import type { ClassId, Difficulty, Goal, Habit, Limitation, PlayerProfile, Training } from '@levelmeup/rules';
import type { Voice } from '@levelmeup/content';
import type { OnboardingBody } from '../game/types.ts';

export type Draft = {
  name: string;
  /** M12: no longer asked here; null sends the System's (a day 1 card offers the others). */
  voice: Voice | null;
  goals: Goal[];
  training: Training | null;
  limitations: Limitation[];
  /** "Nothing" was picked on the limits row (otherwise "no limits" and "not answered yet" look the same). */
  noLimits: boolean;
  /** The safety check, one answer per question (null: not yet). Kept in memory only, never written (spec §4.5). */
  safety: (boolean | null)[];
  reading: Habit | null;
  focus: Habit | null;
  /** Minutes after midnight, on the half hour. */
  sleep: number;
  wake: number;
  minutesPerDay: number;
  difficulty: Difficulty;
  /** The class the player picked on the reveal; null takes the rules' suggestion. */
  classId: ClassId | null;
  /** M7c: the pact signed on the reveal (decision 10), sent when the onboarding ends; null when none. */
  pact: 1 | 2 | null;
};

export const NEW_DRAFT: Draft = {
  name: '', voice: null, goals: [], training: null, limitations: [], noLimits: false,
  safety: Array<boolean | null>(SAFETY_QUESTIONS).fill(null), reading: null, focus: null,
  sleep: 23 * 60, wake: 7 * 60, minutesPerDay: 25, difficulty: 'steady', classId: null, pact: null,
};

/** The voice the onboarding sends: the System's, which narrates the onboarding itself. */
export const DEFAULT_VOICE: Voice = 'system';

export type Step = 'awakening' | 'goals' | 'body' | 'safety' | 'mind' | 'rhythm';

export const STEP_PATH: Readonly<Record<Step, string>> = {
  awakening: '/onboarding', goals: '/onboarding/goals', body: '/onboarding/body', safety: '/onboarding/safety',
  mind: '/onboarding/mind', rhythm: '/onboarding/rhythm',
};

/** M12 (board R3-7): each step's chapter, 1 You, 2 Your body, 3 Your day. */
export const CHAPTER: Readonly<Record<Step, 1 | 2 | 3>> = { awakening: 1, goals: 1, body: 2, safety: 2, mind: 3, rhythm: 3 };
export const ANALYSIS_PATH = '/onboarding/analysis';
export const NAME_MAX = 40;
const CONTROL = /[\p{Cc}\p{Cf}]/u;

/** The mind screen is only for the Learn and Focus goals ("I'll only ask about these"). */
export function asksMind(draft: Draft): boolean {
  return draft.goals.includes('learn') || draft.goals.includes('focus');
}

export function stepsFor(draft: Draft): Step[] {
  return ['awakening', 'goals', 'body', 'safety', ...(asksMind(draft) ? (['mind'] as const) : []), 'rhythm'];
}

/** The safety questions not answered yet (the step says "2 of 7 answered"). */
export const safetyLeft = (draft: Draft): number => draft.safety.filter((a) => a === null).length;

/** Whether a screen's answers are complete (its Continue button). */
export function complete(draft: Draft, step: Step): boolean {
  switch (step) {
    case 'awakening': {
      const name = draft.name.trim();
      return name.length >= 1 && name.length <= NAME_MAX && !CONTROL.test(name);
    }
    case 'goals':
      return draft.goals.length >= 1 && draft.goals.length <= MAX_GOALS;
    case 'body':
      return draft.training !== null && (draft.noLimits || draft.limitations.length > 0);
    case 'safety':
      return draft.safety.every((a) => a !== null);
    case 'mind':
      return (!draft.goals.includes('learn') || draft.reading !== null) && (!draft.goals.includes('focus') || draft.focus !== null);
    case 'rhythm':
      return draft.sleep !== draft.wake;
  }
}

/** Where Continue goes: the next screen this player sees, or the analysis after the last one. */
export function nextPath(draft: Draft, step: Step): string {
  const steps = stepsFor(draft);
  const next = steps[steps.indexOf(step) + 1];
  return next === undefined ? ANALYSIS_PATH : STEP_PATH[next];
}

export function gentleStart(draft: Draft): boolean {
  return draft.safety.some((a) => a === true);
}

/** Toggles a goal; a third one is refused (the board's "2 of 2 chosen"). */
export function toggleGoal(goals: readonly Goal[], goal: Goal): Goal[] {
  if (goals.includes(goal)) return goals.filter((g) => g !== goal);
  return goals.length >= MAX_GOALS ? [...goals] : [...goals, goal];
}

/** "Nothing" and the limits exclude each other. */
export function toggleLimit(draft: Draft, limit: Limitation | 'nothing'): Pick<Draft, 'limitations' | 'noLimits'> {
  if (limit === 'nothing') return { limitations: [], noLimits: !draft.noLimits };
  const has = draft.limitations.includes(limit);
  return { limitations: has ? draft.limitations.filter((l) => l !== limit) : [...draft.limitations, limit], noLimits: false };
}

export function boundaryOf(draft: Draft): number {
  return draft.sleep === draft.wake ? DEFAULT_BOUNDARY_MINUTES : boundaryFromSleep(draft.sleep, draft.wake);
}

/** The body for `lmu-onboarding`; called once every screen is complete. */
export function toRequest(draft: Draft, timeZone: string, redo: boolean): OnboardingBody {
  return {
    name: draft.name.trim(),
    voice: draft.voice ?? DEFAULT_VOICE,
    goals: draft.goals,
    ...(draft.classId === null ? {} : { classId: draft.classId }),
    training: draft.training!,
    reading: draft.goals.includes('learn') ? draft.reading : null,
    focus: draft.goals.includes('focus') ? draft.focus : null,
    limitations: draft.limitations,
    // M12: bodyweight until the day 2 card's Training screen says otherwise.
    equipment: [],
    programStyle: 'none',
    safety: draft.safety.map((a) => a === true),
    minutesPerDay: draft.minutesPerDay,
    difficulty: draft.difficulty,
    boundaryMinutes: boundaryOf(draft),
    timeZone,
    redo,
  };
}

/** The player as the rules would see them now (the Rhythm screen's own-program note). */
export function draftProfile(draft: Draft): PlayerProfile {
  const goals = draft.goals.length > 0 ? draft.goals : (['body'] as Goal[]);
  return {
    classId: draft.classId ?? suggestedClass(goals), level: 1, goals, minutesPerDay: draft.minutesPerDay, difficulty: draft.difficulty,
    limitations: draft.limitations, gentleStart: gentleStart(draft), ownProgram: draft.training === 'own',
    equipment: [], programStyle: 'none', trainingPlan: 'build', programDays: 3,
    stats: { strength: 5, vitality: 5, wisdom: 5, focus: 5 }, book: null,
  };
}

/** What the phone keeps between launches: everything except the safety answers. */
export function persistable(draft: Draft): string {
  return JSON.stringify({ ...draft, safety: undefined });
}

export function restoreDraft(json: string | null): Draft {
  if (json === null) return NEW_DRAFT;
  try {
    const saved: unknown = JSON.parse(json);
    if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return NEW_DRAFT;
    const draft: Draft = { ...NEW_DRAFT, ...(saved as Partial<Draft>), safety: NEW_DRAFT.safety };
    // M7c: only a level the Pact screen can sign.
    return { ...draft, pact: draft.pact === 1 || draft.pact === 2 ? draft.pact : null };
  } catch {
    return NEW_DRAFT;
  }
}
