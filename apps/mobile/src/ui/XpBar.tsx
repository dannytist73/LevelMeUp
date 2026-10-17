// The XP bar (D1 Today, D2 Quest cleared; Lantern, M11): a 10 px rounded track with the accent's fill. M10a: given its `level`, the bar moves (spec decisions 3, 5, 7). It fills from `from` when it opens
// (Quest cleared), then from what it last showed whenever the value changes (Today after a sync). Across a level it
// fills to the end, flashes chalk and fills again from empty. A drop shows at once, and so does everything with reduced
// motion. Its accessibility value is always the new one. Without a level it never moves (stat bars, timers, the trial).
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors, radius } from '../theme/tokens.ts';
import { FILL_MS, FLASH_MS, REFILL_MS, WRAP_FILL_MS, delayed, fillFraction, fillSegments, timing } from './motion.ts';
import type { BarPoint } from './motion.ts';
import { useReduce } from './useMotion.ts';

export { fillFraction } from './motion.ts';

type BarProps = { value: number; max: number; label: string; on?: 'night' | 'paper' };

export type XpBarProps = BarProps & {
  /** The level this XP is in; given, the bar moves (M10a). */
  level?: number;
  /** What it showed before it opened: Quest cleared's "before". */
  from?: BarPoint | null;
  /** Milliseconds before the first fill. */
  delay?: number;
  /** Overrides the phone's setting (tests, the motion bench). */
  reduceMotion?: boolean;
};

const frame = (on: 'night' | 'paper') => ({
  height: 10, borderRadius: radius.pill, overflow: 'hidden' as const, backgroundColor: on === 'paper' ? colors.trackOnPaper : colors.segmentNext,
});

export function XpBar({ level, from = null, delay = 0, reduceMotion, ...bar }: XpBarProps) {
  return level === undefined
    ? <StillBar {...bar} />
    : <MovingBar {...bar} level={level} from={from} delay={delay} reduceMotion={reduceMotion} />;
}

function StillBar({ value, max, label, on = 'night' }: BarProps) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }} style={frame(on)}>
      <View testID="xp-fill" style={{ width: `${fillFraction(value, max) * 100}%`, height: '100%', backgroundColor: colors.accent }} />
    </View>
  );
}

function MovingBar({ value, max, label, on = 'night', level, from, delay, reduceMotion }: BarProps & {
  level: number;
  from: BarPoint | null;
  delay: number;
  reduceMotion?: boolean;
}) {
  const reduce = useReduce(reduceMotion);
  const start = reduce || from === null ? { level, value, max } : from;
  const last = useRef<BarPoint>(start);
  const first = useRef(true);
  const fill = useSharedValue(fillFraction(start.value, start.max));
  const flash = useSharedValue(0);
  useEffect(() => {
    const was = last.current;
    last.current = { level, value, max };
    const wait = first.current ? delay : 0;
    first.current = false;
    cancelAnimation(fill);
    cancelAnimation(flash);
    flash.value = 0;
    const steps = reduce ? [] : fillSegments(was, { level, value, max });
    if (steps.length === 0) {
      fill.value = fillFraction(value, max);
      return;
    }
    fill.value = steps[0]!.from;
    if (steps.length === 1) {
      fill.value = delayed(wait, withTiming(steps[0]!.to, timing(FILL_MS)));
      return;
    }
    fill.value = delayed(wait, withSequence(
      ReduceMotion.Never,
      withTiming(1, timing(WRAP_FILL_MS)),
      withTiming(1, timing(FLASH_MS)), // holds at full while it flashes
      withTiming(0, timing(0)),
      withTiming(steps[1]!.to, timing(REFILL_MS)),
    ));
    flash.value = delayed(wait + WRAP_FILL_MS, withSequence(ReduceMotion.Never, withTiming(1, timing(FLASH_MS / 2)), withTiming(0, timing(FLASH_MS / 2))));
  }, [level, value, max, reduce, delay, fill, flash]);
  const width = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const flashing = useAnimatedStyle(() => ({ opacity: flash.value }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }} style={frame(on)}>
      <Animated.View testID="xp-fill" style={[{ height: '100%', backgroundColor: colors.accent }, width]} />
      {!reduce && <Animated.View testID="xp-flash" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.chalk }, flashing]} />}
    </View>
  );
}
