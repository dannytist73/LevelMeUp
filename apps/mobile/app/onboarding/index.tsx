import { router } from 'expo-router';
import { Awakening } from '../../src/screens/onboarding/Awakening.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function AwakeningRoute() {
  return <Awakening onNavigate={(path) => router.push(path)} onRestored={() => router.replace('/')} />;
}
