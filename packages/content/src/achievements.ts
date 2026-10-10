import type { AchievementRule } from '../../rules/src/index.ts';

/** An achievement with its words. A title, when there is one, can be shown under the player's name. */
export type Achievement = AchievementRule & { name: string; description: string; title: string | null };

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-trial', name: 'First Trial', description: 'Clear your first quest.', title: null, criterion: { kind: 'quests', count: 1 } },
  { id: 'trials-10', name: 'Ten Trials', description: 'Clear 10 quests.', title: null, criterion: { kind: 'quests', count: 10 } },
  { id: 'trials-50', name: 'Fifty Trials', description: 'Clear 50 quests.', title: null, criterion: { kind: 'quests', count: 50 } },
  { id: 'trials-100', name: 'The Hundredth Trial', description: 'Clear 100 quests.', title: 'The Tireless', criterion: { kind: 'quests', count: 100 } },
  { id: 'level-5', name: 'Awakened', description: 'Reach level 5.', title: null, criterion: { kind: 'level', level: 5 } },
  { id: 'level-10', name: 'Risen', description: 'Reach level 10.', title: null, criterion: { kind: 'level', level: 10 } },
  { id: 'level-15', name: 'Ascendant', description: 'Reach level 15.', title: 'The Ascendant', criterion: { kind: 'level', level: 15 } },
  { id: 'level-20', name: 'Twenty Floors Up', description: 'Reach level 20.', title: null, criterion: { kind: 'level', level: 20 } },
  { id: 'streak-7', name: 'Seven Dawns', description: 'Keep a 7-day streak.', title: null, criterion: { kind: 'streak', days: 7 } },
  { id: 'streak-14', name: 'Fortnight Flame', description: 'Keep a 14-day streak.', title: null, criterion: { kind: 'streak', days: 14 } },
  { id: 'streak-30', name: 'Thirty Unbroken', description: 'Keep a 30-day streak.', title: 'The Unbroken', criterion: { kind: 'streak', days: 30 } },
  { id: 'streak-66', name: 'Second Nature', description: 'Keep a 66-day streak.', title: null, criterion: { kind: 'streak', days: 66 } },
  { id: 'streak-100', name: "Hundred Days' Oath", description: 'Keep a 100-day streak.', title: 'The Oathkeeper', criterion: { kind: 'streak', days: 100 } },
  { id: 'rung-1', name: 'New Ground', description: 'Step up a ladder for the first time.', title: null, criterion: { kind: 'rung', ladder: null, rung: 1 } },
  { id: 'rung-4', name: 'Climber', description: 'Reach the fourth rung of any ladder.', title: null, criterion: { kind: 'rung', ladder: null, rung: 3 } },
  { id: 'rung-6', name: 'Summit Seeker', description: 'Reach the sixth rung of any ladder.', title: 'The Climber', criterion: { kind: 'rung', ladder: null, rung: 5 } },
  { id: 'full-push-up', name: 'Floor Breaker', description: 'Unlock full push-ups.', title: null, criterion: { kind: 'rung', ladder: 'push', rung: 3 } },
  { id: 'article-1', name: 'First Page', description: "Read an article and write its takeaway.", title: null, criterion: { kind: 'articles', count: 1 } },
  { id: 'article-10', name: 'Lamplighter', description: 'Read 10 articles.', title: null, criterion: { kind: 'articles', count: 10 } },
  { id: 'article-30', name: 'Archivist', description: 'Read 30 articles.', title: 'The Archivist', criterion: { kind: 'articles', count: 30 } },
  { id: 'rise-again', name: 'Rise Again', description: 'Clear a recovery quest after a missed day.', title: null, criterion: { kind: 'recoveries', count: 1 } },
  { id: 'hard-day', name: "Bend, Don't Break", description: 'Clear the core quest on a hard day.', title: null, criterion: { kind: 'hard_days', count: 1 } },
  { id: 'the-return', name: 'The Return', description: 'Clear the core quest on your first day back after 5 or more days away.', title: 'The Returned', criterion: { kind: 'comebacks', count: 1 } },
  { id: 'rank-d', name: 'Beyond E', description: 'Raise any stat to rank D.', title: null, criterion: { kind: 'rank', rank: 'D' } },
  { id: 'rank-c', name: 'Seasoned', description: 'Raise any stat to rank C.', title: null, criterion: { kind: 'rank', rank: 'C' } },
  { id: 'second-wind', name: 'Caught Breath', description: 'Use Second Wind.', title: null, criterion: { kind: 'ability', ability: 'second_wind' } },
  { id: 'stillness', name: 'Still Water', description: 'Use Stillness.', title: null, criterion: { kind: 'ability', ability: 'stillness' } },
];
