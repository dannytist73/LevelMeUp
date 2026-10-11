// The onboarding's words (boards O01–O10 in docs/design/ink-panel, spec §1.1) and which answer seeds which ladder. The
// numbers come from the rules (packages/rules/src/onboarding.ts). Every line is player-facing, so the lint and the
// app's font-subset test cover it.
import type { ClassId, Difficulty, Goal, Habit, Seed, Slip, TrainableStat, Training } from '../../rules/src/index.ts';
import { STAT_NAMES } from './names.ts';
import type { Voice } from './types.ts';

/** Which answer sets each ladder's starting rung (rules: `startingLadders`). Other ladders start at rung 0. */
export const SEEDS: Readonly<Record<string, Seed>> = {
  push: 'training', squat: 'training', core: 'training', walk: 'training', reading: 'reading', focus: 'focus',
};

export const VOICE_NAMES: Readonly<Record<Voice, string>> = { mentor: 'Mentor', system: 'System', questmaster: 'Questmaster' };

export const VOICE_SAMPLES: Readonly<Record<Voice, string>> = {
  mentor: '"Good work today. Let\'s keep the next step small."',
  system: '"Core quest available. Reward: 20 XP."',
  questmaster: '"Your trial is waiting. Rise and clear it."',
};

/** The goals as the Goals board lists them (names.ts has the in-sentence forms). */
export const GOAL_CHOICES: Readonly<Record<Goal, string>> = {
  body: 'A stronger body',
  energy: 'More energy, better sleep',
  learn: 'Read and learn',
  focus: 'Focus and beat distraction',
  routine: 'Build a routine',
};

export const TRAINING_CHOICES: Readonly<Record<Training, string>> = {
  none: 'Not lately', some: 'Now and then', most: 'Most weeks', own: 'I follow my own plan',
};

export const READING_CHOICES: Readonly<Record<Habit, string>> = { low: 'Rarely', mid: 'A few pages a week', high: 'Most days' };

export const FOCUS_CHOICES: Readonly<Record<Habit, string>> = {
  low: 'A few minutes', mid: 'About 15 minutes', high: 'Half an hour or more',
};

export const DIFFICULTY_CHOICES: Readonly<Record<Difficulty, { name: string; line: string }>> = {
  gentle: { name: 'Gentle', line: 'Small steps, slow climb' },
  steady: { name: 'Steady', line: "Step up when you're ready" },
  hard: { name: 'Hard', line: 'Faster climb, bigger asks' },
};

export const SLIP_CHOICES: Readonly<Record<Slip, { name: string; line: string }>> = {
  nudge: { name: 'A kind nudge', line: 'A reminder, then a fresh start.' },
  smaller: { name: 'A smaller plan', line: 'Shrink the day, keep the streak alive.' },
  stakes: { name: 'Real stakes', line: 'A challenge that costs me something if I skip.' },
  space: { name: 'Space', line: "Leave me be. I'll come back on my own." },
};

/** What the reveal says about the slip answer (spec §1.1 beat 7). Only "real stakes" suggests a pact; nothing turns on. */
export const SLIP_SUGGESTIONS: Readonly<Record<Slip, string>> = {
  nudge: "You said a kind nudge helps, so no pact for now. I'll remind you, never push.",
  smaller: 'You said a smaller plan helps. On a rough day, pick a hard day: shorter quests, and the streak still counts.',
  stakes: 'You said real stakes help, so I suggest a pact: The Shadow (level 1). Nothing turns on until you sign it.',
  space: "You said you want space. No pact and no pushing. I'll be here when you come back.",
};

/**
 * The safety check (spec §3.4): our own wording on the topics of the PAR-Q+ screening. Any yes means a gentle start;
 * the answers are never stored, only the result (spec §4.5).
 */
export const SAFETY_CHECK: readonly string[] = [
  'Has a doctor said you have a heart condition or high blood pressure?',
  'Do you get chest pain at rest, in daily life, or when you are active?',
  'In the past year, has dizziness made you lose your balance, or have you fainted?',
  'Do you have another long-term medical condition?',
  'Do you take prescribed medicine for a long-term condition?',
  'In the past year, have you had a bone, joint or muscle problem that more activity could make worse?',
  'Has a doctor said you should only exercise under medical supervision?',
];

/** Each class on the class picker: a typical day (spec §2.5). */
export const CLASS_DAYS: Readonly<Record<ClassId, string>> = {
  warrior: 'Strength ladders and walks, with a short read.',
  mage: 'Reading, notes and reflection, with walks and stretches.',
  rogue: 'Focus sessions, phone-free blocks and your hardest task first, plus movement.',
  monk: 'Sleep routine, mobility, breathing and gentle walks.',
};

/** A class's main and second stat, as the rules' `CLASSES` gives them (content imports only types from the rules). */
export type ClassStats = { main: TrainableStat; second: TrainableStat };

/** "Strength · Vitality": a class's main and second stat. */
export function classStats({ main, second }: ClassStats): string {
  return `${STAT_NAMES[main]} · ${STAT_NAMES[second]}`;
}

/** The reveal's starting routine (O08 board), from the rules' numbers. */
export function routineLine(p: { stats: ClassStats; minutesPerDay: number; difficulty: Difficulty; gentleStart: boolean }): string {
  const { main, second } = p.stats;
  const line =
    `${p.minutesPerDay} min a day, ${DIFFICULTY_CHOICES[p.difficulty].name.toLowerCase()}. Your core quest trains ` +
    `${STAT_NAMES[main]} on most days and ${STAT_NAMES[second]} on others, with a balance quest once a week.`;
  return p.gentleStart ? `${line} Exercise stays gentle for now: easy walks and stretches.` : line;
}

export function voiceLine(name: string): string {
  return `${name}. How should I speak to you?`;
}

export function analysisLine(name: string): string {
  return `Hold still, ${name}. This takes a few seconds.`;
}

export function boundaryLine(time: string): string {
  return `Your quest day turns over at ${time}, while you're asleep.`;
}

export function goalsCount(chosen: number): string {
  return `${chosen} of 2 chosen`;
}

/** Every fixed line of the onboarding screens. */
export const ONBOARDING_TEXT = {
  awakening: {
    signal: 'Signal found.',
    detected: 'A new player has been detected.',
    line: 'Before your trials begin, I need to know who you are.',
    ask: 'What should I call you?',
    go: 'Awaken',
    note: 'No account needed. You can save your character later.',
    restore: 'Saved a character before? Sign in with Google',
    noSave: 'No character is saved on that Google account yet. Make one now and it stays saved.',
    restoreOffline: "Signed in with Google, but there's no connection to look for your character. A saved one appears once you're back online.",
  },
  voice: { note: 'You can change this any time in Settings.' },
  goals: { line: 'What are you training for?', note: 'Pick up to two. Your quests are built around them.' },
  body: {
    line: 'Your body. Tell me, so I never push you the wrong way.',
    training: 'How much do you train now?',
    limits: 'Anything to work around?',
    nothing: 'Nothing',
    safety: 'Safety check',
    safetyNote:
      "Seven yes-or-no health questions. Any yes means a gentle start and a nudge to see a doctor first. Your answers aren't stored, only the result.",
    yes: 'Yes',
    no: 'No',
    clear: 'Safety check · No flags',
    gentleTitle: 'Safety check · Gentle start',
    gentle: 'Easy walks and stretches only for now. Please check with a doctor before harder training.',
  },
  mind: {
    line: 'Your mind. This sets where your first quests start.',
    reading: 'How much do you read now?',
    focus: 'How long can you focus before you reach for your phone?',
  },
  rhythm: {
    line: 'Your day, your pace.',
    wake: 'Wake up',
    sleep: 'Sleep',
    minutes: 'Minutes a day',
    difficulty: 'Difficulty',
    note: 'Hard days and rest days are always one tap away.',
    ownProgram:
      "Your own training session takes 20 minutes, so at 10 or 15 minutes a day there's no room for strength quests. Pick 25 or 40 to keep them.",
  },
  slip: {
    line: 'Everyone slips. When you do, what gets you back?',
    note: 'This only shapes my suggestion. Nothing turns on until you sign the Pact yourself.',
  },
  analysis: {
    title: 'Analysing…',
    steps: ['Reading your answers', 'Choosing your class', 'Setting your first quests', 'Writing your record'],
    offline: 'The System needs a connection to record your character. Your answers are kept on this phone.',
    locked: "Your trials have already begun, so the analysis can't run again. Class changes come with the Character screen.",
    failed: "The System couldn't record your character. Your answers are kept; try again.",
    retry: 'Try again',
    today: 'Go to Today',
  },
  reveal: {
    title: 'Analysis complete',
    classLabel: 'Class',
    stats: 'Stats',
    estimates: 'Game estimates',
    statsNote: 'Stats grow from what you do. Discipline grows only from showing up.',
    strength: 'Strengths',
    growth: 'Growth',
    routine: 'Starting routine',
    accept: 'Accept class',
    change: 'Change class',
    fix: 'Fix an assumption',
    rewriting: 'The System is rewriting your record.',
    pickClass: 'Choose your class',
    fixWhat: 'What should I correct?',
    fixGoals: 'Your goals',
    fixBody: 'Training, limits and the safety check',
    fixMind: 'Reading and focus',
    fixRhythm: 'Your day and pace',
    fixSlip: 'When you slip',
    back: 'Back',
    missing: 'Your character is ready.',
  },
  vow: {
    line: "One last thing. A vow is a promise to yourself. It's optional, and nothing happens if you skip it.",
    label: 'Your vow',
    default: 'I will clear one quest a day, even a small one.',
    edit: 'Change the words',
    hold: 'Hold to swear',
    holdNote: 'Hold for 2 seconds.',
    tap: 'Swear',
    confirm: 'Confirm the vow',
    skip: 'Skip the vow',
    sworn: 'Sworn',
    next: 'Continue',
  },
  save: {
    line: 'For now, only this phone can reach your character.',
    title: 'Save your character',
    subtitle: 'Link Google and nothing gets lost.',
    body: "A new or lost phone won't cost you your level, stats or streak. Everything so far stays exactly as it is.",
    google: 'Continue with Google',
    lightTitle: 'Day 1 is light on purpose',
    lightBody: 'Short quests, about 10 minutes in all. The climb starts tomorrow.',
    later: 'Not now · begin Day 1',
    laterNote: 'You can save any time in Settings.',
    saved: 'Saved. Your character is linked to Google.',
    begin: 'Begin Day 1',
  },
} as const;

/** What a Google save or sign-in that didn't finish tells the player; the progress is always kept (spec §1.4). */
export const GOOGLE_ERRORS: Readonly<Record<'cancelled' | 'taken' | 'network' | 'failed', string>> = {
  cancelled: 'Not saved. You can try again, or save later in Settings.',
  taken: "That Google account is already in use here, so it can't be linked. Your progress is kept; try another account.",
  network: "No connection, so nothing changed. Your progress is kept; try again when you're online.",
  failed: "Google sign-in didn't finish. Your progress is kept; try again, or save later in Settings.",
};
