import { router } from 'expo-router';
import { SafetyStep } from '../../src/screens/onboarding/SafetyStep.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function SafetyRoute() {
  return <SafetyStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
