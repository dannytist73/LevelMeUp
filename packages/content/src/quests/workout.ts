// The workout ladder (M6c decision 6): every rung is a workout the rules plan for the player (planWorkout). Rungs raise
// the exercises' level first, then the sets, then add a fourth exercise. Minutes follow the rules' workoutMinutes (a
// 2-minute warm-up and 2.25 minutes a set); the hard-day version is one set of the first two exercises (7 minutes).
import type { Ladder, MoveLevel } from '../../../rules/src/index.ts';
import type { AuthoredTemplate, Voice, VoiceText } from '../types.ts';

export const WORKOUT_LADDERS: readonly Ladder[] = [
  { id: 'workout', stat: 'strength', goals: ['body'], affinity: ['warrior', 'mage', 'rogue', 'monk'], ownProgram: false, tracksBook: false },
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
      mentor: { title: "Today's workout", line: 'Three exercises, two easy sets each. Learn the moves before anything else.' },
      system: { title: 'Workout', line: 'Strength program, first rung. Three exercises, two sets each.' },
      questmaster: { title: 'The first forge', line: 'Three trials, two rounds each. Learn the shape of every one.' },
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
      system: { title: 'Workout', line: 'Strength program. Three exercises, three sets each.' },
      questmaster: { title: 'The long forge', line: 'Three rounds of every trial. Your strength is earning its keep.' },
    },
  }),
  rung(4, {
    sets: [3, 3, 3, 3], level: 3, minutes: 29, tier: 'major', name: 'Full workout',
    voice: {
      mentor: { title: "Today's workout", line: 'A fourth exercise joins in. Take your time between sets.' },
      system: { title: 'Workout', line: 'Strength program. Four exercises, three sets each.' },
      questmaster: { title: 'Trial of the full forge', line: 'Four trials now, three rounds each. Stand ready.' },
    },
  }),
  rung(5, {
    sets: [4, 3, 3, 3], level: 3, minutes: 32, tier: 'major', name: 'Peak workout',
    voice: {
      mentor: { title: "Today's workout", line: 'The top of the program: an extra set on the first exercise. Well earned.' },
      system: { title: 'Workout', line: 'Strength program, top rung. Four exercises, an extra set on the first.' },
      questmaster: { title: 'Trial of the summit', line: 'The summit of the forge. Your first trial gets a fourth round.' },
    },
  }),
];
