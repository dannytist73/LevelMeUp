import { router } from 'expo-router';
import { purchasesSetUp } from '../../src/plus/purchases.ts';
import { Reveal } from '../../src/screens/onboarding/Reveal.tsx';
import { useGame } from '../../src/state/store.ts';

export default function RevealRoute() {
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  const offers = useGame((s) => s.offers);
  const markOffer = useGame((s) => s.markOffer);
  // M12 (plan decision 7): Accept ends the onboarding. M13: Plus is offered once here, while it is on sale; its Not now
  // goes on to Today.
  const accept = async () => {
    await finishOnboarding();
    if (purchasesSetUp() && !offers.includes('plus:intro')) {
      void markOffer('plus:intro');
      router.replace('/plus?from=reveal');
      return;
    }
    router.replace('/');
  };
  return <Reveal onAccept={() => void accept()} onFix={(path) => router.push(path)} />;
}
