import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { SlipSetup } from '../src/screens/SlipSetup.tsx';

export default function SlipRoute() {
  return (
    <SlipSetup onDone={goBack} onPact={() => router.push('/pact')} onNotifications={() => router.push('/notifications')}
      onGame={() => router.push('/game')} />
  );
}
