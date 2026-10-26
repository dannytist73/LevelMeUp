// A simpler day (docs/2026-10-26-simpler-day.md, decision 6): the quest a quest screen just cleared. The screen closes
// at once, so Camp asks how it felt instead of Cleared; this holds which quest that is until it is rated, another is
// cleared, or the app closes.
import { useSyncExternalStore } from 'react';

let current: number | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markJustCleared(questId: number | null): void {
  if (questId === current) return;
  current = questId;
  listeners.forEach((listener) => listener());
}

export const useJustCleared = (): number | null => useSyncExternalStore(subscribe, () => current);
