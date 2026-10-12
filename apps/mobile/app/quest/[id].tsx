import { router, useLocalSearchParams } from 'expo-router';
import { Quest } from '../../src/screens/Quest.tsx';

export default function QuestRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Quest
      questId={Number(id)}
      onBack={() => router.back()}
      onSwap={(questId) => router.push(`/swap?quest=${questId}`)}
      onPain={(questId) => router.push(`/pain/${questId}`)}
      onTraining={() => router.push('/training')}
      onTrial={() => router.push('/trial')}
      onRead={(articleId) => router.push(`/reading/${articleId}`)}
    />
  );
}
