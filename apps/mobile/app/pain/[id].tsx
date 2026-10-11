import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../../src/lib/navigation.ts';
import { Pain } from '../../src/screens/Pain.tsx';

export default function PainRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Pain questId={Number(id)} onDone={goBack} onBack={goBack} />;
}
