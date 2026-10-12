import { goBack } from '../src/lib/navigation.ts';
import { Pact } from '../src/screens/Pact.tsx';

export default function PactRoute() {
  return <Pact mode="game" onDone={goBack} />;
}
