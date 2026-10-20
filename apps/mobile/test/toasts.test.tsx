// Premium pass B1: the app's note after an action that closes its own screen.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useSegments } from 'expo-router';
import { Text } from 'react-native';
import { SNACKBAR_MS } from '../src/ui/Snackbar.tsx';
import { Toasts } from '../src/ui/Toasts.tsx';
import { dismissToast, peekToast, setTabBarHeight, toast, useToastLift } from '../src/ui/toast.ts';

jest.mock('expo-router', () => ({ useSegments: jest.fn(() => ['(tabs)']) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }) }));

const bottomOf = () => (screen.getByTestId('toasts').props.style as { bottom: number }).bottom;

function Bar({ height }: { height: number | null }) {
  useToastLift(height);
  return <Text>bar</Text>;
}

describe('the app note (premium pass B1)', () => {
  afterEach(async () => {
    const shown = peekToast();
    if (shown !== null) await act(async () => dismissToast(shown.id));
  });

  it('shows one note at a time, a newer one replacing the older', async () => {
    await render(<Toasts />);
    await act(async () => toast('First.'));
    await act(async () => toast('Second.'));
    expect(screen.queryByText('First.')).toBeNull();
    expect(screen.getByText('Second.')).toBeTruthy();
  });

  it('goes by itself, and an action closes it', async () => {
    jest.useFakeTimers();
    try {
      await render(<Toasts />);
      await act(async () => toast('Saved.'));
      await act(async () => jest.advanceTimersByTime(SNACKBAR_MS));
      expect(screen.queryByText('Saved.')).toBeNull();
      const onPress = jest.fn();
      await act(async () => toast('Swapped.', { label: 'Change', onPress }));
      await fireEvent.press(screen.getByRole('button', { name: 'Change' }));
      expect(onPress).toHaveBeenCalled();
      expect(screen.queryByText('Swapped.')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('sits above the tab bar on a tab, and above a bar fixed at the bottom of a screen', async () => {
    setTabBarHeight(70);
    await render(<><Toasts /><Bar height={null} /></>);
    await act(async () => toast('On a tab.'));
    expect(bottomOf()).toBe(82);
    await screen.unmount();
    await render(<><Toasts /><Bar height={120} /></>);
    await act(async () => toast('Above a Claim bar.'));
    expect(bottomOf()).toBe(132);
    await screen.unmount(); // the bar's screen closed: the note comes down again
    (useSegments as jest.Mock).mockReturnValue(['settings']);
    await render(<Toasts />);
    await act(async () => toast('Off the tabs.'));
    expect(bottomOf()).toBe(36); // the phone's own bar: 24, then 12
  });
});
