import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { Swap } from '../src/screens/Swap.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function SwapRoute() {
  const { quest } = useLocalSearchParams<{ quest?: string }>();
  return <Swap questId={quest === undefined ? null : Number(quest)} onDone={goBack} onBack={goBack} />;
}
