// What the home-screen widget shows (M10c decision 9), as a small snapshot the app keeps on the phone: the widget's own
// task draws from it when the app isn't running, so it holds words, not the game. Pure, so the app and the task agree.
import { WIDGET_TEXT, authoredTemplate, fillText } from '@levelmeup/content';
import type { Shown } from '../game/project.ts';
import { dayCleared, shownStreak } from '../game/today.ts';

export const WIDGET_KEY = 'lmu.widget';
export const WIDGET_NAME = 'Today';

export type WidgetSnapshot = {
  day: number;
  streak: number;
  /** The core quest's title in the player's voice, or null when the day has none. */
  core: string | null;
  coreCleared: boolean;
  done: number;
  total: number;
  /** M12 decision 2: the day's must-do quests are cleared (missing in a snapshot from before: every quest then). */
  dayDone?: boolean;
  /** When the day ends (epoch ms): after it, the widget says a new day is ready. */
  endsAt: number;
};

export function widgetSnapshot(view: Pick<Shown, 'today' | 'character' | 'profile'> | null): WidgetSnapshot | null {
  const today = view?.today ?? null;
  if (view === null || today === null || today.endsAt === null || today.quests.length === 0) return null;
  const core = today.quests.find((q) => q.slot === 'core') ?? null;
  return {
    day: today.dayNumber,
    streak: shownStreak(view).current,
    core: core === null ? null : authoredTemplate(core.templateId).voice[view.profile.voice].title,
    coreCleared: core !== null && core.completedAt !== null,
    done: today.quests.filter((q) => q.completedAt !== null).length,
    total: today.quests.length,
    dayDone: dayCleared(today),
    endsAt: Date.parse(today.endsAt),
  };
}

export function readSnapshot(raw: string | null): WidgetSnapshot | null {
  if (raw === null) return null;
  try {
    const s = JSON.parse(raw) as Partial<WidgetSnapshot> | null;
    if (s === null || typeof s !== 'object') return null;
    const ok = typeof s.day === 'number' && typeof s.streak === 'number' && (s.core === null || typeof s.core === 'string')
      && typeof s.coreCleared === 'boolean' && typeof s.done === 'number' && typeof s.total === 'number' && typeof s.endsAt === 'number'
      && (s.dayDone === undefined || typeof s.dayDone === 'boolean');
    return ok ? (s as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}

/** The widget's lines, by when it is drawn. */
export type WidgetLines =
  | { kind: 'none'; line: string }
  | { kind: 'stale'; line: string; hint: string }
  /** `label` is null on a cleared day: "Day cleared" needs no "CORE QUEST" over it (emulator check). */
  | { kind: 'day'; day: string; streak: string; label: string | null; title: string; progress: string; cleared: boolean };

export function widgetLines(snap: WidgetSnapshot | null, now: number): WidgetLines {
  if (snap === null) return { kind: 'none', line: WIDGET_TEXT.none };
  if (now >= snap.endsAt) return { kind: 'stale', line: WIDGET_TEXT.newDay, hint: WIDGET_TEXT.open };
  const allDone = snap.dayDone ?? (snap.total > 0 && snap.done === snap.total);
  return {
    kind: 'day',
    day: fillText(WIDGET_TEXT.day, { day: snap.day }),
    streak: fillText(WIDGET_TEXT.streak, { n: snap.streak }),
    label: allDone || snap.core === null ? null : WIDGET_TEXT.core,
    title: allDone ? WIDGET_TEXT.dayCleared : (snap.core ?? WIDGET_TEXT.dayCleared),
    progress: fillText(WIDGET_TEXT.progress, { done: snap.done, total: snap.total }),
    cleared: allDone || snap.coreCleared,
  };
}
