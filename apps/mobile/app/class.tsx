import { goBack } from '../src/lib/navigation.ts';
import { ClassChange } from '../src/screens/ClassChange.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function ClassRoute() {
  return <ClassChange onDone={goBack} onBack={goBack} />;
}
