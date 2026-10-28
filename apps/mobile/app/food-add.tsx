import { useLocalSearchParams } from 'expo-router';
import { FoodAdd } from '../src/base/screens/Eat.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx';

export default function FoodAddRoute() {
  const { day } = useLocalSearchParams<{ day?: string }>();
  return <FoodAdd day={day} />;
}
