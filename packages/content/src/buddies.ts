// Monster Buddy (docs/2026-10-25-monster-buddy.md): the little clay monster your class hatches. It stands on Me in the
// portrait's frame, grows at levels 5 and 10, throws the shots when a battle plays and keeps the fire at camp. One per
// class, and it follows the class. It is never sad: a lost battle leaves it as it was.
import type { ClassId } from '../../rules/src/index.ts';

export type Buddy = {
  name: string;
  /** What it is, after "a": "pink baby dragon with a headband". */
  kind: string;
};

export const BUDDIES: Readonly<Record<ClassId, Buddy>> = {
  warrior: { name: 'Pummel', kind: 'pink baby dragon with a headband' },
  mage: { name: 'Starkit', kind: 'violet fox with a star on its tail' },
  rogue: { name: 'Whisk', kind: 'navy cat in a cyan mask' },
  monk: { name: 'Mochi', kind: 'white seal pup in a lilac robe' },
};

/** Its three sizes, by level: 1–4, 5–9 and 10 on. */
export const BUDDY_SIZES = ['little', 'grown', 'grand'] as const;
export type BuddySize = (typeof BUDDY_SIZES)[number];

export const BUDDY_TEXT = {
  /** What a screen reader says for the portrait. */
  label: '{name}, your {className} buddy, {size}, level {level}',
  /** Under the portrait on Me. */
  caption: '{name} · {size}',
  hatched: '{name} hatched!',
  hatchedLine: 'Your {className} buddy, a {kind}. It grows as you do.',
  grew: '{name} grew!',
  grewLine: 'Level {level} of showing up, and {name} is {size} now.',
  /** The class change screen: the buddy each class brings. */
  becomes: 'Buddy: {name}, a {kind}',
  /** The battle replay's buddy, for a screen reader. */
  throwing: '{name} throwing your power',
  camp: '{name} keeps the fire.',
  /** A quest's picture: the buddy doing it. */
  questPicture: '{name} doing a {stat} quest',
} as const;
