import { router } from 'expo-router';
import { MindStep } from '../../src/screens/onboarding/MindStep.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function MindRoute() {
  return <MindStep onNavigate={(path) => router.push(path)} onBack={() => router.back()} />;
}
