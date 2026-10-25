import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { BattleResult } from '../src/screens/BattleResult.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

// Monster Week: a decided battle, opened once from Today.
export default function BattleRoute() {
  return (
    <BattleResult onDone={goBack} onCamp={() => {
      goBack();
      router.navigate('/camp');
    }} />
  );
}
