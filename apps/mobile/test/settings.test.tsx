import { DIFFICULTY_CHOICES, ONBOARDING_TEXT, PLAY_TEXT, SETTINGS_TEXT, VOICE_NAMES } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { GameSettings } from '../src/screens/GameSettings.tsx';
import { adjustState } from './support/fixtures.ts';
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
