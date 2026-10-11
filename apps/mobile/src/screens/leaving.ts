// A screen that sends a change and then closes keeps showing what it showed. On Android, the class picker crashed
// ("the specified child already has a parent") when its content changed during its exit animation (M6b device check).
import { useState } from 'react';
import type { Shown } from '../game/project.ts';
import { useGame } from '../state/store.ts';

/** The game view to show, and `leave`, which keeps the current one from then on (call it before sending). */
export function useLeavingView(): [Shown | null, () => void] {
  const live = useGame((s) => s.view);
  const [kept, setKept] = useState<Shown | null>(null);
  return [kept ?? live, () => setKept(live)];
}
