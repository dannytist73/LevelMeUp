// M10a: the hooks behind the motion pieces. `useReduce` reads the phone's "Remove animations" unless a test or the motion
// bench overrides it. M12 (audit 25): Reanimated reads the setting once, at launch; the phone's own accessibility events
// now keep it current, so switching it on mid-session stills the next moment.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { cancelAnimation, useAnimatedReaction, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SETTLE_MS, delayed, timing } from './motion.ts';
import type { CountPlan } from './motion.ts';

/** The setting as the phone last changed it; null until it changes (Reanimated's launch value is right until then). */
let reported: boolean | null = null;
const watchers = new Set<() => void>();
let listening = false;

function report(on: boolean): void {
  if (on === reported) return;
  reported = on;
  for (const watcher of watchers) watcher();
}

function listen(): void {
  if (listening) return;
  listening = true;
  try {
    AccessibilityInfo.addEventListener('reduceMotionChanged', report);
  } catch {
    // No accessibility module (a test without it): Reanimated's value stands.
  }
}

const subscribe = (watcher: () => void): (() => void) => {
  watchers.add(watcher);
  return () => watchers.delete(watcher);
};

export function useReduce(override?: boolean): boolean {
  const atLaunch = useReducedMotion();
  listen();
  const live = useSyncExternalStore(subscribe, () => reported);
  return override ?? live ?? atLaunch;
}

/**
 * Calls `settle` once a motion that ends `ms` from now is surely over (audit 2026-10-15), so the piece can set its shared
 * values to where the motion ends: an animation that never ran can't leave it hidden. Seen once on the emulator, after a
 * cold start: Today's core quest card stayed invisible, its slam-in at its first frame. It has to go through Reanimated:
 * a plain style from React doesn't replace what Reanimated last drew (emulator check). A still piece never waits.
 */
export function useSettle(ms: number, active: boolean, settle: () => void): void {
  const latest = useRef(settle);
  latest.current = settle;
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => latest.current(), ms + SETTLE_MS);
    return () => clearTimeout(timer);
  }, [ms, active]);
}

/**
 * How many times `value` has risen since the first value: 0 until it does, so opening a screen never animates. A rise
 * while the screen is hidden (`shown` false) is taken quietly: it never plays unseen, nor late on return (M10b review).
 */
export function useGrowth(value: number | null, shown = true): number {
  const last = useRef(value);
  const [grown, setGrown] = useState(0);
  useEffect(() => {
    if (shown && value !== null && last.current !== null && value > last.current) setGrown((n) => n + 1);
    last.current = value;
  }, [value, shown]);
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
    n.value = delayed(delay, withTiming(to, timing(duration)));
  }, [from, delay, duration, to, reduce, n]);
  // Not counting, the end comes straight from the props: no state update, so no extra render.
  return from === null || reduce ? to : shown;
}

/**
 * M10b: whether LevelMeUp is in front (plan decision 8). A screen that loops stops while it isn't. It starts true: a
 * screen being shown is in front (and React Native's test mock has no current state).
 */
export function useAppActive(): boolean {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setActive(next === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}
