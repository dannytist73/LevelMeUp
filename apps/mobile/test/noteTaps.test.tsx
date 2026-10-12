import { render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { NoteTaps } from '../src/notify/NoteTaps.tsx';
import { listenTaps } from '../src/notify/os.ts';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));
jest.mock('../src/notify/os.ts', () => ({ listenTaps: jest.fn() }));

const listen = listenTaps as jest.Mock;

describe('notification taps (M7d decision 7)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('open the screen a tap names, and stop listening when the root goes', async () => {
    const stop = jest.fn();
    listen.mockImplementation((go: (url: string) => void) => {
      go('/quest/12');
      return stop;
    });
    const { unmount } = await render(<NoteTaps />);
    expect(router.navigate).toHaveBeenCalledWith('/quest/12');
    await unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('leave the app working on a build without the native module', async () => {
    listen.mockImplementation(() => {
      throw new Error("Cannot find native module 'ExpoPushTokenManager'");
    });
    const { unmount } = await render(<NoteTaps />);
    expect(router.navigate).not.toHaveBeenCalled();
    await unmount();
  });
});
