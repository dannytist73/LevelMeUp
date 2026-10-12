import { router } from 'expo-router';
import { Pact } from '../../src/screens/Pact.tsx';

export default function OnboardingPactRoute() {
  return <Pact mode="draft" onDone={() => router.back()} />;
}
