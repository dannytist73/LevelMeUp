import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { Swap } from '../src/screens/Swap.tsx';

export default function SwapRoute() {
  const { quest } = useLocalSearchParams<{ quest?: string }>();
  return <Swap questId={quest === undefined ? null : Number(quest)} onDone={goBack} onBack={goBack} />;
}
