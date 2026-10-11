import { goBack } from '../src/lib/navigation.ts';
import { Training } from '../src/screens/Training.tsx';

export default function TrainingRoute() {
  return <Training onDone={goBack} onBack={goBack} />;
}
