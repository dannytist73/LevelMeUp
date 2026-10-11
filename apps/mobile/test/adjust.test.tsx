import { ADJUST_TEXT, fillText } from '@levelmeup/content';
import { newLadder } from '@levelmeup/rules';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { DayActions, DayBanners, PausedExercises } from '../src/screens/DayActions.tsx';
import { adjustState, characterRow, ladderRows, profileRow } from './support/fixtures.ts';

const A = ADJUST_TEXT;
const shown = (state: ServerState = adjustState()) => project(state, []);
const actions = (view = shown(), enqueue = jest.fn(async () => {}), onSwap = jest.fn(), onVanish = jest.fn()) =>
  <DayActions view={view} enqueue={enqueue} onSwap={onSwap} onVanish={onVanish} />;

describe("Today's adjustments (M6b)", () => {
  it('offers swap, hard day and rest; each confirm says what happens, then sends its event', async () => {
    const enqueue = jest.fn(async () => {});
    const onSwap = jest.fn();
    await render(actions(shown(), enqueue, onSwap));
    await fireEvent.press(screen.getByRole('button', { name: 'Swap · 1 left' }));
    expect(onSwap).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: A.day.hardDay }));
    expect(screen.getByText(A.hardDay.explain)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.hardDay.confirm }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'hard_day', dayId: 2 });
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    await fireEvent.press(screen.getByRole('button', { name: A.rest.confirm }));
    expect(enqueue).toHaveBeenLastCalledWith({ type: 'plan_rest', dayId: 2 });
  });

  it('"Not now" sends nothing; over the rest limit the confirm explains instead', async () => {
    const enqueue = jest.fn(async () => {});
    const view = shown();
    await render(actions({ ...view, today: { ...view.today!, restAllowed: false } }, enqueue));
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.getByText(A.rest.limit)).toBeTruthy();
    expect(screen.queryByRole('button', { name: A.rest.confirm })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.day.notNow }));
    expect(screen.getByRole('button', { name: A.day.hardDay })).toBeTruthy();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('hides what the day no longer allows: no swap left, already a hard day, already protected', async () => {
    await render(actions(shown(adjustState({}, { swaps_used: 1, hard_day: true, protection: 'planned_rest' }))));
    expect(screen.queryByRole('button', { name: /Swap ·/ })).toBeNull();
    expect(screen.queryByRole('button', { name: A.day.hardDay })).toBeNull();
    expect(screen.queryByRole('button', { name: A.day.rest })).toBeNull();
  });

  it('a Monk at level 5 gets Stillness; a Rogue at level 10 gets Vanish', async () => {
    const enqueue = jest.fn(async () => {});
    const monk = shown(adjustState({ profile: profileRow(undefined, { class_id: 'monk' }), character: characterRow({ xp_vitality: 240 }) }));
    const view = await render(actions(monk, enqueue));
    await fireEvent.press(screen.getByRole('button', { name: 'Stillness' }));
    expect(screen.getByText(A.abilities.stillness)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Use Stillness' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'ability', dayId: 2, ability: 'stillness' });
    const onVanish = jest.fn();
    const rogue = shown(adjustState({ profile: profileRow(undefined, { class_id: 'rogue' }), character: characterRow({ xp_focus: 990 }) }));
    await view.rerender(actions(rogue, enqueue, jest.fn(), onVanish));
    await fireEvent.press(screen.getByRole('button', { name: A.day.vanish }));
    expect(onVanish).toHaveBeenCalled();
  });

  it('the banners say what kind of day it is; a resting exercise offers Resume', async () => {
    const enqueue = jest.fn(async () => {});
    const view = shown(adjustState({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) }, { hard_day: true, protection: 'pain' }));
    await render(<><DayBanners today={view.today!} /><PausedExercises view={view} enqueue={enqueue} /></>);
    expect(screen.getByText(A.hardDay.banner)).toBeTruthy();
    expect(screen.getByText(A.pain.restBanner)).toBeTruthy();
    expect(screen.getByText(fillText(A.paused.line, { name: 'Push-ups' }))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Resume Push-ups' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'resume', ladderId: 'push' });
  });
});
