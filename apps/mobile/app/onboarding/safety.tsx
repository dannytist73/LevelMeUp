import { router } from 'expo-router';
import { SafetyStep } from '../../src/screens/onboarding/SafetyStep.tsx';

export default function SafetyRoute() {
  return <SafetyStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
