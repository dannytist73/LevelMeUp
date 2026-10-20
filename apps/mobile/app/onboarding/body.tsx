import { router } from 'expo-router';
import { BodyStep } from '../../src/screens/onboarding/BodyStep.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function BodyRoute() {
  return <BodyStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
