// M17: a tap on the tab you are already on takes its screen back to the top, as Android's and iOS's own apps do (it did
// nothing). The tab bar calls `tabTop`; the tab's ScreenScroll listens.
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function tabTop(tab: string): void {
  listeners.get(tab)?.forEach((listener) => listener());
}

/** Listens for taps on `tab` while it is the tab shown; returns the unsubscribe. */
export function onTabTop(tab: string, listener: Listener): () => void {
  const set = listeners.get(tab) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(tab, set);
  return () => {
    set.delete(listener);
  };
}
