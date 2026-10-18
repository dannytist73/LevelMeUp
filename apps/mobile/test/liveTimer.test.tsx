// M12 plan decision 12: live timers in the notification shade (src/notify/live.ts), with LevelMeUp's native module
// mocked; the Kotlin side is checked on the emulator (docs/device-verification-checklist.md, M12).
import { NOTIFY_TEXT } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { QuestView, ServerState } from '../src/game/types.ts';
import { DEFAULT_NOTIFY } from '../src/notify/settings.ts';
import { Quest } from '../src/screens/Quest.tsx';
import { RepLog } from '../src/screens/quest/RepLog.tsx';
import { REPS_REST_MS } from '../src/quest/rest.ts';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const mockNative = { show: jest.fn(() => true), clear: jest.fn() };
jest.mock('expo', () => ({ requireOptionalNativeModule: (name: string) => (name === 'LmuLiveTimer' ? mockNative : null) }));
const native = mockNative;

// Loaded after the mock.
const live = require('../src/notify/live.ts') as typeof import('../src/notify/live.ts');
const { planLive } = require('../src/notify/plan.ts') as typeof import('../src/notify/plan.ts');

const NOW = Date.UTC(2026, 9, 10, 13);
beforeEach(() => {
  native.show.mockClear();
  native.clear.mockClear();
  live.setLiveAllowed(false);
});

describe('live timers', () => {
  it('show only while allowed, counting down to their time', () => {
    live.showLive({ id: 1001, title: 'Read 10 minutes', text: NOTIFY_TEXT.live.timer, at: NOW + 60_000 }, NOW);
    expect(native.show).not.toHaveBeenCalled();
    live.setLiveAllowed(true);
    live.showLive({ id: 1001, title: 'Read 10 minutes', text: NOTIFY_TEXT.live.timer, at: NOW + 60_000 }, NOW);
    expect(native.show).toHaveBeenCalledWith(1001, 'Read 10 minutes', NOTIFY_TEXT.live.timer, NOW + 60_000, true, NOTIFY_TEXT.live.channel);
  });

  it('never for a time already past', () => {
    live.setLiveAllowed(true);
    live.showLive({ id: 1001, title: 'x', text: 'y', at: NOW }, NOW);
    expect(native.show).not.toHaveBeenCalled();
  });

  it('a sync clears the quest timers that stopped, but not the rest between sets', () => {
    live.setLiveAllowed(true);
    live.showLive({ id: live.REST_LIVE_ID, title: 'Rest', text: 'r', at: NOW + 30_000 }, NOW);
    live.syncLive([{ id: 1001, title: 'a', text: 't', at: NOW + 60_000 }, { id: 1002, title: 'b', text: 't', at: NOW + 60_000 }], NOW);
    native.clear.mockClear();
    live.syncLive([{ id: 1002, title: 'b', text: 't', at: NOW + 60_000 }], NOW);
    expect(native.clear).toHaveBeenCalledWith(1001);
    expect(native.clear).not.toHaveBeenCalledWith(live.REST_LIVE_ID);
  });

  it('turning them off clears what shows', () => {
    live.setLiveAllowed(true);
    live.syncLive([{ id: 1003, title: 'a', text: 't', at: NOW + 60_000 }], NOW);
    live.setLiveAllowed(false);
    expect(native.clear).toHaveBeenCalledWith(1003);
  });

  it("an offline quest's negative id gets an id of its own", () => {
    expect(live.liveId(201)).toBe(1201);
    expect(live.liveId(-3)).toBe(503);
    expect(new Set([live.liveId(1), live.liveId(-1), live.REST_LIVE_ID]).size).toBe(3);
  });

  it('the planner gives running timers as countdowns, only with the timer notes on', () => {
    const input = {
      settings: { ...DEFAULT_NOTIFY, optedIn: true }, voice: 'system' as const, nowMs: NOW, boundaryMinutes: 240,
      today: { dayNumber: 1, window: { startsAt: NOW - 1, endsAt: NOW + 86_400_000, timeZone: 'UTC' }, restDay: false, settled: false },
      restTomorrow: false, shadowEvening: false, timers: [{ questId: 7, title: 'Read', doneAt: NOW + 60_000 }, { questId: 8, title: 'Done', doneAt: NOW - 1 }],
    };
    expect(planLive(input)).toEqual([{ id: 1007, title: 'Read', text: NOTIFY_TEXT.live.timer, at: NOW + 60_000 }]);
    expect(planLive({ ...input, settings: { ...input.settings, timers: false } })).toEqual([]);
    expect(planLive({ ...input, settings: { ...input.settings, optedIn: false } })).toEqual([]);
  });

  it('the rest between sets shows while it runs and goes when skipped', async () => {
    live.setLiveAllowed(true);
    await render(<RepLog condition={{ kind: 'reps', sets: 2, reps: 8, perSide: false }} disabled={false} onClaim={jest.fn()} now={() => NOW} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
    expect(native.show).toHaveBeenCalledWith(live.REST_LIVE_ID, 'Rest between sets', NOTIFY_TEXT.live.rest, NOW + REPS_REST_MS, true, NOTIFY_TEXT.live.channel);
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(native.clear).toHaveBeenCalledWith(live.REST_LIVE_ID);
  });
});

describe('the offer on the quest screen (decision 12)', () => {
  const timerDay = (): ServerState => {
    const s = serverState();
    const quests = s.today!.quests.map((q): QuestView => (q.slot === 'core' ? { ...q, completion: 'timer', condition: { kind: 'minutes', minutes: 10 }, minutes: 10 } : q));
    return { ...s, today: { ...s.today!, quests } };
  };
  const core = (s: ServerState) => s.today!.quests.find((q) => q.slot === 'core')!;

  it('once a timer runs without the timer notes: Show it asks the phone and turns them on', async () => {
    const s = timerDay();
    const store = testStore({ view: project(s, []), permission: 'ask' });
    await render(withStore(store, <Quest questId={core(s).id} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => NOW} />));
    expect(screen.queryByTestId('live-offer')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByTestId('live-offer')).toBeTruthy();
    await act(async () => { await fireEvent.press(screen.getByRole('button', { name: NOTIFY_TEXT.live.allow })); });
    expect(store.getState().markOffer).toHaveBeenCalledWith('live-timer');
    expect(store.getState().allowNotify).toHaveBeenCalled();
    expect(store.getState().setNotify).toHaveBeenCalledWith(expect.objectContaining({ timers: true, optedIn: true }));
  });

  it('never when they are on already, or once answered', async () => {
    const s = timerDay();
    await render(withStore(testStore({ view: project(s, []), notify: { ...DEFAULT_NOTIFY, optedIn: true } }),
      <Quest questId={core(s).id} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => NOW} />));
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(screen.queryByTestId('live-offer')).toBeNull();
    await render(withStore(testStore({ view: project(s, []), permission: 'ask', offers: ['live-timer'] }),
      <Quest questId={core(s).id} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => NOW} />));
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(screen.queryByTestId('live-offer')).toBeNull();
  });
});
