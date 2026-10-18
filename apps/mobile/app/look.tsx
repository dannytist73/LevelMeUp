import { router } from 'expo-router';
import { Look } from '../src/screens/Look.tsx';

export default function LookRoute() {
  return <Look onBack={() => router.back()} onPlus={() => router.push('/plus')} />;
}
