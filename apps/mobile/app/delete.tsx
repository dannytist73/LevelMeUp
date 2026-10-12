import { backToStart, goBack } from '../src/lib/navigation.ts';
import { DeleteCharacter } from '../src/screens/DeleteCharacter.tsx';

export default function DeleteRoute() {
  return <DeleteCharacter onDeleted={backToStart} onBack={goBack} />;
}
