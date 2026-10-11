// The onboarding interview (spec §1.1, boards O01–O06): the answers so far, which screens this player sees, when each
// screen's answers are complete, and the body `lmu-onboarding` receives. The server computes every number from it.
import { DEFAULT_BOUNDARY_MINUTES, MAX_GOALS, SAFETY_QUESTIONS, boundaryFromSleep, suggestedClass } from '@levelmeup/rules';
import type { ClassId, Difficulty, Goal, Habit, Limitation, PlayerProfile, Slip, Training } from '@levelmeup/rules';
import type { Voice } from '@levelmeup/content';
import type { OnboardingBody } from '../game/types.ts';

export type Draft = {
  name: string;
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
  slip: Slip | null;
  /** The class the player picked on the reveal; null takes the rules' suggestion. */
  classId: ClassId | null;
};

export const NEW_DRAFT: Draft = {
  name: '', voice: null, goals: [], training: null, limitations: [], noLimits: false,
  safety: Array<boolean | null>(SAFETY_QUESTIONS).fill(null), reading: null, focus: null,
  sleep: 23 * 60, wake: 7 * 60, minutesPerDay: 25, difficulty: 'steady', slip: null, classId: null,
};

export type Step = 'awakening' | 'voice' | 'goals' | 'body' | 'mind' | 'rhythm' | 'slip';

export const STEP_PATH: Readonly<Record<Step, string>> = {
  awakening: '/onboarding', voice: '/onboarding/voice', goals: '/onboarding/goals', body: '/onboarding/body',
  mind: '/onboarding/mind', rhythm: '/onboarding/rhythm', slip: '/onboarding/slip',
};
export const ANALYSIS_PATH = '/onboarding/analysis';
export const NAME_MAX = 40;
const CONTROL = /[\p{Cc}\p{Cf}]/u;

/** The mind screen is only for the Learn and Focus goals ("I'll only ask about these"). */
export function asksMind(draft: Draft): boolean {
  return draft.goals.includes('learn') || draft.goals.includes('focus');
}

export function stepsFor(draft: Draft): Step[] {
  return ['awakening', 'voice', 'goals', 'body', ...(asksMind(draft) ? (['mind'] as const) : []), 'rhythm', 'slip'];
}

/** Whether a screen's answers are complete (its Continue button). */
export function complete(draft: Draft, step: Step): boolean {
  switch (step) {
    case 'awakening': {
      const name = draft.name.trim();
      return name.length >= 1 && name.length <= NAME_MAX && !CONTROL.test(name);
    }
    case 'voice':
      return draft.voice !== null;
    case 'goals':
      return draft.goals.length >= 1 && draft.goals.length <= MAX_GOALS;
    case 'body':
      return draft.training !== null && (draft.noLimits || draft.limitations.length > 0) && draft.safety.every((a) => a !== null);
    case 'mind':
      return (!draft.goals.includes('learn') || draft.reading !== null) && (!draft.goals.includes('focus') || draft.focus !== null);
    case 'rhythm':
      return draft.sleep !== draft.wake;
    case 'slip':
      return draft.slip !== null;
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
    voice: draft.voice!,
    goals: draft.goals,
    ...(draft.classId === null ? {} : { classId: draft.classId }),
    training: draft.training!,
    reading: draft.goals.includes('learn') ? draft.reading : null,
    focus: draft.goals.includes('focus') ? draft.focus : null,
    limitations: draft.limitations,
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
    equipment: [], programStyle: 'none',
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
    return { ...NEW_DRAFT, ...(saved as Partial<Draft>), safety: NEW_DRAFT.safety };
  } catch {
    return NEW_DRAFT;
  }
}
