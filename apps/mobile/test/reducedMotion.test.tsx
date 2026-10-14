// M10a plan decision 1 and the review: each piece picks its own reduced path, so no timing, spring, delay or sequence
// may follow the phone's setting on its own (Reanimated's default jumps a fade to its end, skips a delay, and ends a
// sequence at once). The moments follow the phone's "Remove animations" (`useReducedMotion`), which this file switches.
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ReduceMotion, useReducedMotion, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { project } from '../src/game/project.ts';
import type { ClearedNumbers } from '../src/quest/cleared.ts';
import { Cleared } from '../src/screens/quest/Cleared.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { FadeIn } from '../src/ui/FadeIn.tsx';
import { SpeedLines } from '../src/ui/SpeedLines.tsx';
import { DAY_TWO_NOW, claimedState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

jest.mock('react-native-reanimated', () => {
  const base = require('react-native-reanimated/mock');
  return {
    ...base,
    useReducedMotion: jest.fn(() => false),
    withDelay: jest.fn(base.withDelay),
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
  for (const fn of [withDelay, withSequence, withSpring, withTiming]) (fn as jest.Mock).mockClear();
});
afterEach(() => {
  (useReducedMotion as jest.Mock).mockImplementation(() => false);
});

describe('the phone\'s setting never cuts a piece short (M10a decision 1, review)', () => {
  it('every delay, sequence, timing and spring runs on the piece\'s own choice', async () => {
    await cleared(LEVELLED); // a slam with a delay, thuds, the ink, a bar across a level, the count
    await render(<FadeIn rise delay={100}><></></FadeIn>);
    await render(<SpeedLines burst />);
    expect(calls(withDelay).length).toBeGreaterThan(5);
    expect(calls(withSequence).length).toBeGreaterThan(0);
    expect(calls(withSpring).length).toBeGreaterThan(0);
    expect(calls(withDelay).filter((c) => c[2] !== ReduceMotion.Never)).toEqual([]);
    expect(calls(withSequence).filter((c) => c[0] !== ReduceMotion.Never)).toEqual([]);
    expect(calls(withTiming).filter((c) => (c[1] as { reduceMotion?: unknown }).reduceMotion !== ReduceMotion.Never)).toEqual([]);
    expect(calls(withSpring).filter((c) => (c[1] as { reduceMotion?: unknown }).reduceMotion !== ReduceMotion.Never)).toEqual([]);
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
    expect(screen.getByText('LV 6 · 87 / 130 XP')).toBeTruthy();
  });

  it('the Shadow\'s painting stays still', async () => {
    (useReducedMotion as jest.Mock).mockImplementation(() => true);
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(flat(screen.getByTestId('shadow-creep', hidden).props.style).transform).toBeUndefined();
    expect(screen.getByTestId('shadow-art', hidden)).toBeTruthy();
  });
});
