import { router, useLocalSearchParams } from 'expo-router';
import { Reading } from '../../src/screens/Reading.tsx';

export default function ReadingRoute() {
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();
  // A reading opens by its day: an evergreen article read twice has two (review).
  const dayNumber = day === undefined || !/^[0-9]+$/.test(String(day)) ? null : Number(day);
  return <Reading articleId={String(id)} dayNumber={dayNumber} onBack={() => router.back()} />;
}
