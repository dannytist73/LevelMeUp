import { router } from 'expo-router';
import { GearStep } from '../../src/screens/onboarding/GearStep.tsx';

export default function GearRoute() {
  return <GearStep onNavigate={(path) => router.push(path)} />;
}
