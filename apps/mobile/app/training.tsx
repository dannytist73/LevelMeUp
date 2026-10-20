import { useLeaveGuard } from '../src/lib/leaveGuard.ts';
import { goBack } from '../src/lib/navigation.ts';
import { Training } from '../src/screens/Training.tsx';

export default function TrainingRoute() {
  const guard = useLeaveGuard();
  return <Training onDone={guard.done(goBack)} onBack={goBack} onDirty={guard.onDirty} />;
}
