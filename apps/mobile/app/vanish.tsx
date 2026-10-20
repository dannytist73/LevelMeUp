import { goBack } from '../src/lib/navigation.ts';
import { Vanish } from '../src/screens/Vanish.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function VanishRoute() {
  return <Vanish onBack={goBack} />;
}
