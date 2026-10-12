/** @jest-environment node */
import { Linking } from 'react-native';
import { NOTIFY_TEXT } from '@levelmeup/content';
import { CHANNELS, expoNotes, listenTaps } from '../src/notify/os.ts';
import type { PlannedNote } from '../src/notify/types.ts';

const mockRemove = jest.fn();
const mockNotifications = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async (_id: string, _channel?: unknown): Promise<null> => null),
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  dismissAllNotificationsAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  getLastNotificationResponse: jest.fn((): unknown => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn((_listener: (response: unknown) => void) => ({ remove: mockRemove })),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
};
jest.mock('expo-notifications', () => mockNotifications);

const tap = (url: unknown) => ({ notification: { request: { content: { data: { url } } } } });
const N = mockNotifications;

beforeEach(() => jest.clearAllMocks());

describe("the phone's notifications (the only file that imports expo-notifications)", () => {
  it('reads the permission without asking: granted, may still ask, or refused for good', async () => {
    N.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted', canAskAgain: true });
    expect(await expoNotes.permission()).toBe('granted');
    N.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined', canAskAgain: true });
    expect(await expoNotes.permission()).toBe('ask');
    N.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied', canAskAgain: false });
    expect(await expoNotes.permission()).toBe('denied');
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('makes the two channels before it asks (Android 13 shows its prompt only after one exists)', async () => {
    const order: string[] = [];
    N.setNotificationChannelAsync.mockImplementation(async (id: string) => { order.push(id); return null; });
    N.requestPermissionsAsync.mockImplementation(async () => { order.push('ask'); return { status: 'granted', canAskAgain: true }; });
    expect(await expoNotes.ask()).toBe('granted');
    expect(order).toEqual([CHANNELS.reminders, CHANNELS.timers, 'ask']);
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith(CHANNELS.reminders, { name: NOTIFY_TEXT.channels.reminders, importance: 3 });
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith(CHANNELS.timers, { name: NOTIFY_TEXT.channels.timers, importance: 4 });
  });

  it('replaces the plan: shows them while the app is open, cancels, then schedules each at its time on its channel', async () => {
    const notes: PlannedNote[] = [
      { id: 'briefing:2', kind: 'briefing', at: 1_000, title: 'Day 2', body: 'b', url: '/', channel: 'reminders' },
      { id: 'timer:9', kind: 'timer', at: 2_000, title: 'Walk', body: 't', url: '/quest/9', channel: 'timers' },
    ];
    await expoNotes.replace(notes);
    const handler = N.setNotificationHandler.mock.calls[0]![0] as { handleNotification: () => Promise<unknown> };
    expect(await handler.handleNotification()).toEqual({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false });
    expect(N.cancelAllScheduledNotificationsAsync.mock.invocationCallOrder[0]!).toBeLessThan(N.scheduleNotificationAsync.mock.invocationCallOrder[0]!);
    expect(N.scheduleNotificationAsync.mock.calls).toEqual([
      [{ identifier: 'briefing:2', content: { title: 'Day 2', body: 'b', data: { url: '/' } }, trigger: { type: 'date', date: 1_000, channelId: CHANNELS.reminders } }],
      [{ identifier: 'timer:9', content: { title: 'Walk', body: 't', data: { url: '/quest/9' } }, trigger: { type: 'date', date: 2_000, channelId: CHANNELS.timers } }],
    ]);
  });

  it("cancels everything, shown ones too, and opens LevelMeUp's own page in the phone's settings", async () => {
    await expoNotes.cancelAll();
    expect(N.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(N.dismissAllNotificationsAsync).toHaveBeenCalledTimes(1); // and those already in the shade (decision 9)
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await expoNotes.openSettings();
    expect(open).toHaveBeenCalled();
  });

  it('opens the screen of the tap that launched the app, once, then of each new tap; only its own kinds of screen', () => {
    N.getLastNotificationResponse.mockReturnValueOnce(tap('/quest/12'));
    const go = jest.fn();
    const stop = listenTaps(go);
    expect(go).toHaveBeenCalledWith('/quest/12');
    expect(N.clearLastNotificationResponse).toHaveBeenCalled();
    const listener = N.addNotificationResponseReceivedListener.mock.calls[0]![0];
    listener(tap('/'));
    listener(tap('https://example.com'));
    listener(tap(42));
    listener(tap('/quest/-3'));
    expect(go.mock.calls).toEqual([['/quest/12'], ['/'], ['/quest/-3']]);
    expect(N.clearLastNotificationResponse).toHaveBeenCalledTimes(5); // each one, so a remount after Back can't repeat it
    stop();
    expect(mockRemove).toHaveBeenCalled();
  });
});
