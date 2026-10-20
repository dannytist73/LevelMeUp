import { router } from 'expo-router';
import { Privacy } from '../src/screens/Privacy.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function PrivacyRoute() {
  return <Privacy onBack={() => router.back()} />;
}
