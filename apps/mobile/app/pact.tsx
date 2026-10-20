import { goBack } from '../src/lib/navigation.ts';
import { Pact } from '../src/screens/Pact.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function PactRoute() {
  return <Pact mode="game" onDone={goBack} />;
}
