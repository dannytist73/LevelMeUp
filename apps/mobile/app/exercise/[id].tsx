import { useLocalSearchParams } from 'expo-router';
import { Exercise } from '../../src/base/screens/Exercise.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx';

export default function ExerciseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Exercise id={id} />;
}
