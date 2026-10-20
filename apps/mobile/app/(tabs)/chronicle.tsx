import { router } from 'expo-router';
import { Chronicle } from '../../src/screens/Chronicle.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function ChronicleRoute() {
  return <Chronicle onPlus={() => router.push('/plus')} onSettings={() => router.push('/settings')} />;
}
