import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { SlipSetup } from '../src/screens/SlipSetup.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function SlipRoute() {
  return (
    <SlipSetup onDone={goBack} onPact={() => router.push('/pact')} onNotifications={() => router.push('/notifications')}
      onGame={() => router.push('/game')} />
  );
}
