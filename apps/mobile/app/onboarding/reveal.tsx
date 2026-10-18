import { router } from 'expo-router';
import { Reveal } from '../../src/screens/onboarding/Reveal.tsx';
import { useGame } from '../../src/state/store.ts';

export default function RevealRoute() {
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  // M12 (plan decision 7): Accept ends the onboarding.
  const accept = async () => {
    await finishOnboarding();
    router.replace('/');
  };
  return <Reveal onAccept={() => void accept()} onFix={(path) => router.push(path)} />;
}
