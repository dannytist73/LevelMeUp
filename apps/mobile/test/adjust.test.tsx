import { ABILITY_LINES, ADJUST_TEXT, PLAY_TEXT, authoredTemplate, fillText } from '@levelmeup/content';
import { DAY_MS, newLadder } from '@levelmeup/rules';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { AppState } from 'react-native';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { ClassChange } from '../src/screens/ClassChange.tsx';
import { DayActions, DayBanners, PausedExercises } from '../src/screens/DayActions.tsx';
import { Pain } from '../src/screens/Pain.tsx';
import { Swap } from '../src/screens/Swap.tsx';
import { Vanish } from '../src/screens/Vanish.tsx';
import { DAY_TWO_NOW, adjustState, characterRow, ladderRows, profileRow } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(async () => {}),
  deactivateKeepAwake: jest.fn(async () => {}),
}));

const A = ADJUST_TEXT;
const now = () => DAY_TWO_NOW;
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

describe('the swap sheet (spec §3.5)', () => {
  const title = (templateId: string) => authoredTemplate(templateId).voice.system.title;

  it("from a quest: lists that quest's options and sends the chosen one", async () => {
    const view = shown();
    const store = testStore({ view });
    const onDone = jest.fn();
    await render(withStore(store, <Swap questId={200} now={now} onDone={onDone} onBack={jest.fn()} />));
    const option = view.today!.quests.find((q) => q.id === 200)!.swaps[0]!;
    expect(screen.getByRole('button', { name: A.swap.choose }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByText(title(option.templateId)));
    await fireEvent.press(screen.getByRole('button', { name: A.swap.choose }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'swap', instanceId: 200, templateId: option.templateId });
    expect(onDone).toHaveBeenCalled();
  });

  it('from Today: asks which quest first', async () => {
    await render(withStore(testStore({ view: shown() }), <Swap questId={null} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(A.swap.which)).toBeTruthy();
    await fireEvent.press(screen.getByText(title('walk-1')));
    expect(screen.getByText(A.swap.options)).toBeTruthy();
  });

  it('with no swap left, says so', async () => {
    await render(withStore(testStore({ view: shown(adjustState({}, { swaps_used: 1 })) }),
      <Swap questId={200} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(A.swap.none)).toBeTruthy();
  });
});

describe('"I felt pain" (spec §3.3, §3.4)', () => {
  const completeCore = { id: '00000000-0000-4000-9000-000000000001', type: 'complete', instanceId: 200, completedAt: DAY_TWO_NOW, rating: null, payload: {} } as const;

  it('an open exercise quest: gentle movement instead, or rest; the exercise rests either way', async () => {
    const store = testStore({ view: shown() });
    const onDone = jest.fn();
    await render(withStore(store, <Pain questId={200} now={now} onDone={onDone} onBack={jest.fn()} />));
    expect(screen.getByText(fillText(A.pain.paused, { name: 'Push-ups' }))).toBeTruthy();
    expect(screen.getByText(A.pain.advice)).toBeTruthy();
    expect(screen.getByRole('button', { name: A.pain.rest })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.pain.gentle }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'pain', instanceId: 200, choice: 'gentle' });
    expect(onDone).toHaveBeenCalled();
  });

  it('from the second report in two weeks it leads with a doctor or physiotherapist', async () => {
    const store = testStore({ view: shown(adjustState({ painReports: 1 })) });
    await render(withStore(store, <Pain questId={201} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(fillText(A.pain.persists, { count: 2 }))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.pain.rest }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'pain', instanceId: 201, choice: 'rest' });
  });

  it('a cleared exercise quest can be paused; a quest with no exercise has no pain flow', async () => {
    const store = testStore({ view: project(adjustState(), [completeCore]) });
    const view = await render(withStore(store, <Pain questId={200} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.queryByRole('button', { name: A.pain.gentle })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.pain.pause }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'pain', instanceId: 200, choice: 'pause' });
    await view.rerender(withStore(testStore({ view: shown() }), <Pain questId={202} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(PLAY_TEXT.quest.gone)).toBeTruthy();
  });
});

describe('class change (spec §2.5)', () => {
  it('lists the four classes, marks the current one, and sends the chosen class', async () => {
    const store = testStore({ view: shown() });
    const onDone = jest.fn();
    await render(withStore(store, <ClassChange now={now} onDone={onDone} onBack={jest.fn()} />));
    expect(screen.getByText('Warrior · current')).toBeTruthy();
    await fireEvent.press(screen.getByText('Monk'));
    expect(screen.getByText(`Stillness: ${ABILITY_LINES.stillness}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Become a Monk' }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'class_change', classId: 'monk' });
    expect(onDone).toHaveBeenCalled();
  });

  it('within 14 days of the last change, says when it opens and sends nothing', async () => {
    const changed = adjustState({ profile: profileRow(undefined, { class_changed_at: new Date(DAY_TWO_NOW - 3 * DAY_MS) }) });
    const store = testStore({ view: shown(changed) });
    await render(withStore(store, <ClassChange now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(/Your next class change opens on/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Monk'));
    expect(screen.getByRole('button', { name: ADJUST_TEXT.classChange.title }).props.accessibilityState.disabled).toBe(true);
    expect(store.getState().enqueue).not.toHaveBeenCalled();
  });
});

describe('Vanish (Rogue level 10)', () => {
  const rogue = () => shown(adjustState({ profile: profileRow(undefined, { class_id: 'rogue' }), character: characterRow({ xp_focus: 990 }) }));

  afterEach(() => jest.restoreAllMocks());

  it('only a Rogue at level 10 can vanish', async () => {
    await render(withStore(testStore({ view: shown() }), <Vanish now={now} onBack={jest.fn()} />));
    expect(screen.getByText(A.vanish.locked)).toBeTruthy();
  });

  it('counts while LevelMeUp stays open, pauses when it leaves, and ends when the time is up', async () => {
    let t = DAY_TWO_NOW;
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const store = testStore({ view: rogue() });
    // A new element each time: re-rendering the same one would let React skip the render (and the clock check).
    const tree = () => withStore(store, <Vanish now={() => t} onBack={jest.fn()} />);
    const view = await render(tree());
    await fireEvent.press(screen.getByRole('button', { name: fillText(A.vanish.minutes, { n: 30 }) }));
    expect(screen.getByText(A.vanish.running)).toBeTruthy();
    expect(screen.getByText(/Back at/)).toBeTruthy();
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('lmu-vanish');
    t += 10 * 60_000;
    await act(async () => {
      for (const listener of listeners) listener('background');
    });
    expect(screen.getByText(A.vanish.paused)).toBeTruthy();
    t += 60 * 60_000; // away for an hour: not counted
    await fireEvent.press(screen.getByRole('button', { name: A.vanish.resume }));
    t += 20 * 60_000;
    await view.rerender(tree());
    expect(screen.getByText(fillText(A.vanish.done, { n: 30 }))).toBeTruthy();
  });
});
