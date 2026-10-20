// Premium pass B1: a short note after an action that closes its own screen (a swap, a saved plan, a class change), shown
// on whichever screen comes next, so the player always learns that it worked. One at a time: a newer note replaces the
// older. The note itself is drawn by `Toasts` (once, at the root); the tab bar reports its height so a note on a tab sits
// just above it, where Today's own Undo note sits.
import { useSyncExternalStore } from 'react';

export type ToastAction = { label: string; onPress: () => void };
export type Toast = { id: number; message: string; action?: ToastAction };

let shown: Toast | null = null;
let nextId = 1;
let barHeight = 0;
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

export function toast(message: string, action?: ToastAction): void {
  shown = { id: nextId++, message, ...(action === undefined ? {} : { action }) };
  changed();
}

/** Its time is up, or its action was taken: only the note still shown goes (a newer one stays). */
export function dismissToast(id: number): void {
  if (shown?.id !== id) return;
  shown = null;
  changed();
}

export function setTabBarHeight(height: number): void {
  if (height === barHeight) return;
  barHeight = height;
  changed();
}

export const useToast = (): Toast | null => useSyncExternalStore(subscribe, () => shown);
export const useTabBarHeight = (): number => useSyncExternalStore(subscribe, () => barHeight);
