// M12 plan decision 8: the set-up items of days 1 to 3 (src/game/setup.ts). A simpler day (docs/2026-10-26-simpler-day.md,
// decision 9): they wait on Me's Set up list, with the other one-time offers, instead of Today's notice strip; and last
// week's recap is one line under the camp.
import { CAMP_TEXT, SETUP_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { setUpItems } from '../src/game/setup.ts';
import type { SetUpInput } from '../src/game/setup.ts';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { Character } from '../src/screens/Character.tsx';
import { Today } from '../src/screens/Today.tsx';
import type { Offer } from '../src/state/store.ts';
import { checkinState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13); // inside day 1
const items = (s: ServerState, offers: Offer[], over: Partial<SetUpInput> = {}) =>
  setUpItems({ view: project(s, []), offers, saved: false, vow: null, trainingNoticeSeen: true, reminder: false, plus: false, ...over });

describe('the set-up items (decision 8; a simpler day, decision 9)', () => {
  it('the set-up cards only for a character that onboarded after M12, all at once and in order', () => {
    expect(items(serverState(), [])).toEqual([]);
    expect(items(serverState(), ['setup'])).toEqual(['save', 'voice', 'gear', 'slip', 'vow']);
  });

  it('each one leaves once answered, or once nothing is left to set up', () => {
    expect(items(serverState(), ['setup', 'setup:save', 'setup:voice'])).toEqual(['gear', 'slip', 'vow']);
    expect(items(serverState(), ['setup'], { saved: true, vow: 'I will rise.' })).toEqual(['voice', 'gear', 'slip']);
  });

  it('then training (once, for a player from before M6c), the weekly program, the morning briefing and Plus', () => {
    expect(items(serverState(), [], { trainingNoticeSeen: false })).toEqual(['training']);
    expect(items(serverState(), ['setup'], { trainingNoticeSeen: false })).not.toContain('training'); // gear asks it already
    const s = serverState();
    expect(items({ ...s, workoutsDone: 3 }, [], { reminder: true, plus: true })).toEqual(['program', 'reminder', 'plus']);
    expect(items({ ...s, workoutsDone: 3 }, ['program'])).toEqual([]);
  });
});

describe("on Me's Set up list", () => {
  async function renderMe(offers: Offer[]) {
    const store = testStore({ view: project(serverState(['core']), []), offers: ['monster:intro', 'reminder', ...offers] });
    const go = { onSettings: jest.fn(), onGame: jest.fn(), onTraining: jest.fn(), onSlip: jest.fn(), onVow: jest.fn(), onPlus: jest.fn() };
    await render(withStore(store, <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} setUp={go} now={() => NOW} />));
    return { store, go };
  }

  it('a row goes where it says and is marked', async () => {
    const { store, go } = await renderMe(['setup', 'setup:save']);
    await fireEvent.press(screen.getByRole('button', { name: `${CAMP_TEXT.setUp.voice}. ${SETUP_TEXT.voice.line}` }));
    expect(store.getState().markOffer).toHaveBeenCalledWith('setup:voice');
    expect(go.onGame).toHaveBeenCalled();
  });

  it('"Not now" marks it and goes nowhere', async () => {
    const { store, go } = await renderMe(['setup']);
    await fireEvent.press(screen.getByRole('button', { name: `${SETUP_TEXT.notNow}: ${CAMP_TEXT.setUp.save}` }));
    expect(store.getState().markOffer).toHaveBeenCalledWith('setup:save');
    expect(go.onSettings).not.toHaveBeenCalled();
  });

  it('a character from before M12 with nothing waiting has no list', async () => {
    await renderMe([]);
    expect(screen.queryByTestId('set-up')).toBeNull();
  });
});

describe("last week's recap, under the camp (M17)", () => {
  it('the first open of a new week says how last week went, kindly, once', async () => {
    const calendar = [
      { dayNumber: 9, date: '2026-10-19', mark: 'open' }, { dayNumber: 8, date: '2026-10-18', mark: 'cleared' },
      { dayNumber: 7, date: '2026-10-17', mark: 'rest' }, { dayNumber: 6, date: '2026-10-16', mark: 'none' },
    ] as ServerState['calendar'];
    const store = testStore({ view: project({ ...serverState(['core']), calendar }, []), offers: ['monster:intro'] });
    await render(withStore(store, <Today onOpenQuest={jest.fn()} onDay={jest.fn()} now={() => NOW} />));
    expect(screen.getByText('Last week: 1 of 3 days cleared, 1 rested. A new week has begun.')).toBeTruthy();
    expect(store.getState().markOffer).toHaveBeenCalledWith('week:2026-10-19');
    expect(screen.getByTestId('week-recap')).toBeTruthy(); // still said while Camp stays
  });

  it('the recap waits while a check-in asks its question', async () => {
    const calendar = [
      { dayNumber: 9, date: '2026-10-19', mark: 'open' }, { dayNumber: 8, date: '2026-10-18', mark: 'cleared' },
      { dayNumber: 7, date: '2026-10-17', mark: 'none' },
    ] as ServerState['calendar'];
    const store = testStore({ view: project({ ...checkinState(), calendar }, []), offers: ['monster:intro'] });
    await render(withStore(store, <Today onOpenQuest={jest.fn()} onDay={jest.fn()} now={() => NOW} />));
    expect(screen.queryByText(/^Last week: /)).toBeNull();
  });
});
