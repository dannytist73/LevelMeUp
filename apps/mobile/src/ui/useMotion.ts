// M10a: the hooks behind the motion pieces. `useReduce` reads the phone's "Remove animations" (Reanimated reads it once,
// at launch) unless a test or the motion bench overrides it.
import { useEffect, useRef, useState } from 'react';
import { cancelAnimation, useAnimatedReaction, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { timing } from './motion.ts';
import type { CountPlan } from './motion.ts';

export function useReduce(override?: boolean): boolean {
  const phone = useReducedMotion();
  return override ?? phone;
}

/** How many times `value` has risen since the first value: 0 until it does, so opening a screen never animates. */
export function useGrowth(value: number | null): number {
  const last = useRef(value);
  const [grown, setGrown] = useState(0);
  useEffect(() => {
    if (value !== null && last.current !== null && value > last.current) setGrown((n) => n + 1);
    last.current = value;
  }, [value]);
  return grown;
}

/**
 * A number counting to `to` (plan decision 5): a shared value runs the count on the UI thread, and each whole number it
 * passes is sent back to React. Without a plan, or with reduced motion, it is `to` at once. Reanimated's Jest mock never
 * calls the reaction, so in a test a counting number stays at its start.
 */
export function useCountUp(plan: CountPlan | null, to: number, reduceMotion?: boolean): number {
  const reduce = useReduce(reduceMotion);
  const start = plan !== null && !reduce ? plan.from : to;
  const [shown, setShown] = useState(start);
  const n = useSharedValue(start);
  useAnimatedReaction(
    () => Math.round(n.value),
    (now, before) => {
      if (now !== before) scheduleOnRN(setShown, now);
    },
  );
  const from = plan?.from ?? null;
  const delay = plan?.delay ?? 0;
  const duration = plan?.duration ?? 0;
  useEffect(() => {
    if (from === null || reduce) return;
    cancelAnimation(n);
    n.value = from;
    n.value = withDelay(delay, withTiming(to, timing(duration)));
  }, [from, delay, duration, to, reduce, n]);
  // Not counting, the end comes straight from the props: no state update, so no extra render.
  return from === null || reduce ? to : shown;
}
