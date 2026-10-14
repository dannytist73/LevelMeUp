// M10b: what the player feels (spec decisions 2, 3, 6). The Jest setup mocks src/ui/haptics.ts, so `buzz` here is a
// jest.fn that records each feel, and fake timers place each one in time. A stamp's buzz waits on the animation clock
// (`after`, emulator check), which this file runs on the fake timers: cancelling its shared value clears the wait, as
// Reanimated calls a cancelled animation back with false. reducedMotion.test checks the real `after`.
import { ACHIEVEMENTS, ONBOARDING_TEXT } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { project } from '../src/game/project.ts';
import type { ClearedNumbers } from '../src/quest/cleared.ts';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Vow } from '../src/screens/onboarding/Vow.tsx';
import { Cleared } from '../src/screens/quest/Cleared.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { Today } from '../src/screens/Today.tsx';
import { buzz } from '../src/ui/haptics.ts';
import { HOLD_SETTLE_MS, HoldButton } from '../src/ui/HoldButton.tsx';
import { MOMENTS, THUD_LAND_MS, THUD_SPRING, after } from '../src/ui/motion.ts';
import { Thud } from '../src/ui/Thud.tsx';
import { DAY_TWO_NOW, READY_DRAFT, claimedState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';
import { fingerDown, fingerUp, touchTaken } from './support/touch.ts';

jest.mock('../src/ui/motion.ts', () => ({
  ...jest.requireActual('../src/ui/motion.ts'),
  after: jest.fn((ms: number, then: () => void) => ({ wait: setTimeout(then, ms) })),
}));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => false,
  cancelAnimation: jest.fn((shared: { value: unknown }) => {
    const v = shared.value as { wait?: ReturnType<typeof setTimeout> } | null;
    if (typeof v === 'object' && v !== null && v.wait !== undefined) clearTimeout(v.wait);
  }),
}));

const felt = () => (buzz as jest.Mock).mock.calls.map((c) => c[0] as string);
const wait = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  (buzz as jest.Mock).mockClear();
  (after as jest.Mock).mockClear();
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

  it('waits on the animation clock, its delay and the landing, as the stamp does (emulator check)', async () => {
    await render(<Thud delay={220} haptic="stamp"><Text>+20</Text></Thud>);
    expect((after as jest.Mock).mock.calls.map((c) => c[0])).toEqual([220 + THUD_LAND_MS]);
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
    await fingerDown(button);
    expect(felt()).toEqual([]);
    await wait(HOLD_SETTLE_MS);
    expect(felt()).toEqual(['tick']);
    await wait(1_000);
    await fingerUp(button);
    await wait(3_000);
    expect(felt()).toEqual(['tick']);
    await fingerDown(button);
    await wait(HOLD_SETTLE_MS + 2_000);
    expect(felt()).toEqual(['tick', 'tick', 'sworn']);
    expect(onDone).toHaveBeenCalledTimes(1);
    // The click comes first, so it lands with the moment rather than after the next screen's work.
    expect((buzz as jest.Mock).mock.invocationCallOrder.at(-1)!).toBeLessThan(onDone.mock.invocationCallOrder[0]!);
  });

  it('a scroll that starts on the button takes the touch before the hold settles: no tick, no hold (review)', async () => {
    const onDone = jest.fn();
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={onDone} screenReader={false} />);
    const button = screen.getByRole('button', { name: 'Hold to swear' });
    await fingerDown(button);
    await wait(HOLD_SETTLE_MS - 1);
    await touchTaken(button); // the list takes the touch
    await wait(3_000);
    expect(felt()).toEqual([]);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('a quick tap: one tick, nothing sworn (React Native starts a press that ends before it settles)', async () => {
    const onDone = jest.fn();
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={onDone} screenReader={false} />);
    const button = screen.getByRole('button', { name: 'Hold to swear' });
    await fingerDown(button);
    await wait(40);
    await fingerUp(button);
    await wait(3_000);
    expect(felt()).toEqual(['tick']);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('with a screen reader: the sworn click on Confirm (TalkBack speaks the first tap)', async () => {
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={jest.fn()} screenReader />);
    await fireEvent.press(screen.getByRole('button', { name: 'Swear' }));
    expect(felt()).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm the vow' }));
    expect(felt()).toEqual(['sworn']);
  });
});

const TWO_UPS: ClearedNumbers = {
  xp: 20,
  statUps: [{ stat: 'strength', from: 11, to: 12, rank: 'D' }, { stat: 'vitality', from: 9, to: 10, rank: 'D' }],
  discipline: true, streak: { from: 9, to: 10 },
  level: { level: 6, xpIntoLevel: 87, xpForLevel: 130 }, levelBefore: { level: 6, xpIntoLevel: 67, xpForLevel: 130 }, recovered: false,
};
const clearedScreen = (numbers: ClearedNumbers) => (
  <Cleared heading="CORE QUEST · KNEE PUSH-UPS" line="3 sets of 8" numbers={numbers} rating={null} dayOpen waiting={false}
    onRate={jest.fn()} onUndo={jest.fn()} onContinue={jest.fn()} canStepDown={false} onStepDown={jest.fn()} onPain={null} />
);
const cleared = (numbers: ClearedNumbers) => render(clearedScreen(numbers));
const TODAY_NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs 12:00–20:00 UTC
const today = (store: ReturnType<typeof testStore>, shown?: boolean) => withStore(store,
  <Today shown={shown} onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()}
    onTraining={jest.fn()} onCheckin={jest.fn()} now={() => TODAY_NOW} />);
const streakUp = (view: ReturnType<typeof project>) =>
  ({ ...view, character: { ...view.character, streak: { ...view.character.streak, current: view.character.streak.current + 1 } } });

describe('the moments buzz on rewards (M10b spec decision 2)', () => {
  it('Quest cleared: the firm click as the XP stamp lands, then one tick for the rank stamps', async () => {
    await cleared(TWO_UPS);
    await wait(MOMENTS.cleared.stamp + THUD_LAND_MS);
    expect(felt()).toEqual(['stamp']);
    await wait(MOMENTS.cleared.rank - MOMENTS.cleared.stamp);
    expect(felt()).toEqual(['stamp', 'tick']);
    await wait(2_000);
    expect(felt()).toEqual(['stamp', 'tick']); // two rank stamps land together: one tick
  });

  it('a sync that changes the stat-ups never moves the rank tick, nor plays it again (review)', async () => {
    const swapped = { ...TWO_UPS, statUps: [...TWO_UPS.statUps].reverse() };
    const screenNow = await cleared(TWO_UPS);
    await wait(MOMENTS.cleared.stamp + THUD_LAND_MS);
    await screenNow.rerender(clearedScreen(swapped)); // before the rank stamps land
    await wait(MOMENTS.cleared.rank - MOMENTS.cleared.stamp);
    expect(felt()).toEqual(['stamp', 'tick']); // on time
    await screenNow.rerender(clearedScreen(TWO_UPS)); // and after
    await wait(2_000);
    expect(felt()).toEqual(['stamp', 'tick']);
  });

  it('a quest cleared reopened (no before) shows still and stays quiet', async () => {
    await cleared({ ...TWO_UPS, levelBefore: null });
    await wait(2_000);
    expect(felt()).toEqual([]);
  });

  it('a level-up: the double as "LV n" lands', async () => {
    await render(withStore(testStore({ view: project(serverState(), []), celebrations: [{ kind: 'level', level: 5, from: 4 }] }), <Celebration />));
    await wait(MOMENTS.level.number + THUD_LAND_MS);
    expect(felt()).toEqual(['level']);
    await wait(2_000);
    expect(felt()).toEqual(['level']);
  });

  it('an achievement: the firm click as its name lands', async () => {
    await render(withStore(testStore({ celebrations: [{ kind: 'achievement', id: ACHIEVEMENTS[0]!.id }] }), <Celebration />));
    await wait(MOMENTS.achievement.name + THUD_LAND_MS);
    expect(felt()).toEqual(['stamp']);
    await wait(2_000);
    expect(felt()).toEqual(['stamp']);
  });

  it('Today: a tick when the streak grows, never on opening', async () => {
    const view = project(serverState(), []);
    const store = testStore({ view });
    await render(today(store));
    await wait(1_000);
    expect(felt()).toEqual([]);
    await act(async () => store.setState({ view: streakUp(view) }));
    await wait(THUD_LAND_MS);
    expect(felt()).toEqual(['tick']);
  });

  it('Today under another tab or screen: a streak that grows there stays quiet, then and on return (review)', async () => {
    const view = project(serverState(), []);
    const store = testStore({ view });
    const shown = await render(today(store, false));
    await act(async () => store.setState({ view: streakUp(view) }));
    await wait(2_000);
    await shown.rerender(today(store, true));
    await wait(2_000);
    expect(felt()).toEqual([]);
  });
});

describe('nothing buzzes for a miss (M10b spec decision 3)', () => {
  it("the Shadow's claimed stamp stays quiet", async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    await wait(5_000);
    expect(felt()).toEqual([]);
  });

  it('"Sworn" adds nothing: the hold\'s click already marked the vow', async () => {
    await render(withStore(testStore({ phase: 'ready', draft: READY_DRAFT }), <Vow onDone={jest.fn()} screenReader />));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.edit }));
    await fireEvent.changeText(screen.getByLabelText(ONBOARDING_TEXT.vow.edit), 'I will rise.');
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.tap }));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.confirm }));
    expect(await screen.findByTestId('sworn-thud')).toBeTruthy();
    await wait(2_000);
    expect(felt()).toEqual(['sworn']);
  });
});
