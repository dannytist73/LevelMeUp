import { useLocalSearchParams } from 'expo-router';
import { SwapExercise } from '../src/base/screens/SwapPain.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx';

export default function SwapRoute() {
  const { ex } = useLocalSearchParams<{ ex: string }>();
  return <SwapExercise ex={Number(ex)} />;
}
