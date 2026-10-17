// M10a plan decision 1 and the review: each piece picks its own reduced path, so no timing, spring, delay or sequence
// may follow the phone's setting on its own (Reanimated's default jumps a fade to its end, skips a delay, and ends a
// sequence at once). The moments follow the phone's "Remove animations" (`useReducedMotion`), which this file switches.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ReduceMotion, useReducedMotion, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { project } from '../src/game/project.ts';
import type { ClearedNumbers } from '../src/quest/cleared.ts';
import { Cleared } from '../src/screens/quest/Cleared.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { FadeIn } from '../src/ui/FadeIn.tsx';
import { CREEP_TO, after } from '../src/ui/motion.ts';
import { ShadowArt } from '../src/ui/ShadowArt.tsx';
import { SpeedLines } from '../src/ui/SpeedLines.tsx';
import { DAY_TWO_NOW, claimedState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

jest.mock('react-native-reanimated', () => {
  const base = require('react-native-reanimated/mock');
  return {
    ...base,
    useReducedMotion: jest.fn(() => false),
    withDelay: jest.fn(base.withDelay),
    withRepeat: jest.fn(base.withRepeat),
    withSequence: jest.fn(base.withSequence),
    withSpring: jest.fn(base.withSpring),
    withTiming: jest.fn(base.withTiming),
  };
});

const calls = (fn: unknown) => (fn as jest.Mock).mock.calls as unknown[][];
const flat = (style: unknown): Record<string, unknown> => (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
const hidden = { includeHiddenElements: true } as const;

const LEVELLED: ClearedNumbers = {
  xp: 20, statUps: [{ stat: 'strength', from: 11, to: 12, rank: 'D' }], discipline: true, streak: { from: 9, to: 10 },
  level: { level: 7, xpIntoLevel: 7, xpForLevel: 150 }, levelBefore: { level: 6, xpIntoLevel: 117, xpForLevel: 130 }, recovered: false,
};
const SAMPLE: ClearedNumbers = { ...LEVELLED, level: { level: 6, xpIntoLevel: 87, xpForLevel: 130 }, levelBefore: { level: 6, xpIntoLevel: 67, xpForLevel: 130 } };

const cleared = (numbers: ClearedNumbers) => render(
  <Cleared heading="CORE QUEST · KNEE PUSH-UPS" line="3 sets of 8" numbers={numbers} rating={null} dayOpen waiting={false}
    onRate={jest.fn()} onUndo={jest.fn()} onContinue={jest.fn()} canStepDown={false} onStepDown={jest.fn()} onPain={null} />,
);

beforeEach(() => {
  for (const fn of [withDelay, withRepeat, withSequence, withSpring, withTiming]) (fn as jest.Mock).mockClear();
});
afterEach(() => {
  (useReducedMotion as jest.Mock).mockImplementation(() => false);
});

describe('the phone\'s setting never cuts a piece short (M10a decision 1, review; M10b)', () => {
  it('every delay, sequence, timing and spring runs on the piece\'s own choice', async () => {
    await cleared(LEVELLED); // a slam with a delay, thuds, the ink, a bar across a level, the count
    await render(<FadeIn rise delay={100}><></></FadeIn>);
    await render(<SpeedLines burst />);
    await render(<ShadowArt />); // M10b: the living Shadow's loops
    await fireEvent(screen.getByTestId('shadow-art', hidden), 'load');
    expect(calls(withDelay).length).toBeGreaterThan(5);
    expect(calls(withSequence).length).toBeGreaterThan(0);
    expect(calls(withSpring).length).toBeGreaterThan(0);
    expect(calls(withDelay).filter((c) => c[2] !== ReduceMotion.Never)).toEqual([]);
    expect(calls(withSequence).filter((c) => c[0] !== ReduceMotion.Never)).toEqual([]);
    expect(calls(withTiming).filter((c) => (c[1] as { reduceMotion?: unknown }).reduceMotion !== ReduceMotion.Never)).toEqual([]);
    expect(calls(withSpring).filter((c) => (c[1] as { reduceMotion?: unknown }).reduceMotion !== ReduceMotion.Never)).toEqual([]);
    expect(calls(withRepeat).length).toBeGreaterThan(0);
    expect(calls(withRepeat).filter((c) => c[4] !== ReduceMotion.Never)).toEqual([]);
  });
});

describe('"Remove animations" on: the moments only fade (M10a decision 3)', () => {
  it('Quest cleared: no burst, no ink, no flash; slams and thuds only fade; the count at its end', async () => {
    (useReducedMotion as jest.Mock).mockImplementation(() => true);
    await cleared(SAMPLE);
    expect(flat(screen.getByTestId('speed-lines', hidden).props.style)).toMatchObject({ opacity: 0 });
    expect(flat(screen.getByTestId('speed-lines', hidden).props.style).transform).toBeUndefined();
    expect(screen.queryAllByTestId('ink-drop', hidden)).toEqual([]);
    expect(screen.queryByTestId('xp-flash')).toBeNull();
    for (const id of ['slam-in', 'xp-stamp-thud', 'rank-thud']) {
      for (const el of screen.getAllByTestId(id)) expect(flat(el.props.style).transform).toBeUndefined();
    }
    expect(flat(screen.getByTestId('xp-fill').props.style).width).toBe(`${(87 / 130) * 100}%`);
    expect(screen.getByText('Lv 6 · 87 / 130 XP')).toBeTruthy();
  });

  it("the Shadow's painting stays still, even once it has loaded", async () => {
    (useReducedMotion as jest.Mock).mockImplementation(() => true);
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    await fireEvent(screen.getByTestId('shadow-art', hidden), 'load');
    expect(flat(screen.getByTestId('shadow-creep', hidden).props.style).transform).toBeUndefined();
    expect(calls(withTiming).filter((c) => c[0] === CREEP_TO)).toEqual([]);
  });
});

describe("the Shadow's creep (M10a decision 4; emulator check)", () => {
  it('waits for the painting: on a slow first download it would be over before the painting shows', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(calls(withTiming).filter((c) => c[0] === CREEP_TO)).toEqual([]);
    await fireEvent(screen.getByTestId('shadow-art', hidden), 'load');
    expect(calls(withTiming).filter((c) => c[0] === CREEP_TO)).toHaveLength(1);
  });
});

describe("a buzz's wait runs on the animation clock (M10b, emulator check)", () => {
  it('waits on the animation clock, whatever the phone asks, then calls back on the JS thread, never once cancelled', async () => {
    const then = jest.fn();
    let finish: ((finished: boolean) => void) | undefined;
    (withTiming as jest.Mock).mockImplementationOnce((to: number, _config: unknown, callback: (finished: boolean) => void) => {
      finish = callback;
      return to;
    });
    after(320, then);
    expect(calls(withDelay).at(-1)?.[0]).toBe(320);
    expect(calls(withDelay).at(-1)?.[2]).toBe(ReduceMotion.Never);
    expect((calls(withTiming).at(-1)?.[1] as { reduceMotion?: unknown }).reduceMotion).toBe(ReduceMotion.Never);
    finish!(false); // Reanimated calls a cancelled animation back with false: leaving the screen
    await Promise.resolve();
    expect(then).not.toHaveBeenCalled();
    finish!(true);
    await Promise.resolve(); // scheduleOnRN hands it to the JS thread
    expect(then).toHaveBeenCalledTimes(1);
  });
});
