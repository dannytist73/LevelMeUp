import { useLocalSearchParams } from 'expo-router';
import { ChapterScreen } from '../../src/base/screens/Read.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx';

export default function ChapterRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChapterScreen key={id} id={id} />;
}
