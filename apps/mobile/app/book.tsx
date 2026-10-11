import { goBack } from '../src/lib/navigation.ts';
import { Book } from '../src/screens/Book.tsx';

export default function BookRoute() {
  return <Book onDone={goBack} onBack={goBack} />;
}
