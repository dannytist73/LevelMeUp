import { goBack } from '../src/lib/navigation.ts';
import { Vanish } from '../src/screens/Vanish.tsx';

export default function VanishRoute() {
  return <Vanish onBack={goBack} />;
}
