import { useLocalSearchParams } from 'expo-router';
import { BookScreen } from '../../src/base/screens/Read.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx';

export default function BookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookScreen id={id} />;
}
