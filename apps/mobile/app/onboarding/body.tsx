import { router } from 'expo-router';
import { BodyStep } from '../../src/screens/onboarding/BodyStep.tsx';

export default function BodyRoute() {
  return <BodyStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
