// M10c (clarity): Today says what to do next and quietens what's done; Character and the Chronicle lose their noise.
import { CHARACTER_TEXT, TODAY_TEXT, authoredTemplate, fillText } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { clockTime } from '../src/lib/dates.ts';
import { Character } from '../src/screens/Character.tsx';
import { Chronicle } from '../src/screens/Chronicle.tsx';
import { QUICK_CLEAR_MS } from '../src/screens/QuestCard.tsx';
import { Today } from '../src/screens/Today.tsx';
import { HOLD_SETTLE_MS } from '../src/ui/HoldButton.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';
import { fingerDown, fingerUp } from './support/touch.ts';

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

describe('Today (M10c)', () => {
  it('the open core quest ends in a Begin bar that is part of its card', async () => {
    const s = serverState();
    const { onOpenQuest } = await renderToday(s);
    expect(screen.getByText('Begin')).toBeTruthy();
    await fireEvent.press(screen.getByText('Begin'));
    expect(onOpenQuest).toHaveBeenCalledWith(s.today!.quests.find((q) => q.slot === 'core')!.id);
  });

  it('a cleared core quest is a slim row; the next quest is marked; the streak shows today with "today counts"', async () => {
    const s = serverState(['core'], { streak_current: 5, streak_best: 5 });
    await renderToday(s);
    expect(screen.queryByText('Begin')).toBeNull();
    expect(screen.getByText(titleOf(s, 'core'))).toBeTruthy();
    expect(screen.getByText(fillText(TODAY_TEXT.cleared, { xp: xpOf(s, 'core') }))).toBeTruthy();
    expect(screen.getAllByText(TODAY_TEXT.next)).toHaveLength(1);
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText(`${TODAY_TEXT.streak} · ${TODAY_TEXT.counts}`)).toBeTruthy();
  });

  it('before anything counts: the server\'s streak and no note', async () => {
    await renderToday(serverState([], { streak_current: 5, streak_best: 5 }));
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText(TODAY_TEXT.streak)).toBeTruthy();
    expect(screen.queryByText(TODAY_TEXT.next)).toBeNull();
  });

  it('a cleared day heads the list with what it earned and when the next day starts', async () => {
    const all = serverState().today!.quests.map((q) => q.slot);
    const s = serverState(all);
    await renderToday(s);
    expect(screen.getByText(fillText(TODAY_TEXT.dayCleared, { day: 1 }))).toBeTruthy();
    const xp = all.reduce((sum, slot) => sum + xpOf(s, slot), 0);
    expect(screen.getByText(fillText(TODAY_TEXT.earned, { xp }))).toBeTruthy();
    expect(screen.getByText(fillText(TODAY_TEXT.nextDay, { time: clockTime(s.today!.endsAt!, s.today!.timeZone) }))).toBeTruthy();
    expect(screen.queryByText(TODAY_TEXT.next)).toBeNull();
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

  describe('quick clear (decision 6)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    /** Day 1 with side quest 1 a check-off quest. */
    const tapDay = (): ServerState => {
      const s = serverState();
      return { ...s, today: { ...s.today!, quests: s.today!.quests.map((q) => (q.slot === 'side1' ? { ...q, completion: 'tap' as const } : q)) } };
    };

    it('a hold under a check-off quest sends its completion; a short press sends nothing', async () => {
      const s = tapDay();
      const side1 = s.today!.quests.find((q) => q.slot === 'side1')!;
      const { store } = await renderToday(s);
      const hold = screen.getByRole('button', { name: fillText(TODAY_TEXT.hold, { xp: xpOf(s, 'side1') }) });
      await fingerDown(hold);
      await act(async () => { jest.advanceTimersByTime(HOLD_SETTLE_MS + QUICK_CLEAR_MS / 2); });
      await fingerUp(hold);
      await act(async () => { jest.advanceTimersByTime(2_000); });
      expect(store.getState().enqueue).not.toHaveBeenCalled();
      await fingerDown(hold);
      await act(async () => { jest.advanceTimersByTime(HOLD_SETTLE_MS + QUICK_CLEAR_MS); });
      expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'complete', instanceId: side1.id, completedAt: NOW, rating: null, payload: {} });
    });

    it('only check-off quests get the hold', async () => {
      const s = serverState();
      const taps = s.today!.quests.filter((q) => q.completion === 'tap' && q.slot !== 'article').length;
      await renderToday(s);
      expect(screen.queryAllByRole('button', { name: /^Hold to clear/ })).toHaveLength(taps);
      const none = { ...s, today: { ...s.today!, quests: s.today!.quests.map((q) => ({ ...q, completion: 'timer' as const })) } };
      await renderToday(none);
      expect(screen.queryAllByRole('button', { name: /^Hold to clear/ })).toHaveLength(0);
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
