import { router } from 'expo-router';
import { SlipStep } from '../../src/screens/onboarding/SlipStep.tsx';

export default function SlipRoute() {
  return <SlipStep onNavigate={(path) => router.push(path)} />;
}
