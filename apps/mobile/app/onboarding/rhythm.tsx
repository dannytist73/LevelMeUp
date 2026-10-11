import { router } from 'expo-router';
import { RhythmStep } from '../../src/screens/onboarding/RhythmStep.tsx';

export default function RhythmRoute() {
  return <RhythmStep onNavigate={(path) => router.push(path)} />;
}
