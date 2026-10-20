import { useLeaveGuard } from '../src/lib/leaveGuard.ts';
import { goBack } from '../src/lib/navigation.ts';
import { GameSettings } from '../src/screens/GameSettings.tsx';

export default function GameRoute() {
  const guard = useLeaveGuard();
  return <GameSettings onDone={guard.done(goBack)} onBack={goBack} onDirty={guard.onDirty} />;
}
