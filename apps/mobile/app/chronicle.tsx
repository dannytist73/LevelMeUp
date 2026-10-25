import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { Chronicle } from '../src/screens/Chronicle.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

// Monster Week: the Chronicle opens from Me (the Camp took its tab).
export default function ChronicleRoute() {
  return <Chronicle onBack={goBack} onPlus={() => router.push('/plus')} />;
}
