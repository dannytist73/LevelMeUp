import { goBack } from '../src/lib/navigation.ts';
import { Vow } from '../src/screens/Vow.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function VowRoute() {
  return <Vow onDone={goBack} />;
}
