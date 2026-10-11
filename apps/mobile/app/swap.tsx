import { router, useLocalSearchParams } from 'expo-router';
import { Swap } from '../src/screens/Swap.tsx';

export default function SwapRoute() {
  const { quest } = useLocalSearchParams<{ quest?: string }>();
  return <Swap questId={quest === undefined ? null : Number(quest)} onDone={() => router.back()} onBack={() => router.back()} />;
}
