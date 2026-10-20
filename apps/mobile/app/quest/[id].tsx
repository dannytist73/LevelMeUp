import { router, useLocalSearchParams } from 'expo-router';
import { Quest } from '../../src/screens/Quest.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

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
      onNext={(questId) => router.replace(`/quest/${questId}`)}
    />
  );
}
