import { router, useLocalSearchParams } from 'expo-router';
import { Reading } from '../../src/screens/Reading.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function ReadingRoute() {
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();
  // A reading opens by its day: an evergreen article read twice has two (review).
  const dayNumber = day === undefined || !/^[0-9]+$/.test(String(day)) ? null : Number(day);
  return <Reading articleId={String(id)} dayNumber={dayNumber} onBack={() => router.back()} />;
}
