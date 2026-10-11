import { goBack } from '../src/lib/navigation.ts';
import { ClassChange } from '../src/screens/ClassChange.tsx';

export default function ClassRoute() {
  return <ClassChange onDone={goBack} onBack={goBack} />;
}
