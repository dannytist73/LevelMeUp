// M10c (clarity): Today says what to do next and quietens what's done; Character and the Chronicle lose their noise.
// M12 (Round 3): Up next, Then, the day done once its core quest and reading are, the check circle with Undo.
import { CHARACTER_TEXT, TODAY_TEXT, authoredTemplate, fillText } from '@levelmeup/content';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { clockTime } from '../src/lib/dates.ts';
import { Character } from '../src/screens/Character.tsx';
import { Chronicle } from '../src/screens/Chronicle.tsx';
import { Today } from '../src/screens/Today.tsx';
import { SNACKBAR_MS } from '../src/ui/Snackbar.tsx';
import { play } from '../src/ui/sound.ts';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13); // inside day 1 (12:00–20:00 UTC)
const titleOf = (s: ServerState, slot: string) => authoredTemplate(s.today!.quests.find((q) => q.slot === slot)!.templateId).voice.system.title;
const xpOf = (s: ServerState, slot: string) => Object.values(s.today!.quests.find((q) => q.slot === slot)!.xp).reduce((a, x) => a + (x ?? 0), 0);

async function renderToday(server: ServerState, over: Parameters<typeof testStore>[0] = {}) {
  const store = testStore({ view: project(server, []), ...over });
  const onOpenQuest = jest.fn();
  await render(withStore(store,
    <Today onSettings={jest.fn()} onOpenQuest={onOpenQuest} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
      onCheckin={jest.fn()} now={() => NOW} />));
  return { store, onOpenQuest };
}

describe('Today (M10c, M12)', () => {
  it('the open core quest is Up next, one card ending in Begin, the only bright button', async () => {
    const s = serverState();
    const { onOpenQuest } = await renderToday(s);
    const next = within(screen.getByTestId('up-next'));
    expect(next.getByText('Begin')).toBeTruthy();
    expect(screen.getAllByTestId('up-next')).toHaveLength(1);
    await fireEvent.press(screen.getByText('Begin'));
    expect(onOpenQuest).toHaveBeenCalledWith(s.today!.quests.find((q) => q.slot === 'core')!.id);
    // The rest wait as rows under "Then".
    expect(screen.getByText(TODAY_TEXT.then)).toBeTruthy();
    expect(screen.getByText(titleOf(s, 'side2'))).toBeTruthy();
  });

  it('with the core quest cleared, the reading moves up; the streak shows today with "today counts"', async () => {
    const base = serverState(['core'], { streak_current: 5, streak_best: 5 });
    const s = { ...base, today: { ...base.today!, article: { id: 'article-9', cluster: 'sleep' as const, title: 'Wake time', minutes: 6 } } };
    await renderToday(s);
    expect(within(screen.getByTestId('up-next')).getByText('Wake time')).toBeTruthy();
    expect(screen.getByRole('button', { name: fillText(TODAY_TEXT.doneToday, { n: 1 }) })).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText(`${TODAY_TEXT.streak} · ${TODAY_TEXT.counts}`)).toBeTruthy();
  });

  it('before anything counts: the server\'s streak and no note', async () => {
    await renderToday(serverState([], { streak_current: 5, streak_best: 5 }));
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText(TODAY_TEXT.streak)).toBeTruthy();
  });

  it('a cleared day heads the list with what it earned and when the next day starts', async () => {
    const all = serverState().today!.quests.map((q) => q.slot);
    const s = serverState(all);
    await renderToday(s);
    expect(screen.getByText(fillText(TODAY_TEXT.dayCleared, { day: 1 }))).toBeTruthy();
    const xp = all.reduce((sum, slot) => sum + xpOf(s, slot), 0);
    expect(screen.getByText(fillText(TODAY_TEXT.earned, { xp }))).toBeTruthy();
    expect(screen.getByText(fillText(TODAY_TEXT.nextDay, { time: clockTime(s.today!.endsAt!, s.today!.timeZone) }))).toBeTruthy();
    expect(screen.queryByTestId('up-next')).toBeNull();
  });

  it('the day is done once the core quest and the reading are; side quests are then optional (decision 2)', async () => {
    const base = serverState(['core', 'article']);
    const s = { ...base, today: { ...base.today!, article: { id: 'article-9', cluster: 'sleep' as const, title: 'Wake time', minutes: 6 } } };
    await renderToday(s);
    expect(screen.getByTestId('day-done')).toBeTruthy();
    expect(screen.getByText(TODAY_TEXT.extra)).toBeTruthy();
    expect(screen.getByText(TODAY_TEXT.optional)).toBeTruthy();
    expect(screen.getByText(titleOf(s, 'side1'))).toBeTruthy();
    expect(screen.queryByTestId('up-next')).toBeNull();
  });

  it('a check-off core quest opens its screen from Begin; it is never cleared from Today (review)', async () => {
    const s = serverState();
    const tapCore = { ...s, today: { ...s.today!, quests: s.today!.quests.map((q) => (q.slot === 'core' ? { ...q, completion: 'tap' as const } : q)) } };
    const { store, onOpenQuest } = await renderToday(tapCore);
    await fireEvent.press(screen.getByText('Begin'));
    expect(onOpenQuest).toHaveBeenCalledWith(tapCore.today!.quests.find((q) => q.slot === 'core')!.id);
    expect(store.getState().enqueue).not.toHaveBeenCalled();
  });

  it('a protected day (a planned rest) asks nothing: no Up next, its quests are optional extras (review)', async () => {
    const s = serverState();
    await renderToday({ ...s, today: { ...s.today!, protection: 'planned_rest' } });
    expect(screen.queryByTestId('up-next')).toBeNull();
    expect(screen.getByText(TODAY_TEXT.extra)).toBeTruthy();
    expect(screen.queryByTestId('day-done')).toBeNull(); // the rest-day banner says what the day is
  });

  it('a quick second tap on a check circle sends one completion (review)', async () => {
    const s = serverState();
    const { store } = await renderToday(s);
    const circle = screen.getByRole('checkbox', { name: fillText(TODAY_TEXT.markDone, { title: titleOf(s, 'side1') }) });
    await fireEvent.press(circle);
    await fireEvent.press(circle);
    expect(store.getState().enqueue).toHaveBeenCalledTimes(1);
  });

  it('an open day with no quests says so, not that it ended (review)', async () => {
    const s = serverState();
    await renderToday({ ...s, today: { ...s.today!, quests: [] } });
    expect(screen.getByText(TODAY_TEXT.states.none)).toBeTruthy();
    expect(screen.queryByText(TODAY_TEXT.states.ended)).toBeNull();
  });

  it('a day whose article never came is done with its core quest', async () => {
    await renderToday(serverState(['core']));
    expect(screen.getByTestId('day-done')).toBeTruthy();
  });

  it('offers a morning briefing once, on the day done; Remind me asks the phone and turns it on (decision 9)', async () => {
    const all = serverState().today!.quests.map((q) => q.slot);
    const { store } = await renderToday(serverState(all), { permission: 'ask' });
    expect(screen.getByTestId('reminder-offer')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: TODAY_TEXT.reminder.yes }));
    expect(store.getState().markOffer).toHaveBeenCalledWith('reminder');
    expect(store.getState().allowNotify).toHaveBeenCalled();
    expect(store.getState().setNotify).toHaveBeenCalledWith(expect.objectContaining({ optedIn: true, briefing: expect.objectContaining({ on: true }) }));
    expect(screen.queryByTestId('reminder-offer')).toBeNull();
  });

  it('never offers it again, nor when refused for good or already on', async () => {
    const all = serverState().today!.quests.map((q) => q.slot);
    await renderToday(serverState(all), { offers: ['reminder'] });
    expect(screen.queryByTestId('reminder-offer')).toBeNull();
    await renderToday(serverState(all), { permission: 'denied' });
    expect(screen.queryByTestId('reminder-offer')).toBeNull();
  });

  it('shows one notice at a time, with how many wait', async () => {
    const notices = [
      { eventId: 'a', code: 'no_swaps_left', at: NOW },
      { eventId: 'b', code: 'day_closed', at: NOW },
    ];
    const { store } = await renderToday(serverState(), { notices: notices as never });
    expect(screen.getByText(fillText(TODAY_TEXT.notices, { n: 1, total: 2 }))).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Got it' })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(store.getState().dismissNotice).toHaveBeenCalledWith('a');
  });

  describe('the check circle (M12 decision 3)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("a check-off quest's circle sends its completion, and Undo takes it back for 5 seconds", async () => {
      const s = serverState(); // side quest 1 is a check-off quest
      const side1 = s.today!.quests.find((q) => q.slot === 'side1')!;
      const { store } = await renderToday(s);
      await fireEvent.press(screen.getByRole('checkbox', { name: fillText(TODAY_TEXT.markDone, { title: titleOf(s, 'side1') }) }));
      expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'complete', instanceId: side1.id, completedAt: NOW, rating: null, payload: {} });
      expect(screen.getByText(fillText(TODAY_TEXT.markedDone, { title: titleOf(s, 'side1') }))).toBeTruthy();
      expect(play).toHaveBeenCalledWith('claim'); // M12 decision 11
      await fireEvent.press(screen.getByRole('button', { name: TODAY_TEXT.undo }));
      expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'undo', instanceId: side1.id });
      expect(play).toHaveBeenCalledWith('undo');
      expect(screen.queryByTestId('snackbar')).toBeNull();
    });

    it('the Undo goes after 5 seconds', async () => {
      const s = serverState();
      await renderToday(s);
      await fireEvent.press(screen.getByRole('checkbox', { name: fillText(TODAY_TEXT.markDone, { title: titleOf(s, 'side1') }) }));
      expect(screen.getByTestId('snackbar')).toBeTruthy();
      await act(async () => { jest.advanceTimersByTime(SNACKBAR_MS); });
      expect(screen.queryByTestId('snackbar')).toBeNull();
    });

    it('only check-off quests get the circle', async () => {
      const s = serverState();
      const taps = s.today!.quests.filter((q) => q.completion === 'tap' && q.slot !== 'article' && q.slot !== 'core').length;
      await renderToday(s);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(taps);
      const none = { ...s, today: { ...s.today!, quests: s.today!.quests.map((q) => ({ ...q, completion: 'timer' as const })) } };
      await renderToday(none);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });
});

describe('Character and the Chronicle (M10c)', () => {
  it('switches the portrait from the button on its corner; the stats have no lead line', async () => {
    const store = testStore({ view: project(serverState(), []) });
    await render(withStore(store, <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    await fireEvent.press(screen.getByRole('button', { name: CHARACTER_TEXT.switchPortrait }));
    expect(store.getState().setPortrait).toHaveBeenCalled();
    expect(screen.queryByText('Bars show progress to the next point.')).toBeNull();
  });

  it('the tiles count today as Today does, and growth shows only the stats that grew', async () => {
    const s = serverState(['core'], { streak_current: 5, streak_best: 5 });
    await render(withStore(testStore({ view: project(s, []) }), <Chronicle />));
    expect(screen.getByLabelText('Streak 6')).toBeTruthy();
    expect(screen.getByLabelText('Best 6')).toBeTruthy();
    expect(screen.queryByText('+0')).toBeNull();
  });
});
