import { router } from 'expo-router';
import { RhythmStep } from '../../src/screens/onboarding/RhythmStep.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function RhythmRoute() {
  return <RhythmStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
