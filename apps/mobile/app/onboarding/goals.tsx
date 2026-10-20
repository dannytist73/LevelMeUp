import { router } from 'expo-router';
import { GoalsStep } from '../../src/screens/onboarding/GoalsStep.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function GoalsRoute() {
  return <GoalsStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
