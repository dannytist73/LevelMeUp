// M10a: the motion rule (visual spec §3; spec 2026-10-14-m10a-motion-design.md). Reanimated's Jest mock makes a fresh
// shared value at each render and computes each animated style from it, so every render shows where a piece starts;
// an animation jumps to its end without a render. These tests check where each piece starts, its reduced-motion path
// and its accessibility, not frames; screens check that the motion is there, and that a piece starts again is seen in
// the calls that start it.
import { ACHIEVEMENTS, ONBOARDING_TEXT, PLAY_TEXT } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, StyleSheet, Text } from 'react-native';
import { project } from '../src/game/project.ts';
import type { ClearedNumbers } from '../src/quest/cleared.ts';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { Vow } from '../src/screens/Vow.tsx';
import { Cleared } from '../src/screens/quest/Cleared.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { Today } from '../src/screens/Today.tsx';
import { colors } from '../src/theme/tokens.ts';
import { FadeIn } from '../src/ui/FadeIn.tsx';
import { InkBurst } from '../src/ui/InkBurst.tsx';
import {
  BURST_FROM, EMBERS, FILL_MS, GLOW_SHARE, INK_FROM, FLASH_MS, MOMENTS, REFILL_MS, RISE_MS, RISE_PX, SETTLE_MS, SLAM_MS, SLAM_PX, THUD_FROM, THUD_SETTLE_MS, WRAP_FILL_MS, countPlan, fillSegments,
  inkDrops, SHADOW_EYES,
} from '../src/ui/motion.ts';
import type { BarPoint, CountPlan } from '../src/ui/motion.ts';
import * as motion from '../src/ui/motion.ts';
import { SlamIn } from '../src/ui/SlamIn.tsx';
import { SpeedLines } from '../src/ui/SpeedLines.tsx';
import { Thud } from '../src/ui/Thud.tsx';
import { useAppActive, useCountUp, useGrowth, useSettle } from '../src/ui/useMotion.ts';
import { XpBar } from '../src/ui/XpBar.tsx';
import { DAY_TWO_NOW, READY_DRAFT, REVEAL, claimedState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const at = (level: number, value: number, max = 130): BarPoint => ({ level, value, max });
const flat = (style: unknown): Record<string, unknown> => (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
const hidden = { includeHiddenElements: true } as const;

describe('the motion numbers (M10a decisions 3–5)', () => {
  it('fills up within a level once, wraps once across a level, and never animates a drop', () => {
    expect(fillSegments(at(6, 26), at(6, 65))).toEqual([{ from: 0.2, to: 0.5 }]);
    expect(fillSegments(at(6, 117), at(7, 30, 150))).toEqual([{ from: 0.9, to: 1 }, { from: 0, to: 0.2 }]);
    expect(fillSegments(at(6, 117), at(8, 30, 150))).toEqual([{ from: 0.9, to: 1 }, { from: 0, to: 0.2 }]); // wraps once
    expect(fillSegments(at(6, 65), at(6, 26))).toEqual([]); // an undo
    expect(fillSegments(at(7, 10, 150), at(6, 120))).toEqual([]); // an undo across a level
    expect(fillSegments(at(6, 65), at(6, 65))).toEqual([]);
  });

  it('counts the level line in step with the bar: across a level, only the last part', () => {
    expect(countPlan(null, at(6, 65), 600)).toBeNull();
    expect(countPlan(at(6, 26), at(6, 65), 600)).toEqual({ from: 26, delay: 600, duration: FILL_MS });
    expect(countPlan(at(6, 117), at(7, 30, 150), 600)).toEqual({ from: 0, delay: 600 + WRAP_FILL_MS + FLASH_MS, duration: REFILL_MS });
    expect(countPlan(at(6, 65), at(6, 26), 600)).toBeNull();
  });

  it('splashes the same drops every time, all inside the radius', () => {
    const drops = inkDrops(12, 80);
    expect(drops).toHaveLength(12);
    expect(inkDrops(12, 80)).toEqual(drops);
    expect(inkDrops(16, 120)).toHaveLength(16);
    expect(drops.filter((d) => Math.hypot(d.dx, d.dy) > 80 + 1e-9 || Math.hypot(d.dx, d.dy) < 80 * 0.6)).toEqual([]);
    expect(drops.filter((d) => d.size < 5 || d.size > 12)).toEqual([]);
    expect(new Set(drops.map((d) => d.tone))).toEqual(new Set(['accent', 'accentText', 'chalk']));
  });

  it('every moment is over in under two seconds (the Shadow\'s creep aside)', () => {
    const ends = [
      MOMENTS.cleared.bar + WRAP_FILL_MS + FLASH_MS + REFILL_MS, // the longest: a level crossed
      MOMENTS.cleared.rank + THUD_SETTLE_MS,
      MOMENTS.level.line + SLAM_MS,
      MOMENTS.level.portrait + RISE_MS,
      MOMENTS.achievement.rest + RISE_MS,
      MOMENTS.reveal.panel + SLAM_MS,
      MOMENTS.shadow.stamp + THUD_SETTLE_MS,
    ];
    expect(ends.filter((ms) => ms >= 2_000)).toEqual([]);
  });
});

function Growth({ value, shown }: { value: number | null; shown?: boolean }) {
  return <Text>{`grew ${useGrowth(value, shown)}`}</Text>;
}

function Count({ plan, to, reduce }: { plan: CountPlan | null; to: number; reduce?: boolean }) {
  return <Text>{`n ${useCountUp(plan, to, reduce)}`}</Text>;
}

describe('the motion hooks (M10a)', () => {
  it('counts only rises after the first value, so opening a screen never animates', async () => {
    const view = await render(<Growth value={null} />);
    await view.rerender(<Growth value={4} />);
    expect(screen.getByText('grew 0')).toBeTruthy();
    await view.rerender(<Growth value={5} />);
    expect(screen.getByText('grew 1')).toBeTruthy();
    await view.rerender(<Growth value={3} />);
    expect(screen.getByText('grew 1')).toBeTruthy();
    await view.rerender(<Growth value={4} />);
    expect(screen.getByText('grew 2')).toBeTruthy();
  });

  it('a rise while the screen is hidden is taken quietly: it never plays unseen, nor late on return (M10b review)', async () => {
    const view = await render(<Growth value={4} />);
    await view.rerender(<Growth value={5} shown={false} />);
    expect(screen.getByText('grew 0')).toBeTruthy();
    await view.rerender(<Growth value={5} />);
    expect(screen.getByText('grew 0')).toBeTruthy();
    await view.rerender(<Growth value={6} />);
    expect(screen.getByText('grew 1')).toBeTruthy();
  });

  it('a count starts at its plan (the phone counts up from there); with reduced motion or no plan, the end at once', async () => {
    await render(<Count plan={{ from: 67, delay: 600, duration: FILL_MS }} to={87} />);
    expect(screen.getByText('n 67')).toBeTruthy();
    await render(<Count plan={{ from: 67, delay: 600, duration: FILL_MS }} to={87} reduce />);
    expect(screen.getByText('n 87')).toBeTruthy();
    await render(<Count plan={null} to={87} />);
    expect(screen.getByText('n 87')).toBeTruthy();
  });
});

function Settles({ ms, active = true, settle }: { ms: number; active?: boolean; settle: () => void }) {
  useSettle(ms, active, settle);
  return null;
}

describe('slam, thud and fade (M10a decision 3)', () => {
  it('moving, each starts where its motion begins', async () => {
    await render(
      <>
        <SlamIn><Text>slam</Text></SlamIn>
        <Thud><Text>thud</Text></Thud>
        <FadeIn rise><Text>fade</Text></FadeIn>
      </>,
    );
    expect(flat(screen.getByTestId('slam-in').props.style)).toEqual({ opacity: 0, transform: [{ translateY: -SLAM_PX }, { scale: 1.04 }] });
    expect(flat(screen.getByTestId('thud').props.style)).toEqual({ opacity: 0, transform: [{ scale: THUD_FROM }] });
    expect(flat(screen.getByTestId('fade-in').props.style)).toEqual({ opacity: 0, transform: [{ translateY: RISE_PX }] });
  });

  it('with reduced motion, each only fades', async () => {
    await render(
      <>
        <SlamIn reduceMotion delay={100}><Text>slam</Text></SlamIn>
        <Thud reduceMotion><Text>thud</Text></Thud>
        <FadeIn reduceMotion rise><Text>fade</Text></FadeIn>
      </>,
    );
    for (const id of ['slam-in', 'thud', 'fade-in']) expect(flat(screen.getByTestId(id).props.style)).toEqual({ opacity: 0 });
    expect(screen.getByText('thud')).toBeTruthy();
  });

  it('once the motion is surely over, a piece is told to settle where it ends: never early, never still, never after leaving (audit 2026-10-15)', async () => {
    // Each piece then sets its shared values to the motion's end, so an animation that never ran can't leave it hidden. That
    // part is checked on the emulator (a slam-in that never starts shows its card); Reanimated's Jest mock can't show it.
    jest.useFakeTimers();
    try {
      const settle = jest.fn();
      const still = jest.fn();
      const gone = jest.fn();
      await render(<Settles ms={100 + SLAM_MS} settle={settle} />);
      await act(async () => { jest.advanceTimersByTime(100 + SLAM_MS + SETTLE_MS - 1); });
      expect(settle).not.toHaveBeenCalled();
      await act(async () => { jest.advanceTimersByTime(1); });
      expect(settle).toHaveBeenCalledTimes(1);
      await render(<Settles ms={SLAM_MS} active={false} settle={still} />);
      const left = await render(<Settles ms={SLAM_MS} settle={gone} />);
      await act(async () => { left.unmount(); });
      await act(async () => { jest.advanceTimersByTime(10_000); });
      expect(still).not.toHaveBeenCalled();
      expect(gone).not.toHaveBeenCalled();
      expect(settle).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('a still thud shows its child as it is; a wrapper style is kept', async () => {
    await render(<Thud still style={{ alignSelf: 'flex-start' }}><Text>still</Text></Thud>);
    expect(flat(screen.getByTestId('thud').props.style)).toEqual({ alignSelf: 'flex-start' });
    await render(<SlamIn style={{ alignSelf: 'stretch' }}><Text>wide</Text></SlamIn>);
    expect(flat(screen.getByTestId('slam-in').props.style).alignSelf).toBe('stretch');
  });
});

describe('speed-line burst and the ink splash (M10a decision 3)', () => {
  it('a burst starts small and clear; still lines have no motion at all', async () => {
    await render(<SpeedLines burst />);
    expect(flat(screen.getByTestId('speed-lines', hidden).props.style)).toMatchObject({ opacity: 0, transform: [{ scale: BURST_FROM }] });
    await render(<SpeedLines />);
    const still = flat(screen.getByTestId('speed-lines', hidden).props.style);
    expect(still.transform).toBeUndefined();
    expect(still.opacity).toBeUndefined();
    await render(<SpeedLines burst reduceMotion />);
    const fading = flat(screen.getByTestId('speed-lines', hidden).props.style);
    expect(fading.transform).toBeUndefined();
    expect(fading.opacity).toBe(0);
  });

  it("the drops start just past the stamp's edge, so they show from the first frame (emulator check)", async () => {
    await render(<InkBurst count={12} radius={80}><Text>stamp</Text></InkBurst>);
    for (const drop of screen.getAllByTestId('ink-drop', hidden)) {
      const [x, y] = (flat(drop.props.style).transform as Record<string, number>[]).map((t) => t.translateX ?? t.translateY ?? 0);
      expect(Math.hypot(x!, y!)).toBeCloseTo(INK_FROM * 80, 6);
    }
  });

  it('the splash has its drops, out of the way of touches and screen readers', async () => {
    await render(<InkBurst count={12}><Text>stamp</Text></InkBurst>);
    expect(screen.getAllByTestId('ink-drop', hidden)).toHaveLength(12);
    expect(screen.getByTestId('ink-burst', hidden).props).toMatchObject({
      pointerEvents: 'none', accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants',
    });
    expect(screen.getByText('stamp')).toBeTruthy();
  });

  it('works its drops out once, so a re-render (the count ticking) never restarts their motion (review)', async () => {
    const drops = jest.spyOn(motion, 'inkDrops');
    const view = await render(<InkBurst count={12}><Text>stamp</Text></InkBurst>);
    await view.rerender(<InkBurst count={12}><Text>stamp</Text></InkBurst>);
    await view.rerender(<InkBurst count={12}><Text>stamp</Text></InkBurst>);
    expect(drops).toHaveBeenCalledTimes(1);
    drops.mockRestore();
  });

  it('with reduced motion there is no splash, only what it wraps', async () => {
    await render(<InkBurst reduceMotion><Text>stamp</Text></InkBurst>);
    expect(screen.queryAllByTestId('ink-drop', hidden)).toEqual([]);
    expect(screen.getByText('stamp')).toBeTruthy();
  });
});

describe('the XP bar (M10a decisions 3, 5, 7)', () => {
  it('without a level it never moves (stat bars, timers, the trial)', async () => {
    await render(<XpBar value={62} max={130} label="still" />);
    expect(flat(screen.getByTestId('xp-fill').props.style).width).toBe(`${(62 / 130) * 100}%`);
    expect(screen.queryByTestId('xp-flash')).toBeNull();
  });

  it('with a level, it starts where it was, and says the new value at once', async () => {
    await render(<XpBar value={87} max={130} level={6} from={at(6, 67)} label="moving" />);
    expect(flat(screen.getByTestId('xp-fill').props.style).transform).toEqual([{ scaleX: 67 / 130 }]);
    expect(screen.getByRole('progressbar', { name: 'moving' }).props.accessibilityValue).toEqual({ min: 0, max: 130, now: 87 });
    expect(screen.getByTestId('xp-flash')).toBeTruthy();
  });

  it('opened without a "from", it shows the value: Today opening never moves the bar', async () => {
    await render(<XpBar value={87} max={130} level={6} label="opened" />);
    expect(flat(screen.getByTestId('xp-fill').props.style).transform).toEqual([{ scaleX: 87 / 130 }]);
  });

  it('with reduced motion, the new value at once and no flash', async () => {
    await render(<XpBar value={87} max={130} level={6} from={at(6, 67)} label="reduced" reduceMotion />);
    expect(flat(screen.getByTestId('xp-fill').props.style).transform).toEqual([{ scaleX: 87 / 130 }]);
    expect(screen.queryByTestId('xp-flash')).toBeNull();
  });
});

const NUMBERS: ClearedNumbers = {
  xp: 20, statUps: [{ stat: 'strength', from: 11, to: 12, rank: 'D' }], discipline: true, streak: { from: 9, to: 10 },
  level: { level: 6, xpIntoLevel: 87, xpForLevel: 130 }, levelBefore: { level: 6, xpIntoLevel: 67, xpForLevel: 130 }, recovered: false,
};

const cleared = (numbers: ClearedNumbers) => render(
  <Cleared heading="CORE QUEST · KNEE PUSH-UPS" line="3 sets of 8" numbers={numbers} rating={null} dayOpen waiting={false}
    onRate={jest.fn()} onUndo={jest.fn()} onContinue={jest.fn()} canStepDown={false} onStepDown={jest.fn()} onPain={null} />,
);

describe('Quest cleared moves (M10a decision 4)', () => {
  it('the lines burst, the title slams, the stamp thuds in ink, the panel slams, the rank thuds', async () => {
    await cleared(NUMBERS);
    expect(flat(screen.getByTestId('speed-lines', hidden).props.style).transform).toBeDefined();
    expect(screen.getAllByTestId('slam-in')).toHaveLength(2); // the title and the stats panel
    expect(screen.getByTestId('xp-stamp-thud')).toBeTruthy();
    expect(screen.getAllByTestId('ink-drop', hidden)).toHaveLength(12);
    expect(screen.getByTestId('rank-thud')).toBeTruthy();
    expect(screen.getByLabelText('+20 XP')).toBeTruthy();
    expect(screen.getByLabelText('Rank D')).toBeTruthy();
  });

  it('the bar moves; the level line counts up and is heard at its end', async () => {
    await cleared(NUMBERS);
    expect(screen.getByTestId('xp-flash')).toBeTruthy(); // a moving bar (where it starts: Task 5's tests)
    expect(screen.getByRole('progressbar', { name: 'Level 6 progress' }).props.accessibilityValue).toEqual({ min: 0, max: 130, now: 87 });
    expect(screen.getByText('Lv 6 · 67 / 130 XP')).toBeTruthy(); // the count's start (the mock never runs it)
    expect(screen.getByLabelText('Lv 6 · 87 / 130 XP')).toBeTruthy();
  });

  it('opened later (no before): no fill, no count', async () => {
    await cleared({ ...NUMBERS, levelBefore: null });
    expect(flat(screen.getByTestId('xp-fill').props.style).transform).toEqual([{ scaleX: 87 / 130 }]);
    expect(screen.getByText('Lv 6 · 87 / 130 XP')).toBeTruthy();
  });

  it('reopened (no before), the moment stays still: no burst, no ink, nothing slams or thuds (the owner, 2026-10-14)', async () => {
    await cleared({ ...NUMBERS, levelBefore: null });
    const lines = flat(screen.getByTestId('speed-lines', hidden).props.style);
    expect([lines.transform, lines.opacity]).toEqual([undefined, undefined]);
    expect(screen.queryAllByTestId('ink-drop', hidden)).toEqual([]);
    for (const id of ['slam-in', 'xp-stamp-thud', 'rank-thud']) {
      for (const el of screen.getAllByTestId(id)) {
        const style = flat(el.props.style);
        expect([id, style.transform, style.opacity]).toEqual([id, undefined, undefined]);
      }
    }
    expect(screen.getByLabelText('+20 XP')).toBeTruthy();
  });

  it('buttons work from the first frame: nothing waits for the motion', async () => {
    const onContinue = jest.fn();
    await render(
      <Cleared heading="H" line="L" numbers={NUMBERS} rating={null} dayOpen waiting={false} onRate={jest.fn()} onUndo={jest.fn()}
        onContinue={onContinue} canStepDown={false} onStepDown={jest.fn()} onPain={null} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalled();
  });
});

describe('level-ups and achievements move (M10a decision 4)', () => {
  it('a level-up: bursting lines, a thud in a bigger splash, the portrait rising, the line slamming in', async () => {
    await render(withStore(testStore({ view: project(serverState(), []), celebrations: [{ kind: 'level', level: 5, from: 4 }] }), <Celebration />));
    expect(flat(screen.getByTestId('speed-lines', hidden).props.style).transform).toBeDefined();
    expect(screen.getByTestId('level-thud')).toBeTruthy();
    expect(screen.getByText('Lv 5')).toBeTruthy();
    expect(screen.getAllByTestId('ink-drop', hidden)).toHaveLength(16);
    expect(screen.getAllByTestId('fade-in')).toHaveLength(3); // the portrait, its line and (M17) the new ability
    expect(screen.getAllByTestId('slam-in')).toHaveLength(2); // LEVEL UP and the System's line
    expect(screen.getByText(PLAY_TEXT.celebration.portrait)).toBeTruthy();
    expect(screen.getByText('New ability: Second Wind')).toBeTruthy(); // M17: a Warrior's level 5
  });

  it('an achievement: still lines, no splash; its name thuds and its words fade in', async () => {
    const titled = ACHIEVEMENTS.find((a) => a.title !== null)!;
    await render(withStore(testStore({ celebrations: [{ kind: 'achievement', id: titled.id }] }), <Celebration />));
    expect(flat(screen.getByTestId('speed-lines', hidden).props.style).transform).toBeUndefined();
    expect(screen.queryAllByTestId('ink-drop', hidden)).toEqual([]);
    expect(screen.getByTestId('achievement-thud')).toBeTruthy();
    expect(screen.getAllByTestId('fade-in')).toHaveLength(2); // the description and the title earned
    expect(screen.getByText(titled.name)).toBeTruthy();
  });

  it("the next one in the queue plays afresh: the modal's content is keyed (plan decision 6, review)", async () => {
    const [a, b] = ACHIEVEMENTS;
    const store = testStore({ celebrations: [{ kind: 'achievement', id: a!.id }, { kind: 'achievement', id: b!.id }] });
    await render(withStore(store, <Celebration />));
    const first = screen.getByTestId('achievement-thud');
    await act(async () => store.setState({ celebrations: [{ kind: 'achievement', id: b!.id }] }));
    expect(screen.getByText(b!.name)).toBeTruthy();
    // A new view, not the finished one re-rendered: on the phone its motion starts again.
    expect(screen.getByTestId('achievement-thud')).not.toBe(first);
  });

  it('Continue works from the first frame', async () => {
    const store = testStore({ celebrations: [{ kind: 'level', level: 7, from: 6 }] });
    await render(withStore(store, <Celebration />));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(store.getState().dismissCelebration).toHaveBeenCalled();
  });
});

describe('the reveal, the Shadow and the vow move (M10a decision 4)', () => {
  it('the reveal: its lines burst once and the class panel slams in', async () => {
    await render(withStore(testStore({ phase: 'not_started', draft: READY_DRAFT, reveal: REVEAL, view: project(serverState(), []) }),
      <Reveal onAccept={() => {}} onFix={() => {}} />));
    expect(flat(screen.getByTestId('speed-lines', hidden).props.style).transform).toBeDefined();
    expect(screen.getAllByTestId('slam-in')).toHaveLength(1);
  });

  it('the Shadow: the painting creeps, the box slams in, the claimed stamp thuds', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(flat(screen.getByTestId('shadow-creep', hidden).props.style).transform).toBeDefined();
    expect(screen.getByTestId('shadow-art', hidden)).toBeTruthy();
    expect(screen.getAllByTestId('slam-in')).toHaveLength(1);
    expect(screen.getByTestId('claimed-thud')).toBeTruthy();
    expect(screen.getByText(/^Claimed · /)).toBeTruthy();
    expect(flat(screen.getByLabelText(/^Claimed · /).props.style)).toMatchObject({ borderColor: colors.shadow }); // red is the Shadow's (M11 review)
  });

  it('the vow: "Sworn" thuds when it appears', async () => {
    await render(withStore(testStore({ phase: 'ready', draft: READY_DRAFT }), <Vow onDone={jest.fn()} screenReader />));
    expect(screen.queryByTestId('sworn-thud')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.edit }));
    await fireEvent.changeText(screen.getByLabelText(ONBOARDING_TEXT.vow.edit), 'I will rise.');
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.tap }));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.confirm }));
    expect(await screen.findByTestId('sworn-thud')).toBeTruthy();
  });
});

describe('Today moves only when something changes (M10a decision 7)', () => {
  const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs 12:00–20:00 UTC
  const today = (store: ReturnType<typeof testStore>) => render(withStore(store,
    <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
      onCheckin={jest.fn()} now={() => NOW} />));

  it("the streak is still on opening and thuds once it grows (drops never count: useGrowth's test)", async () => {
    const view = project(serverState(), []);
    const store = testStore({ view });
    await today(store);
    const thud = () => flat(screen.getByTestId('streak-thud').props.style).transform;
    expect(thud()).toBeUndefined();
    const streak = (current: number) => ({ ...view, character: { ...view.character, streak: { ...view.character.streak, current } } });
    await act(async () => store.setState({ view: streak(view.character.streak.current + 1) }));
    expect(thud()).toBeDefined();
  });

  it('the XP bar is a moving one, and says a synced value at once', async () => {
    const view = project(serverState(), []);
    const store = testStore({ view });
    await today(store);
    expect(screen.getByTestId('xp-flash')).toBeTruthy();
    const more = { ...view, character: { ...view.character, xpIntoLevel: view.character.xpIntoLevel + 5 } };
    await act(async () => store.setState({ view: more }));
    expect(screen.getByRole('progressbar', { name: /Level \d+ progress/ }).props.accessibilityValue.now).toBe(view.character.xpIntoLevel + 5);
  });
});

describe("the living Shadow's numbers (M10b spec decision 7)", () => {
  it('the glows sit on the painted eyes, whole inside the frame', () => {
    expect(SHADOW_EYES).toEqual([{ x: 0.488, y: 0.227 }, { x: 0.533, y: 0.227 }]); // measured from shadow.webp, 960 × 540
    for (const eye of SHADOW_EYES) {
      expect(eye.x - GLOW_SHARE / 2).toBeGreaterThan(0);
      expect(eye.x + GLOW_SHARE / 2).toBeLessThan(1);
      expect(eye.y - (GLOW_SHARE / 2) * (16 / 9)).toBeGreaterThan(0); // the glow is square; the frame 16:9
    }
  });

  it('ten embers from a fixed table, starting in its lower half, small and slow', () => {
    expect(EMBERS).toHaveLength(10);
    expect(EMBERS.filter((e) => e.y < 0.5 || e.y >= 1 || e.x <= 0 || e.x >= 1)).toEqual([]);
    expect(EMBERS.filter((e) => e.size < 3 || e.size > 5 || e.rise < 30 || e.rise > 70 || e.ms < 3_000 || e.ms > 5_000)).toEqual([]);
  });
});

function Front() {
  return <Text>{useAppActive() ? 'front' : 'away'}</Text>;
}

describe('useAppActive (M10b plan decision 8)', () => {
  it('in front on opening, away in the background, in front again on return', async () => {
    const listen = AppState.addEventListener as jest.Mock;
    listen.mockClear();
    await render(<Front />);
    expect(screen.getByText('front')).toBeTruthy();
    const change = listen.mock.calls.at(-1)![1] as (state: string) => void;
    await act(async () => change('background'));
    expect(screen.getByText('away')).toBeTruthy();
    await act(async () => change('active'));
    expect(screen.getByText('front')).toBeTruthy();
  });
});
