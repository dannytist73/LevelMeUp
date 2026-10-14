// What Today says about the day as it stands (M10c): whether it already counts for the streak, the streak to show, the
// next quest, whether the day is cleared, and which quests a hold on Today can clear.
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

/** Every quest of the day is cleared. */
export const dayCleared = (today: TodayView): boolean => today.quests.length > 0 && today.quests.every((q) => q.completedAt !== null);

/** The XP today's cleared quests earned. */
export const xpToday = (today: TodayView): number =>
  today.quests.filter((q) => q.completedAt !== null).reduce((sum, q) => sum + Object.values(q.xp).reduce((s, x) => s + (x ?? 0), 0), 0);

/** The first open quest after the core quest is cleared: the one Today marks "Next". None while the core quest is open. */
export function nextQuest(today: TodayView): QuestView | null {
  const core = today.quests.find((q) => q.slot === 'core');
  if (core !== undefined && core.completedAt === null) return null;
  const order: QuestView['slot'][] = ['recovery', 'side1', 'side2', 'article'];
  return [...today.quests].sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot)).find((q) => q.slot !== 'core' && q.completedAt === null) ?? null;
}

/** A check-off quest Today can clear with a hold (M10c decision 6): open, `tap`, not the reading, not sealed. */
export const quickClearable = (quest: QuestView, sealed: boolean): boolean =>
  quest.completedAt === null && quest.completion === 'tap' && quest.slot !== 'article' && !sealed;
