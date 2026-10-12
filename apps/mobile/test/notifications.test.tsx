import { NOTIFY_TEXT, fillText } from '@levelmeup/content';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { project } from '../src/game/project.ts';
import { DEFAULT_NOTIFY } from '../src/notify/settings.ts';
import type { NotifySettings, Permission } from '../src/notify/types.ts';
import { Notifications } from '../src/screens/Notifications.tsx';
import type { GameState } from '../src/state/store.ts';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const T = NOTIFY_TEXT;
const BRIEFING_ON: NotifySettings = { ...DEFAULT_NOTIFY, optedIn: true, briefing: { on: true, minutes: 7 * 60 + 30 } };

async function show(over: Partial<GameState> = {}) {
  const store = testStore({ view: project(serverState(), []), ...over });
  const onOpenSettings = jest.fn();
  await render(withStore(store, <Notifications onBack={jest.fn()} onOpenSettings={onOpenSettings} />));
  return { store, onOpenSettings };
}
const toggle = (label: string) => screen.getByRole('switch', { name: label });

describe('Settings → Notifications (M7d)', () => {
  it('shows each switch off until the phone allows notifications', async () => {
    await show({ permission: 'ask', notify: BRIEFING_ON });
    expect(toggle(T.briefing)).not.toBeChecked();
    expect(toggle(T.timers)).not.toBeChecked();
    expect(screen.getByText(T.lead)).toBeTruthy();
    expect(screen.getByText(T.late)).toBeTruthy();
  });

  it('turning one on asks first; "Allow notifications" asks the phone, then turns it on', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const { store } = await show({ permission: 'ask' });
    await fireEvent.press(toggle(T.briefing));
    expect(screen.getByText(T.ask.title)).toBeTruthy();
    expect(announce).toHaveBeenCalledWith(`${T.ask.title} ${T.ask.line}`); // the card shows at the top; a screen reader hears it
    announce.mockRestore();
    expect(store.getState().setNotify).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(T.ask.allow));
    await waitFor(() => expect(store.getState().setNotify).toHaveBeenCalledWith(BRIEFING_ON));
    expect(store.getState().allowNotify).toHaveBeenCalled();
  });

  it('"Not now" leaves it off and asks the phone nothing', async () => {
    const { store } = await show({ permission: 'ask' });
    await fireEvent.press(toggle(T.evening));
    await fireEvent.press(screen.getByText(T.ask.notNow));
    expect(screen.queryByText(T.ask.title)).toBeNull();
    expect(store.getState().allowNotify).not.toHaveBeenCalled();
    expect(store.getState().setNotify).not.toHaveBeenCalled();
  });

  it('when the phone says no, the switch stays off', async () => {
    const allowNotify = jest.fn(async (): Promise<Permission> => 'denied');
    const { store } = await show({ permission: 'ask', allowNotify });
    await fireEvent.press(toggle(T.briefing));
    await fireEvent.press(screen.getByText(T.ask.allow));
    await waitFor(() => expect(allowNotify).toHaveBeenCalled());
    expect(store.getState().setNotify).not.toHaveBeenCalled();
  });

  it('with notifications allowed, a switch turns it on at once and shows its time, in half hours', async () => {
    const { store } = await show({ notify: BRIEFING_ON });
    expect(toggle(T.briefing)).toBeChecked();
    expect(toggle(T.timers)).toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: `${T.briefingAt} 30 minutes later` }));
    expect(store.getState().setNotify).toHaveBeenCalledWith({ ...BRIEFING_ON, briefing: { on: true, minutes: 8 * 60 } });
    await fireEvent.press(toggle(T.evening));
    expect(store.getState().setNotify).toHaveBeenLastCalledWith({ ...BRIEFING_ON, evening: { on: true, minutes: 20 * 60 } });
    await fireEvent.press(toggle(T.timers));
    expect(store.getState().setNotify).toHaveBeenLastCalledWith({ ...BRIEFING_ON, timers: false });
  });

  it('before the player turns one on, a phone that allows them from install (Android 12 and older) shows them off', async () => {
    const { store } = await show({ permission: 'granted', notify: DEFAULT_NOTIFY });
    expect(toggle(T.timers)).not.toBeChecked();
    await fireEvent.press(toggle(T.timers));
    expect(screen.queryByText(T.ask.title)).toBeNull();
    expect(store.getState().setNotify).toHaveBeenCalledWith({ ...DEFAULT_NOTIFY, optedIn: true, timers: true });
  });

  it("refused for good: says so, opens the phone's settings, and never asks", async () => {
    const { store, onOpenSettings } = await show({ permission: 'denied' });
    expect(screen.getByText(T.denied.line)).toBeTruthy();
    expect(toggle(T.briefing)).toBeDisabled();
    await fireEvent.press(screen.getByText(T.denied.open));
    expect(onOpenSettings).toHaveBeenCalled();
    await fireEvent.press(toggle(T.briefing));
    expect(screen.queryByText(T.ask.title)).toBeNull();
    expect(store.getState().allowNotify).not.toHaveBeenCalled();
  });

  it("names the Shadow's reminder only at Pact level 2, an hour after the evening time", async () => {
    const view = project(serverState(), []);
    await show({ view: { ...view, profile: { ...view.profile, accountabilityLevel: 2 } }, notify: BRIEFING_ON });
    expect(screen.getByText(T.shadowTitle)).toBeTruthy();
    expect(screen.getByText(fillText(T.shadowNote, { time: '9:00 PM' }))).toBeTruthy();
  });

  it("says nothing of the Shadow's reminder while none can come", async () => {
    const view = project(serverState(), []);
    const level2 = { ...view, profile: { ...view.profile, accountabilityLevel: 2 as const } };
    await show({ view: level2, notify: BRIEFING_ON, permission: 'ask' });
    expect(screen.queryByText(T.shadowTitle)).toBeNull();
  });

  it('says nothing of the Shadow below level 2', async () => {
    await show();
    expect(screen.queryByText(T.shadowTitle)).toBeNull();
  });
});
