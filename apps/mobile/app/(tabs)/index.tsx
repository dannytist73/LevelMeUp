import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useRef } from 'react';
import { resultKey, resultToShow } from '../../src/game/battle.ts';
import { shadowDue } from '../../src/game/pact.ts';
import { Today } from '../../src/screens/Today.tsx';
import { useGame } from '../../src/state/store.ts';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

/** Camp, the home (a simpler day: Today and the Camp tab became one). */
export default function TodayRoute() {
  // M7c decision 5: a consequence the phone hasn't shown opens the Shadow's scene, once, while Today is in front. It is
  // decided when Today comes into focus, at that moment's time, and never pushed twice for one check-in (review).
  const view = useGame((s) => s.view);
  const seen = useGame((s) => s.shadowSeen);
  const offers = useGame((s) => s.offers);
  // Review: a level-up or achievement (a modal over everything) goes first; the battle opens once it is dismissed.
  const celebrating = useGame((s) => s.celebrations.length > 0);
  const pushed = useRef<number | null>(null);
  // Monster Week: a decided battle opens its moment once, while Today is in front, after the Shadow's scene if one is due.
  const battlePushed = useRef<string | null>(null);
  // M10b review: the streak's flare and tick play only while Today is in front.
  const shown = useIsFocused();
  useFocusEffect(
    useCallback(() => {
      const due = view === null ? null : shadowDue(view, seen, Date.now());
      if (due !== null && due !== pushed.current) {
        pushed.current = due;
        router.push('/shadow');
        return;
      }
      const result = view === null || celebrating ? null : resultToShow(view, offers);
      if (result === null || resultKey(result) === battlePushed.current) return;
      battlePushed.current = resultKey(result);
      router.push('/battle');
    }, [view, seen, offers, celebrating]),
  );
  return (
    <Today
      onOpenQuest={(id) => router.push(`/quest/${id}`)}
      onOpenReading={(id) => router.push(`/reading/${id}`)}
      onDay={() => router.push('/day')}
      onPain={(id) => router.push(`/pain/${id}`)}
      onShadow={() => router.push('/shadow')}
      onTrial={() => router.push('/trial')}
      shown={shown}
    />
  );
}
