import { goBack } from '../src/lib/navigation.ts';
import { GameSettings } from '../src/screens/GameSettings.tsx';

export default function GameRoute() {
  return <GameSettings onDone={goBack} onBack={goBack} />;
}
