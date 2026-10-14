// M10b: what the player feels (spec decisions 2, 3, 6). The Jest setup mocks src/ui/haptics.ts, so `buzz` here is a
// jest.fn that records each feel, and fake timers place each one in time.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { buzz } from '../src/ui/haptics.ts';
import { HoldButton } from '../src/ui/HoldButton.tsx';
import { THUD_LAND_MS, THUD_SPRING } from '../src/ui/motion.ts';
import { Thud } from '../src/ui/Thud.tsx';

const felt = () => (buzz as jest.Mock).mock.calls.map((c) => c[0] as string);
const wait = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  (buzz as jest.Mock).mockClear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('a thud buzzes as its stamp lands (M10b spec decision 6)', () => {
  it('THUD_LAND_MS is when the spring first reaches full size (plan decision 5)', () => {
    const { damping, mass, stiffness } = THUD_SPRING;
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const wd = w0 * Math.sqrt(1 - zeta ** 2);
    const land = ((Math.PI - Math.atan(wd / (zeta * w0))) / wd) * 1000;
    expect(Math.abs(land - THUD_LAND_MS)).toBeLessThan(10);
  });

  it('once, its delay and the landing after it appears', async () => {
    await render(<Thud delay={220} haptic="stamp"><Text>+20</Text></Thud>);
    await wait(220 + THUD_LAND_MS - 1);
    expect(felt()).toEqual([]);
    await wait(1);
    expect(felt()).toEqual(['stamp']);
    await wait(2_000);
    expect(felt()).toEqual(['stamp']);
  });

  it('with reduced motion, at the same moment (haptics are a setting of their own)', async () => {
    await render(<Thud delay={220} haptic="stamp" reduceMotion><Text>+20</Text></Thud>);
    await wait(220 + THUD_LAND_MS);
    expect(felt()).toEqual(['stamp']);
  });

  it('never when still, never without a feel, and not once the screen has gone', async () => {
    await render(<Thud still haptic="stamp"><Text>+20</Text></Thud>);
    await render(<Thud><Text>+20</Text></Thud>);
    const left = await render(<Thud delay={220} haptic="stamp"><Text>+20</Text></Thud>);
    await wait(100);
    await left.unmount(); // RNTL 14: unmount returns a promise
    await wait(2_000);
    expect(felt()).toEqual([]);
  });
});

describe('the hold buttons (M10b spec decision 6)', () => {
  it('a tick when the hold starts and the sworn click when it fires; let go early, only the tick', async () => {
    const onDone = jest.fn();
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={onDone} screenReader={false} />);
    const button = screen.getByRole('button', { name: 'Hold to swear' });
    await fireEvent(button, 'pressIn');
    expect(felt()).toEqual(['tick']);
    await wait(1_000);
    await fireEvent(button, 'pressOut');
    await wait(3_000);
    expect(felt()).toEqual(['tick']);
    await fireEvent(button, 'pressIn');
    await wait(2_000);
    expect(felt()).toEqual(['tick', 'tick', 'sworn']);
    expect(onDone).toHaveBeenCalledTimes(1);
    // The click comes first, so it lands with the moment rather than after the next screen's work.
    expect((buzz as jest.Mock).mock.invocationCallOrder.at(-1)!).toBeLessThan(onDone.mock.invocationCallOrder[0]!);
  });

  it('with a screen reader: the sworn click on Confirm (TalkBack speaks the first tap)', async () => {
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={jest.fn()} screenReader />);
    await fireEvent.press(screen.getByRole('button', { name: 'Swear' }));
    expect(felt()).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm the vow' }));
    expect(felt()).toEqual(['sworn']);
  });
});
