import { router } from 'expo-router';
import { Today } from '../../src/screens/Today.tsx';

export default function TodayRoute() {
  return (
    <Today
      onSettings={() => router.push('/settings')}
      onOpenQuest={(id) => router.push(`/quest/${id}`)}
      onSwap={() => router.push('/swap')}
      onPain={(id) => router.push(`/pain/${id}`)}
      onVanish={() => router.push('/vanish')}
    />
  );
}
