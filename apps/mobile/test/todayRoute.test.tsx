import { render } from '@testing-library/react-native';
import { router } from 'expo-router';
import TodayRoute from '../app/(tabs)/index.tsx';
import { project } from '../src/game/project.ts';
import { DAY_TWO_NOW, claimedState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

// The route's focus effect runs as an effect here: Today is always in focus.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { router: { push: jest.fn() }, useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
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
