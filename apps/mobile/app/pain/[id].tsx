import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../../src/lib/navigation.ts';
import { Pain } from '../../src/screens/Pain.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function PainRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Pain questId={Number(id)} onDone={goBack} onBack={goBack} />;
}
