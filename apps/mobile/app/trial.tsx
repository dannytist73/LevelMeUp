import { goBack } from '../src/lib/navigation.ts';
import { Trial } from '../src/screens/Trial.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function TrialRoute() {
  return <Trial onDone={goBack} />;
}
