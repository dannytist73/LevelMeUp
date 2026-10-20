import { CHECKIN_TEXT } from '@levelmeup/content';
import { cumulativeXpForLevel } from '@levelmeup/rules';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Checkin } from '../src/screens/Checkin.tsx';
import { SECOND_WIND_SLOTS, checkinState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';
import { peekToast } from '../src/ui/toast.ts';

const T = CHECKIN_TEXT;

async function open(state = checkinState()) {
  const store = testStore({ view: project(state, []) });
  const onDone = jest.fn();
  await render(withStore(store, <Checkin onDone={onDone} />));
  return { store, onDone };
}

describe('the check-in screen (board F1)', () => {
  it('asks the question with the five answers and what each does', async () => {
    await open();
    expect(screen.getByText(T.title)).toBeTruthy();
    for (const key of ['sick_or_injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt'] as const) {
      expect(screen.getByText(T.answers[key].label)).toBeTruthy();
    }
    expect(screen.getByText(T.answers.too_hard.outcome)).toBeTruthy();
  });

  it('"I just didn\'t" sends the answer and goes back to Today', async () => {
    const { store, onDone } = await open();
    await fireEvent.press(screen.getByText(T.answers.just_didnt.label));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin', checkinId: 7, answer: 'just_didnt', secondWind: false });
    expect(onDone).toHaveBeenCalled();
    expect(peekToast()?.message).toBe('Noted. A 5-minute recovery quest today keeps your streak.'); // premium pass B3
  });

  it('"sick or injured" asks which before it can be sent', async () => {
    const { store } = await open();
    await fireEvent.press(screen.getByText(T.answers.sick_or_injured.label));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(T.injured));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin', checkinId: 7, answer: 'injured', secondWind: false });
  });

  it('offers Second Wind when the server does', async () => {
    const { store } = await open(checkinState({}, { xp_strength: cumulativeXpForLevel(5) }, SECOND_WIND_SLOTS));
    await fireEvent.press(screen.getByText(T.answers.just_didnt.label));
    await fireEvent.press(screen.getByText(/^Second Wind: redo /));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin', checkinId: 7, answer: 'just_didnt', secondWind: true });
  });

  it('switching answers starts the follow-up again; no Second Wind unless the server offers it', async () => {
    const { store } = await open();
    await fireEvent.press(screen.getByText(T.answers.sick_or_injured.label));
    await fireEvent.press(screen.getByText(T.injured));
    await fireEvent.press(screen.getByText(T.answers.just_didnt.label));
    expect(screen.queryByText(T.which)).toBeNull();
    expect(screen.queryByText(T.how)).toBeNull();
    await fireEvent.press(screen.getByText(T.answers.sick_or_injured.label));
    await fireEvent.press(screen.getByText(T.answer));
    expect(store.getState().enqueue).not.toHaveBeenCalled(); // "which" was asked again
  });

  it('"Answer later" puts it off and goes back', async () => {
    const { store, onDone } = await open();
    await fireEvent.press(screen.getByText(T.later));
    expect(store.getState().answerLater).toHaveBeenCalledWith(7);
    expect(onDone).toHaveBeenCalled();
  });

  it('says so when nothing waits for an answer', async () => {
    await open(checkinState({ answer: 'just_didnt' }));
    expect(screen.getByText(T.gone)).toBeTruthy();
  });
});
