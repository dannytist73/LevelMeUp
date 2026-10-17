// M12 phase 1, the shared kit (plan decision 10; audit 4, 5, 10, 11, 13, 24, 25; board R3-8).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import { colors, space } from '../src/theme/tokens.ts';
import { Button } from '../src/ui/Button.tsx';
import { InkTabBar } from '../src/ui/InkTabBar.tsx';
import { OptionCard } from '../src/ui/OptionCard.tsx';
import { Skeleton, TodaySkeleton } from '../src/ui/Skeleton.tsx';
import { Snackbar } from '../src/ui/Snackbar.tsx';
import { StateNote } from '../src/ui/StateNote.tsx';
import { RIPPLE, Tap } from '../src/ui/Tap.tsx';
import { TextField } from '../src/ui/TextField.tsx';
import { TopBar } from '../src/ui/TopBar.tsx';
import { useReduce } from '../src/ui/useMotion.ts';

const flat = (style: unknown): Record<string, unknown> => (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;

// The phone's accessibility events, caught before any screen listens (the hook listens once per launch).
const listeners: ((on: boolean) => void)[] = [];
jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_: string, fn: (on: boolean) => void) => {
  listeners.push(fn);
  return { remove() {} };
}) as never);

describe('every tap answers (audit 4)', () => {
  // The ripple itself is Android's (the emulator checks it); here, that each surface has its tint and the shape clips it.
  it('a tint for each surface', () => {
    expect(RIPPLE).toEqual({ night: colors.rippleNight, paper: colors.ripplePaper, accent: colors.rippleAccent });
  });

  it('a Tap keeps its press inside its corners', async () => {
    await render(<Tap accessibilityRole="button" accessibilityLabel="Row" on="paper" radius={16} onPress={() => {}}><Text>Row</Text></Tap>);
    expect(flat(screen.getByRole('button', { name: 'Row' }).props.style)).toMatchObject({ borderRadius: 16, overflow: 'hidden' });
  });

  it('buttons are Taps: a pill that clips its ripple', async () => {
    await render(<Button label="Begin" onPress={() => {}} />);
    expect(flat(screen.getByRole('button', { name: 'Begin' }).props.style)).toMatchObject({ borderRadius: 999, overflow: 'hidden' });
  });
});

describe('edges you can see (audit 13)', () => {
  it('outline buttons, unselected options and fields use the strong line; a field takes the accent while typing', async () => {
    await render(
      <>
        <Button label="Later" variant="secondary" onPress={() => {}} />
        <OptionCard label="One sentence" selected={false} onPress={() => {}} />
        <TextField label="Your line" value="" onChangeText={() => {}} />
      </>,
    );
    expect(flat(screen.getByRole('button', { name: 'Later' }).props.style).borderColor).toBe(colors.lineStrong);
    expect(flat(screen.getByTestId('option').props.style).borderColor).toBe(colors.lineStrong);
    const field = screen.getByLabelText('Your line');
    expect(flat(field.props.style).borderColor).toBe(colors.lineStrong);
    await fireEvent(field, 'focus');
    expect(flat(screen.getByLabelText('Your line').props.style)).toMatchObject({ borderColor: colors.accent, borderWidth: space.heroBorder });
    await fireEvent(screen.getByLabelText('Your line'), 'blur');
    expect(flat(screen.getByLabelText('Your line').props.style).borderColor).toBe(colors.lineStrong);
  });

  it('touch targets are 48 dp', () => {
    expect(space.touch).toBe(48);
  });
});

describe('the tab you are on is obvious (audit 5)', () => {
  const tabs = [
    { key: 'index', label: 'Today', icon: 'sun' },
    { key: 'library', label: 'Library', icon: 'book' },
    { key: 'character', label: 'Character', icon: 'user' },
    { key: 'chronicle', label: 'Chronicle', icon: 'calendar' },
  ] as const;

  it('fills the active tab’s pill with the accent; its label is bold accent text', async () => {
    await render(<InkTabBar tabs={tabs} active="library" onSelect={() => {}} />);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(flat(screen.getByTestId('tab-pill').props.style).backgroundColor).toBe(colors.accent);
    expect(flat(screen.getByText('Library').props.style)).toMatchObject({ color: colors.accentText, fontFamily: 'MPlusRounded-ExtraBold' });
    expect(flat(screen.getByText('Today').props.style)).toMatchObject({ color: colors.ash, fontFamily: 'MPlusRounded-Bold' });
  });
});

describe('one top bar (audit 10, 15)', () => {
  it('has a 48 dp Back and reads its title as a heading', async () => {
    const onBack = jest.fn();
    await render(<TopBar title="Notifications" onBack={onBack} />);
    const back = screen.getByRole('button', { name: 'Back' });
    expect(flat(back.props.style)).toMatchObject({ width: 48, height: 48 });
    expect(screen.getByRole('header', { name: 'Notifications' })).toBeTruthy();
    await fireEvent.press(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('closes, for a screen over another', async () => {
    await render(<TopBar kind="close" onBack={() => {}} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
});

describe('loading, empty, offline and failed (audit 11)', () => {
  it('loading is a skeleton read as one "Loading"', async () => {
    await render(<TodaySkeleton reduceMotion />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });

  it('a skeleton holds still with "Remove animations" on', async () => {
    await render(<Skeleton reduceMotion><Text>bone</Text></Skeleton>);
    expect(flat(screen.getByTestId('skeleton').props.style).opacity).toBe(1);
  });

  it.each(['empty', 'offline', 'failed'] as const)('%s says what it is, and offers its action', async (kind) => {
    const onPress = jest.fn();
    await render(<StateNote kind={kind} title="Couldn't sync" line="Nothing is lost." action={{ label: 'Try again', onPress }} />);
    expect(screen.getByTestId(`state-${kind}`)).toBeTruthy();
    expect(screen.getByText("Couldn't sync")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('undo on a snackbar (audit 24, decision 3)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('hides itself after 5 seconds', async () => {
    const onHide = jest.fn();
    await render(<Snackbar message="Walk 10 minutes cleared" actionLabel="Undo" onAction={() => {}} onHide={onHide} />);
    await act(async () => jest.advanceTimersByTime(4999));
    expect(onHide).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('Undo acts, then hides', async () => {
    const onAction = jest.fn();
    const onHide = jest.fn();
    await render(<Snackbar message="Walk 10 minutes cleared" actionLabel="Undo" onAction={onAction} onHide={onHide} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});

describe('"Remove animations" follows the phone live (audit 25)', () => {
  function Probe() {
    return <Text>{useReduce() ? 'still' : 'moving'}</Text>;
  }

  it('a change mid-session reaches the moments', async () => {
    await render(<Probe />);
    expect(screen.getByText('moving')).toBeTruthy();
    expect(listeners).toHaveLength(1);
    await act(async () => listeners[0]!(true));
    expect(screen.getByText('still')).toBeTruthy();
    await act(async () => listeners[0]!(false));
    expect(screen.getByText('moving')).toBeTruthy();
  });
});
