// M17: a tap on the tab already shown takes it back to the top (ui/tabTop.ts).
import { onTabTop, tabTop } from '../src/ui/tabTop.ts';

describe('tabTop', () => {
  it('tells only that tab\'s screen, until it stops listening', () => {
    const today = jest.fn();
    const library = jest.fn();
    const stopToday = onTabTop('index', today);
    const stopLibrary = onTabTop('library', library);
    tabTop('index');
    expect(today).toHaveBeenCalledTimes(1);
    expect(library).not.toHaveBeenCalled();
    stopToday();
    tabTop('index');
    expect(today).toHaveBeenCalledTimes(1);
    tabTop('chronicle');
    stopLibrary();
  });
});
