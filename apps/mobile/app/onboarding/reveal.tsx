import { router } from 'expo-router';
import { Reveal } from '../../src/screens/onboarding/Reveal.tsx';
import { useGame } from '../../src/state/store.ts';

export default function RevealRoute() {
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  const markOffer = useGame((s) => s.markOffer);
  // M12 (plan decisions 7–8): Accept ends the onboarding; the set-up cards of days 1 to 3 are this character's.
  const accept = async () => {
    await markOffer('setup');
    await finishOnboarding();
    router.replace('/');
  };
  return <Reveal onAccept={() => void accept()} onFix={(path) => router.push(path)} />;
}
