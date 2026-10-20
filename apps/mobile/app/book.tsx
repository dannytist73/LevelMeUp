import { goBack } from '../src/lib/navigation.ts';
import { Book } from '../src/screens/Book.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function BookRoute() {
  return <Book onDone={goBack} onBack={goBack} />;
}
