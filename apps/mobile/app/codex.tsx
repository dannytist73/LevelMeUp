import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { Codex } from '../src/screens/Codex.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function CodexRoute() {
  return <Codex onBack={goBack} onOpenReading={(id) => router.push(`/reading/${id}`)} />;
}
