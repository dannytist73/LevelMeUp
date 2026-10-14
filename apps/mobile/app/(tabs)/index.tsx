import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useRef } from 'react';
import { shadowDue } from '../../src/game/pact.ts';
import { Today } from '../../src/screens/Today.tsx';
import { useGame } from '../../src/state/store.ts';

export default function TodayRoute() {
  // M7c decision 5: a consequence the phone hasn't shown opens the Shadow's scene, once, while Today is in front. It is
  // decided when Today comes into focus, at that moment's time, and never pushed twice for one check-in (review).
  const view = useGame((s) => s.view);
  const seen = useGame((s) => s.shadowSeen);
  const pushed = useRef<number | null>(null);
  // M10b review: the streak's flare and tick play only while Today is in front.
  const shown = useIsFocused();
  useFocusEffect(
    useCallback(() => {
      const due = view === null ? null : shadowDue(view, seen, Date.now());
      if (due === null || due === pushed.current) return;
      pushed.current = due;
      router.push('/shadow');
    }, [view, seen]),
  );
  return (
    <Today
      onSettings={() => router.push('/settings')}
      onOpenQuest={(id) => router.push(`/quest/${id}`)}
      onOpenReading={(id) => router.push(`/reading/${id}`)}
      onSwap={() => router.push('/swap')}
      onPain={(id) => router.push(`/pain/${id}`)}
      onVanish={() => router.push('/vanish')}
      onTraining={() => router.push('/training')}
      onCheckin={() => router.push('/checkin')}
      onShadow={() => router.push('/shadow')}
      onTrial={() => router.push('/trial')}
      shown={shown}
    />
  );
}
