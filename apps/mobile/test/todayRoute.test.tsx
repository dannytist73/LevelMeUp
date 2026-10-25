import { act, render } from '@testing-library/react-native';
import { router, useIsFocused } from 'expo-router';
import TodayRoute from '../app/(tabs)/index.tsx';
import { project } from '../src/game/project.ts';
import { buzz } from '../src/ui/haptics.ts';
import { DAY_TWO_NOW, claimedState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

// The route's focus effect runs as an effect here: Today is in focus unless a test says otherwise.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { router: { push: jest.fn() }, useFocusEffect: (effect: () => void) => useEffect(effect, [effect]), useIsFocused: jest.fn(() => true) };
});

describe("Today opens the Shadow's scene by itself, once (M7c decision 5)", () => {
  beforeEach(() => (router.push as jest.Mock).mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('for a consequence this phone has not shown, and only once', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(DAY_TWO_NOW);
    const store = testStore({ view: project(claimedState('shadow'), []) });
    await render(withStore(store, <TodayRoute />));
    expect(router.push).toHaveBeenCalledWith('/shadow');
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('never for one already shown, nor once its day has ended', async () => {
    const view = project(claimedState('shadow'), []);
    jest.spyOn(Date, 'now').mockReturnValue(DAY_TWO_NOW);
    await render(withStore(testStore({ view, shadowSeen: 7 }), <TodayRoute />));
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse(view.today!.endsAt!));
    await render(withStore(testStore({ view }), <TodayRoute />));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("Today's focus reaches the arena's stamp (M10b review; Monster Week: power, not the streak)", () => {
  beforeEach(() => {
    (buzz as jest.Mock).mockClear();
    jest.useFakeTimers({ now: Date.UTC(2026, 9, 10, 13) }); // day 1 runs 12:00–20:00 UTC
  });
  afterEach(() => {
    jest.useRealTimers();
    (useIsFocused as jest.Mock).mockReturnValue(true);
  });

  it.each([[true, ['stamp']], [false, []]])('in focus %s, power that grows buzzes %j', async (focused, felt) => {
    (useIsFocused as jest.Mock).mockReturnValue(focused);
    const view = project(serverState(), []);
    const store = testStore({ view });
    await render(withStore(store, <TodayRoute />));
    const grown = {
      ...view,
      today: { ...view.today!, quests: view.today!.quests.map((q) => (q.slot === 'core' ? { ...q, completedAt: new Date(Date.UTC(2026, 9, 10, 13)).toISOString() } : q)) },
    };
    await act(async () => store.setState({ view: grown }));
    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });
    expect((buzz as jest.Mock).mock.calls.map((c) => c[0])).toEqual(felt);
  });
});

describe('Today opens a decided battle by itself, once (Monster Week)', () => {
  beforeEach(() => (router.push as jest.Mock).mockClear());
  afterEach(() => jest.restoreAllMocks());

  const decided = () => {
    const s = serverState(['core']);
    return { ...s, camp: { wins: { snoozle: 1 }, last: { n: 1, grumble: 'snoozle', won: true, power: 9, need: 8, rematch: 0, byStat: { vitality: 9 } } } };
  };

  it('for a battle this phone has not shown', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 10, 13));
    await render(withStore(testStore({ view: project(decided(), []) }), <TodayRoute />));
    expect(router.push).toHaveBeenCalledWith('/battle');
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('waits while a level-up or achievement is in front, then opens (review)', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 10, 13));
    const store = testStore({ view: project(decided(), []), celebrations: [{ kind: 'level', level: 2, from: 1 }] });
    await render(withStore(store, <TodayRoute />));
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => store.setState({ celebrations: [] }));
    expect(router.push).toHaveBeenCalledWith('/battle');
  });

  it('never before the card that explains the battles', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 10, 13));
    await render(withStore(testStore({ view: project(decided(), []), offers: [] }), <TodayRoute />));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('never for one already shown', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 10, 13));
    await render(withStore(testStore({ view: project(decided(), []), offers: ['monster:intro', 'battle:1:won'] }), <TodayRoute />));
    expect(router.push).not.toHaveBeenCalled();
  });
});
