// A day this phone built offline (M6e), as the screens show it until the server's state replaces it: its quests have ids
// −1 to −4 by slot, events about them name them by day and slot, and a timer started on one moves to the server's quest
// in its slot.
import { LIBRARY } from '@levelmeup/content';
import { draftQuest, findTemplate, storedQuest } from '@levelmeup/rules';
import type { Slot } from '@levelmeup/rules';
import type { TimerState } from '../quest/timer.ts';
import type { NewEvent } from '../state/store.ts';
import type { Shown } from './project.ts';
import type { ProvisionalDayEvent, QuestView, TodayView } from './types.ts';

/** Quest ids on a day the phone built: never a server id (those are positive). */
export const OFFLINE_IDS: Readonly<Record<Slot, number>> = { core: -1, side1: -2, side2: -3, article: -4, recovery: -5 };
const SLOT_OF_ID = new Map(Object.entries(OFFLINE_IDS).map(([slot, id]) => [id, slot as Slot]));

/** Today from the phone's `provisional_day`: the quests as the server would store them, nothing to swap or offer. */
export function offlineToday(event: Omit<ProvisionalDayEvent, 'id'>): TodayView {
  return {
    id: 0,
    dayNumber: event.dayNumber,
    startsAt: new Date(event.window.startsAt).toISOString(),
    endsAt: new Date(event.window.endsAt).toISOString(),
    timeZone: event.timeZone,
    budget: event.budget,
    light: event.light,
    hardDay: false,
    protection: null,
    status: 'open',
    swapsLeft: 0,
    restAllowed: false,
    abilities: [],
    quests: event.quests.flatMap((q): QuestView[] => {
      const template = findTemplate(LIBRARY, q.templateId);
      if (template === undefined) return [];
      try {
        const stored = storedQuest(LIBRARY, draftQuest(template, q.slot, q.why, { moves: q.moves, book: q.book }));
        return [{ id: OFFLINE_IDS[q.slot], ...stored, completedAt: null, rating: null, swaps: [], gentle: null, canStepDown: false }];
      } catch {
        return []; // this app can't draft it (another content version): the server's day will show it
      }
    }),
  };
}

/** A quest of today by id; an offline id finds the quest now in its slot once the server's day replaced the phone's. */
export function findQuest(today: TodayView | null, id: number): QuestView | null {
  if (today === null) return null;
  const exact = today.quests.find((q) => q.id === id);
  if (exact !== undefined) return exact;
  const slot = SLOT_OF_ID.get(id);
  return slot === undefined ? null : (today.quests.find((q) => q.slot === slot) ?? null);
}

/**
 * An event about a quest of the offline day names it by day and slot: the server has no id for it yet (decision 7). When
 * the server's day arrived while the quest screen was open, the quest now in that slot is named by its id (review).
 */
export function withRef(event: NewEvent, view: Shown | null): NewEvent {
  if (event.type !== 'complete' && event.type !== 'undo' && event.type !== 'rate' && event.type !== 'pain') return event;
  const today = view?.today ?? null;
  if (event.instanceId === null || event.instanceId >= 0) return event;
  const quest = findQuest(today, event.instanceId);
  if (today === null || quest === null) return event;
  if (quest.id > 0) return { ...event, instanceId: quest.id };
  return { ...event, instanceId: null, ref: { dayNumber: today.dayNumber, slot: quest.slot, templateId: quest.templateId } };
}

/**
 * Timers of the offline day's quests once the server's state has that day: each moves to the server's quest in its slot
 * when that is the same template, and is dropped otherwise. Null when nothing changes.
 */
export function carriedTimers(
  timers: Readonly<Record<number, TimerState>>,
  before: Shown | null,
  after: Shown | null,
): Record<number, TimerState> | null {
  const old = before?.offline === true ? before.today : null;
  const now = after !== null && !after.offline ? after.today : null;
  if (old === null || now === null || now.dayNumber !== old.dayNumber) return null;
  const next: Record<number, TimerState> = { ...timers };
  let moved = false;
  for (const q of old.quests) {
    const state = timers[q.id];
    if (state === undefined) continue;
    delete next[q.id];
    moved = true;
    const real = now.quests.find((r) => r.slot === q.slot && r.templateId === q.templateId);
    if (real !== undefined && next[real.id] === undefined) next[real.id] = state;
  }
  return moved ? next : null;
}
