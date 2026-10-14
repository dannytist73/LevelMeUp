// M10b (spec decision 7): the living Shadow. Reanimated's functions are spied (a file-level mock) to see which loops start
// and stop; its mock runs nothing, so these check what starts when, not frames.
import { SHADOW_TEXT } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { ReduceMotion, cancelAnimation, useReducedMotion, withRepeat, withTiming } from 'react-native-reanimated';
import { BREATH_TO, EMBERS, PULSE_TO } from '../src/ui/motion.ts';
import { ShadowArt } from '../src/ui/ShadowArt.tsx';

jest.mock('react-native-reanimated', () => {
  const base = require('react-native-reanimated/mock');
  return {
    ...base,
    useReducedMotion: jest.fn(() => false),
    cancelAnimation: jest.fn(),
    withRepeat: jest.fn(base.withRepeat),
    withTiming: jest.fn(base.withTiming),
  };
});

const calls = (fn: unknown) => (fn as jest.Mock).mock.calls as unknown[][];
const timed = (to: number) => calls(withTiming).filter((c) => c[0] === to).length;
const hidden = { includeHiddenElements: true } as const;
const painting = () => screen.getByTestId('shadow-art', hidden);

beforeEach(() => {
  for (const fn of [cancelAnimation, withRepeat, withTiming]) (fn as jest.Mock).mockClear();
  (AppState.addEventListener as jest.Mock).mockClear();
});
afterEach(() => {
  (useReducedMotion as jest.Mock).mockImplementation(() => false);
});

describe('the living Shadow (M10b spec decision 7)', () => {
  it('before the painting loads, only the stand-in eyes pulse: no glows, no embers, no breath (plan decision 7)', async () => {
    await render(<ShadowArt />);
    expect(timed(PULSE_TO)).toBeGreaterThan(0);
    expect(timed(BREATH_TO)).toBe(0);
    expect(screen.queryAllByTestId('eye-glow', hidden)).toEqual([]);
    expect(screen.queryAllByTestId('ember', hidden)).toEqual([]);
  });

  it('once loaded: two glows on the eyes, ten embers rising, and the breath after the creep', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    expect(screen.getAllByTestId('eye-glow', hidden)).toHaveLength(2);
    expect(screen.getAllByTestId('ember', hidden)).toHaveLength(EMBERS.length);
    expect(timed(BREATH_TO)).toBeGreaterThan(0);
    expect(timed(1)).toBeGreaterThanOrEqual(EMBERS.length); // each ember's rise
  });

  it('every loop is endless and holds when the phone asks for reduced motion (the scene picks its own path)', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    expect(calls(withRepeat).length).toBeGreaterThan(0);
    expect(calls(withRepeat).filter((c) => c[1] !== -1 || c[4] !== ReduceMotion.Never)).toEqual([]);
  });

  it('with "Remove animations" on: nothing pulses, rises or breathes, even once loaded', async () => {
    (useReducedMotion as jest.Mock).mockImplementation(() => true);
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    expect(calls(withRepeat)).toEqual([]);
    expect(screen.queryAllByTestId('eye-glow', hidden)).toEqual([]);
    expect(screen.queryAllByTestId('ember', hidden)).toEqual([]);
  });

  it('stops in the background and starts again on return: it never runs unseen', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    const change = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)![1] as (state: string) => void;
    (cancelAnimation as jest.Mock).mockClear();
    (withTiming as jest.Mock).mockClear();
    await act(async () => change('background'));
    expect(calls(cancelAnimation).length).toBeGreaterThanOrEqual(2 + EMBERS.length); // the pulse, the breath, each ember
    expect(timed(PULSE_TO) + timed(BREATH_TO)).toBe(0);
    await act(async () => change('active'));
    expect(timed(PULSE_TO)).toBeGreaterThan(0);
    expect(timed(BREATH_TO)).toBeGreaterThan(0);
  });

  it('hidden from screen readers and touches; the painting keeps its label', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    const life = screen.getByTestId('shadow-life', hidden);
    expect(life.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(life.props.pointerEvents).toBe('none');
    expect(screen.getByRole('image', { name: SHADOW_TEXT.art })).toBeTruthy();
  });

  it('a painting that cannot load leaves the stand-in eyes, still pulsing', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'error');
    expect(screen.queryByTestId('shadow-art', hidden)).toBeNull();
    expect(screen.getByTestId('shadow-eyes', hidden)).toBeTruthy();
    expect(timed(PULSE_TO)).toBeGreaterThan(0);
    expect(timed(BREATH_TO)).toBe(0);
  });
});
