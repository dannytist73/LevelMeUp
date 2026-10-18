// Which notifications should be pending now (M7d decisions 3–4; MAINARC's pattern). Pure: no React, no native module, no
// clock (`nowMs` is an input), so every rule and every word is tested here. Days ahead are planned blind: only the
// running day knows its core quest, its timers and the Shadow; tomorrow knows only a rest planned for it.
import { NOTIFY_TEXT, authoredTemplate, briefingWords, eveningWords, shadowEveningWords, timerWords } from '@levelmeup/content';
import type { Voice } from '@levelmeup/content';
import { elapsedMs, nextBoundaryAtOrAfter, nextDayWindow } from '@levelmeup/rules';
import type { DayWindow } from '@levelmeup/rules';
import { timerTargetMs } from '../../../../supabase/functions/_shared/events.ts';
import { shadowHold } from '../game/pact.ts';
import type { Shown } from '../game/project.ts';
import { plusOf } from '../plus/plus.ts';
import type { TimerState } from '../quest/timer.ts';
import type { NotifySettings, PlannedNote } from './types.ts';
import { liveId } from './live.ts';
import type { LiveTimer } from './live.ts';

/** The running quest day and the next six get a briefing. */
export const HORIZON_DAYS = 7;
/** The running day and the next one get an evening reminder (decision 4). */
export const EVENING_DAYS = 2;
const MINUTE = 60_000;
/**
 * The Shadow's reminder: an hour after the evening time, never later than 30 minutes before the day ends, and never
 * before the evening time itself.
 */
export const SHADOW_AFTER_MS = 60 * MINUTE;
export const SHADOW_LAST_MS = 30 * MINUTE;
/** M13: a Plus free trial's reminder comes two days before it ends ("Day 5" of seven, on the offer screen). */
export const TRIAL_NOTE_BEFORE_MS = 2 * 24 * 60 * MINUTE;

export type PlanTimer = { questId: number; title: string; doneAt: number };

/** M12 (plan decision 12): the running quest timers as live countdowns, when the timer notes are on. */
export function planLive(p: PlanInput): LiveTimer[] {
  if (!p.settings.optedIn || !p.settings.timers) return [];
  return p.timers.filter((t) => t.doneAt > p.nowMs).map((t) => ({ id: liveId(t.questId), title: t.title, text: NOTIFY_TEXT.live.timer, at: t.doneAt }));
}

export type PlanInput = {
  settings: NotifySettings;
  voice: Voice;
  nowMs: number;
  /** The profile's day end, for the days ahead (rules: nextDayWindow). */
  boundaryMinutes: number;
  today: {
    dayNumber: number;
    window: DayWindow;
    /** A planned rest day (M7b): the briefing says so, and no reminder comes. */
    restDay: boolean;
    /** Nothing more is asked of today: its core quest is cleared, or the day is protected another way (pain, no quests). */
    settled: boolean;
  };
  /** The next quest day is a planned rest day (M7b's "Rest tomorrow"). */
  restTomorrow: boolean;
  /** Level 2's Trial holds today and the recovery quest isn't cleared (M7c). */
  shadowEvening: boolean;
  /** Running timers of today's open quests. */
  timers: readonly PlanTimer[];
  /** M13: when a Plus free trial ends, or null without one. */
  trialEndsAt: number | null;
};

/** The first time `minutes` after local midnight shows at or after the day starts; null when the day ends first. */
function clockAt(window: DayWindow, minutes: number): number | null {
  const at = nextBoundaryAtOrAfter(window.timeZone, minutes, window.startsAt);
  return at < window.endsAt ? at : null;
}

export function planNotes(p: PlanInput): PlannedNote[] {
  if (!p.settings.optedIn) return [];
  const out: PlannedNote[] = [];
  /** Anything already due is dropped: the phone would show it the moment it was planned. */
  const push = (note: PlannedNote): void => {
    if (note.at > p.nowMs) out.push(note);
  };
  const zone = p.today.window.timeZone;
  let window = p.today.window;
  for (let k = 0; k < HORIZON_DAYS; k++) {
    if (k > 0) window = nextDayWindow(window, zone, p.boundaryMinutes);
    const day = p.today.dayNumber + k;
    const rest = k === 0 ? p.today.restDay : k === 1 && p.restTomorrow;
    const cleared = k === 0 && p.today.settled;
    if (p.settings.briefing.on && !cleared) {
      const at = clockAt(window, p.settings.briefing.minutes);
      if (at !== null) push({ id: `briefing:${day}`, kind: 'briefing', at, ...briefingWords(p.voice, day, rest), url: '/', channel: 'reminders' });
    }
    if (p.settings.evening.on && k < EVENING_DAYS && !rest && !cleared) {
      const at = clockAt(window, p.settings.evening.minutes);
      if (at !== null) push({ id: `evening:${day}`, kind: 'evening', at, ...eveningWords(p.voice, day), url: '/', channel: 'reminders' });
    }
    if (k === 0 && p.shadowEvening) {
      const evening = clockAt(window, p.settings.evening.minutes);
      if (evening !== null) {
        const at = Math.max(evening, Math.min(evening + SHADOW_AFTER_MS, window.endsAt - SHADOW_LAST_MS));
        push({ id: `shadow:${day}`, kind: 'shadow', at, ...shadowEveningWords(day), url: '/', channel: 'reminders' });
      }
    }
  }
  if (p.trialEndsAt !== null) {
    push({ id: 'trial', kind: 'trial', at: p.trialEndsAt - TRIAL_NOTE_BEFORE_MS, ...NOTIFY_TEXT.trial, url: '/settings', channel: 'reminders' });
  }
  if (p.settings.timers) {
    for (const t of p.timers) {
      push({
        id: `timer:${t.questId}`, kind: 'timer', at: t.doneAt, ...timerWords(p.voice, t.title),
        // A quest built offline has no server id yet (M6e): its screen may be gone by the time the alert is tapped.
        url: t.questId > 0 ? `/quest/${t.questId}` : '/', channel: 'timers',
      });
    }
  }
  return out.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The Shadow's reminder as a clock time (minutes after midnight) for Settings: the rule above on a 24-hour day. */
export function shadowClock(eveningMinutes: number, boundaryMinutes: number): number {
  const day = 24 * 60;
  const into = (eveningMinutes - boundaryMinutes + day) % day; // minutes into the quest day
  const at = Math.max(into, Math.min(into + SHADOW_AFTER_MS / MINUTE, day - SHADOW_LAST_MS / MINUTE));
  return (boundaryMinutes + at) % day;
}

/** The planner's input from what the phone shows; null without a quest day (before the onboarding ends). */
export function planInput(
  view: Pick<Shown, 'profile' | 'today' | 'checkin' | 'character' | 'plus'>,
  timers: Readonly<Record<number, TimerState>>,
  settings: NotifySettings,
  nowMs: number,
): PlanInput | null {
  const today = view.today;
  if (today === null || today.startsAt === null || today.endsAt === null) return null;
  const voice = view.profile.voice;
  const hold = shadowHold(view, nowMs);
  const core = today.quests.find((q) => q.slot === 'core');
  const endsAt = Date.parse(today.endsAt);
  const plus = plusOf(view);
  return {
    settings,
    voice,
    nowMs,
    boundaryMinutes: view.profile.boundaryMinutes,
    today: {
      dayNumber: today.dayNumber,
      window: { startsAt: Date.parse(today.startsAt), endsAt, timeZone: today.timeZone },
      restDay: today.protection === 'planned_rest',
      settled: (core !== undefined && core.completedAt !== null) || (today.protection !== null && today.protection !== 'planned_rest'),
    },
    restTomorrow: view.character.restDay === today.dayNumber + 1,
    shadowEvening: hold !== null && hold.kind === 'trial' && !hold.cleared,
    timers: today.quests.flatMap((q) => {
      const timer = timers[q.id];
      if (timer === undefined || timer.runningSince === null || q.completedAt !== null) return [];
      const doneAt = timer.runningSince + timerTargetMs(q) - elapsedMs(timer.segments);
      // The server counts no timer time past the day's end (review): a timer that would end later can't be claimed.
      return doneAt > timer.runningSince && doneAt < endsAt
        ? [{ questId: q.id, title: authoredTemplate(q.templateId).voice[voice].title, doneAt }]
        : [];
    }),
    trialEndsAt: plus.active && plus.trial && plus.endsAt !== null ? Date.parse(plus.endsAt) : null,
  };
}
