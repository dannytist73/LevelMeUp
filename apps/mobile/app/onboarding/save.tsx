import { router } from 'expo-router';
import { Save } from '../../src/screens/onboarding/Save.tsx';

export default function SaveRoute() {
  return <Save onBegin={() => router.replace('/')} />;
}
