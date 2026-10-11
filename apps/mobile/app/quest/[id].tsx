import { router, useLocalSearchParams } from 'expo-router';
import { Quest } from '../../src/screens/Quest.tsx';

export default function QuestRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Quest questId={Number(id)} onBack={() => router.back()} />;
}
