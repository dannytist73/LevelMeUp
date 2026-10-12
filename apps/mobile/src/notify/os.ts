// The one file that imports expo-notifications (M7d decision 3; MAINARC's seam). No rules, no dates, no words of its
// own: what to show and when comes from plan.ts. Loaded at the first call, so screens and tests that never touch
// notifications never load the native module.
import { NOTIFY_TEXT } from '@levelmeup/content';
import type * as ExpoNotifications from 'expo-notifications';
import { Linking } from 'react-native';
import type { NoteOs, Permission, PlannedNote } from './types.ts';

const lib = (): typeof ExpoNotifications => require('expo-notifications');

export const CHANNELS = { reminders: 'lmu-reminders', timers: 'lmu-timers' } as const;

const toPermission = (p: { status: string; canAskAgain: boolean }): Permission =>
  p.status === 'granted' ? 'granted' : p.canAskAgain ? 'ask' : 'denied';

/** Idempotent. Android 13+ shows its permission prompt only once a channel exists (decision 5); elsewhere a no-op. */
async function ensureChannels(): Promise<void> {
  const n = lib();
  await n.setNotificationChannelAsync(CHANNELS.reminders, { name: NOTIFY_TEXT.channels.reminders, importance: n.AndroidImportance.DEFAULT });
  await n.setNotificationChannelAsync(CHANNELS.timers, { name: NOTIFY_TEXT.channels.timers, importance: n.AndroidImportance.HIGH });
}

/** Without a handler, expo-notifications drops a notification due while the app is open (decision 6). */
function ensureHandler(): void {
  lib().setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export const expoNotes: NoteOs = {
  permission: async () => toPermission(await lib().getPermissionsAsync()),
  ask: async () => {
    await ensureChannels();
    return toPermission(await lib().requestPermissionsAsync());
  },
  replace: async (notes: readonly PlannedNote[]) => {
    const n = lib();
    ensureHandler();
    await ensureChannels();
    await n.cancelAllScheduledNotificationsAsync();
    for (const note of notes) {
      await n.scheduleNotificationAsync({
        identifier: note.id,
        content: { title: note.title, body: note.body, data: { url: note.url } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: note.at, channelId: CHANNELS[note.channel] },
      });
    }
  },
  cancelAll: async () => {
    await lib().cancelAllScheduledNotificationsAsync();
  },
  openSettings: () => Linking.openSettings(),
};

/** Only the screens the planner names (decision 7). */
const SCREEN = /^\/(quest\/-?\d+)?$/;

type Tap = { notification: { request: { content: { data?: unknown } } } } | null;

/**
 * Taps open the screen a notification names: the one that launched the app, then each new one. Each is cleared once
 * followed: a tap stays the phone's "last response", and Android remounts the app after Back, which would repeat it.
 * Returns the unsubscribe.
 */
export function listenTaps(go: (url: string) => void): () => void {
  const n = lib();
  const open = (response: Tap): void => {
    const data = response?.notification.request.content.data as { url?: unknown } | null | undefined;
    if (typeof data?.url === 'string' && SCREEN.test(data.url)) go(data.url);
    n.clearLastNotificationResponse();
  };
  open(n.getLastNotificationResponse() as Tap);
  const subscription = n.addNotificationResponseReceivedListener((response) => open(response as Tap));
  return () => subscription.remove();
}
