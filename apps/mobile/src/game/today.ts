// What Today says about the day as it stands (M10c): whether it already counts for the streak, the streak to show, the
// next quest, whether the day is cleared, and which quests Today can clear itself. M12 (Round 3, plan decisions 2–3):
// the day is done once its must-do quests are, and one quest is "Up next".
import { STREAK_SLOTS, isStreakDay } from '@levelmeup/rules';
import type { Shown } from './project.ts';
import type { QuestView, TodayView } from './types.ts';

/** The rules' own test (spec §2.4), on today's quests: the core quest done, or any two quests. */
function streakDay(today: TodayView): boolean {
  const done = today.quests.filter((q) => q.completedAt !== null);
  return isStreakDay({ coreDone: done.some((q) => q.slot === 'core'), questsDone: done.filter((q) => STREAK_SLOTS.includes(q.slot)).length });
}

/**
 * Today already counts for the streak (M10c decision 2): it is still open, no check-in is waiting (the answer decides
 * then), and its quests make it a streak day. The server adds it when the day closes.
 */
export function todayCounts(view: Pick<Shown, 'today' | 'character'>): boolean {
  const { today } = view;
  return today !== null && today.status === 'open' && !view.character.streak.awaitingCheckin && streakDay(today);
}

/** The streak as Today and the Chronicle show it: the server's count, plus today once it counts. */
export function shownStreak(view: Pick<Shown, 'today' | 'character'>): { current: number; best: number; counts: boolean } {
  const { current, best } = view.character.streak;
  const counts = todayCounts(view);
  const shown = counts ? current + 1 : current;
  return { current: shown, best: Math.max(best, shown), counts };
}

/**
 * What a day needs (M12 decision 2): the core quest, a recovery quest while there is one, and the reading once the day
 * has its article (a day whose article never came isn't held open by it). Side quests are extras. A day with none of
 * these needs every quest. A display rule only: the streak is the server's (spec §2.4) and doesn't change.
 */
export function mustDo(today: TodayView): QuestView[] {
  return today.quests.filter((q) => q.slot === 'core' || q.slot === 'recovery' || (q.slot === 'article' && today.article !== null));
}

/**
 * The day is done: everything it needs is cleared. `excused` names quests that can't be done today (an exercise resting
 * after pain): they never hold the day open (review).
 */
export function dayCleared(today: TodayView, excused: (q: QuestView) => boolean = () => false): boolean {
  if (today.quests.length === 0) return false;
  const must = mustDo(today).filter((q) => !excused(q));
  const rest = today.quests.filter((q) => !excused(q));
  return (must.length > 0 ? must : rest).every((q) => q.completedAt !== null);
}

/**
 * A day the rules already protect (a planned rest, a rest after pain, no quests built): nothing is asked of it, so its
 * open quests are extras and nothing is Up next (review: they were pushed with the screen's only bright button).
 */
export const dayOff = (today: TodayView): boolean => today.protection !== null;

/** The XP today's cleared quests earned. */
export const xpToday = (today: TodayView): number =>
  today.quests.filter((q) => q.completedAt !== null).reduce((sum, q) => sum + Object.values(q.xp).reduce((s, x) => s + (x ?? 0), 0), 0);

/** The order Today works through the day (M12 decision 3): a recovery quest, the core quest, the reading, the side quests. */
const ORDER: readonly QuestView['slot'][] = ['recovery', 'core', 'article', 'side1', 'side2'];

/** Today's open quests in that order, without those `skip` names (the side quests a Trial seals). */
export function openQuests(today: TodayView, skip: (q: QuestView) => boolean = () => false): QuestView[] {
  return [...today.quests].sort((a, b) => ORDER.indexOf(a.slot) - ORDER.indexOf(b.slot)).filter((q) => q.completedAt === null && !skip(q));
}

/**
 * The one quest Today puts first, with the only bright button (M12 decision 3), or none once the day is done: side
 * quests are extras then. A reading whose article hasn't arrived waits behind the side quests.
 */
export function upNext(today: TodayView, skip: (q: QuestView) => boolean = () => false): QuestView | null {
  if (dayCleared(today)) return null;
  const open = openQuests(today, skip);
  return open.find((q) => q.slot !== 'article' || today.article !== null) ?? open[0] ?? null;
}

/** A check-off quest Today can clear from its row (M10c decision 6; M12: the check circle): open, `tap`, not the reading, not sealed. */
export const quickClearable = (quest: QuestView, sealed: boolean): boolean =>
  quest.completedAt === null && quest.completion === 'tap' && quest.slot !== 'article' && !sealed;
