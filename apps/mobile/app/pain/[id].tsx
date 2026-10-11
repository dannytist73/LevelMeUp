import { router, useLocalSearchParams } from 'expo-router';
import { Pain } from '../../src/screens/Pain.tsx';

export default function PainRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Pain questId={Number(id)} onDone={() => router.back()} onBack={() => router.back()} />;
}
