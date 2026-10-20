import { router } from 'expo-router';
import { Look } from '../src/screens/Look.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function LookRoute() {
  return <Look onBack={() => router.back()} onPlus={() => router.push('/plus')} />;
}
