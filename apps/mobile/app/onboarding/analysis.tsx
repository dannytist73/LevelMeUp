import { router } from 'expo-router';
import { Analysis } from '../../src/screens/onboarding/Analysis.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function AnalysisRoute() {
  // dismissTo: back to the reveal a correction came from, or in its place the first time (decision 14).
  return <Analysis onRevealed={() => router.dismissTo('/onboarding/reveal')} onToday={() => router.replace('/')} />;
}
