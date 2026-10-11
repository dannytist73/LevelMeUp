import { router } from 'expo-router';
import { Analysis } from '../../src/screens/onboarding/Analysis.tsx';

export default function AnalysisRoute() {
  // dismissTo: back to the reveal a correction came from, or in its place the first time (decision 14).
  return <Analysis onRevealed={() => router.dismissTo('/onboarding/reveal')} onToday={() => router.replace('/')} />;
}
