import { DIFFICULTY_CHOICES, NOTIFY_TEXT, ONBOARDING_TEXT, PLAY_TEXT, SETTINGS_TEXT, VOICE_NAMES } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { DEFAULT_NOTIFY } from '../src/notify/settings.ts';
import type { Permission } from '../src/notify/types.ts';
import { DeleteCharacter } from '../src/screens/DeleteCharacter.tsx';
import { GameSettings } from '../src/screens/GameSettings.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { adjustState, profileRow } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const G = SETTINGS_TEXT.game;

describe('Your game (M7b decision 2)', () => {
  it('Save waits for a change, then sends all four values at once and closes', async () => {
    const view = project(adjustState(), []);
    const store = testStore({ view });
    const onDone = jest.fn();
    await render(withStore(store, <GameSettings onDone={onDone} onBack={jest.fn()} />));
    const save = () => screen.getByRole('button', { name: G.save });
    expect(save().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByText(VOICE_NAMES.questmaster));
    await fireEvent.press(screen.getByRole('button', { name: `${G.dayEnd} 30 minutes later` }));
    await fireEvent.press(screen.getByRole('radio', { name: '40 minutes a day' }));
    await fireEvent.press(screen.getByText(DIFFICULTY_CHOICES.hard.name));
    await fireEvent.press(save());
    expect(store.getState().enqueue).toHaveBeenCalledWith({
      type: 'settings', voice: 'questmaster', boundaryMinutes: (view.profile.boundaryMinutes + 30) % 1440, minutesPerDay: 40, difficulty: 'hard',
    });
    expect(onDone).toHaveBeenCalled();
  });

  it('a day end off the half hour starts at the nearest one, so a save is never refused (review)', async () => {
    const view = project(adjustState({ profile: profileRow(undefined, { boundary_minutes: 255 }) }), []);
    const store = testStore({ view });
    await render(withStore(store, <GameSettings onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByRole('button', { name: G.save }).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByText(VOICE_NAMES.questmaster));
    await fireEvent.press(screen.getByRole('button', { name: G.save }));
    expect(store.getState().enqueue).toHaveBeenCalledWith(expect.objectContaining({ voice: 'questmaster', boundaryMinutes: 270 }));
  });

  it('at 10 minutes says workouts need 25, as onboarding does', async () => {
    await render(withStore(testStore({ view: project(adjustState(), []) }), <GameSettings onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.queryByText(ONBOARDING_TEXT.rhythm.workouts)).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: '10 minutes a day' }));
    expect(screen.getByText(ONBOARDING_TEXT.rhythm.workouts)).toBeTruthy();
  });

  it('before the first state: preparing, and a way back', async () => {
    const onBack = jest.fn();
    await render(withStore(testStore({ view: null }), <GameSettings onDone={jest.fn()} onBack={onBack} />));
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.quest.back }));
    expect(onBack).toHaveBeenCalled();
  });
});

const D = SETTINGS_TEXT.delete;

describe('Delete your character (M7b decision 3)', () => {
  it('says what goes, asks a second time, then deletes and leaves', async () => {
    const deleteCharacter = jest.fn(async () => ({ ok: true as const }));
    const onDeleted = jest.fn();
    await render(withStore(testStore({ account: { kind: 'guest' }, deleteCharacter }), <DeleteCharacter onDeleted={onDeleted} onBack={jest.fn()} />));
    expect(screen.getByText(D.what)).toBeTruthy();
    expect(screen.getByText(D.guest)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: D.start }));
    expect(deleteCharacter).not.toHaveBeenCalled();
    expect(screen.getByText(D.sure)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: D.yes }));
    expect(deleteCharacter).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalled();
  });

  it('a character saved with Google: the sign-in stays, and the screen says so', async () => {
    await render(withStore(testStore({ account: { kind: 'saved', email: 'rin@example.com' } }), <DeleteCharacter onDeleted={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(D.google)).toBeTruthy();
    expect(screen.queryByText(D.guest)).toBeNull();
  });

  it('"Keep my character" sends nothing; a delete that fails says why and leaves nothing changed', async () => {
    const deleteCharacter = jest.fn(async () => ({ ok: false as const, code: 'network' }));
    const onDeleted = jest.fn();
    await render(withStore(testStore({ deleteCharacter }), <DeleteCharacter onDeleted={onDeleted} onBack={jest.fn()} />));
    await fireEvent.press(screen.getByRole('button', { name: D.start }));
    await fireEvent.press(screen.getByRole('button', { name: D.keep }));
    expect(deleteCharacter).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: D.start }));
    await fireEvent.press(screen.getByRole('button', { name: D.yes }));
    expect(await screen.findByText(D.network)).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe('Settings → Account and Game (M7b)', () => {
  const settings = (onGame = jest.fn(), onDelete = jest.fn()) => (
    <Settings onBack={() => {}} onTraining={() => {}} onGame={onGame} onDelete={onDelete} version="0.1.0" deviceZone="Asia/Manila" />
  );

  it('opens Your game and Delete my character', async () => {
    const onGame = jest.fn();
    const onDelete = jest.fn();
    await render(withStore(testStore({ view: project(adjustState(), []) }), settings(onGame, onDelete)));
    await fireEvent.press(screen.getByRole('button', { name: G.open }));
    expect(onGame).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: SETTINGS_TEXT.account.delete }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('with the sign-in gone for good: the start-again card, and no delete (decision 4)', async () => {
    const store = testStore({ signInLost: true });
    await render(withStore(store, settings()));
    await fireEvent.press(screen.getByRole('button', { name: 'Start again as a new guest' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Yes, start again' }));
    expect(store.getState().startOver).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: SETTINGS_TEXT.account.delete })).toBeNull();
  });
});

describe('Settings → Notifications section (M7d, S1 board)', () => {
  const show = async (permission: Permission, onNotifications = jest.fn()) => {
    const store = testStore({ view: project(adjustState(), []), permission, notify: { ...DEFAULT_NOTIFY, optedIn: true, briefing: { on: true, minutes: 450 } } });
    await render(withStore(store,
      <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} onNotifications={onNotifications} version="0.1.0" deviceZone="Asia/Manila" />));
    return onNotifications;
  };

  it('shows the briefing and the evening reminder, and opens the notifications', async () => {
    const onNotifications = await show('granted');
    expect(screen.getByText(`${NOTIFY_TEXT.briefing} · 7:30 AM`)).toBeTruthy();
    expect(screen.getByText(`${NOTIFY_TEXT.evening} · ${NOTIFY_TEXT.off}`)).toBeTruthy();
    expect(screen.getByText(NOTIFY_TEXT.eveningNote)).toBeTruthy();
    await fireEvent.press(screen.getByText(NOTIFY_TEXT.open));
    expect(onNotifications).toHaveBeenCalled();
  });

  it('says Off until the phone allows them', async () => {
    await show('ask');
    expect(screen.getByText(`${NOTIFY_TEXT.briefing} · ${NOTIFY_TEXT.off}`)).toBeTruthy();
  });

  it("names the phone's settings once they turned notifications off", async () => {
    await show('denied');
    expect(screen.getByText(`${NOTIFY_TEXT.briefing} · ${NOTIFY_TEXT.blocked}`)).toBeTruthy();
  });
});

describe('Settings → Game → Haptics (M10b decision 4)', () => {
  const settings = () => <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} version="0.4.0" deviceZone="Asia/Manila" />;

  it('a switch under Your game, on by default, with its line; flipping it applies at once', async () => {
    const store = testStore({ view: project(adjustState(), []) });
    await render(withStore(store, settings()));
    const toggle = screen.getByRole('switch', { name: SETTINGS_TEXT.haptics.label });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(SETTINGS_TEXT.haptics.line)).toBeTruthy();
    await fireEvent.press(toggle);
    expect(store.getState().setHaptics).toHaveBeenCalledWith(false);
  });

  it('kept off, it shows off, and turns back on', async () => {
    const store = testStore({ view: project(adjustState(), []), haptics: false });
    await render(withStore(store, settings()));
    const toggle = screen.getByRole('switch', { name: SETTINGS_TEXT.haptics.label });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(toggle);
    expect(store.getState().setHaptics).toHaveBeenCalledWith(true);
  });
});
