import { router } from 'expo-router';
import { Privacy } from '../src/screens/Privacy.tsx';

export default function PrivacyRoute() {
  return <Privacy onBack={() => router.back()} />;
}
