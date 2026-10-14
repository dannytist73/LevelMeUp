// M10a: the motion rule's numbers (visual spec §3; spec 2026-10-14-m10a-motion-design.md) and the pure parts of the
// motion pieces. Every timing, spring, delay and sequence runs even when the phone asks for reduced motion
// (`ReduceMotion.Never`, plan decision 1, review): each piece picks its own reduced path (a fade), so Reanimated must
// not skip that fade to its end, nor a delay that staggers it.
import { Easing, ReduceMotion, withDelay } from 'react-native-reanimated';

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

/** When each part of a moment starts, in ms from the screen opening (spec decision 4). */
export const MOMENTS = {
  cleared: { stamp: 220, panel: 380, rank: 500, bar: 600 },
  level: { label: 100, number: 200, portrait: 450, line: 600 },
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

export type InkTone = 'vermilion' | 'seal' | 'chalk';
export type InkDrop = { dx: number; dy: number; size: number; tone: InkTone };

const JITTER = [0, 0.31, -0.22, 0.17, -0.35, 0.08, 0.26, -0.12];
const REACH = [1, 0.62, 0.84, 0.71, 0.93];
const SIZES = [12, 7, 10, 5, 8, 6];
const TONES: readonly InkTone[] = ['vermilion', 'chalk', 'seal'];

/** The ink splash's drops (spec decision 3, plan decision 3): a fixed table, never random, so every run is the same. */
export function inkDrops(count: number, radius: number): InkDrop[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i + JITTER[i % JITTER.length]!) / count) * 2 * Math.PI;
    const reach = radius * REACH[i % REACH.length]!;
    return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach, size: SIZES[i % SIZES.length]!, tone: TONES[i % TONES.length]! };
  });
}
