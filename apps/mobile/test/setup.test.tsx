// M12 plan decision 8: the set-up cards of days 1 to 3 (src/game/setup.ts) and how Today shows them.
import { SETUP_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { setupCard } from '../src/game/setup.ts';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { Today } from '../src/screens/Today.tsx';
import type { Offer } from '../src/state/store.ts';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13); // inside day 1
const onDay = (s: ServerState, dayNumber: number): ServerState => ({ ...s, today: { ...s.today!, dayNumber } });
const card = (s: ServerState, offers: Offer[], over: { saved?: boolean; vow?: string | null } = {}) =>
  setupCard({ view: project(s, []), offers, saved: over.saved ?? false, vow: over.vow ?? null });

describe('the set-up cards (decision 8)', () => {
  it('only for a character that onboarded after M12, and only once the core quest is cleared', () => {
    expect(card(serverState(['core']), [])).toBeNull();
    expect(card(serverState(), ['setup'])).toBeNull();
    expect(card(serverState(['core']), ['setup'])).toBe('save');
  });

  it('day 1: saving (guests only), then the voice; each once', () => {
    const day1 = serverState(['core']);
    expect(card(day1, ['setup'], { saved: true })).toBe('voice');
    expect(card(day1, ['setup', 'setup:save'])).toBe('voice');
    expect(card(day1, ['setup', 'setup:save', 'setup:voice'])).toBeNull(); // day 2's wait
  });

  it('day 2: the equipment while none is set up, then the slip question; day 3: the vow, unless sworn', () => {
    const done: Offer[] = ['setup', 'setup:save', 'setup:voice'];
    expect(card(onDay(serverState(['core']), 2), done)).toBe('gear');
    expect(card(onDay(serverState(['core']), 2), [...done, 'setup:gear'])).toBe('slip');
    expect(card(onDay(serverState(['core']), 2), [...done, 'setup:gear', 'setup:slip'])).toBeNull();
    expect(card(onDay(serverState(['core']), 3), [...done, 'setup:gear', 'setup:slip'])).toBe('vow');
    expect(card(onDay(serverState(['core']), 3), [...done, 'setup:gear', 'setup:slip'], { vow: 'I will rise.' })).toBeNull();
  });

  it('a card skipped on its day still comes later', () => {
    expect(card(onDay(serverState(['core']), 5), ['setup', 'setup:save', 'setup:voice', 'setup:gear', 'setup:slip'])).toBe('vow');
  });
});

describe('on Today', () => {
  async function renderToday(offers: Offer[]) {
    const store = testStore({ view: project(serverState(['core']), []), offers });
    const props = {
      onSettings: jest.fn(), onOpenQuest: jest.fn(), onSwap: jest.fn(), onPain: jest.fn(), onVanish: jest.fn(), onTraining: jest.fn(),
      onCheckin: jest.fn(), onGame: jest.fn(), onSlip: jest.fn(), onVow: jest.fn(),
    };
    await render(withStore(store, <Today {...props} now={() => NOW} />));
    return { store, props };
  }

  it('the first open of a new week says how last week went, kindly, once (M17)', async () => {
    const calendar = [
      { dayNumber: 9, date: '2026-10-19', mark: 'open' }, { dayNumber: 8, date: '2026-10-18', mark: 'cleared' },
      { dayNumber: 7, date: '2026-10-17', mark: 'rest' }, { dayNumber: 6, date: '2026-10-16', mark: 'none' },
    ] as ServerState['calendar'];
    const store = testStore({ view: project({ ...serverState(['core']), calendar }, []), offers: [] });
    await render(withStore(store, <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()}
      onTraining={jest.fn()} onCheckin={jest.fn()} now={() => NOW} />));
    expect(screen.getByLabelText('System: Last week: 1 of 3 days cleared, 1 rested. A new week starts today.')).toBeTruthy();
    await fireEvent.press(within(screen.getByTestId('notice-strip')).getByRole('button', { name: 'Got it' }));
    expect(store.getState().markOffer).toHaveBeenCalledWith('week:2026-10-19');
  });

  it('shows one card in the notice strip; its button marks it and goes there', async () => {
    const { store, props } = await renderToday(['setup', 'setup:save']);
    expect(screen.getByLabelText(`System: ${SETUP_TEXT.voice.line}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SETUP_TEXT.voice.go }));
    expect(store.getState().markOffer).toHaveBeenCalledWith('setup:voice');
    expect(props.onGame).toHaveBeenCalled();
  });

  it('"Not now" marks it, and the next card waits for its day', async () => {
    const { store } = await renderToday(['setup']);
    expect(screen.getByLabelText(`System: ${SETUP_TEXT.save.line}`)).toBeTruthy();
    await fireEvent.press(within(screen.getByTestId('notice-strip')).getByRole('button', { name: SETUP_TEXT.notNow })); // the reminder offer has one too
    expect(store.getState().markOffer).toHaveBeenCalledWith('setup:save');
    expect(screen.getByLabelText(`System: ${SETUP_TEXT.voice.line}`)).toBeTruthy(); // the same day's next one
  });

  it('a character from before M12 never sees them', async () => {
    await renderToday([]);
    expect(screen.queryByTestId('notice-strip')).toBeNull();
  });
});
