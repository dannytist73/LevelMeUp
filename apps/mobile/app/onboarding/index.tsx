import { router } from 'expo-router';
import { Awakening } from '../../src/screens/onboarding/Awakening.tsx';

export default function AwakeningRoute() {
  return <Awakening onNavigate={(path) => router.push(path)} onRestored={() => router.replace('/')} />;
}
