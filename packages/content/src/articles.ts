// The daily article's topics (spec §4.1): eight clusters, each with topic seeds the nightly job works through in order
// (M8a decision 6). A seed is a subject, not a title: the research finds the facts and the writer the angle.
import type { ClassId, Goal } from '../../rules/src/index.ts';

export const ARTICLE_CLUSTERS = ['habits', 'psychology', 'movement', 'sleep', 'focus', 'learning', 'philosophy', 'history'] as const;
export type ArticleCluster = (typeof ARTICLE_CLUSTERS)[number];

export const CLUSTER_NAMES: Readonly<Record<ArticleCluster, string>> = {
  habits: 'Discipline and habits',
  psychology: 'Psychology',
  movement: 'Fitness and movement',
  sleep: 'Sleep and recovery',
  focus: 'Focus',
  learning: 'Learning',
  philosophy: 'Philosophy',
  history: 'History and decision-making',
};

// The first seeds of habits, psychology, movement and focus are ideas the owner's coaching lessons teach (2026-10-13,
// the owner's choice; notes in docs/research/kaizen-videos.md): subjects only, researched against public sources like
// every other seed, never the lessons' words, and the evidence wins where it disagrees.
export const ARTICLE_TOPICS: Readonly<Record<ArticleCluster, readonly string[]>> = {
  habits: [
    'The minimum session: doing something small on a bad day',
    'The weekly review: planning the week and correcting course',
    'Plan A and plan B for the days you usually slip',
    'Process goals and outcome goals',
    'How habits form: cue, routine and reward',
    'Implementation intentions: deciding when and where',
    'Habit stacking: tying a new habit to an old one',
    'Why small daily actions add up',
    'Designing your surroundings so the good choice is the easy one',
    'Streaks, and what to do after a missed day',
    'Willpower and decision fatigue: what the research shows',
    'Identity-based habits: acting as the person you want to become',
    'Breaking a bad habit by adding friction',
    'Tracking progress without obsessing over it',
  ],
  psychology: [
    'The motivation dip after the first weeks, and what carries you through',
    'Questioning limiting beliefs',
    'Does telling others about your goals help?',
    'The progress principle: why small wins motivate',
    'Self-compassion and getting back on track',
    'Intrinsic and extrinsic motivation',
    'The planning fallacy and estimating time better',
    'Growth mindset: what holds up and what does not',
    'Delayed gratification and the marshmallow studies revisited',
    'How stress changes the way we decide',
    'Loss aversion in everyday choices',
    'Flow: the state of full absorption',
    'Why we procrastinate, and what helps',
  ],
  movement: [
    'Rest between sets: how long to rest, and why',
    'Deload weeks: planned easier training',
    'Training three or four times a week for months, rather than in hard bursts',
    'Adding steps gradually, about 1,000 a day at a time',
    'Does lifting weights make women bulky?',
    'Judging training progress by the trend over weeks, not one session',
    'What walking does for body and mind',
    'Progressive overload for beginners',
    'Why mobility matters as we age',
    'Bodyweight strength: push, pull, squat and hinge',
    'Rest days and how muscles adapt',
    'Zone 2 cardio explained',
    'Posture: what matters and what is myth',
    'Warming up: why and how',
    'Exercise and mood',
    'Grip strength and healthy ageing',
  ],
  sleep: [
    'How sleep cycles work',
    'Light, the body clock and morning sunlight',
    'Caffeine timing and sleep',
    'Naps: when they help and when they hurt',
    'Sleep and memory',
    'A wind-down routine that works',
    'Slow breathing and the nervous system',
    'Recovery: why rest is part of training',
    'Screens at night: what the evidence says',
    'Keeping a steady wake-up time',
  ],
  focus: [
    'Phone-free mornings and attention',
    'Overstimulation and the dopamine detox idea: what the evidence says',
    'Doing the important, low-stimulation work first',
    'Doing fewer things well: focus by subtraction',
    'Attention residue and the cost of switching tasks',
    'Deep work: protecting long stretches of focus',
    'The Pomodoro technique and timed work blocks',
    'Phone notifications and attention',
    'Single-tasking',
    'Boredom, and why it is useful',
    'Mind-wandering: when it helps and when it hurts',
    'Meditation as attention training',
    'Planning tomorrow the night before',
    'Working with your energy peaks',
  ],
  learning: [
    'Spaced repetition: remembering what you study',
    'Retrieval practice: testing yourself to learn',
    'Deliberate practice and building a skill',
    'Note-taking that helps you think',
    'The Feynman technique: explaining to learn',
    'Interleaving: mixing practice to learn better',
    'Ways to read more books',
    'Learning plateaus and how to get past them',
    'Curiosity and memory',
    'Learning by teaching others',
  ],
  philosophy: [
    'Stoicism and the dichotomy of control',
    'Marcus Aurelius and the Meditations',
    'Seneca on time',
    'Epictetus on what is up to us',
    'Aristotle on virtue as habit',
    "Zen and the beginner's mind",
    'Bushido in history: the samurai code and its myths',
    'The examined life: Socrates and self-reflection',
    'Memento mori: remembering mortality to live well',
    'Confucius on self-cultivation',
  ],
  history: [
    'Miyamoto Musashi and The Book of Five Rings',
    "Benjamin Franklin's thirteen virtues",
    'The Endurance expedition and planning for the unknown',
    'Pre-mortems: imagining failure before it happens',
    'Second-order thinking',
    'The OODA loop: observe, orient, decide, act',
    'Checklists in surgery and aviation',
    'Inversion: solving problems backwards',
    'Sunk costs and knowing when to quit',
    'The Wright brothers and patient experiments',
  ],
};

/** M8b decision 2: the topic of each goal; with the class's, a player's areas (3 reading days in 5 come from them). */
export const GOAL_CLUSTERS: Readonly<Record<Goal, ArticleCluster>> = {
  body: 'movement',
  energy: 'sleep',
  learn: 'learning',
  focus: 'focus',
  routine: 'habits',
};

/** M8b decision 2: the topic of each class. */
export const CLASS_CLUSTERS: Readonly<Record<ClassId, ArticleCluster>> = {
  warrior: 'movement',
  mage: 'learning',
  rogue: 'psychology',
  monk: 'philosophy',
};

/** What each topic is about, under its name in Insight's choice (M8b decision 8). */
export const CLUSTER_LINES: Readonly<Record<ArticleCluster, string>> = {
  habits: 'How habits form, hold and break.',
  psychology: 'How minds weigh choices and keep going.',
  movement: 'How bodies get stronger and stay able.',
  sleep: 'How rest restores the body and the mind.',
  focus: 'How attention works and how to guard it.',
  learning: 'How memory and skill are built.',
  philosophy: 'Old ideas about living well, tried on today.',
  history: 'Decisions from the past and what they teach.',
};
