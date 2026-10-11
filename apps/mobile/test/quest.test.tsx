import { fireEvent, render, screen } from '@testing-library/react-native';
import { NEW_TIMER, startTimer } from '../src/quest/timer.ts';
import { RepLog } from '../src/screens/quest/RepLog.tsx';
import { SentenceLog } from '../src/screens/quest/SentenceLog.tsx';
import { TapClaim } from '../src/screens/quest/TapClaim.tsx';
import { TimerPanel, clock } from '../src/screens/quest/TimerPanel.tsx';

const T0 = Date.UTC(2026, 9, 10, 13);
const MIN = 60_000;
const disabled = (name: string) => screen.getByRole('button', { name }).props.accessibilityState.disabled;

describe('the completion panels (spec §3.6)', () => {
  it('check-off: one tap claims it', async () => {
    const onClaim = jest.fn();
    await render(<TapClaim disabled={false} onClaim={onClaim} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    expect(onClaim).toHaveBeenCalledWith({});
  });

  it('timer: starts, shows the time, and claims only from 80 %', async () => {
    const onChange = jest.fn();
    const onClaim = jest.fn();
    const props = { targetMs: 20 * MIN, disabled: false, onChange, onClaim };
    const view = await render(<TimerPanel timer={NEW_TIMER} now={() => T0} {...props} />);
    expect(screen.getByText('00:00 / 20:00')).toBeTruthy();
    expect(screen.getByText(/claim it from 16:00/)).toBeTruthy();
    expect(disabled('Claim')).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(onChange).toHaveBeenCalledWith({ segments: [], runningSince: T0 });

    await view.rerender(<TimerPanel timer={startTimer(NEW_TIMER, T0)} now={() => T0 + 16 * MIN} {...props} />);
    expect(screen.getByText('16:00 / 20:00')).toBeTruthy();
    expect(screen.getByText('Ready to claim.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Claim' }));
    expect(onClaim).toHaveBeenCalledWith({ segments: [{ start: T0, end: T0 + 16 * MIN }] });
  });

  it('timer: a paused timer offers Resume', async () => {
    const paused = { segments: [{ start: T0, end: T0 + MIN }], runningSince: null };
    await render(<TimerPanel timer={paused} now={() => T0 + 5 * MIN} targetMs={20 * MIN} disabled={false} onChange={jest.fn()} onClaim={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
    expect(screen.getByText('01:00 / 20:00')).toBeTruthy();
  });

  it('formats long timers with hours, and never below zero', () => {
    expect(clock(65 * MIN + 5000)).toBe('1:05:05');
    expect(clock(-1)).toBe('00:00');
  });

  it('rep log: starts at the target, moves each set, adds and removes sets, and logs what was done', async () => {
    const onClaim = jest.fn();
    await render(<RepLog condition={{ kind: 'reps', sets: 2, reps: 8, perSide: false }} disabled={false} onClaim={onClaim} />);
    expect(screen.getAllByLabelText('8 reps')).toHaveLength(2);
    expect(screen.getByText('Each set in reps.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Set 2, one less' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add a set' }));
    expect(screen.getAllByLabelText('7 reps')).toHaveLength(2); // a new set copies the last one
    await fireEvent.press(screen.getByRole('button', { name: 'Remove the last set' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    expect(onClaim).toHaveBeenCalledWith({ sets: [8, 7] });
  });

  it('rep log for a hold counts seconds per side', async () => {
    await render(<RepLog condition={{ kind: 'hold', sets: 1, seconds: 30, perSide: true }} disabled={false} onClaim={jest.fn()} />);
    expect(screen.getByLabelText('30 seconds per side')).toBeTruthy();
    expect(screen.getByText('Each set in seconds per side.')).toBeTruthy();
    expect(disabled('Remove the last set')).toBe(true); // never below one set
  });

  it('rep log refuses all zeros', async () => {
    await render(<RepLog condition={{ kind: 'reps', sets: 1, reps: 1, perSide: false }} disabled={false} onClaim={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Set 1, one less' }));
    expect(disabled('Log it')).toBe(true);
  });

  it('one sentence: waits for a line, then logs it trimmed', async () => {
    const onClaim = jest.fn();
    await render(<SentenceLog disabled={false} onClaim={onClaim} />);
    expect(disabled('Log it')).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('One sentence'), '  Two pages on focus.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    expect(onClaim).toHaveBeenCalledWith({ text: 'Two pages on focus.' });
  });

  it('every panel can be disabled while a claim is on its way', async () => {
    await render(<TapClaim disabled onClaim={jest.fn()} />);
    expect(disabled('Mark cleared')).toBe(true);
  });
});
