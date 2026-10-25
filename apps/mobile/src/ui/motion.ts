// M10a: the motion rule's numbers (visual spec §3; spec 2026-10-14-m10a-motion-design.md) and the pure parts of the
// motion pieces. Every timing, spring, delay and sequence runs even when the phone asks for reduced motion
// (`ReduceMotion.Never`, plan decision 1, review): each piece picks its own reduced path (a fade), so Reanimated must
// not skip that fade to its end, nor a delay that staggers it. M10b: the living Shadow's numbers, `forever` for its loops,
// and `after` for a buzz that lands with a stamp.
import { Easing, ReduceMotion, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export const SLAM_MS = 180;
export const SLAM_PX = 16;
export const FADE_MS = 180;
export const THUD_FROM = 1.3;
export const THUD_FADE_MS = 80;
/** Settles in about 270 ms, overshooting once to about 0.97. */
export const THUD_SPRING = { damping: 18, mass: 0.6, stiffness: 400, reduceMotion: ReduceMotion.Never } as const;
export const THUD_SETTLE_MS = 300;
/** When the thud's spring first reaches full size, about 0.1 s in (from THUD_SPRING): the stamp's buzz lands then (M10b). */
export const THUD_LAND_MS = 100;
export const RISE_MS = 300;
export const RISE_PX = 12;
export const BURST_MS = 400;
export const BURST_FROM = 0.6;
export const INK_MS = 600;
/** The ink drops start this share of the radius out, just past the stamp's edge, so they show at once (emulator check). */
export const INK_FROM = 0.6;
export const FILL_MS = 700;
export const WRAP_FILL_MS = 450;
export const FLASH_MS = 120;
export const REFILL_MS = 400;
export const CREEP_MS = 4_000;
export const CREEP_TO = 1.06;
/** How long past its motion's end a piece waits before settling where the motion ends (`useSettle`, audit 2026-10-15). */
export const SETTLE_MS = 500;

/** A timing config that always runs (plan decision 1); ease-out unless told otherwise. */
export function timing(duration: number, easing = Easing.out(Easing.cubic)) {
  return { duration, easing, reduceMotion: ReduceMotion.Never };
}

/**
 * A delay that holds even when the phone asks for reduced motion (plan decision 1, review): Reanimated's default skips
 * it, which would start every staggered fade at once.
 */
export function delayed(ms: number, animation: number): number {
  return withDelay(ms, animation, ReduceMotion.Never);
}

/** A loop that holds even when the phone asks for reduced motion (M10b, as `delayed`): the Shadow picks its own reduced path. */
export function forever(animation: number, reverse: boolean): number {
  return withRepeat(animation, -1, reverse, undefined, ReduceMotion.Never);
}

/**
 * Waits `ms` on the animation clock, then calls `then` on the JS thread; never once cancelled (Reanimated calls a
 * cancelled animation back with `finished` false). M10b: a stamp's buzz waits on the clock its stamp moves on. A JS
 * timer starts as the screen is made, before Android has drawn it and started the stamp, and came about 0.1 s early
 * in the production bundle (emulator check).
 */
export function after(ms: number, then: () => void): number {
  return delayed(ms, withTiming(1, { duration: 0, reduceMotion: ReduceMotion.Never }, (finished) => {
    'worklet';
    if (finished) scheduleOnRN(then);
  }));
}

/** When each part of a moment starts, in ms from the screen opening (spec decision 4). */
export const MOMENTS = {
  cleared: { stamp: 220, panel: 380, rank: 500, bar: 600 },
  level: { label: 100, number: 200, line: 600 },
  achievement: { name: 100, rest: 350 },
  reveal: { panel: 150 },
  shadow: { stamp: 300 },
} as const;

/** The filled share of a bar, between 0 and 1. */
export function fillFraction(value: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.max(0, Math.min(1, value / max));
}

/** A level and the XP into it, as a bar shows them. */
export type BarPoint = { level: number; value: number; max: number };
export type Segment = { from: number; to: number };

/**
 * How a bar moves from what it showed to what it shows now (spec decision 5): up within a level is one fill; up across
 * a level fills to the end, then from empty (once, however many levels); anything else, a drop included, shows at once.
 */
export function fillSegments(was: BarPoint, now: BarPoint): Segment[] {
  const a = fillFraction(was.value, was.max);
  const b = fillFraction(now.value, now.max);
  if (now.level === was.level) return b > a ? [{ from: a, to: b }] : [];
  if (now.level > was.level) return [{ from: a, to: 1 }, { from: 0, to: b }];
  return [];
}

export type CountPlan = { from: number; delay: number; duration: number };

/** The level line's count, in step with the bar that starts after `delay`: across a level it counts only the last part. */
export function countPlan(was: BarPoint | null, now: BarPoint, delay: number): CountPlan | null {
  if (was === null) return null;
  const steps = fillSegments(was, now);
  if (steps.length === 1) return { from: was.value, delay, duration: FILL_MS };
  if (steps.length === 2) return { from: 0, delay: delay + WRAP_FILL_MS + FLASH_MS, duration: REFILL_MS };
  return null;
}

export type InkTone = 'accent' | 'accentText' | 'chalk';
export type InkDrop = { dx: number; dy: number; size: number; tone: InkTone };

const JITTER = [0, 0.31, -0.22, 0.17, -0.35, 0.08, 0.26, -0.12];
const REACH = [1, 0.62, 0.84, 0.71, 0.93];
const SIZES = [12, 7, 10, 5, 8, 6];
const TONES: readonly InkTone[] = ['accent', 'chalk', 'accentText'];

/** The ink splash's drops (spec decision 3, plan decision 3): a fixed table, never random, so every run is the same. */
export function inkDrops(count: number, radius: number): InkDrop[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i + JITTER[i % JITTER.length]!) / count) * 2 * Math.PI;
    const reach = radius * REACH[i % REACH.length]!;
    return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach, size: SIZES[i % SIZES.length]!, tone: TONES[i % TONES.length]! };
  });
}

/** M10b (spec decision 7): the living Shadow. Monster Buddy: it is painted again, in clay. Where the painted eyes are, as
 * shares of the frame (measured from assets/shadow/shadow.webp, 1280 × 720), and the glow's width as a share of the
 * frame's. */
export type ShadowEye = { x: number; y: number };
export const SHADOW_EYES: readonly ShadowEye[] = [{ x: 0.454, y: 0.419 }, { x: 0.561, y: 0.419 }];
export const GLOW_SHARE = 0.09;
/** The eyes' pulse: opacity from PULSE_FROM to PULSE_TO and back, PULSE_MS each way (a 3-second breath). */
export const PULSE_MS = 1_500;
export const PULSE_FROM = 0.3;
export const PULSE_TO = 0.85;
/** The Shadow's breath after the creep: 1.5 % larger and back, BREATH_MS each way. */
export const BREATH_MS = 2_500;
export const BREATH_TO = 1.015;

export type Ember = { x: number; y: number; rise: number; drift: number; size: number; ms: number; delay: number; tone: 'shadow' | 'shadowDeep' };

/** The Shadow's embers: a fixed table, never random (like the ink drops), each starting in its lower half and rising
 * `rise` dp over `ms`, drifting `drift` dp sideways, after `delay`. */
export const EMBERS: readonly Ember[] = [
  { x: 0.40, y: 0.78, rise: 52, drift: 4, size: 4, ms: 4_200, delay: 0, tone: 'shadow' },
  { x: 0.58, y: 0.66, rise: 38, drift: -5, size: 3, ms: 3_400, delay: 600, tone: 'shadowDeep' },
  { x: 0.46, y: 0.90, rise: 66, drift: -3, size: 5, ms: 4_800, delay: 1_300, tone: 'shadow' },
  { x: 0.63, y: 0.84, rise: 44, drift: 6, size: 3, ms: 3_800, delay: 300, tone: 'shadowDeep' },
  { x: 0.37, y: 0.62, rise: 30, drift: 3, size: 3, ms: 3_000, delay: 2_100, tone: 'shadow' },
  { x: 0.52, y: 0.74, rise: 58, drift: -6, size: 4, ms: 4_500, delay: 900, tone: 'shadowDeep' },
  { x: 0.66, y: 0.70, rise: 34, drift: -4, size: 3, ms: 3_200, delay: 2_700, tone: 'shadow' },
  { x: 0.43, y: 0.68, rise: 46, drift: 5, size: 4, ms: 3_900, delay: 1_800, tone: 'shadowDeep' },
  { x: 0.55, y: 0.93, rise: 70, drift: 2, size: 5, ms: 5_000, delay: 2_400, tone: 'shadow' },
  { x: 0.61, y: 0.60, rise: 32, drift: -2, size: 3, ms: 3_600, delay: 1_500, tone: 'shadowDeep' },
];
