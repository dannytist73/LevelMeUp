// Settings → Notifications as this phone keeps them (M7d decision 2): under `lmu.notify`, never on the server. Anything
// unreadable falls back to the defaults: everything off, timer alerts on once the phone allows notifications.
import type { NotifySettings } from './types.ts';

export const NOTIFY_KEY = 'lmu.notify';

export const DEFAULT_NOTIFY: NotifySettings = {
  briefing: { on: false, minutes: 7 * 60 + 30 },
  evening: { on: false, minutes: 20 * 60 },
  timers: true,
};

const isMinutes = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 24 * 60;

function readSlot(raw: unknown, fallback: { on: boolean; minutes: number }): { on: boolean; minutes: number } {
  if (typeof raw !== 'object' || raw === null) return fallback;
  const { on, minutes } = raw as { on?: unknown; minutes?: unknown };
  return { on: typeof on === 'boolean' ? on : fallback.on, minutes: isMinutes(minutes) ? minutes : fallback.minutes };
}

export function readNotify(text: string | null): NotifySettings {
  if (text === null) return DEFAULT_NOTIFY;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return DEFAULT_NOTIFY;
  }
  if (typeof raw !== 'object' || raw === null) return DEFAULT_NOTIFY;
  const { briefing, evening, timers } = raw as { briefing?: unknown; evening?: unknown; timers?: unknown };
  return {
    briefing: readSlot(briefing, DEFAULT_NOTIFY.briefing),
    evening: readSlot(evening, DEFAULT_NOTIFY.evening),
    timers: typeof timers === 'boolean' ? timers : DEFAULT_NOTIFY.timers,
  };
}
