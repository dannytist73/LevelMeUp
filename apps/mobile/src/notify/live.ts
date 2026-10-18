// M12 (plan decision 12): the live timers in the notification shade, through LevelMeUp's own native module
// (modules/lmu-live-timer). The one file that reaches it. It is looked up at the first call, and a build without it (an
// older APK, the tests) has none: then nothing shows and nothing throws. The store decides what may show (the
// notifications the player turned on, and the phone's permission) with `setLiveAllowed`, as the Haptics switch does.
import { NOTIFY_TEXT } from '@levelmeup/content';
import { requireOptionalNativeModule } from 'expo';

type Native = {
  show: (id: number, title: string, text: string, at: number, countDown: boolean, channelName: string) => boolean;
  clear: (id: number) => void;
};

/** One live timer: counting down to `at`. */
export type LiveTimer = { id: number; title: string; text: string; at: number };

/** The rest between sets has one id of its own; quest timers use their quest's (an offline quest's id is negative). */
export const REST_LIVE_ID = 1;
export const liveId = (questId: number): number => (questId > 0 ? 1_000 + questId : 500 - questId);

let native: Native | null | undefined;
const lib = (): Native | null => {
  if (native === undefined) {
    try {
      // Android only: anywhere else there is no such module, so this is null.
      native = requireOptionalNativeModule<Native>('LmuLiveTimer');
    } catch {
      native = null;
    }
  }
  return native;
};

let allowed = false;
/** The ids shown now, so a sync clears the ones that stopped. */
const shown = new Set<number>();

/** Whether live timers may show (the store: notifications turned on, timers on, the phone's permission granted). */
export function setLiveAllowed(on: boolean): void {
  allowed = on;
  if (!on) for (const id of [...shown]) clear(id);
}

export function showLive(timer: LiveTimer, now: number = Date.now()): void {
  if (!allowed || timer.at <= now) return;
  try {
    if (lib()?.show(timer.id, timer.title, timer.text, timer.at, true, NOTIFY_TEXT.live.channel) === true) shown.add(timer.id);
  } catch {
    // A phone that refuses shows nothing.
  }
}

export function clear(id: number): void {
  shown.delete(id);
  try {
    lib()?.clear(id);
  } catch {
    // Nothing to clear.
  }
}

/** The quest timers that should show now; the others go. The rest between sets is left alone. */
export function syncLive(timers: readonly LiveTimer[], now: number = Date.now()): void {
  const keep = new Set(timers.map((t) => t.id));
  for (const id of [...shown]) if (id !== REST_LIVE_ID && !keep.has(id)) clear(id);
  for (const t of timers) showLive(t, now);
}
