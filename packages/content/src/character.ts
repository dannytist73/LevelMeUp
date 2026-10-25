// The words of Character, Chronicle and Scholar's Path (M6d; boards D4 and D5). Player-facing, so the lint and the app's
// font-subset test cover every line.
import type { AbilityId } from '../../rules/src/index.ts';
import { ACHIEVEMENTS } from './achievements.ts';

export const CHARACTER_TEXT = {
  label: 'Character',
  portrait: '{className} portrait, level {level}',
  /** Premium pass C2: the level's progress as Cleared and Day done say it, the total beside it. */
  totalXp: '{into} / {span} XP · {total} XP total',
  next: '{xp} XP to Lv {level}',
  stats: {
    title: 'Stats',
    /** M10c: the rank as a quiet line beside the points (Quest cleared stamps a new one). */
    rank: 'Rank {rank}',
    toNext: '{xp} XP to {next}',
    rankAt: 'rank {rank} at {at}',
    discipline: 'grows only from showing up',
    bar: '{stat} progress to the next point',
  },
  path: {
    title: '{className} path',
    locked: 'Lv {level} · {left} levels to go',
    lockedOne: 'Lv {level} · 1 level to go',
    ready: 'Ready',
    cooldown: 'Ready again in {days} days',
    cooldownOne: 'Ready again tomorrow',
    unlocked: 'Unlocked',
    later: 'Unlocked · it arrives in a later update',
  },
  achievements: {
    title: 'Achievements',
    count: '{earned} / {total}',
    hidden: '{n} still hidden.',
    none: 'Your first achievement is one quest away.',
    /** M12 (board R3-6): what's earned, and the next ones within reach with how far along they are. */
    earned: '{n} earned',
    next: 'Within reach',
    quests: '{have} of {need} quests',
    level: 'At Lv {level}',
    streak: 'Best streak {have} of {need} days',
    seeAll: 'See all {n}',
    fewer: 'Show fewer',
  },
  // M17 (UX audit): the vow opens again from here (Today's card, once answered, never came back).
  vow: { title: 'Your vow', change: 'Change your vow', write: 'Write a vow' },
  scholar: {
    title: "Scholar's Path",
    reading: 'Reading',
    progress: '{sessions} · {minutes} min since {date}',
    progressNoDate: '{sessions} · {minutes} min',
    sessionOne: '1 session',
    sessions: '{n} sessions',
    set: 'Set a book',
    change: 'Change book',
    finished: 'Finished',
    willSync: 'Will sync',
  },
} as const;

export const CHRONICLE_TEXT = {
  label: 'Chronicle',
  streak: 'Streak',
  best: 'Best',
  shields: 'Shields',
  shieldsOf: 'of {max}',
  /** Premium pass C1: how a shield is earned, and when the next one comes. */
  shieldsRule: 'A shield comes with every 7 days of streak, up to {max}, and keeps your streak on a missed day.',
  shieldsNext: 'Next one at a {n}-day streak.',
  previous: 'Previous month',
  next: 'Next month',
  empty: 'Your chronicle begins today.',
  legend: { cleared: 'Cleared', hard: 'Hard day', paused: 'Paused', rest: 'Rest', today: 'Today' },
  cell: { cleared: 'cleared', hard: 'hard day', paused: 'paused', rest: 'rest', today: 'today' },
  since: 'Since day 1 · {date}',
  growthTitle: 'Growth since day 1',
  statShort: { strength: 'STR', vitality: 'VIT', wisdom: 'WIS', focus: 'FOC', discipline: 'DIS' },
  statGain: '{stat} +{n}',
} as const;

export const BOOK_TEXT = {
  title: "Scholar's Path",
  lead: 'Set the book you are reading. Your reading quests track it until you finish it.',
  field: 'Book title',
  start: 'Start this book',
  switchTo: 'Switch to this book',
  switchConfirm: 'Switch to "{title}"? The sessions read with "{current}" are not kept.',
  switchYes: 'Yes, switch',
  current: 'Now reading',
  finish: 'Finished it',
  finishConfirm: 'Mark "{title}" as finished? It joins your finished books.',
  finishYes: 'Yes, finished',
  setAside: 'Set it aside',
  setAsideConfirm: 'Set "{title}" aside? Its sessions so far are not kept.',
  setAsideYes: 'Set it aside',
  notNow: 'Not now',
  questLine: 'Reading: {title}',
  closed: "Scholar's Path opens for a Mage at level 10.",
} as const;

/** Abilities that unlock now but whose screens arrive later: none since M8b (Insight works on Today). */
export const ABILITIES_LATER: readonly AbilityId[] = [];

/** The latest earned title (`earned` oldest first), or null. */
export function latestTitle(earned: readonly string[]): string | null {
  for (const id of [...earned].reverse()) {
    const title = ACHIEVEMENTS.find((a) => a.id === id)?.title ?? null;
    if (title !== null) return title;
  }
  return null;
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "5 levels gained, 21 quests cleared, 1 new rung reached." (board D5). */
export function growthLine({ levels, quests, rungs }: { levels: number; quests: number; rungs: number }): string {
  if (levels === 0 && quests === 0 && rungs === 0) return 'Your first quests are waiting.';
  const climbed = rungs === 0 ? 'no new rungs yet' : `${count(rungs, 'new rung', 'new rungs')} reached`;
  return `${count(levels, 'level', 'levels')} gained, ${count(quests, 'quest', 'quests')} cleared, ${climbed}.`;
}
