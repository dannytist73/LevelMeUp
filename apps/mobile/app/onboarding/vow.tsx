import { router } from 'expo-router';
import { Vow } from '../../src/screens/onboarding/Vow.tsx';
import { useGame } from '../../src/state/store.ts';

export default function VowRoute() {
  const saved = useGame((s) => s.account.kind === 'saved');
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  // Signed in with Google already (decision 13): nothing to save, straight to Day 1.
  const next = () => (saved ? void finishOnboarding().then(() => router.replace('/')) : router.push('/onboarding/save'));
  return <Vow onDone={next} />;
}
