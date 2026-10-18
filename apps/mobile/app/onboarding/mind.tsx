import { router } from 'expo-router';
import { MindStep } from '../../src/screens/onboarding/MindStep.tsx';

export default function MindRoute() {
  return <MindStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
