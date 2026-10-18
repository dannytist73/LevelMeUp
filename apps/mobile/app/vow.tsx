import { goBack } from '../src/lib/navigation.ts';
import { Vow } from '../src/screens/Vow.tsx';

export default function VowRoute() {
  return <Vow onDone={goBack} />;
}
