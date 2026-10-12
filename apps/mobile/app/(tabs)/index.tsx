import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { shadowDue } from '../../src/game/pact.ts';
import { Today } from '../../src/screens/Today.tsx';
import { useGame } from '../../src/state/store.ts';

export default function TodayRoute() {
  // M7c decision 5: a consequence the phone hasn't shown opens the Shadow's scene, once, while Today is in front.
  const due = useGame((s) => (s.view === null ? null : shadowDue(s.view, s.shadowSeen, Date.now())));
  useFocusEffect(
    useCallback(() => {
      if (due !== null) router.push('/shadow');
    }, [due]),
  );
  return (
    <Today
      onSettings={() => router.push('/settings')}
      onOpenQuest={(id) => router.push(`/quest/${id}`)}
      onSwap={() => router.push('/swap')}
      onPain={(id) => router.push(`/pain/${id}`)}
      onVanish={() => router.push('/vanish')}
      onTraining={() => router.push('/training')}
      onCheckin={() => router.push('/checkin')}
      onShadow={() => router.push('/shadow')}
      onTrial={() => router.push('/trial')}
    />
  );
}
