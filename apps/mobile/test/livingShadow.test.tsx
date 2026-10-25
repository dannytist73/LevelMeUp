// M10b (spec decision 7): the living Shadow. Reanimated's functions are spied (a file-level mock) to see which loops start
// and stop; its mock runs nothing, so these check what starts when, not frames. Monster Buddy: the clay painting ships in
// the app, so it and its eyes live from the first frame.
import { SHADOW_TEXT } from '@levelmeup/content';
import { act, render, screen } from '@testing-library/react-native';
import { AppState, StyleSheet } from 'react-native';
import { ReduceMotion, cancelAnimation, useReducedMotion, withRepeat, withTiming } from 'react-native-reanimated';
import { BREATH_TO, CREEP_TO, EMBERS, PULSE_FROM, PULSE_TO } from '../src/ui/motion.ts';
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
const flat = (style: unknown): Record<string, unknown> => (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;

beforeEach(() => {
  for (const fn of [cancelAnimation, withRepeat, withTiming]) (fn as jest.Mock).mockClear();
  (AppState.addEventListener as jest.Mock).mockClear();
});
afterEach(() => {
  (useReducedMotion as jest.Mock).mockImplementation(() => false);
});

describe('the living Shadow (M10b spec decision 7)', () => {
  it('from the first frame: the eyes pulse, it creeps closer once, ten embers rise, and the breath follows the creep', async () => {
    await render(<ShadowArt />);
    expect(screen.getAllByTestId('eye-glow', hidden)).toHaveLength(2); // one over each painted eye
    expect(timed(PULSE_TO)).toBeGreaterThan(0);
    expect(timed(CREEP_TO)).toBe(1);
    expect(screen.getAllByTestId('ember', hidden)).toHaveLength(EMBERS.length);
    expect(timed(BREATH_TO)).toBeGreaterThan(0);
    expect(timed(1)).toBeGreaterThanOrEqual(EMBERS.length); // each ember's rise
    expect(flat(screen.getByTestId('shadow-creep', hidden).props.style).transform).toBeDefined();
  });

  it('every loop is endless and holds when the phone asks for reduced motion (the scene picks its own path)', async () => {
    await render(<ShadowArt />);
    expect(calls(withRepeat).length).toBeGreaterThan(0);
    expect(calls(withRepeat).filter((c) => c[1] !== -1 || c[4] !== ReduceMotion.Never)).toEqual([]);
  });

  it('with "Remove animations" on: nothing pulses, creeps, rises or breathes; the eyes stay', async () => {
    (useReducedMotion as jest.Mock).mockImplementation(() => true);
    await render(<ShadowArt />);
    expect(calls(withRepeat)).toEqual([]);
    expect(timed(CREEP_TO)).toBe(0);
    expect(screen.queryAllByTestId('ember', hidden)).toEqual([]);
    expect(flat(screen.getByTestId('shadow-creep', hidden).props.style).transform).toBeUndefined();
    expect(screen.getByTestId('shadow-art', hidden)).toBeTruthy(); // the painting stays, its painted eyes with it
    expect(screen.queryAllByTestId('eye-glow', hidden)).toEqual([]);
  });

  it('stops in the background and starts again on return: it never runs unseen', async () => {
    await render(<ShadowArt />);
    const change = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)![1] as (state: string) => void;
    (cancelAnimation as jest.Mock).mockClear();
    (withTiming as jest.Mock).mockClear();
    await act(async () => change('background'));
    expect(calls(cancelAnimation).length).toBeGreaterThanOrEqual(2 + EMBERS.length); // the pulse, the breath, each ember
    expect(timed(PULSE_TO) + timed(BREATH_TO) + timed(1)).toBe(0); // nothing starts again while away, embers included
    // A back-and-forth loop swings between where it starts and its end, so each stops at its start: otherwise the pulse
    // and the breath come back smaller after every trip to the background (review).
    const stoppedAt = calls(cancelAnimation).map((c) => (c[0] as { value: number }).value);
    expect(stoppedAt).toContain(PULSE_FROM);
    expect(stoppedAt).toContain(1);
    expect(stoppedAt.filter((v) => v !== PULSE_FROM && v !== 1 && v !== 0)).toEqual([]);
    await act(async () => change('active'));
    expect(timed(PULSE_TO)).toBeGreaterThan(0);
    expect(timed(BREATH_TO)).toBeGreaterThan(0);
    expect(timed(1)).toBeGreaterThanOrEqual(EMBERS.length);
  });

  it('its life is hidden from screen readers and touches; the panel keeps its label', async () => {
    await render(<ShadowArt />);
    const life = screen.getByTestId('shadow-life', hidden);
    expect(life.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(life.props.pointerEvents).toBe('none');
    expect(screen.getByRole('image', { name: SHADOW_TEXT.art })).toBeTruthy();
    expect(screen.getByTestId('shadow-art', hidden)).toBeTruthy(); // inside the labelled panel
  });
});
