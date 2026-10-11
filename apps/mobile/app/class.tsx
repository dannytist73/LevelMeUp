import { router } from 'expo-router';
import { ClassChange } from '../src/screens/ClassChange.tsx';

export default function ClassRoute() {
  return <ClassChange onDone={() => router.back()} onBack={() => router.back()} />;
}
