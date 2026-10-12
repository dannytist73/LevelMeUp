import { goBack } from '../src/lib/navigation.ts';
import { Trial } from '../src/screens/Trial.tsx';

export default function TrialRoute() {
  return <Trial onDone={goBack} />;
}
