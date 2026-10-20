import { router } from 'expo-router';
import { Chronicle } from '../../src/screens/Chronicle.tsx';

export default function ChronicleRoute() {
  return <Chronicle onPlus={() => router.push('/plus')} onSettings={() => router.push('/settings')} />;
}
