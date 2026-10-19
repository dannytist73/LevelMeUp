// The workout ladder (M6c decision 6): every rung is a workout the rules plan for the player (planWorkout). Rungs raise
// the exercises' level first, then the sets, then add a fourth exercise. Minutes follow the rules' workoutMinutes (a
// 2-minute warm-up and 2.25 minutes a set); the hard-day version is one set of the first two exercises (7 minutes).
import type { Ladder, MoveLevel } from '../../../rules/src/index.ts';
import type { AuthoredTemplate, Voice, VoiceText } from '../types.ts';

export const WORKOUT_LADDERS: readonly Ladder[] = [
  { id: 'workout', stat: 'strength', goals: ['body'], affinity: ['warrior', 'mage', 'rogue', 'monk'], ownProgram: false, tracksBook: false },
  // M16 decision 5: the weekly program's exercise levels; only its own workout days build it.
  { id: 'program', stat: 'strength', goals: ['body'], affinity: [], ownProgram: false, tracksBook: false, weekly: true },
];

const STEPS = [
  'Warm up for 2 minutes: march on the spot, circle your arms and do a few easy reps of the first exercise.',
  'Do the exercises in order, every set of one before the next.',
  'Rest about 2 minutes between sets, up to 3 after the first exercise.',
  'End each set with 1 or 2 good reps still in you.',
];
const SAFETY = ['Form comes before weight: pick a load you control on every rep.', 'If an exercise hurts, stop it and tap I felt pain below.'];

type Rung = { sets: number[]; level: MoveLevel; minutes: number; tier: 'standard' | 'major'; name: string; voice: Record<Voice, VoiceText> };

function rung(r: number, x: Rung): AuthoredTemplate {
  return {
    id: `workout-${r}`,
    role: 'ladder',
    ladder: 'workout',
    rung: r,
    stat: 'strength',
    split: null,
    tier: x.tier,
    minutes: x.minutes,
    completion: 'reps',
    condition: { kind: 'workout', sets: x.sets, level: x.level },
    exercise: 'strength',
    gentle: false,
    contraindications: [],
    hardDay: { minutes: 7, condition: { kind: 'workout', sets: [1, 1], level: x.level } },
    name: x.name,
    steps: STEPS,
    safety: SAFETY,
    voice: x.voice,
  };
}

export const WORKOUT_TEMPLATES: readonly AuthoredTemplate[] = [
  rung(0, {
    sets: [2, 2, 2], level: 1, minutes: 16, tier: 'standard', name: 'Starter workout',
    voice: {
      mentor: { title: "Today's workout", line: 'A short workout, two easy sets of each exercise. Learn the moves before anything else.' },
      system: { title: 'Workout', line: 'Strength program, first rung. Two sets of each exercise.' },
      questmaster: { title: 'The first forge', line: 'Two rounds of every trial. Learn the shape of each one.' },
    },
  }),
  rung(1, {
    sets: [2, 2, 2], level: 2, minutes: 16, tier: 'standard', name: 'Steady workout',
    voice: {
      mentor: { title: "Today's workout", line: 'Some exercises step up a level today. Same sets, a little more challenge.' },
      system: { title: 'Workout', line: 'Strength program. Harder versions, two sets each.' },
      questmaster: { title: 'Trial of iron', line: 'The easy forms are behind you. Meet the harder ones.' },
    },
  }),
  rung(2, {
    sets: [2, 2, 2], level: 3, minutes: 16, tier: 'standard', name: 'Strong workout',
    voice: {
      mentor: { title: "Today's workout", line: 'The hardest versions are open now. Keep every rep clean.' },
      system: { title: 'Workout', line: 'Strength program. Full versions, two sets each.' },
      questmaster: { title: 'Trial of steel', line: 'The full form of every trial. Two rounds, no shortcuts.' },
    },
  }),
  rung(3, {
    sets: [3, 3, 3], level: 3, minutes: 23, tier: 'major', name: 'Longer workout',
    voice: {
      mentor: { title: "Today's workout", line: 'A third set for each exercise. Rest well between them.' },
      system: { title: 'Workout', line: 'Strength program. Three sets of each exercise.' },
      questmaster: { title: 'The long forge', line: 'Three rounds of every trial. Your strength is earning its keep.' },
    },
  }),
  rung(4, {
    sets: [3, 3, 3, 3], level: 3, minutes: 29, tier: 'major', name: 'Full workout',
    voice: {
      mentor: { title: "Today's workout", line: 'A fourth exercise joins in. Take your time between sets.' },
      system: { title: 'Workout', line: 'Strength program. One more exercise, three sets of each.' },
      questmaster: { title: 'Trial of the full forge', line: 'Another trial joins the forge, three rounds each. Stand ready.' },
    },
  }),
  rung(5, {
    sets: [4, 3, 3, 3], level: 3, minutes: 32, tier: 'major', name: 'Peak workout',
    voice: {
      mentor: { title: "Today's workout", line: 'The top of the program: an extra set on the first exercise. Well earned.' },
      system: { title: 'Workout', line: 'Strength program, top rung. An extra set on the first exercise.' },
      questmaster: { title: 'Trial of the summit', line: 'The summit of the forge. Your first trial gets a fourth round.' },
    },
  }),
];

// M16 (plan 2026-10-20-m16-weekly-program.md): the weekly program's rungs raise the exercises' level only; its block
// gives the day's exercises and the week's sets (rules: planProgram). The minutes are week 1's full day (6 exercises × 2
// sets); a weekly workout's own minutes come from its plan, outside the daily minutes.
const WEEKLY_STEPS = [
  'Warm up for 2 minutes: march on the spot, circle your arms and do a few easy reps of the first exercise.',
  'Do the exercises in order, every set of one before the next.',
  'Rest 2 to 3 minutes between sets of the first exercises, 1 to 2 minutes for the smaller ones.',
  'End each set with 1 or 2 good reps still in you.',
  'Same weight as last time until every set reaches the top of its range; then go a little heavier.',
];

type WeeklyRung = { level: MoveLevel; name: string; voice: Record<Voice, VoiceText> };

function weeklyRung(r: number, x: WeeklyRung): AuthoredTemplate {
  return {
    id: `program-${r}`,
    role: 'ladder',
    ladder: 'program',
    rung: r,
    stat: 'strength',
    split: null,
    tier: 'major',
    minutes: 29,
    completion: 'reps',
    condition: { kind: 'program', level: x.level },
    exercise: 'strength',
    gentle: false,
    contraindications: [],
    hardDay: { minutes: 7, condition: { kind: 'program', level: x.level } },
    name: x.name,
    steps: WEEKLY_STEPS,
    safety: SAFETY,
    voice: x.voice,
  };
}

export const WEEKLY_TEMPLATES: readonly AuthoredTemplate[] = [
  weeklyRung(0, {
    level: 1, name: 'Weekly workout',
    voice: {
      mentor: { title: 'Your weekly workout', line: "Today's full workout from your program. Learn each exercise before anything else." },
      system: { title: 'Weekly workout', line: 'Weekly program. Every exercise of the day, the sets this week asks for.' },
      questmaster: { title: 'The weekly forge', line: 'The full forge of the day, every trial in turn. Learn their shapes.' },
    },
  }),
  weeklyRung(1, {
    level: 2, name: 'Weekly workout',
    voice: {
      mentor: { title: 'Your weekly workout', line: 'Some exercises step up a level in your weekly workouts now.' },
      system: { title: 'Weekly workout', line: 'Weekly program. Harder versions of the exercises.' },
      questmaster: { title: 'The weekly forge', line: 'The easy forms are behind you. The week brings the harder ones.' },
    },
  }),
  weeklyRung(2, {
    level: 3, name: 'Weekly workout',
    voice: {
      mentor: { title: 'Your weekly workout', line: 'The full versions of every exercise are open now. Keep every rep clean.' },
      system: { title: 'Weekly workout', line: 'Weekly program. Full versions of the exercises.' },
      questmaster: { title: 'The weekly forge', line: 'The full form of every trial, as the week demands. No shortcuts.' },
    },
  }),
];
