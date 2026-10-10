/** The five stats (spec §2.1). Discipline grows only from consistency. */
export type Stat = 'strength' | 'vitality' | 'wisdom' | 'focus' | 'discipline';

/** Stats that quests train directly. */
export type TrainableStat = Exclude<Stat, 'discipline'>;

export type StatMap = Record<Stat, number>;

export type ClassId = 'warrior' | 'mage' | 'rogue' | 'monk';

/** Quest effort tiers (spec §2.2). */
export type Tier = 'minor' | 'standard' | 'major';

/** The player's chosen difficulty (spec §1.1). */
export type Difficulty = 'gentle' | 'steady' | 'hard';

/** The slots of a quest day (architecture §3). */
export type Slot = 'core' | 'side1' | 'side2' | 'article' | 'recovery';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

/**
 * Onboarding goals (spec §1.1 beat 3): a stronger body, more energy and better sleep, read and learn, focus and beat
 * distraction, build a routine.
 */
export type Goal = 'body' | 'energy' | 'learn' | 'focus' | 'routine';

/** Limitations a player can report in onboarding (board 4: knees, lower back, shoulders, wrists). */
export type Limitation = 'knee' | 'back' | 'shoulder' | 'wrist';
