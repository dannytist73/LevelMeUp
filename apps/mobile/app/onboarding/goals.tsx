import { router } from 'expo-router';
import { GoalsStep } from '../../src/screens/onboarding/GoalsStep.tsx';

export default function GoalsRoute() {
  return <GoalsStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
