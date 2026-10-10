// `lmu-onboarding`: the player's choices become a character and day 1 (spec §1.1, §4.2). The rules compute every
// number; Claude (when configured) only writes the reveal's words, which are validated like any untrusted input.
import {
  CLASSES, GOALS, LIMITATIONS, MAX_GOALS, MINUTES_OPTIONS, STATS, TRAINABLE_STATS, buildDay, canonicalTimeZone,
  firstDayWindow, isValidTimeZone, startingStats,
} from '../../../packages/rules/src/index.ts';
import type { ClassId, Difficulty, Goal, Limitation, QuestLibrary, StatMap, TrainableStat } from '../../../packages/rules/src/index.ts';
import { CLASS_NAMES, CONTENT_VERSION, GOAL_NAMES, STAT_NAMES, VOICES, lintText } from '../../../packages/content/src/index.ts';
import type { Voice } from '../../../packages/content/src/index.ts';
import { isObject, problem } from './http.ts';
import type { Problem } from './http.ts';
import { toDraft } from './drafts.ts';
import type { DayDraft } from './state.ts';

export type Choices = {
  name: string;
  voice: Voice;
  goals: Goal[];
  classId: ClassId;
  estimates: StatMap;
  minutesPerDay: number;
  difficulty: Difficulty;
  boundaryMinutes: number;
  timeZone: string;
  limitations: Limitation[];
  gentleStart: boolean;
  ownProgram: boolean;
};

export type Reveal = { narrative: string; strengths: string[]; growth: string[]; source: 'claude' | 'template' };

const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'steady', 'hard'];
const CONTROL = /[\p{Cc}\p{Cf}]/u;

/** The onboarding body, validated field by field; every list is checked against the rules' own constants. */
export function parseOnboarding(body: unknown): Choices | Problem {
  if (!isObject(body)) return problem(400, 'bad_body');
  const bad = (field: string): Problem => problem(400, 'bad_field', field);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 40 || CONTROL.test(name)) return bad('name');
  if (!VOICES.includes(body.voice as Voice)) return bad('voice');
  const goals = body.goals;
  if (!Array.isArray(goals) || goals.length < 1 || goals.length > MAX_GOALS || new Set(goals).size !== goals.length
    || !goals.every((g) => GOALS.includes(g as Goal))) return bad('goals');
  if (typeof body.classId !== 'string' || !Object.hasOwn(CLASSES, body.classId)) return bad('classId');
  const estimates = body.estimates;
  if (!isObject(estimates) || !STATS.every((s) => typeof estimates[s] === 'number' && Number.isFinite(estimates[s]))) return bad('estimates');
  if (!MINUTES_OPTIONS.includes(body.minutesPerDay as number)) return bad('minutesPerDay');
  if (!DIFFICULTIES.includes(body.difficulty as Difficulty)) return bad('difficulty');
  const boundary = body.boundaryMinutes ?? 240;
  if (!Number.isInteger(boundary) || (boundary as number) < 0 || (boundary as number) > 1439) return bad('boundaryMinutes');
  if (typeof body.timeZone !== 'string' || !isValidTimeZone(body.timeZone)) return bad('timeZone');
  const limitations = body.limitations ?? [];
  if (!Array.isArray(limitations) || !limitations.every((l) => LIMITATIONS.includes(l as Limitation))) return bad('limitations');
  if (typeof (body.gentleStart ?? false) !== 'boolean') return bad('gentleStart');
  if (typeof (body.ownProgram ?? false) !== 'boolean') return bad('ownProgram');
  return {
    name,
    voice: body.voice as Voice,
    goals: goals as Goal[],
    classId: body.classId as ClassId,
    estimates: Object.fromEntries(STATS.map((s) => [s, estimates[s] as number])) as StatMap,
    minutesPerDay: body.minutesPerDay as number,
    difficulty: body.difficulty as Difficulty,
    boundaryMinutes: boundary as number,
    timeZone: canonicalTimeZone(body.timeZone),
    limitations: [...new Set(limitations as Limitation[])],
    gentleStart: (body.gentleStart ?? false) as boolean,
    ownProgram: (body.ownProgram ?? false) as boolean,
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
  });
}

export type StartArgs = {
  profile: Record<string, unknown>;
  character: StatMap;
  ladders: Record<string, never>;
  day: DayDraft;
};

/** Everything `levelmeup.start_player` stores: the profile, start points, day 1 (light) with its quests. */
export function startArgs(choices: Choices, reveal: Reveal, nowMs: number, library: QuestLibrary): StartArgs {
  const character = startingStats(choices.estimates, choices.classId);
  const window = firstDayWindow(nowMs, choices.timeZone, choices.boundaryMinutes);
  const stats = Object.fromEntries(TRAINABLE_STATS.map((s) => [s, character[s]])) as Record<TrainableStat, number>;
  const built = buildDay(library, {
    dayNumber: 1,
    profile: {
      classId: choices.classId, level: 1, goals: choices.goals, minutesPerDay: choices.minutesPerDay, difficulty: choices.difficulty,
      limitations: choices.limitations, gentleStart: choices.gentleStart, ownProgram: choices.ownProgram, stats, book: null,
    },
    ladders: {},
    history: [],
    light: true,
    articleId: null,
  });
  return {
    profile: {
      name: choices.name, voice: choices.voice, classId: choices.classId, timeZone: choices.timeZone,
      boundaryMinutes: choices.boundaryMinutes, minutesPerDay: choices.minutesPerDay, difficulty: choices.difficulty,
      goals: choices.goals, limitations: choices.limitations, gentleStart: choices.gentleStart, ownProgram: choices.ownProgram, reveal,
    },
    character,
    ladders: {},
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
