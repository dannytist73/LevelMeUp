import { router } from 'expo-router';
import { Vanish } from '../src/screens/Vanish.tsx';

export default function VanishRoute() {
  return <Vanish onBack={() => router.back()} />;
}
