import type { AbilityId, ClassId, Goal, Limitation, Stat } from '../../rules/src/index.ts';

export const STAT_NAMES: Readonly<Record<Stat, string>> = {
  strength: 'Strength',
  vitality: 'Vitality',
  wisdom: 'Wisdom',
  focus: 'Focus',
  discipline: 'Discipline',
};

export const CLASS_NAMES: Readonly<Record<ClassId, string>> = { warrior: 'Warrior', mage: 'Mage', rogue: 'Rogue', monk: 'Monk' };

/** Fits "Your goal: …". */
export const GOAL_NAMES: Readonly<Record<Goal, string>> = {
  body: 'a stronger body',
  energy: 'more energy and better sleep',
  learn: 'reading and learning',
  focus: 'better focus',
  routine: 'a steady routine',
};

export const LIMITATION_NAMES: Readonly<Record<Limitation, string>> = {
  knee: 'Knees',
  back: 'Lower back',
  shoulder: 'Shoulders',
  wrist: 'Wrists',
};

export const ABILITY_NAMES: Readonly<Record<AbilityId, string>> = {
  second_wind: 'Second Wind',
  unbreakable: 'Unbreakable',
  insight: 'Insight',
  scholars_path: "Scholar's Path",
  shadowstep: 'Shadowstep',
  vanish: 'Vanish',
  stillness: 'Stillness',
  dawn_ritual: 'Dawn Ritual',
};

/** Shown on every exercise quest, with the "I felt pain" button (spec §3.4). */
export const EXERCISE_SAFETY_LINE = 'Stop if you feel sharp pain, dizziness or chest pain.';

/** A ladder as the player reads it, e.g. on "Resting after pain". */
export const LADDER_NAMES: Readonly<Record<string, string>> = {
  push: 'Push-ups',
  squat: 'Squats',
  core: 'Core training',
  'own-program': 'Your own training',
  walk: 'Walking',
  mobility: 'Mobility',
  sleep: 'Sleep routine',
  breathing: 'Breathing',
  reading: 'Reading',
  insight: 'Reflection',
  focus: 'Focus sessions',
  'phone-free': 'Phone-free time',
};
