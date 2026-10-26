import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { DayOptions } from '../src/screens/DayOptions.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

// A simpler day: Change today, opened from Camp's card and the quest screen.
export default function DayRoute() {
  return (
    <DayOptions onBack={goBack} onSwap={() => router.push('/swap')} onVanish={() => router.push('/vanish')}
      onPain={(id) => router.push(`/pain/${id}`)} />
  );
}
