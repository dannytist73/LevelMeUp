import { useLocalSearchParams } from 'expo-router';
import { ExercisePain } from '../src/base/screens/SwapPain.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx';

export default function PainRoute() {
  const { ex } = useLocalSearchParams<{ ex: string }>();
  return <ExercisePain ex={Number(ex)} />;
}
