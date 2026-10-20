import { backToStart, goBack } from '../src/lib/navigation.ts';
import { DeleteCharacter } from '../src/screens/DeleteCharacter.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function DeleteRoute() {
  return <DeleteCharacter onDeleted={backToStart} onBack={goBack} />;
}
