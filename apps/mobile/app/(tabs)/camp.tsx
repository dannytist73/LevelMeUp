import { router } from 'expo-router';
import { Camp } from '../../src/screens/Camp.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function CampRoute() {
  return <Camp onSettings={() => router.push('/settings')} />;
}
