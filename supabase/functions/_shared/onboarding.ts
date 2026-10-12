// `lmu-onboarding`: the player's answers become a character and day 1 (spec §1.1, §4.2). The rules compute every
// number from the answers, here on the server (M5: the phone no longer sends a class or estimates, only its own pick on
// the reveal); Claude (when configured) only writes the reveal's words, validated like any untrusted input.
import {
  CLASSES, DIFFICULTIES, EQUIPMENT, GOALS, HABITS, LIMITATIONS, MAX_GOALS, MINUTES_OPTIONS, PROGRAM_STYLES, SAFETY_QUESTIONS, STATS,
  TRAINABLE_STATS, TRAININGS,
  buildDay, canonicalTimeZone, firstDayWindow, isValidTimeZone, onboardingEstimates, startingLadders, startingStats,
  suggestedClass,
} from '../../../packages/rules/src/index.ts';
import type {
  ClassId, Difficulty, Equipment, Goal, Habit, LadderState, Limitation, PlayerProfile, ProgramStyle, QuestLibrary, StatMap,
  TrainableStat, Training,
} from '../../../packages/rules/src/index.ts';
import {
  CLASS_NAMES, CONTENT_VERSION, GOAL_NAMES, LIMITATION_NAMES, SEEDS, STAT_NAMES, VOICES, lintText,
} from '../../../packages/content/src/index.ts';
import type { Voice } from '../../../packages/content/src/index.ts';
import { isObject, isProblem, problem } from './http.ts';
import type { Problem } from './http.ts';
import { toDraft } from './drafts.ts';
import type { DayDraft } from './state.ts';

/** What the phone sends (apps/mobile/src/onboarding/flow.ts builds it). */
export type OnboardingBody = {
  name: string;
  voice: Voice;
  goals: Goal[];
  /** The player's own pick on the reveal; without it the rules suggest one. */
  classId?: ClassId;
  training: Training;
  /** Required with the Learn goal, ignored otherwise. */
  reading: Habit | null;
  /** Required with the Focus goal, ignored otherwise. */
  focus: Habit | null;
  limitations: Limitation[];
  /** M6c: what the player can train with; an older phone sends none (bodyweight). */
  equipment?: Equipment[];
  /** M6c: their program; an older phone sends none (no preference). */
  programStyle?: ProgramStyle;
  /** The safety check's answers: read here, never stored (spec §4.5). */
  safety: boolean[];
  minutesPerDay: number;
  difficulty: Difficulty;
  boundaryMinutes: number;
  timeZone: string;
  /** Corrections on the reveal: build the character again (allowed until the player's first applied event). */
  redo?: boolean;
};

export type Choices = {
  name: string;
  voice: Voice;
  goals: Goal[];
  classId: ClassId;
  estimates: StatMap;
  training: Training;
  reading: Habit | null;
  focus: Habit | null;
  minutesPerDay: number;
  difficulty: Difficulty;
  boundaryMinutes: number;
  timeZone: string;
  limitations: Limitation[];
  gentleStart: boolean;
  ownProgram: boolean;
  equipment: Equipment[];
  programStyle: ProgramStyle;
};

export type Reveal = { narrative: string; strengths: string[]; growth: string[]; source: 'claude' | 'template' };

const CONTROL = /[\p{Cc}\p{Cf}]/u;

/** The onboarding body, validated field by field against the rules' own constants; the numbers are computed here. */
export function parseOnboarding(body: unknown): Choices | Problem {
  if (!isObject(body)) return problem(400, 'bad_body');
  const bad = (field: string): Problem => problem(400, 'bad_field', field);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 40 || CONTROL.test(name)) return bad('name');
  if (!VOICES.includes(body.voice as Voice)) return bad('voice');
  const goals = body.goals;
  if (!Array.isArray(goals) || goals.length < 1 || goals.length > MAX_GOALS || new Set(goals).size !== goals.length
    || !goals.every((g) => GOALS.includes(g as Goal))) return bad('goals');
  const picked = goals as Goal[];
  if (body.classId !== undefined && (typeof body.classId !== 'string' || !Object.hasOwn(CLASSES, body.classId))) return bad('classId');
  if (!TRAININGS.includes(body.training as Training)) return bad('training');
  const habit = (field: 'reading' | 'focus', goal: Goal): Habit | null | Problem =>
    !picked.includes(goal) ? null : HABITS.includes(body[field] as Habit) ? (body[field] as Habit) : bad(field);
  const reading = habit('reading', 'learn');
  if (isProblem(reading)) return reading;
  const focus = habit('focus', 'focus');
  if (isProblem(focus)) return focus;
  const safety = body.safety;
  if (!Array.isArray(safety) || safety.length !== SAFETY_QUESTIONS || !safety.every((a) => typeof a === 'boolean')) return bad('safety');
  if (!MINUTES_OPTIONS.includes(body.minutesPerDay as number)) return bad('minutesPerDay');
  if (!DIFFICULTIES.includes(body.difficulty as Difficulty)) return bad('difficulty');
  const boundary = body.boundaryMinutes ?? 240;
  if (!Number.isInteger(boundary) || (boundary as number) < 0 || (boundary as number) > 1439) return bad('boundaryMinutes');
  if (typeof body.timeZone !== 'string' || !isValidTimeZone(body.timeZone)) return bad('timeZone');
  const limitations = body.limitations ?? [];
  if (!Array.isArray(limitations) || !limitations.every((l) => LIMITATIONS.includes(l as Limitation))) return bad('limitations');
  const equipment = body.equipment ?? [];
  if (!Array.isArray(equipment) || new Set(equipment).size !== equipment.length || !equipment.every((e) => EQUIPMENT.includes(e as Equipment))) {
    return bad('equipment');
  }
  const programStyle = body.programStyle ?? 'none';
  if (!PROGRAM_STYLES.includes(programStyle as ProgramStyle)) return bad('programStyle');
  const training = body.training as Training;
  return {
    name,
    voice: body.voice as Voice,
    goals: picked,
    classId: (body.classId as ClassId | undefined) ?? suggestedClass(picked),
    estimates: onboardingEstimates({ goals: picked, training, reading, focus }),
    training,
    reading,
    focus,
    minutesPerDay: body.minutesPerDay as number,
    difficulty: body.difficulty as Difficulty,
    boundaryMinutes: boundary as number,
    timeZone: canonicalTimeZone(body.timeZone),
    limitations: [...new Set(limitations as Limitation[])],
    gentleStart: safety.some((a) => a === true),
    ownProgram: training === 'own',
    equipment: equipment as Equipment[],
    programStyle: programStyle as ProgramStyle,
  };
}

/** The weakest trainable stat by starting points (ties: the stat order). */
function weakest(points: StatMap, classId: ClassId): TrainableStat {
  const { main, second } = CLASSES[classId];
  const others = TRAINABLE_STATS.filter((s) => s !== main && s !== second);
  return others.reduce((a, b) => (points[b] < points[a] ? b : a));
}

/** The reveal's words without Claude: plain, in the chosen voice, the same character. */
export function templateReveal(choices: Choices): Reveal {
  const points = startingStats(choices.estimates, choices.classId);
  const { main, second } = CLASSES[choices.classId];
  const cls = CLASS_NAMES[choices.classId];
  const [m, s, w] = [STAT_NAMES[main], STAT_NAMES[second], STAT_NAMES[weakest(points, choices.classId)]];
  const goal = GOAL_NAMES[choices.goals[0]!];
  const narrative: Record<Voice, string> = {
    mentor: `${choices.name}, you start as a ${cls}. ${m} leads and ${s} grows beside it. You came here for ${goal}, so the first days stay short and we build from there.`,
    system: `${choices.name}. Class: ${cls}. Main stat: ${m}. Second stat: ${s}. Goal: ${goal}. The first quests are ready.`,
    questmaster: `${choices.name}. You are a ${cls}. ${m} is your weapon and ${s} keeps you standing. You want ${goal}. Earn it one day at a time.`,
  };
  return { narrative: narrative[choices.voice], strengths: [m, s], growth: [w], source: 'template' };
}

export const REVEAL_LIMITS = { narrative: 600, item: 60, items: 3 } as const;

/** Claude's reveal, accepted only if it has the right shape, fits the limits and passes the text lint. */
export function parseReveal(value: unknown): Reveal | null {
  if (!isObject(value)) return null;
  const { narrative, strengths, growth } = value;
  const list = (v: unknown): v is string[] =>
    Array.isArray(v) && v.length >= 1 && v.length <= REVEAL_LIMITS.items
    && v.every((x) => typeof x === 'string' && x.trim().length > 0 && x.length <= REVEAL_LIMITS.item);
  if (typeof narrative !== 'string' || narrative.trim().length < 20 || narrative.length > REVEAL_LIMITS.narrative) return null;
  if (!list(strengths) || !list(growth)) return null;
  if ([narrative, ...strengths, ...growth].some((t) => CONTROL.test(t.replace(/\n/g, ' ')) || lintText(t).length > 0)) return null;
  return { narrative: narrative.trim(), strengths: strengths.map((x) => x.trim()), growth: growth.map((x) => x.trim()), source: 'claude' };
}

/** The structured-output schema and the facts Claude writes from. The numbers are the rules', never Claude's. */
export const REVEAL_SCHEMA = {
  type: 'object',
  properties: {
    narrative: { type: 'string', description: 'Two or three sentences in the chosen voice, under 600 characters.' },
    strengths: { type: 'array', items: { type: 'string' }, description: '1 to 3 short phrases, under 60 characters each.' },
    growth: { type: 'array', items: { type: 'string' }, description: '1 to 3 short phrases, under 60 characters each.' },
  },
  required: ['narrative', 'strengths', 'growth'],
  additionalProperties: false,
} as const;

export function revealFacts(choices: Choices): string {
  const points = startingStats(choices.estimates, choices.classId);
  const { main, second } = CLASSES[choices.classId];
  return JSON.stringify({
    name: choices.name,
    voice: choices.voice,
    class: CLASS_NAMES[choices.classId],
    mainStat: STAT_NAMES[main],
    secondStat: STAT_NAMES[second],
    goals: choices.goals.map((g) => GOAL_NAMES[g]),
    startingPoints: Object.fromEntries(STATS.map((s) => [STAT_NAMES[s], points[s]])),
    minutesPerDay: choices.minutesPerDay,
    difficulty: choices.difficulty,
    exercise: choices.gentleStart ? 'gentle only: easy walks and stretches' : 'normal',
    limits: choices.limitations.map((l) => LIMITATION_NAMES[l]),
  });
}

export type StartArgs = {
  profile: Record<string, unknown>;
  character: StatMap;
  ladders: Record<string, LadderState>;
  day: DayDraft;
};

/** Everything `levelmeup.start_player` stores: the profile, start points, starting ladders, day 1 (light). */
export function startArgs(choices: Choices, reveal: Reveal, nowMs: number, library: QuestLibrary): StartArgs {
  const character = startingStats(choices.estimates, choices.classId);
  const window = firstDayWindow(nowMs, choices.timeZone, choices.boundaryMinutes);
  const stats = Object.fromEntries(TRAINABLE_STATS.map((s) => [s, character[s]])) as Record<TrainableStat, number>;
  const player: PlayerProfile = {
    classId: choices.classId, level: 1, goals: choices.goals, minutesPerDay: choices.minutesPerDay, difficulty: choices.difficulty,
    limitations: choices.limitations, gentleStart: choices.gentleStart, ownProgram: choices.ownProgram,
    equipment: choices.equipment, programStyle: choices.programStyle, stats, book: null,
  };
  const answers = { goals: choices.goals, training: choices.training, reading: choices.reading, focus: choices.focus };
  const ladders = startingLadders(library, player, answers, SEEDS);
  const built = buildDay(library, { dayNumber: 1, profile: player, ladders, history: [], light: true, workoutsDone: 0, articleId: null });
  return {
    profile: {
      name: choices.name, voice: choices.voice, classId: choices.classId, timeZone: choices.timeZone,
      boundaryMinutes: choices.boundaryMinutes, minutesPerDay: choices.minutesPerDay, difficulty: choices.difficulty,
      goals: choices.goals, limitations: choices.limitations, gentleStart: choices.gentleStart, ownProgram: choices.ownProgram,
      equipment: choices.equipment, programStyle: choices.programStyle, reveal,
    },
    character,
    ladders,
    day: {
      dayNumber: 1,
      startsAt: new Date(window.startsAt).toISOString(),
      endsAt: new Date(window.endsAt).toISOString(),
      timeZone: window.timeZone,
      budget: built.budget,
      light: true,
      comeback: false,
      articleId: null,
      protection: null,
      contentVersion: CONTENT_VERSION,
      quests: built.quests.map((q) => toDraft(library, q)),
    },
  };
}
