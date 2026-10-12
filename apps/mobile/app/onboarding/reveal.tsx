import { router } from 'expo-router';
import { Reveal } from '../../src/screens/onboarding/Reveal.tsx';

export default function RevealRoute() {
  return <Reveal onAccept={() => router.push('/onboarding/vow')} onFix={(path) => router.push(path)} onPact={() => router.push('/onboarding/pact')} />;
}
