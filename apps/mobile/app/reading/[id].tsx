import { router, useLocalSearchParams } from 'expo-router';
import { Reading } from '../../src/screens/Reading.tsx';

export default function ReadingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Reading articleId={String(id)} onBack={() => router.back()} />;
}
