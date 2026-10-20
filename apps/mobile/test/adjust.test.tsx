import {
  ABILITY_LINES, ADJUST_TEXT, EQUIPMENT_NAMES, FEEDBACK_TEXT, LIGHTER_TEXT, ONBOARDING_TEXT, PLAY_TEXT, TODAY_TEXT, authoredTemplate, fillText,
} from '@levelmeup/content';
import { DAY_MS, newLadder } from '@levelmeup/rules';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { AppState } from 'react-native';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import type { NewEvent } from '../src/state/store.ts';
import { ClassChange } from '../src/screens/ClassChange.tsx';
import { DayActions, DayBanners, PausedExercises } from '../src/screens/DayActions.tsx';
import { Pain, gentleLine } from '../src/screens/Pain.tsx';
import { Swap } from '../src/screens/Swap.tsx';
import { peekToast } from '../src/ui/toast.ts';
import { Training } from '../src/screens/Training.tsx';
import { Vanish } from '../src/screens/Vanish.tsx';
import { DAY_TWO_NOW, adjustState, characterRow, ladderRows, profileRow, workoutState } from './support/fixtures.ts';
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
/** M10c decision 3: the day's options open from one row. */
const openOptions = () => fireEvent.press(screen.getByRole('button', { name: TODAY_TEXT.change }));

describe("Today's adjustments (M6b)", () => {
  it('M17 (review): "I felt pain" stays in reach while a change is confirmed, and when there is nothing to change', async () => {
    const onPain = jest.fn();
    await render(<DayActions view={shown()} enqueue={jest.fn(async () => {})} onSwap={jest.fn()} onVanish={jest.fn()} onPain={onPain} />);
    expect(screen.getByRole('button', { name: A.pain.open })).toBeTruthy();
    await openOptions();
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.getByRole('button', { name: A.rest.confirm })).toBeTruthy(); // the confirm panel is open
    await fireEvent.press(screen.getByRole('button', { name: A.pain.open }));
    expect(onPain).toHaveBeenCalledTimes(1);
    await screen.unmount();
    const offline = { ...shown(), offline: true, today: { ...shown().today!, swapsLeft: 0 } };
    await render(<DayActions view={offline} enqueue={jest.fn(async () => {})} onSwap={jest.fn()} onVanish={jest.fn()} onPain={onPain} />);
    expect(screen.queryByRole('button', { name: TODAY_TEXT.change })).toBeNull(); // nothing to change offline
    expect(screen.getByRole('button', { name: A.pain.open })).toBeTruthy();
  });

  it('rest offers today and tomorrow, each within the limit; tomorrow is sent as such (M7b decision 5)', async () => {
    const enqueue = jest.fn(async () => {});
    await render(actions(shown(), enqueue));
    await openOptions();
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.getByRole('button', { name: A.rest.confirm })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.rest.tomorrow }));
    expect(enqueue).toHaveBeenLastCalledWith({ type: 'plan_rest', dayId: 2, tomorrow: true });
  });

  it('a rest day today can still plan tomorrow', async () => {
    const view = shown();
    await render(actions({ ...view, today: { ...view.today!, protection: 'planned_rest' } }));
    await openOptions();
    // M10c: today can't rest again, so the button says what it offers.
    expect(screen.queryByRole('button', { name: A.day.rest })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.rest.tomorrow }));
    expect(screen.queryByRole('button', { name: A.rest.confirm })).toBeNull();
    expect(screen.getByRole('button', { name: A.rest.tomorrow })).toBeTruthy();
  });

  it('with neither today nor tomorrow left, no rest button', async () => {
    const view = shown();
    await render(actions({ ...view, today: { ...view.today!, protection: 'planned_rest', restTomorrow: false } }));
    await openOptions();
    expect(screen.queryByRole('button', { name: A.day.rest })).toBeNull();
  });

  it('tomorrow planned as rest shows on Today', async () => {
    await render(<DayBanners today={shown().today!} restDay={3} />);
    expect(screen.getByText(A.rest.tomorrowBanner)).toBeTruthy();
  });

  it('offers swap, hard day and rest; each confirm says what happens, then sends its event', async () => {
    const enqueue = jest.fn(async () => {});
    const onSwap = jest.fn();
    await render(actions(shown(), enqueue, onSwap));
    await openOptions();
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
    await render(actions({ ...view, today: { ...view.today!, restAllowed: false, restTomorrow: false } }, enqueue));
    await openOptions();
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.getByText(A.rest.limit)).toBeTruthy();
    expect(screen.queryByRole('button', { name: A.rest.confirm })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.day.notNow }));
    expect(screen.getByRole('button', { name: A.day.hardDay })).toBeTruthy();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('over the rest limit the confirm offers the lighter plan, when there is one (M7a decision 9)', async () => {
    const enqueue = jest.fn(async () => {});
    const view = shown();
    const limited = { ...view, today: { ...view.today!, restAllowed: false, restTomorrow: false } };
    await render(actions({ ...limited, lighterPlan: { from: 25, to: 15, offered: false } }, enqueue));
    await openOptions();
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.getByText(A.rest.limit)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: fillText(LIGHTER_TEXT.restLimit, { from: 25, to: 15 }) }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'lighter_plan', accept: true });
    await render(actions({ ...limited, lighterPlan: null }, enqueue));
    await openOptions();
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.queryByRole('button', { name: /^Lighten the plan/ })).toBeNull();
  });

  it('hides what the day no longer allows: no swap left, already a hard day, already protected (and tomorrow planned, M7b)', async () => {
    const tomorrowPlanned = { character: characterRow({ rest_day: 3 }) };
    await render(actions(shown(adjustState(tomorrowPlanned, { swaps_used: 1, hard_day: true, protection: 'planned_rest' }))));
    expect(screen.queryByRole('button', { name: TODAY_TEXT.change })).toBeNull();
    expect(screen.queryByRole('button', { name: /Swap ·/ })).toBeNull();
    expect(screen.queryByRole('button', { name: A.day.hardDay })).toBeNull();
    expect(screen.queryByRole('button', { name: A.day.rest })).toBeNull();
  });

  it('a Monk at level 5 gets Stillness; a Rogue at level 10 gets Vanish', async () => {
    const enqueue = jest.fn(async () => {});
    const monk = shown(adjustState({ profile: profileRow(undefined, { class_id: 'monk' }), character: characterRow({ xp_vitality: 240 }) }));
    const view = await render(actions(monk, enqueue));
    await openOptions();
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

  it('the options start folded under "Change today", which says whether it is open (M10c decision 3)', async () => {
    await render(actions());
    const row = screen.getByRole('button', { name: TODAY_TEXT.change });
    expect(row.props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryByRole('button', { name: A.day.hardDay })).toBeNull();
    await fireEvent.press(row);
    expect(screen.getByRole('button', { name: TODAY_TEXT.change }).props.accessibilityState).toEqual({ expanded: true });
    expect(screen.getByRole('button', { name: A.day.hardDay })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: TODAY_TEXT.change }));
    expect(screen.queryByRole('button', { name: A.day.hardDay })).toBeNull();
  });

  it('a day that already counts is offered only a rest tomorrow (M10c decision 4)', async () => {
    const enqueue = jest.fn(async () => {});
    const counted = shown(adjustState({}, {}));
    const today = counted.today!;
    const done = { ...counted, today: { ...today, quests: today.quests.map((q) => (q.slot === 'core' ? { ...q, completedAt: '2026-10-11T00:00:00.000Z' } : q)) } };
    await render(actions(done, enqueue));
    await openOptions();
    expect(screen.queryByRole('button', { name: A.day.rest })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.rest.tomorrow }));
    expect(screen.queryByRole('button', { name: A.rest.confirm })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.rest.tomorrow }));
    expect(enqueue).toHaveBeenLastCalledWith({ type: 'plan_rest', dayId: 2, tomorrow: true });
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
    expect(peekToast()?.message).toBe(`Swapped to ${title(option.templateId)}.`); // premium pass B1
  });

  it('a swap the phone could not save says so and stays (premium pass A7)', async () => {
    const view = shown();
    const store = testStore({ view, enqueue: jest.fn(async () => { throw new Error('disk'); }) });
    const onDone = jest.fn();
    await render(withStore(store, <Swap questId={200} now={now} onDone={onDone} onBack={jest.fn()} />));
    const option = view.today!.quests.find((q) => q.id === 200)!.swaps[0]!;
    await fireEvent.press(screen.getByText(title(option.templateId)));
    await fireEvent.press(screen.getByRole('button', { name: A.swap.choose }));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText(FEEDBACK_TEXT.saveFailed)).toBeTruthy();
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

  it('on a day that is already a rest day, the exercise can still be paused (device check)', async () => {
    const store = testStore({ view: shown(adjustState({}, { protection: 'planned_rest' })) });
    await render(withStore(store, <Pain questId={200} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(A.pain.restedLine)).toBeTruthy();
    expect(screen.queryByRole('button', { name: A.pain.rest })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.pain.pause }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'pain', instanceId: 200, choice: 'pause' });
  });

  it("names the gentle quest without repeating it: 'Walk 5 minutes', not 'Walk 5 minutes (5 minutes)' (device check)", () => {
    expect(gentleLine('Walk 5 minutes', '5 minutes')).toBe('Instead: Walk 5 minutes');
    expect(gentleLine('Gentle stretch', '3 minutes')).toBe('Instead: Gentle stretch (3 minutes)');
    expect(gentleLine('Walk 15 minutes', '5 minutes')).toBe('Instead: Walk 15 minutes (5 minutes)'); // a whole match only (review)
  });

  it('after the day ends the choices go, but the advice to see a professional stays (review)', async () => {
    const late = () => DAY_TWO_NOW + DAY_MS;
    await render(withStore(testStore({ view: shown() }), <Pain questId={200} now={late} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(PLAY_TEXT.quest.gone)).toBeTruthy();
    expect(screen.getByText(A.pain.advice)).toBeTruthy();
    expect(screen.queryByRole('button', { name: A.pain.rest })).toBeNull();
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
    // Premium pass B2: it locks for 14 days, so it asks once more, with the date.
    expect(store.getState().enqueue).not.toHaveBeenCalled();
    expect(screen.getByText(/^Become a Monk\? Your next class change opens on /)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    expect(store.getState().enqueue).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Become a Monk' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Yes, become a Monk' }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'class_change', classId: 'monk' });
    expect(onDone).toHaveBeenCalled();
    expect(peekToast()?.message).toBe("You're a Monk now. Tomorrow is built for it.");
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

describe('a screen that sends a change keeps what it shows while it closes (M6b device check)', () => {
  // On Android, the class picker crashed ("the specified child already has a parent") when its content changed during
  // its exit animation. The store here applies each event at once, as the real projection does.
  function applying(state: ServerState = adjustState()) {
    const store = testStore({ view: shown(state) });
    let n = 0;
    store.setState({
      enqueue: jest.fn(async (event: NewEvent) => {
        store.setState({ view: project(state, [{ id: `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`, ...event } as PhoneEvent]) });
      }),
    });
    return store;
  }

  it('the class picker', async () => {
    const onDone = jest.fn();
    await render(withStore(applying(), <ClassChange now={now} onDone={onDone} onBack={jest.fn()} />));
    await fireEvent.press(screen.getByText('Monk'));
    await fireEvent.press(screen.getByRole('button', { name: 'Become a Monk' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Yes, become a Monk' })); // premium pass B2
    expect(onDone).toHaveBeenCalled();
    expect(screen.getByText('Warrior · current')).toBeTruthy();
    expect(screen.queryByText(A.classChange.willSync)).toBeNull();
  });

  it('if sending fails, the screen follows the game again and can be used (review)', async () => {
    const store = applying();
    const send = store.getState().enqueue as jest.Mock;
    store.setState({
      enqueue: jest.fn(async (event: NewEvent) => {
        await send(event);
        throw new Error('disk full');
      }),
    });
    const onDone = jest.fn();
    await render(withStore(store, <ClassChange now={now} onDone={onDone} onBack={jest.fn()} />));
    await fireEvent.press(screen.getByText('Monk'));
    await fireEvent.press(screen.getByRole('button', { name: 'Become a Monk' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Yes, become a Monk' })); // premium pass B2
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText(A.classChange.willSync)).toBeTruthy(); // the live view again
    expect(screen.getByText(FEEDBACK_TEXT.saveFailed)).toBeTruthy(); // premium pass A7: and it says so
  });

  it('the swap sheet', async () => {
    const store = applying();
    const option = store.getState().view!.today!.quests.find((q) => q.id === 200)!.swaps[0]!;
    await render(withStore(store, <Swap questId={200} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    await fireEvent.press(screen.getByText(authoredTemplate(option.templateId).voice.system.title));
    await fireEvent.press(screen.getByRole('button', { name: A.swap.choose }));
    expect(screen.getByText(A.swap.options)).toBeTruthy();
    expect(screen.queryByText(A.swap.none)).toBeNull();
  });

  it('the pain flow', async () => {
    await render(withStore(applying(), <Pain questId={200} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    await fireEvent.press(screen.getByRole('button', { name: A.pain.gentle }));
    expect(screen.getByText(fillText(A.pain.paused, { name: 'Push-ups' }))).toBeTruthy();
  });
});

describe('Training (M6c decision 12)', () => {
  it('shows the current setup, saves a change once, and goes back', async () => {
    const store = testStore({ view: project(workoutState(), []) });
    const onDone = jest.fn();
    await render(withStore(store, <Training onDone={onDone} onBack={jest.fn()} />));
    const save = () => screen.getByRole('button', { name: ADJUST_TEXT.training.save });
    expect(screen.getByRole('checkbox', { name: ONBOARDING_TEXT.gear.nothing }).props.accessibilityState.checked).toBe(true);
    expect(save().props.accessibilityState.disabled).toBe(true); // nothing changed yet
    await fireEvent.press(screen.getByRole('checkbox', { name: EQUIPMENT_NAMES.bands }));
    await fireEvent.press(save());
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'training', equipment: ['bands'], programStyle: 'none', trainingPlan: 'build', programDays: 3 });
    expect(onDone).toHaveBeenCalled();
  });

  it('says when workouts don\'t fit the player\'s day', async () => {
    const server = workoutState({ profile: profileRow(undefined, { minutes_per_day: 15 }) });
    const store = testStore({ view: project(server, []) });
    await render(withStore(store, <Training onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(ADJUST_TEXT.training.noRoom)).toBeTruthy();
  });
});
