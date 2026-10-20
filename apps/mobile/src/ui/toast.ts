// Premium pass B1: a short note after an action that closes its own screen (a swap, a saved plan, a class change), shown
// on whichever screen comes next, so the player always learns that it worked. One at a time: a newer note replaces the
// older. The note itself is drawn by `Toasts` (once, at the root); the tab bar reports its height so a note on a tab sits
// just above it, where Today's own Undo note sits, and a bar fixed at the bottom of a screen (a quest's Claim, a Save)
// lifts it above that bar while it shows, so the note never covers the button. Today's and the Codex's Undo come
// through here too (review: two notes stacked in one place), and a plain note waits behind one that offers Undo.
import { useEffect, useRef, useSyncExternalStore } from 'react';

export type ToastAction = { label: string; onPress: () => void };
export type Toast = { id: number; message: string; action?: ToastAction };

let shown: Toast | null = null;
/** A plain note that came while one with an action showed: it shows next, so the action isn't taken away. */
let pending: Toast | null = null;
let nextId = 1;
let barHeight = 0;
const lifts = new Map<number, number>();
let lift = 0;
let nextLift = 1;
const listeners = new Set<() => void>();

function changed(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shows a note; returns its id (to take it back with `dismissToast`). */
export function toast(message: string, action?: ToastAction): number {
  const next: Toast = { id: nextId++, message, ...(action === undefined ? {} : { action }) };
  if (shown?.action !== undefined && action === undefined) {
    pending = next;
    return next.id;
  }
  shown = next;
  pending = null;
  changed();
  return next.id;
}

/** Its time is up, or its action was taken: only that note goes (a newer one stays); one waiting shows next. */
export function dismissToast(id: number): void {
  if (pending?.id === id) {
    pending = null;
    return;
  }
  if (shown?.id !== id) return;
  shown = pending;
  pending = null;
  changed();
}

export function setTabBarHeight(height: number): void {
  if (height === barHeight) return;
  barHeight = height;
  changed();
}

/** A bar fixed at the bottom of a screen, `height` tall (null while it doesn't show): the note sits above it. */
export function useToastLift(height: number | null): void {
  const id = useRef(0);
  if (id.current === 0) id.current = nextLift++;
  useEffect(() => {
    if (height === null) return;
    const key = id.current;
    lifts.set(key, height);
    lift = Math.max(0, ...lifts.values());
    changed();
    return () => {
      lifts.delete(key);
      lift = Math.max(0, ...lifts.values());
      changed();
    };
  }, [height]);
}

export const useToast = (): Toast | null => useSyncExternalStore(subscribe, () => shown);
/** The note shown now, read once (tests, and code that isn't drawing). */
export const peekToast = (): Toast | null => shown;
export const useToastLiftHeight = (): number => useSyncExternalStore(subscribe, () => lift);
export const useTabBarHeight = (): number => useSyncExternalStore(subscribe, () => barHeight);
